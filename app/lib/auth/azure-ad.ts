import { supabase } from '~/lib/supabase'

export interface AzureADConfig {
  clientId: string
  clientSecret: string
  tenantId: string
  redirectUri: string
}

export interface AzureADUser {
  id: string
  email: string
  name: string
  roles?: string[]
  groups?: string[]
}

export class AzureADProvider {
  private config: AzureADConfig

  constructor(config: AzureADConfig) {
    this.config = config
  }

  /**
   * Get Azure AD authorization URL
   */
  getAuthorizationUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      response_type: 'code',
      redirect_uri: this.config.redirectUri,
      scope: 'openid profile email User.Read',
      response_mode: 'query',
      ...(state && { state })
    })

    return `https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/authorize?${params}`
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string): Promise<{ access_token: string; id_token: string }> {
    const response = await fetch(`https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.config.redirectUri,
      }),
    })

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Get user profile from Microsoft Graph API
   */
  async getUserProfile(accessToken: string): Promise<AzureADUser> {
    const response = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to get user profile: ${response.statusText}`)
    }

    const profile = await response.json()
    
    return {
      id: profile.id,
      email: profile.mail || profile.userPrincipalName,
      name: profile.displayName,
    }
  }

  /**
   * Get user's Azure AD groups (for role mapping)
   */
  async getUserGroups(accessToken: string): Promise<string[]> {
    const response = await fetch('https://graph.microsoft.com/v1.0/me/memberOf', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      console.warn('Failed to get user groups:', response.statusText)
      return []
    }

    const data = await response.json()
    return data.value.map((group: any) => group.displayName).filter(Boolean)
  }

  /**
   * Map Azure AD groups to WorkflowHub roles
   */
  mapGroupsToRole(groups: string[]): 'builder' | 'reviewer' | 'approver' | 'auditor' | 'sysadmin' {
    // Default role mapping - customize based on organization needs
    const roleMapping = {
      'WorkflowHub-SystemAdmins': 'sysadmin',
      'WorkflowHub-Auditors': 'auditor', 
      'WorkflowHub-Approvers': 'approver',
      'WorkflowHub-Reviewers': 'reviewer',
      'WorkflowHub-Builders': 'builder',
    } as const

    for (const group of groups) {
      if (group in roleMapping) {
        return roleMapping[group as keyof typeof roleMapping]
      }
    }

    // Default to reviewer role
    return 'reviewer'
  }
}

/**
 * Initialize Azure AD authentication for an organization
 */
export async function initializeAzureAD(organizationId: string, config: AzureADConfig) {
  try {
    // Store Azure AD configuration in organization settings
    const { error } = await supabase
      .from('organizations')
      .update({
        settings: {
          ssoEnabled: true,
          allowedDomains: [], // Will be populated based on tenant
          azureAD: {
            clientId: config.clientId,
            tenantId: config.tenantId,
            redirectUri: config.redirectUri,
            // Don't store client secret in database
          }
        }
      })
      .eq('id', organizationId)

    if (error) {
      throw new Error(`Failed to update organization settings: ${error.message}`)
    }

    return { success: true }
  } catch (error) {
    console.error('Azure AD initialization failed:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Sign in user with Azure AD
 */
export async function signInWithAzureAD(
  code: string, 
  organizationId: string,
  azureProvider: AzureADProvider
): Promise<{ user?: any; error?: string }> {
  try {
    // Exchange code for tokens
    const tokens = await azureProvider.exchangeCodeForToken(code)
    
    // Get user profile
    const profile = await azureProvider.getUserProfile(tokens.access_token)
    
    // Get user groups for role mapping
    const groups = await azureProvider.getUserGroups(tokens.access_token)
    const role = azureProvider.mapGroupsToRole(groups)

    // Create or update user in Supabase
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', profile.email)
      .eq('organization_id', organizationId)
      .single()

    let userId: string

    if (existingUser) {
      // Update existing user
      const { error } = await supabase
        .from('users')
        .update({
          role,
          profile: { name: profile.name },
          last_login: new Date().toISOString()
        })
        .eq('id', existingUser.id)

      if (error) {
        throw new Error(`Failed to update user: ${error.message}`)
      }
      
      userId = existingUser.id
    } else {
      // Create new user
      const { data: newUser, error } = await supabase
        .from('users')
        .insert({
          organization_id: organizationId,
          email: profile.email,
          role,
          profile: { name: profile.name },
          permissions: getDefaultPermissions(role)
        })
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create user: ${error.message}`)
      }

      userId = newUser.id
    }

    // Create Supabase auth session
    const { data: authData, error: authError } = await supabase.auth.signInWithIdToken({
      provider: 'azure',
      token: tokens.id_token,
      options: {
        data: {
          azure_id: profile.id,
          organization_id: organizationId,
          role
        }
      }
    })

    if (authError) {
      throw new Error(`Failed to create auth session: ${authError.message}`)
    }

    return { user: authData.user }
  } catch (error) {
    console.error('Azure AD sign-in failed:', error)
    return { error: error instanceof Error ? error.message : 'Sign-in failed' }
  }
}

function getDefaultPermissions(role: string) {
  const permissionSets = {
    sysadmin: [
      { resource: 'workflow', actions: ['create', 'read', 'update', 'delete', 'execute'] },
      { resource: 'integration', actions: ['create', 'read', 'update', 'delete'] },
      { resource: 'user', actions: ['create', 'read', 'update', 'delete'] },
      { resource: 'settings', actions: ['create', 'read', 'update', 'delete'] }
    ],
    auditor: [
      { resource: 'workflow', actions: ['read'] },
      { resource: 'integration', actions: ['read'] },
      { resource: 'user', actions: ['read'] },
      { resource: 'settings', actions: ['read'] }
    ],
    approver: [
      { resource: 'workflow', actions: ['read', 'execute'] },
      { resource: 'integration', actions: ['read'] }
    ],
    reviewer: [
      { resource: 'workflow', actions: ['read'] },
      { resource: 'integration', actions: ['read'] }
    ],
    builder: [
      { resource: 'workflow', actions: ['create', 'read', 'update', 'execute'] },
      { resource: 'integration', actions: ['read'] }
    ]
  }

  return permissionSets[role as keyof typeof permissionSets] || permissionSets.reviewer
}