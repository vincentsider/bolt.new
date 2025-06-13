/**
 * Multi-Agent Chat API Route
 * Handles workflow requests using coordinated multi-agent system
 */

import { type ActionFunctionArgs, json } from '@remix-run/cloudflare';
import { 
  processWorkflowWithAgents, 
  buildWorkflowWithAgents,
  validateWorkflowRealTime,
  getIntegrationSuggestions,
  performSecurityScan,
  type AgentRole 
} from '~/lib/agents';
import { getAgentOrchestrator } from '~/lib/agents/core/orchestrator';
import { supabase } from '~/lib/supabase';
import { getAPIKey } from '~/lib/.server/llm/api-key';

export async function action({ context, request }: ActionFunctionArgs) {
  try {
    console.log('Multi-agent API called');
    
    // Use the same approach as the default chat
    const env = context.cloudflare?.env || {} as any;
    const apiKey = getAPIKey(env);
    
    console.log('API Key check:', {
      hasCloudflareEnv: !!context.cloudflare?.env,
      hasApiKey: !!apiKey,
      apiKeyLength: apiKey?.length || 0
    });
    
    if (!apiKey) {
      return json({ 
        error: 'Multi-agent system not configured - missing ANTHROPIC_API_KEY',
        details: 'The API key is not available in the environment'
      }, { status: 500 });
    }
    
    // Initialize the orchestrator with explicit API key
    try {
      getAgentOrchestrator(apiKey);
    } catch (orchError) {
      console.error('Failed to initialize orchestrator:', orchError);
      return json({ 
        error: 'Multi-agent system initialization failed',
        details: orchError instanceof Error ? orchError.message : 'Unknown initialization error'
      }, { status: 500 });
    }

    const { action: actionType, approvalMode, maxCost, ...payload } = await request.json();
    
    console.log('Request options:', { approvalMode, maxCost });

    // For now, use mock user context (authentication will be added later)
    const userContext = {
      organizationId: 'default-org',
      userId: 'default-user',
      userRole: 'builder',
      permissions: ['workflow:create', 'workflow:read', 'workflow:update'],
      sessionId: crypto.randomUUID(),
      // Add approval settings
      approvalMode: approvalMode || 'auto',
      maxCost: maxCost || 0.50
    };

    // Route to appropriate handler based on action type
    console.log('Action type:', actionType);
    console.log('Payload:', JSON.stringify(payload).substring(0, 200));
    
    switch (actionType) {
      case 'process_workflow':
        return handleProcessWorkflow(payload, userContext);
      
      case 'build_workflow':
        return handleBuildWorkflow(payload, userContext);
      
      case 'validate_realtime':
        return handleValidateRealtime(payload, userContext);
      
      case 'suggest_integrations':
        return handleSuggestIntegrations(payload, userContext);
      
      case 'security_scan':
        return handleSecurityScan(payload, userContext);
      
      case 'agent_status':
        return handleGetAgentStatus();
      
      default:
        console.error('Unknown action type:', actionType);
        return json({ error: `Unknown action type: ${actionType}` }, { status: 400 });
    }

  } catch (error) {
    console.error('Multi-agent chat error:', error);
    console.error('Error type:', typeof error);
    console.error('Error constructor:', error?.constructor?.name);
    console.error('Error stack:', error?.stack);
    console.error('Error details:', {
      name: error?.name,
      message: error?.message,
      cause: error?.cause,
      toString: error?.toString?.()
    });
    
    // Enhanced error message handling
    let errorMessage = 'Internal server error';
    if (error instanceof Error) {
      errorMessage = error.message || 'An error occurred but no message was provided';
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error && typeof error === 'object') {
      errorMessage = error.toString?.() || JSON.stringify(error) || 'Unknown error object';
    }
    
    return json({ 
      error: errorMessage,
      details: {
        name: error?.name || 'UnknownError',
        message: error?.message || errorMessage,
        stack: error?.stack?.split('\n').slice(0, 3).join('\n'), // First 3 lines of stack
        type: typeof error,
        constructor: error?.constructor?.name
      }
    }, { status: 500 });
  }
}

/**
 * Handle general workflow processing with agents
 */
