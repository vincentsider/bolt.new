import { hash, verify } from 'argon2';
import { v4 as uuidv4 } from 'uuid';
import speakeasy from 'speakeasy';
import { z } from 'zod';
import pino from 'pino';
import { UserService } from './user';
import { TenantService } from './tenant';
import { SessionService } from './session';
import { TokenService } from './token';

const logger = pino({ name: 'auth-service' });

// Validation schemas
const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  tenantId: z.string().uuid(),
  mfaCode: z.string().optional(),
});

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(12).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  tenantId: z.string().uuid(),
  role: z.enum(['builder', 'reviewer', 'approver', 'auditor']),
});

export class AuthService {
  constructor(
    private userService: UserService,
    private tenantService: TenantService,
    private sessionService: SessionService,
    private tokenService: TokenService
  ) {}

  async login(data: z.infer<typeof LoginSchema>) {
    const validated = LoginSchema.parse(data);
    
    // Get user
    const user = await this.userService.findByEmail(validated.email, validated.tenantId);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const validPassword = await verify(user.passwordHash, validated.password);
    if (!validPassword) {
      await this.handleFailedLogin(user.id);
      throw new Error('Invalid credentials');
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new Error('Account is locked');
    }

    // Verify MFA if enabled
    if (user.mfaEnabled) {
      if (!validated.mfaCode) {
        return { requiresMfa: true, userId: user.id };
      }

      const validMfa = speakeasy.totp.verify({
        secret: user.mfaSecret!,
        encoding: 'base32',
        token: validated.mfaCode,
        window: 2,
      });

      if (!validMfa) {
        throw new Error('Invalid MFA code');
      }
    }

    // Get tenant
    const tenant = await this.tenantService.get(validated.tenantId);
    if (!tenant) {
      throw new Error('Invalid tenant');
    }

    // Create session
    const sessionId = uuidv4();
    const session = {
      id: sessionId,
      userId: user.id,
      tenantId: tenant.id,
      role: user.role,
      permissions: user.permissions,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    };

    await this.sessionService.create(session);

    // Generate tokens
    const accessToken = await this.tokenService.generateAccessToken({
      sub: user.id,
      email: user.email,
      tenantId: tenant.id,
      role: user.role,
      permissions: user.permissions,
      sessionId,
    });

    const refreshToken = await this.tokenService.generateRefreshToken({
      sub: user.id,
      sessionId,
    });

    // Update last login
    await this.userService.updateLastLogin(user.id);

    // Audit log
    logger.info({
      userId: user.id,
      tenantId: tenant.id,
      action: 'login',
    }, 'User logged in');

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        permissions: user.permissions,
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
      },
    };
  }

  async register(data: z.infer<typeof RegisterSchema>) {
    const validated = RegisterSchema.parse(data);

    // Check if user exists
    const existingUser = await this.userService.findByEmail(validated.email, validated.tenantId);
    if (existingUser) {
      throw new Error('User already exists');
    }

    // Verify tenant
    const tenant = await this.tenantService.get(validated.tenantId);
    if (!tenant) {
      throw new Error('Invalid tenant');
    }

    // Check tenant user limits
    const userCount = await this.userService.countByTenant(validated.tenantId);
    const limits = this.getTenantLimits(tenant.plan);
    if (userCount >= limits.maxUsers) {
      throw new Error('Tenant user limit reached');
    }

    // Hash password
    const passwordHash = await hash(validated.password);

    // Create user
    const user = await this.userService.create({
      id: uuidv4(),
      email: validated.email,
      passwordHash,
      firstName: validated.firstName,
      lastName: validated.lastName,
      role: validated.role,
      tenantId: validated.tenantId,
      permissions: this.getDefaultPermissions(validated.role),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    logger.info({
      userId: user.id,
      tenantId: tenant.id,
      action: 'register',
    }, 'User registered');

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }

  async logout(sessionId: string) {
    await this.sessionService.delete(sessionId);
    logger.info({ sessionId }, 'User logged out');
  }

  async refreshToken(refreshToken: string) {
    const payload = await this.tokenService.verifyRefreshToken(refreshToken);
    
    // Get session
    const session = await this.sessionService.get(payload.sessionId);
    if (!session) {
      throw new Error('Invalid session');
    }

    // Check if session is expired
    if (session.expiresAt < new Date()) {
      throw new Error('Session expired');
    }

    // Get user
    const user = await this.userService.get(session.userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Generate new access token
    const accessToken = await this.tokenService.generateAccessToken({
      sub: user.id,
      email: user.email,
      tenantId: session.tenantId,
      role: user.role,
      permissions: user.permissions,
      sessionId: session.id,
    });

    return { accessToken };
  }

  async setupMfa(userId: string) {
    const secret = speakeasy.generateSecret({
      name: 'WorkflowHub',
      length: 32,
    });

    await this.userService.update(userId, {
      mfaSecret: secret.base32,
      mfaEnabled: false, // Will be enabled after verification
    });

    return {
      secret: secret.base32,
      qrCode: secret.otpauth_url!,
    };
  }

  async verifyMfa(userId: string, code: string) {
    const user = await this.userService.get(userId);
    if (!user || !user.mfaSecret) {
      throw new Error('MFA not setup');
    }

    const valid = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token: code,
      window: 2,
    });

    if (!valid) {
      throw new Error('Invalid MFA code');
    }

    await this.userService.update(userId, {
      mfaEnabled: true,
      mfaVerifiedAt: new Date(),
    });

    return { success: true };
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await this.userService.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Verify old password
    const valid = await verify(user.passwordHash, oldPassword);
    if (!valid) {
      throw new Error('Invalid password');
    }

    // Hash new password
    const passwordHash = await hash(newPassword);

    await this.userService.update(userId, {
      passwordHash,
      passwordChangedAt: new Date(),
    });

    // Invalidate all sessions
    await this.sessionService.deleteAllForUser(userId);

    logger.info({ userId }, 'Password changed');
  }

  private async handleFailedLogin(userId: string) {
    const user = await this.userService.get(userId);
    if (!user) return;

    const failedAttempts = (user.failedLoginAttempts || 0) + 1;
    const updates: any = { failedLoginAttempts: failedAttempts };

    // Lock account after 5 failed attempts
    if (failedAttempts >= 5) {
      updates.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      logger.warn({ userId }, 'Account locked due to failed login attempts');
    }

    await this.userService.update(userId, updates);
  }

  private getTenantLimits(plan: string) {
    const limits: Record<string, any> = {
      starter: { maxUsers: 10, maxWorkflows: 50 },
      professional: { maxUsers: 100, maxWorkflows: 500 },
      enterprise: { maxUsers: -1, maxWorkflows: -1 }, // Unlimited
    };

    return limits[plan] || limits.starter;
  }

  private getDefaultPermissions(role: string): string[] {
    const permissions: Record<string, string[]> = {
      builder: ['workflow.create', 'workflow.read', 'workflow.update', 'workflow.execute'],
      reviewer: ['workflow.read', 'workflow.review', 'workflow.comment'],
      approver: ['workflow.read', 'workflow.approve', 'workflow.reject'],
      auditor: ['workflow.read', 'audit.read', 'report.generate'],
      sysadmin: ['*'], // All permissions
    };

    return permissions[role] || [];
  }
}