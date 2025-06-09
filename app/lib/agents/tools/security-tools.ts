/**
 * Security Agent Tools
 */

import type { Tool, ToolResult, AgentContext, SecurityValidation } from '../types';
import { z } from 'zod';

// Mock security database for demonstration
const KNOWN_VULNERABILITIES: Record<string, Record<string, Array<{
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  fix: string;
}>>> = {
  'express': {
    '4.17.1': [
      {
        severity: 'medium' as const,
        description: 'Prototype pollution vulnerability',
        fix: 'Upgrade to express@4.18.2 or later'
      }
    ]
  },
  'lodash': {
    '4.17.15': [
      {
        severity: 'high' as const,
        description: 'Prototype pollution in zipObjectDeep',
        fix: 'Upgrade to lodash@4.17.21 or later'
      }
    ]
  }
};

const SECURITY_POLICIES = [
  {
    id: 'data-encryption',
    name: 'Data Encryption Requirements',
    description: 'All sensitive data must be encrypted at rest and in transit',
    keywords: ['password', 'secret', 'token', 'key', 'api_key']
  },
  {
    id: 'input-validation',
    name: 'Input Validation',
    description: 'All user inputs must be validated and sanitized',
    keywords: ['req.body', 'req.query', 'req.params', 'input', 'form']
  },
  {
    id: 'authentication',
    name: 'Authentication Required',
    description: 'All endpoints must require proper authentication',
    keywords: ['app.get', 'app.post', 'app.put', 'app.delete', 'router.']
  }
];

export const validatePackageSecurityTool: Tool = {
  name: 'validate_package_security',
  description: 'Scan workflow packages for known security vulnerabilities',
  parameters: [
    {
      name: 'packages',
      type: 'array',
      description: 'Array of package names and versions to validate',
      required: true,
      schema: z.array(z.object({
        name: z.string(),
        version: z.string()
      }))
    }
  ],
  execute: async (input: { packages: Array<{ name: string; version: string }> }, context?: AgentContext): Promise<ToolResult> => {
    try {
      const vulnerabilities = [];
      const recommendations = [];

      for (const pkg of input.packages) {
        const vulns = KNOWN_VULNERABILITIES[pkg.name]?.[pkg.version];
        if (vulns) {
          vulnerabilities.push({
            severity: vulns[0].severity,
            package: pkg.name,
            version: pkg.version,
            description: vulns[0].description,
            fix: vulns[0].fix
          });
          recommendations.push(`Update ${pkg.name} to resolve security vulnerabilities`);
        }
      }

      const result: SecurityValidation['packageSecurity'] = {
        vulnerabilities,
        recommendations
      };

      return {
        success: true,
        data: result,
        warnings: vulnerabilities.length > 0 ? [`Found ${vulnerabilities.length} security vulnerabilities`] : undefined
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `Failed to validate package security: ${errorMessage}`
      };
    }
  }
};

export const checkPermissionsTool: Tool = {
  name: 'check_permissions',
  description: 'Validate user permissions against required workflow operations',
  parameters: [
    {
      name: 'requiredPermissions',
      type: 'array',
      description: 'Array of permission strings required for the workflow',
      required: true,
      schema: z.array(z.string())
    },
    {
      name: 'workflowActions',
      type: 'array',
      description: 'Array of actions the workflow will perform',
      required: true,
      schema: z.array(z.string())
    }
  ],
  execute: async (input: { requiredPermissions: string[]; workflowActions: string[] }, context?: AgentContext): Promise<ToolResult> => {
    try {
      if (!context) {
        return {
          success: false,
          error: 'Context required for permission validation'
        };
      }

      const granted = context.permissions || [];
      const violations = input.requiredPermissions.filter(perm => !granted.includes(perm));

      const result: SecurityValidation['permissionCheck'] = {
        required: input.requiredPermissions,
        granted,
        violations
      };

      return {
        success: violations.length === 0,
        data: result,
        warnings: violations.length > 0 ? [`Missing permissions: ${violations.join(', ')}`] : undefined
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `Failed to check permissions: ${errorMessage}`
      };
    }
  }
};