async function handleProcessWorkflow(
  payload: { message: string; workflowId?: string; approvalMode?: string; maxCost?: number },
  userContext: any
) {
  try {
    console.log('Processing workflow with message:', payload.message);
    console.log('Approval settings:', { approvalMode: payload.approvalMode, maxCost: payload.maxCost });
    
    // For now, we'll implement a simple cost check without real approval
    // In the future, this could be extended to support real-time approval
    const result = await processWorkflowWithAgents(
      payload.message,
      { 
        ...userContext, 
        workflowId: payload.workflowId,
        approvalMode: payload.approvalMode || 'auto',
        maxCost: payload.maxCost || 0.50
      }
    );

    console.log('Workflow processing result:', {
      success: result.success,
      hasResponse: !!result.finalOutput,
      responseCount: result.responses?.length || 0,
      errors: result.errors
    });

    return json({
      success: result.success,
      response: result.finalOutput,
      agentResponses: result.responses,
      validationResults: result.validationResults,
      suggestions: result.suggestions,
      workflowCode: result.workflowCode,
      executionTime: result.executionTime,
      errors: result.errors
    });
  } catch (error) {
    console.error('Error in handleProcessWorkflow:', error);
    console.error('Error stack:', error.stack);
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error in handleProcessWorkflow'
    }, { status: 500 });
  }
}

/**
 * Handle workflow building with specific agent coordination
 */
async function handleBuildWorkflow(
  payload: {
    description: string;
    options?: {
      requiredAgents?: AgentRole[];
      priority?: 'low' | 'medium' | 'high';
      includeDesignValidation?: boolean;
      includeSecurityScan?: boolean;
      includeIntegrationCheck?: boolean;
      includeQualityReview?: boolean;
    };
  },
  userContext: any
) {
  try {
    const result = await buildWorkflowWithAgents(
      payload.description,
      userContext,
      payload.options
    );

    return json({
      success: result.success,
      workflowCode: result.workflowCode,
      validationResults: result.validationResults,
      recommendations: result.recommendations,
      securityIssues: result.securityIssues,
      designIssues: result.designIssues,
      integrationIssues: result.integrationIssues,
      qualityIssues: result.qualityIssues,
      executionTime: result.executionTime
    });
  } catch (error) {
    return json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

/**
 * Handle real-time validation during workflow building
 */
async function handleValidateRealtime(
  payload: {
    workflowData: {
      code?: string;
      components?: any[];
      integrations?: string[];
      uiElements?: any[];
    };
    validationType?: 'security' | 'design' | 'integration' | 'quality' | 'all';
  },
  userContext: any
) {
  try {
    const result = await validateWorkflowRealTime(
      payload.workflowData,
      userContext,
      payload.validationType
    );

    return json({
      isValid: result.isValid,
      issues: result.issues,
      suggestions: result.suggestions,
      executionTime: result.executionTime
    });
  } catch (error) {
    return json({
      isValid: false,
      error: error.message
    }, { status: 500 });
  }
}

/**
 * Handle integration suggestions
 */
async function handleSuggestIntegrations(
  payload: { workflowDescription: string },
  userContext: any
) {
  try {
    const result = await getIntegrationSuggestions(
      payload.workflowDescription,
      userContext
    );

    return json({
      suggestions: result.suggestions,
      executionTime: result.executionTime
    });
  } catch (error) {
    return json({
      suggestions: [],
      error: error.message
    }, { status: 500 });
  }
}

/**
 * Handle security scanning
 */
async function handleSecurityScan(
  payload: {
    workflowCode: string;
    packages: Array<{ name: string; version: string }>;
  },
  userContext: any
) {
  try {
    const result = await performSecurityScan(
      payload.workflowCode,
      payload.packages,
      userContext
    );

    return json({
      securityScore: result.securityScore,
      vulnerabilities: result.vulnerabilities,
      complianceIssues: result.complianceIssues,
      secrets: result.secrets,
      recommendations: result.recommendations,
      executionTime: result.executionTime
    });
  } catch (error) {
    return json({
      securityScore: 0,
      error: error.message
    }, { status: 500 });
  }
}

/**
 * Handle agent status requests
 */
async function handleGetAgentStatus() {
  try {
    const agentsModule = await import('~/lib/agents');
    console.log('Available agent functions:', Object.keys(agentsModule));
    
    return json({
      statuses: agentsModule.getAgentStatuses(),
      metrics: agentsModule.getAgentPerformanceMetrics(),
      capabilities: agentsModule.getAgentCapabilities()
    });
  } catch (error) {
    console.error('Agent status error:', error);
    return json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}