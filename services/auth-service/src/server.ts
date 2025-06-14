import express from 'express';
import helmet from 'helmet';
import passport from 'passport';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import pino from 'pino';
import { AuthService } from './services/auth';
import { TokenService } from './services/token';
import { UserService } from './services/user';
import { TenantService } from './services/tenant';
import { SessionService } from './services/session';
import { createAuthRouter } from './routes/auth';
import { createOAuthRouter } from './routes/oauth';
import { createSAMLRouter } from './routes/saml';
import { createUsersRouter } from './routes/users';
import { createTenantsRouter } from './routes/tenants';
import { createHealthRouter } from './routes/health';
import { errorHandler } from './middleware/error';
import { auditMiddleware } from './middleware/audit';
import { connectDatabase } from './db';
import { setupPassportStrategies } from './passport';
import Redis from 'ioredis';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: process.env.NODE_ENV !== 'production'
    }
  }
});

async function startServer() {
  const app = express();
  const server = createServer(app);
  const port = process.env.PORT || 3003;

  // Initialize services
  const db = await connectDatabase();
  const redis = new Redis({
    host: process.env.REDIS_HOST || 'redis',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  });

  const sessionService = new SessionService(redis);
  const tokenService = new TokenService();
  const userService = new UserService(db);
  const tenantService = new TenantService(db);
  const authService = new AuthService(userService, tenantService, sessionService, tokenService);

  // Setup Passport strategies
  setupPassportStrategies(authService);

  // Global middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  }));

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(passport.initialize());
  app.use(auditMiddleware(db));

  // Rate limiting
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per window
    message: 'Too many authentication attempts, please try again later',
  });

  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
  });

  // Routes
  app.use('/health', createHealthRouter(db, redis));
  app.use('/api/v1/auth', authLimiter, createAuthRouter(authService));
  app.use('/api/v1/oauth', authLimiter, createOAuthRouter(authService));
  app.use('/api/v1/saml', authLimiter, createSAMLRouter(authService));
  app.use('/api/v1/users', apiLimiter, createUsersRouter(userService));
  app.use('/api/v1/tenants', apiLimiter, createTenantsRouter(tenantService));

  // Error handling
  app.use(errorHandler);

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully');
    server.close(() => {
      logger.info('HTTP server closed');
    });
    await redis.quit();
    await db.end();
    process.exit(0);
  });

  server.listen(port, () => {
    logger.info(`Auth service listening on port ${port}`);
  });
}

startServer().catch((error) => {
  logger.error(error, 'Failed to start server');
  process.exit(1);
});