export const validateComplianceTool: Tool = {
  name: 'validate_compliance',
  description: 'Check workflow code against organizational security policies',
  parameters: [
    {
      name: 'workflowCode',
      type: 'string',
      description: 'The generated workflow code to validate',
      required: true,
      schema: z.string()
    },
    {
      name: 'policyIds',
      type: 'array',
      description: 'Specific policy IDs to check (optional)',
      required: false,
      schema: z.array(z.string()).optional()
    }
  ],
  execute: async (input: { workflowCode: string; policyIds?: string[] }, context?: AgentContext): Promise<ToolResult> => {
    try {
      const policiesToCheck = input.policyIds 
        ? SECURITY_POLICIES.filter(p => input.policyIds!.includes(p.id))
        : SECURITY_POLICIES;

      const policyChecks = policiesToCheck.map(policy => {
        const hasViolation = policy.keywords.some(keyword => 
          input.workflowCode.includes(keyword) && !hasProperSecurity(input.workflowCode, keyword)
        );

        return {
          policyId: policy.id,
          name: policy.name,
          status: hasViolation ? 'violation' as const : 'compliant' as const,
          details: hasViolation 
            ? `Code may violate ${policy.description.toLowerCase()}`
            : `Code complies with ${policy.description.toLowerCase()}`
        };
      });

      const violations = policyChecks.filter(check => check.status === 'violation');
      const score = Math.round(((policyChecks.length - violations.length) / policyChecks.length) * 100);

      const result: SecurityValidation['complianceCheck'] = {
        policies: policyChecks,
        score
      };

      return {
        success: violations.length === 0,
        data: result,
        warnings: violations.length > 0 ? [`${violations.length} policy violations found`] : undefined,
        suggestions: violations.map(v => `Address ${v.name} compliance issues`)
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `Failed to validate compliance: ${errorMessage}`
      };
    }
  }
};

export const scanForSecretsTools: Tool = {
  name: 'scan_for_secrets',
  description: 'Scan workflow code for hardcoded secrets and sensitive data',
  parameters: [
    {
      name: 'workflowCode',
      type: 'string',
      description: 'The workflow code to scan for secrets',
      required: true,
      schema: z.string()
    }
  ],
  execute: async (input: { workflowCode: string }, context?: AgentContext): Promise<ToolResult> => {
    try {
      const secretPatterns = [
        { pattern: /password\s*=\s*['"][^'"]+['"]/, type: 'hardcoded password' },
        { pattern: /api[_-]?key\s*=\s*['"][^'"]+['"]/, type: 'hardcoded API key' },
        { pattern: /secret\s*=\s*['"][^'"]+['"]/, type: 'hardcoded secret' },
        { pattern: /token\s*=\s*['"][^'"]+['"]/, type: 'hardcoded token' },
        { pattern: /sk_[a-zA-Z0-9]{24,}/, type: 'Stripe secret key' },
        { pattern: /pk_[a-zA-Z0-9]{24,}/, type: 'Stripe publishable key' }
      ];

      const findings: Array<{
        type: string;
        line: number;
        content: string;
        severity: 'high';
      }> = [];
      const lines = input.workflowCode.split('\n');

      lines.forEach((line, index) => {
        secretPatterns.forEach(({ pattern, type }) => {
          if (pattern.test(line)) {
            findings.push({
              type,
              line: index + 1,
              content: line.trim(),
              severity: 'high' as const
            });
          }
        });
      });

      return {
        success: findings.length === 0,
        data: { findings },
        warnings: findings.length > 0 ? [`Found ${findings.length} potential secrets in code`] : undefined,
        suggestions: findings.length > 0 ? [
          'Remove hardcoded secrets and use environment variables',
          'Use secure secret management systems',
          'Implement proper authentication flows'
        ] : undefined
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `Failed to scan for secrets: ${errorMessage}`
      };
    }
  }
};

// Helper function to check if code has proper security measures
function hasProperSecurity(code: string, keyword: string): boolean {
  switch (keyword) {
    case 'password':
    case 'secret':
    case 'token':
    case 'api_key':
      // Check if using environment variables or secure storage
      return code.includes('process.env') || code.includes('getSecret') || code.includes('env.');
    
    case 'req.body':
    case 'req.query':
    case 'req.params':
      // Check if input validation is present
      return code.includes('validate') || code.includes('sanitize') || code.includes('joi.') || code.includes('zod.');
    
    case 'app.get':
    case 'app.post':
    case 'app.put':
    case 'app.delete':
    case 'router.':
      // Check if authentication middleware is present
      return code.includes('authenticate') || code.includes('authorize') || code.includes('jwt') || code.includes('auth');
    
    default:
      return false;
  }
}

// Export all security tools
export const securityTools: Tool[] = [
  validatePackageSecurityTool,
  checkPermissionsTool,
  validateComplianceTool,
  scanForSecretsTools
];