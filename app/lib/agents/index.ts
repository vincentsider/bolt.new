/**
 * Multi-Agent System Entry Point for WorkflowHub
 */

// Type exports (must come first)
export type {
  Agent,
  AgentRole,
  AgentStatus,
  AgentResponse,
  AgentContext,
  OrchestrationRequest,
  OrchestrationResponse,
  Tool,
  ToolResult,
  ToolCall,
  ValidationResult,
  ConversationMessage,
  AgentMetrics,
  SecurityValidation,
  DesignValidation,
  IntegrationValidation,
  QualityValidation
} from './types';

// Local imports for function implementations
import type {
  AgentRole,
  AgentContext,
  OrchestrationRequest,
  OrchestrationResponse,
  ValidationResult
} from './types';
import { getAgentOrchestrator } from './core/orchestrator';
import { agentRegistry } from './core/agents';

// Core exports
export { AgentOrchestrator, getAgentOrchestrator } from './core/orchestrator';
export { AgentRegistry, AgentFactory, agentRegistry } from './core/agents';

// Tool exports
export { securityTools } from './tools/security-tools';
export { designTools } from './tools/design-tools';
export { integrationTools } from './tools/integration-tools';
export { qualityTools } from './tools/quality-tools';

/**
 * Main Multi-Agent Processing Function
 * This is the primary entry point for processing workflow requests with multiple agents
 */
export async function processWorkflowWithAgents(
  userMessage: string,
  context: {
    organizationId: string;
    userId: string;
    userRole: string;
    permissions: string[];
    sessionId: string;
    workflowId?: string;
  }
): Promise<OrchestrationResponse> {
  const agentContext: AgentContext = {
    ...context,
    conversationHistory: [] // Would be populated with actual conversation history
  };

  const request: OrchestrationRequest = {
    userMessage,
    context: agentContext,
    priority: 'medium',
    timeout: 120000 // 2 minutes
  };

  // Get the orchestrator instance (should already be initialized with API key)
  const orchestrator = getAgentOrchestrator();
  return orchestrator.processRequest(request);
}

/**
 * Get Agent Capabilities
 * Returns the capabilities of all available agents
 */
export function getAgentCapabilities(): Record<AgentRole, string[]> {
  return agentRegistry.getAgentsCapabilities();
}

/**
 * Get Agent Statuses
 * Returns current status of all agents
 */
export function getAgentStatuses(): Record<string, { status: string; isActive: boolean }> {
  const orchestrator = getAgentOrchestrator();
  return orchestrator.getAgentStatuses();
}

/**
 * Multi-Agent Workflow Builder
 * Specialized function for building workflows with agent coordination
 */
export async function buildWorkflowWithAgents(
  workflowDescription: string,
  context: {
    organizationId: string;
    userId: string;
    userRole: string;
    permissions: string[];
    sessionId: string;
  },
  options?: {
    requiredAgents?: AgentRole[];
    priority?: 'low' | 'medium' | 'high';
    includeDesignValidation?: boolean;
    includeSecurityScan?: boolean;
    includeIntegrationCheck?: boolean;
    includeQualityReview?: boolean;
  }
): Promise<{
  success: boolean;
  workflowCode?: string;
  validationResults: ValidationResult[];
  recommendations: string[];
  securityIssues: ValidationResult[];
  designIssues: ValidationResult[];
  integrationIssues: ValidationResult[];
  qualityIssues: ValidationResult[];
  executionTime: number;
}> {
  // Determine required agents based on options
  const requiredAgents: AgentRole[] = options?.requiredAgents || [];
  
  if (options?.includeSecurityScan !== false) requiredAgents.push('security');
  if (options?.includeDesignValidation) requiredAgents.push('design');
  if (options?.includeIntegrationCheck) requiredAgents.push('integration');
  if (options?.includeQualityReview !== false) requiredAgents.push('quality');

  // Remove duplicates
  const uniqueAgents = Array.from(new Set(requiredAgents));

  const result = await processWorkflowWithAgents(workflowDescription, context);

  // Categorize validation results by type
  const securityIssues = result.validationResults?.filter(v => v.type === 'security') || [];
  const designIssues = result.validationResults?.filter(v => v.type === 'design') || [];
  const integrationIssues = result.validationResults?.filter(v => v.type === 'integration') || [];
  const qualityIssues = result.validationResults?.filter(v => v.type === 'quality') || [];

  return {
    success: result.success,
    workflowCode: result.workflowCode,
    validationResults: result.validationResults || [],
    recommendations: result.suggestions || [],
    securityIssues,
    designIssues,
    integrationIssues,
    qualityIssues,
    executionTime: result.executionTime
  };
}

/**
 * Real-time Validation Function
 * Validates workflow components in real-time during building
 */
