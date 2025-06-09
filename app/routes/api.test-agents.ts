/**
 * Agent Testing API Route
 * Provides endpoints for testing multi-agent coordination in development
 */

import { type ActionFunctionArgs, json } from '@remix-run/cloudflare';
import { 
  agentRegistry,
  agentOrchestrator,
  processWorkflowWithAgents,
  buildWorkflowWithAgents,
  getIntegrationSuggestions,
  performSecurityScan,
  type AgentRole,
  type AgentContext
} from '~/lib/agents';

export async function action({ context, request }: ActionFunctionArgs) {
  try {
    const { testType, payload } = await request.json();

    // Mock user context for testing
    const mockContext: AgentContext = {
      organizationId: 'test-org-123',
      userId: 'test-user-456',
      userRole: 'builder',
      permissions: ['workflow.create', 'workflow.edit', 'workflow.execute'],
      sessionId: `test-session-${Date.now()}`,
      conversationHistory: []
    };

    switch (testType) {
      case 'agent_registry':
        return handleAgentRegistryTest();
      
      case 'single_agent':
        return handleSingleAgentTest(payload, mockContext);
      
      case 'orchestration':
        return handleOrchestrationTest(payload, mockContext);
      
      case 'workflow_building':
        return handleWorkflowBuildingTest(payload, mockContext);
      
      case 'real_time_validation':
        return handleRealTimeValidationTest(payload, mockContext);
      
      case 'integration_suggestions':
        return handleIntegrationSuggestionsTest(payload, mockContext);
      
      case 'security_scan':
        return handleSecurityScanTest(payload, mockContext);
      
      case 'performance_test':
        return handlePerformanceTest(payload, mockContext);
      
      case 'error_handling':
        return handleErrorHandlingTest(payload, mockContext);
      
      default:
        return json({ error: 'Unknown test type' }, { status: 400 });
    }

  } catch (error) {
    console.error('Agent test error:', error);
    return json({ 
      error: 'Test execution failed',
      details: error.message 
    }, { status: 500 });
  }
}

/**
 * Test agent registry functionality
 */
async function handleAgentRegistryTest() {
  const startTime = Date.now();

  try {
    const allAgents = agentRegistry.getAllAgents();
    const specializedAgents = agentRegistry.getSpecializedAgents();
    const orchestrationAgent = agentRegistry.getOrchestrationAgent();
    const capabilities = agentRegistry.getAgentsCapabilities();

    const results = {
      totalAgents: allAgents.length,
      specializedAgents: specializedAgents.length,
      agentRoles: allAgents.map(a => a.role),
      orchestrationAgent: orchestrationAgent.id,
      capabilities: Object.keys(capabilities),
      agentDetails: allAgents.map(agent => ({
        id: agent.id,
        role: agent.role,
        name: agent.name,
        toolCount: agent.tools.length,
        capabilities: agent.capabilities.length,
        status: agent.status
      }))
    };

    return json({
      success: true,
      testType: 'agent_registry',
      results,
      executionTime: Date.now() - startTime
    });

  } catch (error) {
    return json({
      success: false,
      error: error.message,
      executionTime: Date.now() - startTime
    });
  }
}

/**
 * Test individual agent execution
 */
async function handleSingleAgentTest(payload: { agentRole: AgentRole; toolName?: string; toolParams?: any }, mockContext: AgentContext) {
  const startTime = Date.now();

  try {
    const agent = agentRegistry.getAgentByRole(payload.agentRole);
    if (!agent) {
      throw new Error(`Agent not found: ${payload.agentRole}`);
    }

    let toolResult = null;
    if (payload.toolName) {
      const tool = agent.tools.find(t => t.name === payload.toolName);
      if (!tool) {
        throw new Error(`Tool not found: ${payload.toolName}`);
      }

      toolResult = await tool.execute(payload.toolParams || {}, mockContext);
    }

    const results = {
      agent: {
        id: agent.id,
        role: agent.role,
        name: agent.name,
        status: agent.status,
        toolCount: agent.tools.length
      },
      toolResult: toolResult ? {
        success: toolResult.success,
        hasData: !!toolResult.data,
        hasWarnings: !!(toolResult.warnings && toolResult.warnings.length > 0),
        hasSuggestions: !!(toolResult.suggestions && toolResult.suggestions.length > 0),
        error: toolResult.error
      } : null
    };

    return json({
      success: true,
      testType: 'single_agent',
      results,
      executionTime: Date.now() - startTime
    });

  } catch (error) {
    return json({
      success: false,
      error: error.message,
      executionTime: Date.now() - startTime
    });
  }
}

/**
 * Test orchestration system
 */
