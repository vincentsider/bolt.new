/**
 * Integration Agent Tools
 */

import type { Tool, ToolResult, AgentContext, IntegrationValidation } from '../types';
import { z } from 'zod';

// Mock integration registry (would normally come from Arcade.dev API)
const AVAILABLE_INTEGRATIONS = {
  'salesforce': {
    name: 'Salesforce CRM',
    category: 'CRM',
    requiredScopes: ['api', 'refresh_token', 'full'],
    rateLimit: { requests: 1000, window: '1h' },
    endpoints: {
      'create_lead': { method: 'POST', path: '/services/data/v52.0/sobjects/Lead' },
      'update_contact': { method: 'PATCH', path: '/services/data/v52.0/sobjects/Contact/{id}' },
      'query_opportunities': { method: 'GET', path: '/services/data/v52.0/query' }
    }
  },
  'slack': {
    name: 'Slack',
    category: 'Communication',
    requiredScopes: ['chat:write', 'channels:read', 'users:read'],
    rateLimit: { requests: 100, window: '1m' },
    endpoints: {
      'send_message': { method: 'POST', path: '/api/chat.postMessage' },
      'create_channel': { method: 'POST', path: '/api/conversations.create' },
      'list_users': { method: 'GET', path: '/api/users.list' }
    }
  },
  'hubspot': {
    name: 'HubSpot',
    category: 'CRM',
    requiredScopes: ['contacts', 'oauth'],
    rateLimit: { requests: 500, window: '10m' },
    endpoints: {
      'create_contact': { method: 'POST', path: '/crm/v3/objects/contacts' },
      'update_deal': { method: 'PATCH', path: '/crm/v3/objects/deals/{id}' },
      'get_companies': { method: 'GET', path: '/crm/v3/objects/companies' }
    }
  },
  'gmail': {
    name: 'Gmail',
    category: 'Email',
    requiredScopes: ['https://www.googleapis.com/auth/gmail.send', 'https://www.googleapis.com/auth/gmail.readonly'],
    rateLimit: { requests: 250, window: '1s' },
    endpoints: {
      'send_email': { method: 'POST', path: '/gmail/v1/users/me/messages/send' },
      'list_messages': { method: 'GET', path: '/gmail/v1/users/me/messages' },
      'get_message': { method: 'GET', path: '/gmail/v1/users/me/messages/{id}' }
    }
  }
};

// Mock OAuth state (would normally be stored in database)
const MOCK_OAUTH_STATE = {
  'user-123': {
    'salesforce': {
      connected: true,
      scopes: ['api', 'refresh_token'],
      expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
      lastChecked: new Date()
    },
    'slack': {
      connected: true,
      scopes: ['chat:write', 'channels:read'],
      expiresAt: new Date(Date.now() + 86400000), // 24 hours from now
      lastChecked: new Date()
    }
  }
};

