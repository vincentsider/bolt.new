/**
 * Quality Agent Tools
 */

import type { Tool, ToolResult, AgentContext, QualityValidation } from '../types';
import { z } from 'zod';

// Code quality rules and patterns
const CODE_QUALITY_RULES = {
  syntax: [
    { pattern: /console\.log\(/g, message: 'Remove console.log statements', severity: 'warning' },
    { pattern: /debugger;/g, message: 'Remove debugger statements', severity: 'error' },
    { pattern: /var\s+/g, message: 'Use const/let instead of var', severity: 'warning' },
    { pattern: /==\s*(?!null)/g, message: 'Use === instead of ==', severity: 'warning' }
  ],
  security: [
    { pattern: /eval\s*\(/g, message: 'Avoid using eval() - security risk', severity: 'critical' },
    { pattern: /innerHTML\s*=/g, message: 'Potential XSS risk with innerHTML', severity: 'error' },
    { pattern: /document\.write\s*\(/g, message: 'Avoid document.write - security risk', severity: 'error' }
  ],
  performance: [
    { pattern: /for\s*\(\s*var\s+\w+\s*=\s*0.*\.length/g, message: 'Cache array length in loops', severity: 'info' },
    { pattern: /\+\s*''|\s*\+\s*''/g, message: 'Use String() instead of concatenation', severity: 'info' },
    { pattern: /new\s+RegExp\s*\(/g, message: 'Use regex literals for better performance', severity: 'info' }
  ],
  style: [
    { pattern: /function\s*\(/g, message: 'Consider using arrow functions', severity: 'info' },
    { pattern: /\s{2,}/g, message: 'Inconsistent spacing', severity: 'warning' }
  ]
};

const BEST_PRACTICES = [
  {
    id: 'error-handling',
    name: 'Error Handling',
    description: 'Proper error handling with try-catch blocks',
    check: (code: string) => code.includes('try') && code.includes('catch'),
    recommendation: 'Add try-catch blocks for error handling'
  },
  {
    id: 'input-validation',
    name: 'Input Validation',
    description: 'Validate all user inputs',
    check: (code: string) => code.includes('validate') || code.includes('schema') || code.includes('joi') || code.includes('zod'),
    recommendation: 'Add input validation using validation libraries'
  },
  {
    id: 'async-await',
    name: 'Modern Async Patterns',
    description: 'Use async/await instead of callbacks',
    check: (code: string) => code.includes('async') && code.includes('await'),
    recommendation: 'Use async/await for better code readability'
  },
  {
    id: 'type-safety',
    name: 'Type Safety',
    description: 'Use TypeScript for type safety',
    check: (code: string) => code.includes(': ') && (code.includes('interface') || code.includes('type')),
    recommendation: 'Add TypeScript types for better type safety'
  },
  {
    id: 'logging',
    name: 'Proper Logging',
    description: 'Use structured logging instead of console.log',
    check: (code: string) => code.includes('logger') || code.includes('log.'),
    recommendation: 'Implement structured logging with appropriate log levels'
  }
];

const PERFORMANCE_PATTERNS = [
  {
    type: 'memory',
    pattern: /new\s+Array\(\d+\)/g,
    description: 'Large array allocation detected',
    impact: 'High memory usage',
    implementation: 'Consider using generators or streaming for large datasets'
  },
  {
    type: 'cpu',
    pattern: /for\s*\([^)]*\)\s*{[^}]*for\s*\([^)]*\)/g,
    description: 'Nested loops detected',
    impact: 'O(n²) complexity',
    implementation: 'Consider using Map/Set for lookups or optimize algorithm'
  },
  {
    type: 'network',
    pattern: /fetch\s*\([^)]*\)\s*\.then[^}]*fetch\s*\(/g,
    description: 'Sequential API calls detected',
    impact: 'Slow network operations',
    implementation: 'Use Promise.all() for parallel requests'
  }
];

export const reviewCodeTool: Tool = {
  name: 'review_code',
  description: 'Perform comprehensive code review for bugs, style, and best practices',
  parameters: [
    {
      name: 'code',
      type: 'string',
      description: 'The code to review',
      required: true,
      schema: z.string()
    },
    {
      name: 'language',
      type: 'string',
      description: 'Programming language of the code',
      required: true,
      schema: z.string()
    },
    {
      name: 'framework',
      type: 'string',
      description: 'Framework being used (optional)',
      required: false,
      schema: z.string().optional()
    }
  ],
  execute: async (input: { code: string; language: string; framework?: string }, context?: AgentContext): Promise<ToolResult> => {
    try {
      const issues = [];
      const suggestions = [];

      // Check syntax and style issues
      for (const [category, rules] of Object.entries(CODE_QUALITY_RULES)) {
        for (const rule of rules) {
          const matches = Array.from(input.code.matchAll(rule.pattern));
          for (const match of matches) {
            const line = getLineNumber(input.code, match.index);
            issues.push({
              type: category as any,
              severity: rule.severity as any,
              file: 'workflow.js',
              line,
              column: match.index - getLineStart(input.code, match.index),
              message: rule.message,
              fix: getAutoFix(rule, match[0])
            });
          }
        }
      }

      // Generate code suggestions
      const codeLength = input.code.length;
      if (codeLength > 5000) {
        suggestions.push({
          type: 'refactor' as const,
          description: 'Consider breaking down large functions into smaller modules',
          impact: 'medium' as const,
          effort: 'moderate' as const
        });
      }

      if (!input.code.includes('TypeScript') && input.language === 'javascript') {
        suggestions.push({
          type: 'modernize' as const,
          description: 'Consider migrating to TypeScript for better type safety',
          impact: 'high' as const,
          effort: 'significant' as const
        });
      }

      if (input.code.includes('function(') && !input.code.includes('=>')) {
        suggestions.push({
          type: 'modernize' as const,
          description: 'Use arrow functions for better readability',
          impact: 'low' as const,
          effort: 'minimal' as const
        });
      }

      const totalIssues = issues.length;
      const criticalIssues = issues.filter(i => i.severity === 'critical').length;
      const errorIssues = issues.filter(i => i.severity === 'error').length;
      
      // Calculate score based on issues
      let score = 100;
      score -= criticalIssues * 20;
      score -= errorIssues * 10;
      score -= (totalIssues - criticalIssues - errorIssues) * 5;
      score = Math.max(0, score);

      const result: QualityValidation['codeReview'] = {
        score,
        issues,
        suggestions
      };

      return {
        success: criticalIssues === 0,
        data: result,
        warnings: totalIssues > 0 ? [`Found ${totalIssues} code quality issues`] : undefined,
        suggestions: [
          ...suggestions.map(s => s.description),
          ...(criticalIssues > 0 ? ['Fix critical security issues immediately'] : [])
        ]
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to review code: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
};

export const analyzePerformanceTool: Tool = {
  name: 'analyze_performance',
  description: 'Analyze code for performance bottlenecks and optimization opportunities',
  parameters: [
    {
      name: 'code',
      type: 'string',
      description: 'The code to analyze for performance',
      required: true,
      schema: z.string()
    },
    {
      name: 'context',
      type: 'string',
      description: 'Context about the code usage (web, server, etc.)',
      required: false,
      schema: z.string().optional()
    }
  ],
  execute: async (input: { code: string; context?: string }, context?: AgentContext): Promise<ToolResult> => {
    try {
      const optimizations = [];

      // Check for performance patterns
      for (const pattern of PERFORMANCE_PATTERNS) {
        const matches = Array.from(input.code.matchAll(pattern.pattern));
        if (matches.length > 0) {
          optimizations.push({
            type: pattern.type as any,
            description: pattern.description,
            impact: pattern.impact,
            implementation: pattern.implementation
          });
        }
      }

      // Additional performance checks
      if (input.code.includes('document.querySelector') && (input.code.match(/document\.querySelector/g)?.length || 0) > 5) {
        optimizations.push({
          type: 'rendering' as const,
          description: 'Multiple DOM queries detected',
          impact: 'Cache DOM elements to avoid repeated queries',
          implementation: 'Store DOM references in variables'
        });
      }

      if (input.code.includes('JSON.parse') && input.code.includes('JSON.stringify')) {
        optimizations.push({
          type: 'cpu' as const,
          description: 'JSON serialization/deserialization detected',
          impact: 'CPU intensive operations',
          implementation: 'Consider using structured cloning or object references'
        });
      }

      // Calculate performance score
      let score = 100;
      const highImpactOptimizations = optimizations.filter(o => 
        o.impact.includes('High') || o.impact.includes('O(n²)')
      ).length;
      
      score -= highImpactOptimizations * 25;
      score -= (optimizations.length - highImpactOptimizations) * 10;
      score = Math.max(0, score);

      const result: QualityValidation['performance'] = {
        score,
        optimizations
      };

      return {
        success: optimizations.length === 0,
        data: result,
        warnings: optimizations.length > 0 ? [`Found ${optimizations.length} performance opportunities`] : undefined,
        suggestions: optimizations.slice(0, 3).map(o => o.implementation)
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to analyze performance: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
};

export const generateTestRecommendationsTool: Tool = {
  name: 'generate_test_recommendations',
  description: 'Generate testing recommendations based on code analysis',
  parameters: [
    {
      name: 'code',
      type: 'string',
      description: 'The code to generate test recommendations for',
      required: true,
      schema: z.string()
    },
    {
      name: 'workflowType',
      type: 'string',
      description: 'Type of workflow (form, api, integration, etc.)',
      required: true,
      schema: z.string()
    }
  ],
  execute: async (input: { code: string; workflowType: string }, context?: AgentContext): Promise<ToolResult> => {
    try {
      const recommendations = [];

      // Analyze code for testable components
      const hasFunctions = /function\s+\w+|const\s+\w+\s*=\s*\(/g.test(input.code);
      const hasAPICallS = /fetch\s*\(|axios\.|http\./g.test(input.code);
      const hasFormHandling = /req\.body|formData|input/g.test(input.code);
      const hasValidation = /validate|schema|joi|zod/g.test(input.code);
      const hasAsyncOperations = /async|await|Promise/g.test(input.code);

      if (hasFunctions) {
        recommendations.push({
          type: 'unit' as const,
          description: 'Test individual functions with various input scenarios',
          priority: 'high' as const,
          template: `
describe('Function Tests', () => {
  it('should handle valid input', () => {
    // Test with valid data
  });
  
  it('should handle edge cases', () => {
    // Test with edge cases
  });
});`
        });
      }

      if (hasAPICallS) {
        recommendations.push({
          type: 'integration' as const,
          description: 'Test API integrations with mock responses',
          priority: 'high' as const,
          template: `
describe('API Integration Tests', () => {
  beforeEach(() => {
    // Mock API responses
  });
  
  it('should handle successful API calls', () => {
    // Test success scenarios
  });
  
  it('should handle API errors gracefully', () => {
    // Test error scenarios
  });
});`
        });
      }

      if (hasFormHandling) {
        recommendations.push({
          type: 'e2e' as const,
          description: 'Test complete form submission workflow',
          priority: 'medium' as const,
          template: `
describe('Form Workflow E2E', () => {
  it('should complete form submission successfully', () => {
    // Fill form, submit, verify result
  });
});`
        });
      }

      if (hasValidation) {
        recommendations.push({
          type: 'unit' as const,
          description: 'Test validation logic with valid and invalid inputs',
          priority: 'high' as const,
          template: `
describe('Validation Tests', () => {
  it('should accept valid data', () => {
    // Test validation with valid data
  });
  
  it('should reject invalid data', () => {
    // Test validation with invalid data
  });
});`
        });
      }

      if (hasAsyncOperations) {
        recommendations.push({
          type: 'performance' as const,
          description: 'Test async operations for timing and memory usage',
          priority: 'medium' as const,
          template: `
describe('Performance Tests', () => {
  it('should complete operations within time limits', async () => {
    const start = Date.now();
    await performOperation();
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(1000);
  });
});`
        });
      }

      // Workflow-specific recommendations
      const workflowSpecificRecommendations = getWorkflowSpecificTests(input.workflowType);
      recommendations.push(...workflowSpecificRecommendations);

      // Calculate coverage estimate
      const codeLines = input.code.split('\n').filter(line => line.trim()).length;
      const testableLines = Math.max(1, codeLines - input.code.split('\n').filter(line => 
        line.trim().startsWith('//') || line.trim().startsWith('/*') || line.trim() === ''
      ).length);
      
      const coverage = Math.min(90, recommendations.length * 15); // Rough estimate

      const result: QualityValidation['testing'] = {
        coverage,
        recommendations
      };

      return {
        success: true,
        data: result,
        suggestions: recommendations.slice(0, 3).map(r => r.description)
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to generate test recommendations: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
};

export const checkBestPracticesTool: Tool = {
  name: 'check_best_practices',
  description: 'Check code against established best practices and coding standards',
  parameters: [
    {
      name: 'code',
      type: 'string',
      description: 'The code to check against best practices',
      required: true,
      schema: z.string()
    },
    {
      name: 'language',
      type: 'string',
      description: 'Programming language',
      required: true,
      schema: z.string()
    }
  ],
  execute: async (input: { code: string; language: string }, context?: AgentContext): Promise<ToolResult> => {
    try {
      const violations = [];
      let totalPractices = BEST_PRACTICES.length;
      let followedPractices = 0;

      for (const practice of BEST_PRACTICES) {
        const follows = practice.check(input.code);
        if (follows) {
          followedPractices++;
        } else {
          violations.push({
            practice: practice.name,
            description: practice.description,
            recommendation: practice.recommendation,
            severity: 'minor' as const
          });
        }
      }

      // Additional language-specific checks
      if (input.language === 'javascript' || input.language === 'typescript') {
        if (!input.code.includes('strict')) {
          violations.push({
            practice: 'Strict Mode',
            description: 'Use strict mode for better error detection',
            recommendation: 'Add "use strict"; at the top of files',
            severity: 'minor' as const
          });
          totalPractices++;
        } else {
          followedPractices++;
        }
      }

      const score = Math.round((followedPractices / totalPractices) * 100);

      const result: QualityValidation['bestPractices'] = {
        score,
        violations
      };

      return {
        success: violations.length === 0,
        data: result,
        warnings: violations.length > 0 ? [`${violations.length} best practice violations found`] : undefined,
        suggestions: violations.slice(0, 3).map(v => v.recommendation)
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to check best practices: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
};

// Helper Functions

function getLineNumber(code: string, index: number): number {
  return code.substring(0, index).split('\n').length;
}

function getLineStart(code: string, index: number): number {
  const beforeIndex = code.substring(0, index);
  const lastNewline = beforeIndex.lastIndexOf('\n');
  return lastNewline === -1 ? 0 : lastNewline + 1;
}

function getAutoFix(rule: any, match: string): string | undefined {
  if (match.includes('console.log')) return 'Remove console.log statement';
  if (match.includes('var ')) return 'Replace var with const or let';
  if (match.includes('==')) return 'Replace == with ===';
  if (match.includes('debugger')) return 'Remove debugger statement';
  return undefined;
}

function getWorkflowSpecificTests(workflowType: string) {
  const recommendations = [];

  switch (workflowType) {
    case 'form':
      recommendations.push({
        type: 'e2e' as const,
        description: 'Test form validation and submission flow',
        priority: 'high' as const,
        template: 'Test all form fields, validation rules, and submission handling'
      });
      break;

    case 'api':
      recommendations.push({
        type: 'integration' as const,
        description: 'Test all API endpoints with various payloads',
        priority: 'high' as const,
        template: 'Test CRUD operations, error handling, and authentication'
      });
      break;

    case 'integration':
      recommendations.push({
        type: 'integration' as const,
        description: 'Test external service integrations',
        priority: 'high' as const,
        template: 'Mock external services and test error scenarios'
      });
      break;

    case 'dashboard':
      recommendations.push({
        type: 'performance' as const,
        description: 'Test data loading and rendering performance',
        priority: 'medium' as const,
        template: 'Test with large datasets and measure render times'
      });
      break;
  }

  return recommendations;
}

// Export all quality tools
export const qualityTools: Tool[] = [
  reviewCodeTool,
  analyzePerformanceTool,
  generateTestRecommendationsTool,
  checkBestPracticesTool
];