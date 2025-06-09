/**
 * Multi-Agent Coordination Test Suite
 * Tests the complete multi-agent workflow coordination system
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  agentOrchestrator,
  agentRegistry,
  processWorkflowWithAgents,
  buildWorkflowWithAgents,
  validateWorkflowRealTime,
  getIntegrationSuggestions,
  performSecurityScan
} from '../index';
import type { AgentContext, OrchestrationRequest } from '../types';

// Mock Anthropic AI SDK
vi.mock('@ai-sdk/anthropic', () => ({
  anthropic: vi.fn(() => ({
    // Mock model instance
  }))
}));

// Mock AI SDK generateText function
vi.mock('ai', () => ({
  generateText: vi.fn(async ({ messages }) => {
    const userMessage = messages[messages.length - 1]?.content || '';
    
    // Simulate different responses based on message content
    if (userMessage.includes('security')) {
      return {
        text: 'Security analysis complete. Found 2 potential vulnerabilities in the workflow code. Recommend updating dependencies and adding input validation.',
        usage: { totalTokens: 150 },
        toolCalls: [
          {
            toolName: 'validate_package_security',
            args: { packages: [{ name: 'express', version: '4.17.1' }] }
          }
        ]
      };
    }
    
    if (userMessage.includes('design')) {
      return {
        text: 'Design validation complete. UI components follow brand guidelines with 85% compliance. Minor spacing issues detected.',
        usage: { totalTokens: 120 },
        toolCalls: [
          {
            toolName: 'validate_brand_compliance',
            args: { uiComponents: [{ type: 'button', styles: { color: '#007bff' } }] }
          }
        ]
      };
    }
    
    if (userMessage.includes('integration')) {
      return {
        text: 'Integration analysis complete. Suggested Salesforce and Slack integrations based on workflow requirements.',
        usage: { totalTokens: 100 },
        toolCalls: [
          {
            toolName: 'suggest_integrations',
            args: { workflowDescription: userMessage }
          }
        ]
      };
    }
    
    if (userMessage.includes('quality')) {
      return {
        text: 'Code quality analysis complete. Overall score: 78%. Found 3 optimization opportunities and recommended adding unit tests.',
        usage: { totalTokens: 130 },
        toolCalls: [
          {
            toolName: 'review_code',
            args: { code: 'mock code', language: 'javascript' }
          }
        ]
      };
    }
    
    // Default orchestration response
    return {
      text: `I'll coordinate multiple agents to build your workflow. Based on your request, I'll involve the Security, Design, Integration, and Quality agents to ensure comprehensive analysis.`,
      usage: { totalTokens: 80 }
    };
  })
}));

describe('Multi-Agent Coordination System', () => {
  let mockContext: AgentContext;

  beforeEach(() => {
    mockContext = {
      organizationId: 'org-123',
      userId: 'user-456',
      userRole: 'builder',
      permissions: ['workflow.create', 'workflow.edit'],
      sessionId: 'session-789',
      conversationHistory: []
    };
  });

  describe('Agent Registry', () => {
    it('should initialize all required agents', () => {
      const agents = agentRegistry.getAllAgents();
      
      expect(agents).toHaveLength(5);
      expect(agents.map(a => a.role)).toEqual(
        expect.arrayContaining(['orchestration', 'security', 'design', 'integration', 'quality'])
      );
    });

    it('should provide agent capabilities', () => {
      const capabilities = agentRegistry.getAgentsCapabilities();
      
      expect(capabilities.security).toContain('Package vulnerability scanning');
      expect(capabilities.design).toContain('Brand compliance validation');
      expect(capabilities.integration).toContain('Connection validation');
      expect(capabilities.quality).toContain('Code review and bug detection');
    });

    it('should retrieve agents by role', () => {
      const securityAgent = agentRegistry.getAgentByRole('security');
      const orchestrationAgent = agentRegistry.getOrchestrationAgent();
      
      expect(securityAgent?.role).toBe('security');
      expect(orchestrationAgent.role).toBe('orchestration');
    });
  });

  describe('Agent Orchestrator', () => {
    it('should process workflow request with multiple agents', async () => {
      const request: OrchestrationRequest = {
        userMessage: 'Create a customer onboarding workflow with Salesforce integration',
        context: mockContext,
        priority: 'medium',
        timeout: 30000
      };

      const response = await agentOrchestrator.processRequest(request);

      expect(response.success).toBe(true);
      expect(response.responses.length).toBeGreaterThan(1);
      expect(response.finalOutput).toContain('coordinate multiple agents');
      expect(response.executionTime).toBeGreaterThan(0);
    });

    it('should handle agent execution errors gracefully', async () => {
      const request: OrchestrationRequest = {
        userMessage: 'Create an invalid workflow',
        context: { ...mockContext, permissions: [] }, // No permissions
        priority: 'high'
      };

      const response = await agentOrchestrator.processRequest(request);

      // Should still return a response even with errors
      expect(response).toBeDefined();
      expect(response.executionTime).toBeGreaterThan(0);
    });

    it('should track agent statuses during execution', () => {
      const statuses = agentOrchestrator.getAgentStatuses();
      
      expect(statuses).toBeDefined();
      expect(Object.keys(statuses).length).toBeGreaterThan(0);
    });
  });

  describe('Workflow Building with Agents', () => {
    it('should build workflow with security and quality validation', async () => {
      const result = await buildWorkflowWithAgents(
        'Create a form submission workflow with email notifications',
        mockContext,
        {
          includeSecurityScan: true,
          includeQualityReview: true,
          includeDesignValidation: false,
          includeIntegrationCheck: false
        }
      );

      expect(result.success).toBe(true);
      expect(result.validationResults).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(result.executionTime).toBeGreaterThan(0);
    });

    it('should categorize validation results by agent type', async () => {
      const result = await buildWorkflowWithAgents(
        'Create a comprehensive workflow with all validations',
        mockContext,
        {
          includeSecurityScan: true,
          includeQualityReview: true,
          includeDesignValidation: true,
          includeIntegrationCheck: true
        }
      );

      expect(result.securityIssues).toBeDefined();
      expect(result.designIssues).toBeDefined();
      expect(result.integrationIssues).toBeDefined();
      expect(result.qualityIssues).toBeDefined();
    });
  });

  describe('Real-time Validation', () => {
    it('should validate workflow data in real-time', async () => {
      const workflowData = {
        code: 'const express = require("express"); const app = express();',
        components: [{ type: 'form', props: { action: '/submit' } }],
        integrations: ['salesforce', 'slack'],
        uiElements: [{ type: 'button', styles: { color: '#007bff' } }]
      };

      const result = await validateWorkflowRealTime(
        workflowData,
        mockContext,
        'all'
      );

      expect(result.isValid).toBeDefined();
      expect(result.issues).toBeDefined();
      expect(result.suggestions).toBeDefined();
      expect(result.executionTime).toBeGreaterThan(0);
    });

    it('should validate specific agent types', async () => {
      const workflowData = {
        code: 'console.log("test");'
      };

      const securityResult = await validateWorkflowRealTime(
        workflowData,
        mockContext,
        'security'
      );

      const qualityResult = await validateWorkflowRealTime(
        workflowData,
        mockContext,
        'quality'
      );

      expect(securityResult.issues).toBeDefined();
      expect(qualityResult.issues).toBeDefined();
    });
  });

  describe('Integration Suggestions', () => {
    it('should suggest appropriate integrations', async () => {
      const result = await getIntegrationSuggestions(
        'Create a CRM workflow for managing customer contacts and sending emails',
        mockContext
      );

      expect(result.suggestions).toBeDefined();
      expect(result.executionTime).toBeGreaterThan(0);
      
      // Should suggest CRM and email integrations
      const suggestionNames = result.suggestions.map(s => s.name.toLowerCase());
      expect(suggestionNames.some(name => name.includes('salesforce') || name.includes('crm'))).toBe(true);
    });
  });

  describe('Security Scanning', () => {
    it('should perform comprehensive security scan', async () => {
      const workflowCode = `
        const express = require('express');
        const app = express();
        app.get('/', (req, res) => {
          console.log(req.query.input);
          res.send('Hello');
        });
      `;

      const packages = [
        { name: 'express', version: '4.17.1' },
        { name: 'lodash', version: '4.17.15' }
      ];

      const result = await performSecurityScan(
        workflowCode,
        packages,
        mockContext
      );

      expect(result.securityScore).toBeGreaterThanOrEqual(0);
      expect(result.securityScore).toBeLessThanOrEqual(100);
      expect(result.vulnerabilities).toBeDefined();
      expect(result.complianceIssues).toBeDefined();
      expect(result.secrets).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(result.executionTime).toBeGreaterThan(0);
    });
  });

  describe('Agent Tool Integration', () => {
    it('should execute security tools correctly', async () => {
      const securityAgent = agentRegistry.getAgentByRole('security');
      expect(securityAgent).toBeDefined();
      
      const validatePackageTool = securityAgent!.tools.find(t => t.name === 'validate_package_security');
      expect(validatePackageTool).toBeDefined();

      const result = await validatePackageTool!.execute(
        { packages: [{ name: 'express', version: '4.17.1' }] },
        mockContext
      );

      expect(result.success).toBeDefined();
      expect(result.data).toBeDefined();
    });

    it('should execute design tools correctly', async () => {
      const designAgent = agentRegistry.getAgentByRole('design');
      expect(designAgent).toBeDefined();

      const brandComplianceTool = designAgent!.tools.find(t => t.name === 'validate_brand_compliance');
      expect(brandComplianceTool).toBeDefined();

      const result = await brandComplianceTool!.execute(
        { 
          uiComponents: [
            { type: 'button', styles: { backgroundColor: '#007bff', color: 'white' } }
          ]
        },
        mockContext
      );

      expect(result.success).toBeDefined();
      expect(result.data).toBeDefined();
    });

    it('should execute integration tools correctly', async () => {
      const integrationAgent = agentRegistry.getAgentByRole('integration');
      expect(integrationAgent).toBeDefined();

      const suggestTool = integrationAgent!.tools.find(t => t.name === 'suggest_integrations');
      expect(suggestTool).toBeDefined();

      const result = await suggestTool!.execute(
        { workflowDescription: 'Customer onboarding with CRM integration' },
        mockContext
      );

      expect(result.success).toBeDefined();
      expect(result.data).toBeDefined();
    });

    it('should execute quality tools correctly', async () => {
      const qualityAgent = agentRegistry.getAgentByRole('quality');
      expect(qualityAgent).toBeDefined();

      const reviewTool = qualityAgent!.tools.find(t => t.name === 'review_code');
      expect(reviewTool).toBeDefined();

      const result = await reviewTool!.execute(
        { 
          code: 'function test() { console.log("test"); }',
          language: 'javascript'
        },
        mockContext
      );

      expect(result.success).toBeDefined();
      expect(result.data).toBeDefined();
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle missing authentication gracefully', async () => {
      const invalidContext = { ...mockContext, userId: '' };
      
      const result = await processWorkflowWithAgents(
        'Test workflow',
        invalidContext
      );

      expect(result).toBeDefined();
      // Should handle the error gracefully
    });

    it('should handle agent failures without breaking orchestration', async () => {
      // Test with invalid tool parameters
      const request: OrchestrationRequest = {
        userMessage: 'Create workflow with invalid parameters',
        context: mockContext
      };

      const response = await agentOrchestrator.processRequest(request);
      
      // Should still return a response
      expect(response).toBeDefined();
      expect(response.executionTime).toBeGreaterThan(0);
    });
  });

  describe('Performance and Metrics', () => {
    it('should track execution metrics', async () => {
      await processWorkflowWithAgents(
        'Test workflow for metrics',
        mockContext
      );

      const metrics = agentOrchestrator.getExecutionMetrics();
      expect(Object.keys(metrics).length).toBeGreaterThan(0);
      
      // Check that metrics have proper structure
      Object.values(metrics).forEach(metric => {
        expect(metric.executionTime).toBeGreaterThan(0);
        expect(typeof metric.isComplete).toBe('boolean');
      });
    });

    it('should handle concurrent requests', async () => {
      const requests = [
        processWorkflowWithAgents('Workflow 1', mockContext),
        processWorkflowWithAgents('Workflow 2', mockContext),
        processWorkflowWithAgents('Workflow 3', mockContext)
      ];

      const results = await Promise.all(requests);
      
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.success).toBeDefined();
        expect(result.executionTime).toBeGreaterThan(0);
      });
    });
  });
});

// Helper function to run integration tests (commented out for regular test runs)
/*
describe.skip('Integration Tests (requires API access)', () => {
  it('should work with real API endpoints', async () => {
    // These tests would require actual API access and authentication
    // Uncomment and configure when ready for integration testing
  });
});
*/