export const validateConnectionTool: Tool = {
  name: 'validate_connection',
  description: 'Check connection status and health of external integrations',
  parameters: [
    {
      name: 'integrations',
      type: 'array',
      description: 'Array of integration names to validate',
      required: true,
      schema: z.array(z.string())
    }
  ],
  execute: async (input: { integrations: string[] }, context?: AgentContext): Promise<ToolResult> => {
    try {
      const connectionStatus = {};

      for (const integration of input.integrations) {
        const integrationConfig = (AVAILABLE_INTEGRATIONS as Record<string, any>)[integration];
        if (!integrationConfig) {
          (connectionStatus as Record<string, any>)[integration] = {
            connected: false,
            lastChecked: new Date(),
            error: 'Integration not found in registry'
          };
          continue;
        }

        // Simulate connection check with mock data
        const userOAuth = (MOCK_OAUTH_STATE as Record<string, any>)[context?.userId || '']?.[integration];
        if (!userOAuth) {
          (connectionStatus as Record<string, any>)[integration] = {
            connected: false,
            lastChecked: new Date(),
            error: 'Not connected - OAuth required'
          };
          continue;
        }

        // Check if token is expired
        const isExpired = userOAuth.expiresAt < new Date();
        if (isExpired) {
          (connectionStatus as Record<string, any>)[integration] = {
            connected: false,
            lastChecked: new Date(),
            error: 'OAuth token expired'
          };
          continue;
        }

        // Simulate latency check
        const latency = Math.random() * 500 + 100; // 100-600ms
        (connectionStatus as Record<string, any>)[integration] = {
          connected: true,
          lastChecked: new Date(),
          latency: Math.round(latency)
        };
      }

      const result: IntegrationValidation['connectionStatus'] = connectionStatus;

      const failedConnections = Object.entries(connectionStatus).filter(([_, status]: [string, any]) => !status.connected);

      return {
        success: failedConnections.length === 0,
        data: result,
        warnings: failedConnections.length > 0 ? [
          `${failedConnections.length} integrations have connection issues`
        ] : undefined,
        suggestions: failedConnections.length > 0 ? [
          'Reconnect failed integrations',
          'Check OAuth token expiration',
          'Verify integration configuration'
        ] : undefined
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to validate connections: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
};

export const checkPermissionsTool: Tool = {
  name: 'check_integration_permissions',
  description: 'Validate OAuth permissions for required integration operations',
  parameters: [
    {
      name: 'integrationOperations',
      type: 'array',
      description: 'Array of integration operations with required scopes',
      required: true,
      schema: z.array(z.object({
        integration: z.string(),
        operation: z.string(),
        requiredScopes: z.array(z.string())
      }))
    }
  ],
  execute: async (input: { integrationOperations: Array<{ integration: string; operation: string; requiredScopes: string[] }> }, context?: AgentContext): Promise<ToolResult> => {
    try {
      const permissionValidation = {};

      for (const op of input.integrationOperations) {
        const userOAuth = (MOCK_OAUTH_STATE as Record<string, any>)[context?.userId || '']?.[op.integration];
        if (!userOAuth) {
          (permissionValidation as Record<string, any>)[op.integration] = {
            requiredScopes: op.requiredScopes,
            grantedScopes: [],
            missingScopes: op.requiredScopes,
            excessScopes: []
          };
          continue;
        }

        const grantedScopes = userOAuth.scopes || [];
        const missingScopes = op.requiredScopes.filter((scope: string) => !grantedScopes.includes(scope));
        const excessScopes = grantedScopes.filter((scope: string) => !op.requiredScopes.includes(scope));

        (permissionValidation as Record<string, any>)[op.integration] = {
          requiredScopes: op.requiredScopes,
          grantedScopes,
          missingScopes,
          excessScopes
        };
      }

      const result: IntegrationValidation['permissionValidation'] = permissionValidation;

      const permissionIssues = Object.entries(permissionValidation).filter(
        ([_, validation]: [string, any]) => validation.missingScopes.length > 0
      );

      return {
        success: permissionIssues.length === 0,
        data: result,
        warnings: permissionIssues.length > 0 ? [
          `${permissionIssues.length} integrations have permission issues`
        ] : undefined,
        suggestions: permissionIssues.length > 0 ? [
          'Request additional OAuth scopes',
          'Update integration permissions',
          'Re-authorize integrations'
        ] : undefined
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to check integration permissions: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
};

export const checkRateLimitsTool: Tool = {
  name: 'check_rate_limits',
  description: 'Check current rate limit status for integrations',
  parameters: [
    {
      name: 'integrations',
      type: 'array',
      description: 'Array of integration names to check rate limits for',
      required: true,
      schema: z.array(z.string())
    }
  ],
  execute: async (input: { integrations: string[] }, context?: AgentContext): Promise<ToolResult> => {
    try {
      const rateLimit = {};

      for (const integration of input.integrations) {
        const integrationConfig = (AVAILABLE_INTEGRATIONS as Record<string, any>)[integration];
        if (!integrationConfig) continue;

        // Simulate rate limit status
        const limit = integrationConfig.rateLimit.requests;
        const remaining = Math.floor(Math.random() * limit);
        const resetTime = new Date(Date.now() + 3600000); // 1 hour from now

        let status: 'ok' | 'warning' | 'exceeded' = 'ok';
        if (remaining === 0) status = 'exceeded';
        else if (remaining < limit * 0.1) status = 'warning';

        (rateLimit as Record<string, any>)[integration] = {
          limit,
          remaining,
          resetTime,
          status
        };
      }

      const result: IntegrationValidation['rateLimit'] = rateLimit;

      const rateLimitIssues = Object.entries(rateLimit).filter(
        ([_, limit]: [string, any]) => limit.status === 'exceeded' || limit.status === 'warning'
      );

      return {
        success: rateLimitIssues.length === 0,
        data: result,
        warnings: rateLimitIssues.length > 0 ? [
          `${rateLimitIssues.length} integrations approaching or at rate limits`
        ] : undefined,
        suggestions: rateLimitIssues.length > 0 ? [
          'Implement request queuing',
          'Reduce API call frequency',
          'Consider caching responses'
        ] : undefined
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to check rate limits: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
};

export const suggestIntegrationsTool: Tool = {
  name: 'suggest_integrations',
  description: 'Suggest appropriate integrations based on workflow requirements',
  parameters: [
    {
      name: 'workflowDescription',
      type: 'string',
      description: 'Description of the workflow and its requirements',
      required: true,
      schema: z.string()
    },
    {
      name: 'categories',
      type: 'array',
      description: 'Preferred integration categories (optional)',
      required: false,
      schema: z.array(z.string()).optional()
    }
  ],
  execute: async (input: { workflowDescription: string; categories?: string[] }, context?: AgentContext): Promise<ToolResult> => {
    try {
      const suggestions = [];
      const workflowLower = input.workflowDescription.toLowerCase();

      // Analyze workflow description for keywords
      for (const [integrationId, integration] of Object.entries(AVAILABLE_INTEGRATIONS)) {
        let score = 0;
        let reasons = [];

        // Category matching
        if (input.categories?.includes(integration.category)) {
          score += 3;
          reasons.push(`Matches requested ${integration.category} category`);
        }

        // Keyword matching
        if (workflowLower.includes('crm') && integration.category === 'CRM') {
          score += 2;
          reasons.push('CRM functionality required');
        }

        if (workflowLower.includes('email') && integration.category === 'Email') {
          score += 2;
          reasons.push('Email functionality required');
        }

        if (workflowLower.includes('slack') || workflowLower.includes('message')) {
          if (integrationId === 'slack') {
            score += 3;
            reasons.push('Messaging/communication required');
          }
        }

        if (workflowLower.includes('salesforce') || workflowLower.includes('lead')) {
          if (integrationId === 'salesforce') {
            score += 3;
            reasons.push('Salesforce-specific functionality detected');
          }
        }

        if (score > 0) {
          suggestions.push({
            integrationId,
            name: integration.name,
            category: integration.category,
            score,
            reasons,
            requiredScopes: integration.requiredScopes,
            availableOperations: Object.keys(integration.endpoints)
          });
        }
      }

      // Sort by score
      suggestions.sort((a, b) => b.score - a.score);

      return {
        success: true,
        data: { suggestions },
        suggestions: suggestions.slice(0, 3).map(s => 
          `Consider using ${s.name} for ${s.reasons.join(', ')}`
        )
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to suggest integrations: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
};

export const testIntegrationEndpointTool: Tool = {
  name: 'test_integration_endpoint',
  description: 'Test specific integration endpoint with mock data',
  parameters: [
    {
      name: 'integration',
      type: 'string',
      description: 'Integration name to test',
      required: true,
      schema: z.string()
    },
    {
      name: 'endpoint',
      type: 'string',
      description: 'Endpoint operation to test',
      required: true,
      schema: z.string()
    },
    {
      name: 'testData',
      type: 'object',
      description: 'Test data to send to endpoint',
      required: false,
      schema: z.record(z.any()).optional()
    }
  ],
  execute: async (input: { integration: string; endpoint: string; testData?: Record<string, any> }, context?: AgentContext): Promise<ToolResult> => {
    try {
      const integrationConfig = (AVAILABLE_INTEGRATIONS as Record<string, any>)[input.integration];
      if (!integrationConfig) {
        return {
          success: false,
          error: `Integration '${input.integration}' not found`
        };
      }

      const endpointConfig = integrationConfig?.endpoints?.[input.endpoint];
      if (!endpointConfig) {
        return {
          success: false,
          error: `Endpoint '${input.endpoint}' not found for ${input.integration}`
        };
      }

      // Simulate API call
      const latency = Math.random() * 1000 + 200; // 200-1200ms
      const success = Math.random() > 0.1; // 90% success rate

      await new Promise(resolve => setTimeout(resolve, 100)); // Simulate network delay

      if (!success) {
        return {
          success: false,
          error: 'Simulated API error - endpoint temporarily unavailable',
          suggestions: [
            'Retry the request',
            'Check integration status',
            'Verify endpoint parameters'
          ]
        };
      }

      const mockResponse = generateMockResponse(input.integration, input.endpoint, input.testData);

      return {
        success: true,
        data: {
          integration: input.integration,
          endpoint: input.endpoint,
          method: endpointConfig.method,
          path: endpointConfig.path,
          responseTime: Math.round(latency),
          response: mockResponse,
          status: 'success'
        },
        suggestions: [
          'Test completed successfully',
          'Integration is working properly'
        ]
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to test integration endpoint: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
};

// Helper function to generate mock API responses
function generateMockResponse(integration: string, endpoint: string, testData?: Record<string, any>): any {
  const responses = {
    'salesforce': {
      'create_lead': { id: '00Q000001234567', success: true },
      'update_contact': { id: '003000001234567', success: true },
      'query_opportunities': { totalSize: 5, records: [{ Id: '006000001234567', Name: 'Test Opportunity' }] }
    },
    'slack': {
      'send_message': { ok: true, ts: '1234567890.123', channel: 'C1234567890' },
      'create_channel': { ok: true, channel: { id: 'C1234567890', name: 'test-channel' } },
      'list_users': { ok: true, members: [{ id: 'U1234567890', name: 'testuser' }] }
    },
    'hubspot': {
      'create_contact': { id: '1234567890', properties: { email: 'test@example.com' } },
      'update_deal': { id: '9876543210', properties: { amount: '10000' } },
      'get_companies': { results: [{ id: '1111111111', properties: { name: 'Test Company' } }] }
    },
    'gmail': {
      'send_email': { id: '17a1b2c3d4e5f6g7', threadId: '17a1b2c3d4e5f6g7' },
      'list_messages': { messages: [{ id: '17a1b2c3d4e5f6g7', threadId: '17a1b2c3d4e5f6g7' }] },
      'get_message': { id: '17a1b2c3d4e5f6g7', snippet: 'Test email content' }
    }
  };

  return (responses as Record<string, any>)[integration]?.[endpoint] || { success: true, message: 'Mock response' };
}

// Export all integration tools
export const integrationTools: Tool[] = [
  validateConnectionTool,
  checkPermissionsTool,
  checkRateLimitsTool,
  suggestIntegrationsTool,
  testIntegrationEndpointTool
];