async function handleOrchestrationTest(payload: { message: string; requiredAgents?: AgentRole[] }, mockContext: AgentContext) {
  const startTime = Date.now();

  try {
    const result = await processWorkflowWithAgents(payload.message, {
      organizationId: mockContext.organizationId,
      userId: mockContext.userId,
      userRole: mockContext.userRole,
      permissions: mockContext.permissions,
      sessionId: mockContext.sessionId
    });

    const results = {
      orchestrationSuccess: result.success,
      responseCount: result.responses?.length || 0,
      agentResponses: result.responses?.map(r => ({
        agentRole: r.agentRole,
        hasContent: !!r.content,
        toolCallCount: r.toolCalls?.length || 0,
        confidence: r.confidence,
        executionTime: r.metadata?.executionTime
      })) || [],
      validationResultCount: result.validationResults?.length || 0,
      suggestionCount: result.suggestions?.length || 0,
      hasWorkflowCode: !!result.workflowCode,
      hasErrors: !!(result.errors && result.errors.length > 0)
    };

    return json({
      success: true,
      testType: 'orchestration',
      results,
      executionTime: Date.now() - startTime
    });

  } catch (error) {
    return json({
      success: false,
      error: error.message,
      executionTime: Date.now() - startTime
    });
  }
}

/**
 * Test workflow building functionality
 */
async function handleWorkflowBuildingTest(payload: { description: string; options?: any }, mockContext: AgentContext) {
  const startTime = Date.now();

  try {
    const result = await buildWorkflowWithAgents(
      payload.description,
      {
        organizationId: mockContext.organizationId,
        userId: mockContext.userId,
        userRole: mockContext.userRole,
        permissions: mockContext.permissions,
        sessionId: mockContext.sessionId
      },
      payload.options || {
        includeSecurityScan: true,
        includeDesignValidation: true,
        includeIntegrationCheck: true,
        includeQualityReview: true
      }
    );

    const results = {
      buildSuccess: result.success,
      hasWorkflowCode: !!result.workflowCode,
      validationCounts: {
        total: result.validationResults.length,
        security: result.securityIssues.length,
        design: result.designIssues.length,
        integration: result.integrationIssues.length,
        quality: result.qualityIssues.length
      },
      recommendationCount: result.recommendations.length,
      hasIssues: result.securityIssues.length > 0 || result.designIssues.length > 0 || 
                  result.integrationIssues.length > 0 || result.qualityIssues.length > 0
    };

    return json({
      success: true,
      testType: 'workflow_building',
      results,
      executionTime: Date.now() - startTime
    });

  } catch (error) {
    return json({
      success: false,
      error: error.message,
      executionTime: Date.now() - startTime
    });
  }
}

/**
 * Test real-time validation
 */
async function handleRealTimeValidationTest(payload: { workflowData: any; validationType?: string }, mockContext: AgentContext) {
  const startTime = Date.now();

  try {
    const { validateWorkflowRealTime } = await import('~/lib/agents');
    
    const result = await validateWorkflowRealTime(
      payload.workflowData,
      {
        organizationId: mockContext.organizationId,
        userId: mockContext.userId,
        userRole: mockContext.userRole,
        permissions: mockContext.permissions,
        sessionId: mockContext.sessionId
      },
      payload.validationType as any || 'all'
    );

    const results = {
      isValid: result.isValid,
      issueCount: result.issues.length,
      suggestionCount: result.suggestions.length,
      issuesByType: {
        security: result.issues.filter(i => i.type === 'security').length,
        design: result.issues.filter(i => i.type === 'design').length,
        integration: result.issues.filter(i => i.type === 'integration').length,
        quality: result.issues.filter(i => i.type === 'quality').length
      },
      issuesByStatus: {
        failed: result.issues.filter(i => i.status === 'failed').length,
        warning: result.issues.filter(i => i.status === 'warning').length,
        passed: result.issues.filter(i => i.status === 'passed').length
      }
    };

    return json({
      success: true,
      testType: 'real_time_validation',
      results,
      executionTime: Date.now() - startTime
    });

  } catch (error) {
    return json({
      success: false,
      error: error.message,
      executionTime: Date.now() - startTime
    });
  }
}

/**
 * Test integration suggestions
 */
async function handleIntegrationSuggestionsTest(payload: { workflowDescription: string }, mockContext: AgentContext) {
  const startTime = Date.now();

  try {
    const result = await getIntegrationSuggestions(
      payload.workflowDescription,
      {
        organizationId: mockContext.organizationId,
        userId: mockContext.userId,
        userRole: mockContext.userRole,
        permissions: mockContext.permissions,
        sessionId: mockContext.sessionId
      }
    );

    const results = {
      suggestionCount: result.suggestions.length,
      categories: [...new Set(result.suggestions.map(s => s.category))],
      topSuggestions: result.suggestions.slice(0, 3).map(s => ({
        name: s.name,
        category: s.category,
        score: s.score,
        reasonCount: s.reasons.length
      }))
    };

    return json({
      success: true,
      testType: 'integration_suggestions',
      results,
      executionTime: Date.now() - startTime
    });

  } catch (error) {
    return json({
      success: false,
      error: error.message,
      executionTime: Date.now() - startTime
    });
  }
}

/**
 * Test security scanning
 */