export async function validateWorkflowRealTime(
  workflowData: {
    code?: string;
    components?: any[];
    integrations?: string[];
    uiElements?: any[];
  },
  context: {
    organizationId: string;
    userId: string;
    userRole: string;
    permissions: string[];
    sessionId: string;
  },
  validationType: 'security' | 'design' | 'integration' | 'quality' | 'all' = 'all'
): Promise<{
  isValid: boolean;
  issues: ValidationResult[];
  suggestions: string[];
  executionTime: number;
}> {
  const startTime = Date.now();
  const issues: ValidationResult[] = [];
  const suggestions: string[] = [];

  try {
    // Determine which agents to use for validation
    const agentsToUse: AgentRole[] = [];
    
    if (validationType === 'all') {
      agentsToUse.push('security', 'design', 'integration', 'quality');
    } else {
      agentsToUse.push(validationType);
    }

    // Build validation message
    const validationMessage = `Validate the following workflow data:
${workflowData.code ? `Code: ${workflowData.code.substring(0, 1000)}...` : ''}
${workflowData.components ? `Components: ${JSON.stringify(workflowData.components).substring(0, 500)}...` : ''}
${workflowData.integrations ? `Integrations: ${workflowData.integrations.join(', ')}` : ''}
${workflowData.uiElements ? `UI Elements: ${JSON.stringify(workflowData.uiElements).substring(0, 500)}...` : ''}`;

    const result = await processWorkflowWithAgents(validationMessage, context);

    issues.push(...(result.validationResults || []));
    suggestions.push(...(result.suggestions || []));

    const isValid = !issues.some(issue => issue.status === 'failed');

    return {
      isValid,
      issues,
      suggestions,
      executionTime: Date.now() - startTime
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      isValid: false,
      issues: [{
        agentRole: 'orchestration' as const,
        type: 'quality' as const,
        status: 'failed' as const,
        message: `Validation failed: ${errorMessage}`
      }],
      suggestions: ['Retry validation after fixing the error'],
      executionTime: Date.now() - startTime
    };
  }
}

/**
 * Agent Performance Monitoring
 * Get performance metrics for all agents
 */
export function getAgentPerformanceMetrics(): Record<string, { executionTime: number; isComplete: boolean }> {
  const orchestrator = getAgentOrchestrator();
  return orchestrator.getExecutionMetrics();
}

/**
 * Integration Suggestions
 * Get integration suggestions based on workflow description
 */
export async function getIntegrationSuggestions(
  workflowDescription: string,
  context: {
    organizationId: string;
    userId: string;
    userRole: string;
    permissions: string[];
    sessionId: string;
  }
): Promise<{
  suggestions: Array<{
    integrationId: string;
    name: string;
    category: string;
    score: number;
    reasons: string[];
    requiredScopes: string[];
    availableOperations: string[];
  }>;
  executionTime: number;
}> {
  const startTime = Date.now();

  // Get integration agent
  const integrationAgent = agentRegistry.getAgentByRole('integration');
  if (!integrationAgent) {
    throw new Error('Integration agent not available');
  }

  // Find suggest integrations tool
  const suggestTool = integrationAgent.tools.find(tool => tool.name === 'suggest_integrations');
  if (!suggestTool) {
    throw new Error('Integration suggestion tool not available');
  }

  const agentContext: AgentContext = {
    ...context,
    conversationHistory: []
  };

  try {
    const result = await suggestTool.execute(
      { workflowDescription },
      agentContext
    );

    return {
      suggestions: result.data?.suggestions || [],
      executionTime: Date.now() - startTime
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to get integration suggestions: ${errorMessage}`);
  }
}

/**
 * Security Scan
 * Perform comprehensive security scan of workflow
 */
export async function performSecurityScan(
  workflowCode: string,
  packages: Array<{ name: string; version: string }>,
  context: {
    organizationId: string;
    userId: string;
    userRole: string;
    permissions: string[];
    sessionId: string;
  }
): Promise<{
  securityScore: number;
  vulnerabilities: any[];
  complianceIssues: any[];
  secrets: any[];
  recommendations: string[];
  executionTime: number;
}> {
  const startTime = Date.now();

  const securityAgent = agentRegistry.getAgentByRole('security');
  if (!securityAgent) {
    throw new Error('Security agent not available');
  }

  const agentContext: AgentContext = {
    ...context,
    conversationHistory: []
  };

  try {
    // Run all security tools
    const results = await Promise.all([
      securityAgent.tools.find((t: any) => t.name === 'validate_package_security')?.execute({ packages }, agentContext),
      securityAgent.tools.find((t: any) => t.name === 'validate_compliance')?.execute({ workflowCode }, agentContext),
      securityAgent.tools.find((t: any) => t.name === 'scan_for_secrets')?.execute({ workflowCode }, agentContext)
    ]);

    const [packageSecurity, compliance, secrets] = results;

    // Calculate overall security score
    const scores = results.filter((r: any) => r?.success).length / results.length * 100;

    return {
      securityScore: Math.round(scores),
      vulnerabilities: packageSecurity?.data?.vulnerabilities || [],
      complianceIssues: compliance?.data?.policies?.filter((p: any) => p.status === 'violation') || [],
      secrets: secrets?.data?.findings || [],
      recommendations: results.flatMap(r => r?.suggestions || []),
      executionTime: Date.now() - startTime
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Security scan failed: ${errorMessage}`);
  }
}