async function handleSecurityScanTest(payload: { workflowCode: string; packages?: any[] }, mockContext: AgentContext) {
  const startTime = Date.now();

  try {
    const packages = payload.packages || [
      { name: 'express', version: '4.17.1' },
      { name: 'lodash', version: '4.17.15' }
    ];

    const result = await performSecurityScan(
      payload.workflowCode,
      packages,
      {
        organizationId: mockContext.organizationId,
        userId: mockContext.userId,
        userRole: mockContext.userRole,
        permissions: mockContext.permissions,
        sessionId: mockContext.sessionId
      }
    );

    const results = {
      securityScore: result.securityScore,
      vulnerabilityCount: result.vulnerabilities.length,
      complianceIssueCount: result.complianceIssues.length,
      secretCount: result.secrets.length,
      recommendationCount: result.recommendations.length,
      scoreCategory: result.securityScore >= 90 ? 'excellent' : 
                   result.securityScore >= 70 ? 'good' : 
                   result.securityScore >= 50 ? 'fair' : 'poor'
    };

    return json({
      success: true,
      testType: 'security_scan',
      results,
      executionTime: Date.now() - startTime
    });

  } catch (error) {
    return json({
      success: false,
      error: error.message,
      executionTime: Date.now() - startTime
    });
  }
}

/**
 * Test system performance
 */
async function handlePerformanceTest(payload: { iterations?: number; concurrency?: number }, mockContext: AgentContext) {
  const startTime = Date.now();

  try {
    const iterations = payload.iterations || 5;
    const concurrency = payload.concurrency || 3;

    // Sequential test
    const sequentialTimes: number[] = [];
    for (let i = 0; i < iterations; i++) {
      const iterationStart = Date.now();
      await processWorkflowWithAgents(`Test workflow ${i}`, {
        organizationId: mockContext.organizationId,
        userId: mockContext.userId,
        userRole: mockContext.userRole,
        permissions: mockContext.permissions,
        sessionId: `${mockContext.sessionId}-seq-${i}`
      });
      sequentialTimes.push(Date.now() - iterationStart);
    }

    // Concurrent test
    const concurrentStart = Date.now();
    const concurrentPromises = Array.from({ length: concurrency }, (_, i) => 
      processWorkflowWithAgents(`Concurrent test ${i}`, {
        organizationId: mockContext.organizationId,
        userId: mockContext.userId,
        userRole: mockContext.userRole,
        permissions: mockContext.permissions,
        sessionId: `${mockContext.sessionId}-conc-${i}`
      })
    );
    await Promise.all(concurrentPromises);
    const concurrentTotalTime = Date.now() - concurrentStart;

    const results = {
      sequential: {
        iterations,
        times: sequentialTimes,
        averageTime: sequentialTimes.reduce((a, b) => a + b, 0) / sequentialTimes.length,
        minTime: Math.min(...sequentialTimes),
        maxTime: Math.max(...sequentialTimes)
      },
      concurrent: {
        concurrency,
        totalTime: concurrentTotalTime,
        averageTimePerRequest: concurrentTotalTime / concurrency
      }
    };

    return json({
      success: true,
      testType: 'performance_test',
      results,
      executionTime: Date.now() - startTime
    });

  } catch (error) {
    return json({
      success: false,
      error: error.message,
      executionTime: Date.now() - startTime
    });
  }
}

/**
 * Test error handling
 */
async function handleErrorHandlingTest(payload: { errorType: string }, mockContext: AgentContext) {
  const startTime = Date.now();

  try {
    let result: any;
    let expectedError = false;

    switch (payload.errorType) {
      case 'invalid_context':
        expectedError = true;
        result = await processWorkflowWithAgents('Test', {
          organizationId: '',
          userId: '',
          userRole: 'invalid',
          permissions: [],
          sessionId: ''
        });
        break;

      case 'invalid_message':
        result = await processWorkflowWithAgents('', mockContext);
        break;

      case 'missing_permissions':
        result = await processWorkflowWithAgents('Create admin workflow', {
          ...mockContext,
          permissions: []
        });
        break;

      case 'malformed_data':
        const { validateWorkflowRealTime } = await import('~/lib/agents');
        result = await validateWorkflowRealTime(
          { invalidData: true } as any,
          mockContext,
          'all'
        );
        break;

      default:
        throw new Error('Unknown error type');
    }

    const results = {
      errorType: payload.errorType,
      expectedError,
      actualResult: {
        hasResult: !!result,
        success: result?.success,
        hasError: !!result?.error || !!result?.errors,
        errorMessage: result?.error || (result?.errors && result.errors[0])
      }
    };

    return json({
      success: true,
      testType: 'error_handling',
      results,
      executionTime: Date.now() - startTime
    });

  } catch (error) {
    return json({
      success: true, // Expected for error handling tests
      testType: 'error_handling',
      results: {
        errorType: payload.errorType,
        caughtError: true,
        errorMessage: error.message
      },
      executionTime: Date.now() - startTime
    });
  }
}

export async function loader() {
  return json({
    message: 'Agent testing API. Use POST requests with testType parameter.',
    availableTests: [
      'agent_registry',
      'single_agent',
      'orchestration',
      'workflow_building',
      'real_time_validation',
      'integration_suggestions',
      'security_scan',
      'performance_test',
      'error_handling'
    ]
  });
}