/**
 * Multi-Agent System Types for WorkflowHub
 */

import { z } from 'zod';

// Agent Role Definitions
export type AgentRole = 
  | 'orchestration'
  | 'security' 
  | 'design'
  | 'integration'
  | 'quality';

// Agent Status
export type AgentStatus = 'idle' | 'active' | 'completed' | 'error';

// Tool Parameter Schema
export const ToolParameterSchema = z.object({
  name: z.string(),
  type: z.enum(['string', 'number', 'boolean', 'object', 'array']),
  description: z.string(),
  required: z.boolean().default(false),
  schema: z.any().optional(),
});

export type ToolParameter = z.infer<typeof ToolParameterSchema>;

// Tool Definition
export const ToolSchema = z.object({
  name: z.string(),
  description: z.string(),
  parameters: z.array(ToolParameterSchema),
  execute: z.function(),
});

export type Tool = {
  name: string;
  description: string;
  parameters: ToolParameter[];
  execute: (input: any, context?: AgentContext) => Promise<ToolResult>;
};

// Tool Execution Result
export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  suggestions?: string[];
  warnings?: string[];
}

// Agent Context
export interface AgentContext {
  workflowId?: string;
  organizationId: string;
  userId: string;
  userRole: string;
  permissions: string[];
  sessionId: string;
  conversationHistory: ConversationMessage[];
}

// Conversation Message
export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'agent' | 'tool';
  content: string;
  agentRole?: AgentRole;
  toolCalls?: ToolCall[];
  timestamp: Date;
  metadata?: Record<string, any>;
}

// Tool Call
export interface ToolCall {
  toolName: string;
  parameters: Record<string, any>;
  result?: ToolResult;
}

// Agent Definition
export interface Agent {
  id: string;
  role: AgentRole;
  name: string;
  description: string;
  instructions: string;
  handoffDescription?: string;
  tools: Tool[];
  capabilities: string[];
  status: AgentStatus;
  config?: Record<string, any>;
}

// Agent Response
export interface AgentResponse {
  agentId: string;
  agentRole: AgentRole;
  content: string;
  toolCalls?: ToolCall[];
  handoffTo?: AgentRole;
  confidence: number;
  reasoning?: string;
  metadata?: Record<string, any>;
}

// Orchestration Request
export interface OrchestrationRequest {
  userMessage: string;
  context: AgentContext;
  requiredAgents?: AgentRole[];
  priority?: 'low' | 'medium' | 'high';
  timeout?: number;
  approvalMode?: 'auto' | 'step-by-step' | 'batch';
  maxCost?: number; // Maximum cost in USD
  approvalCallback?: (step: AgentApprovalStep) => Promise<boolean>;
}

export interface AgentApprovalStep {
  stepType: 'agent_execution' | 'tool_call' | 'api_call';
  agentRole?: AgentRole;
  description: string;
  estimatedCost: number;
  details: {
    tokens?: number;
    apiCalls?: number;
    toolName?: string;
    parameters?: any;
  };
}

// Orchestration Response
export interface OrchestrationResponse {
  success: boolean;
  responses: AgentResponse[];
  finalOutput: string;
  workflowCode?: string;
  validationResults?: ValidationResult[];
  suggestions?: string[];
  errors?: string[];
  executionTime: number;
  totalCost?: number;
  stepsPending?: AgentApprovalStep[];
  needsApproval?: boolean;
}

// Validation Result
export interface ValidationResult {
  agentRole: AgentRole;
  type: 'security' | 'design' | 'integration' | 'quality';
  status: 'passed' | 'failed' | 'warning';
  message: string;
  details?: Record<string, any>;
  suggestions?: string[];
}

// Agent Performance Metrics
export interface AgentMetrics {
  agentId: string;
  agentRole: AgentRole;
  totalRequests: number;
  successfulRequests: number;
  averageResponseTime: number;
  errorRate: number;
  lastActiveAt: Date;
  capabilities: {
    [capability: string]: {
      requests: number;
      successRate: number;
      averageTime: number;
    };
  };
}

// Security Validation Types
export interface SecurityValidation {
  packageSecurity: {
    vulnerabilities: SecurityVulnerability[];
    recommendations: string[];
  };
  permissionCheck: {
    required: string[];
    granted: string[];
    violations: string[];
  };
  complianceCheck: {
    policies: PolicyCheck[];
    score: number;
  };
}

export interface SecurityVulnerability {
  severity: 'low' | 'medium' | 'high' | 'critical';
  package: string;
  version: string;
  description: string;
  fix?: string;
}

export interface PolicyCheck {
  policyId: string;
  name: string;
  status: 'compliant' | 'violation' | 'warning';
  details: string;
}

// Design Validation Types
export interface DesignValidation {
  brandCompliance: {
    score: number;
    violations: BrandViolation[];
  };
  uiConsistency: {
    components: ComponentCheck[];
    patterns: PatternCheck[];
  };
  accessibility: {
    score: number;
    issues: AccessibilityIssue[];
  };
}

export interface BrandViolation {
  type: 'color' | 'typography' | 'spacing' | 'logo';
  component: string;
  expected: string;
  actual: string;
  severity: 'minor' | 'major';
}

export interface ComponentCheck {
  component: string;
  standard: string;
  compliant: boolean;
  suggestions?: string[];
}

export interface PatternCheck {
  pattern: string;
  usage: string;
  correct: boolean;
  recommendation?: string;
}

export interface AccessibilityIssue {
  type: 'color-contrast' | 'keyboard-navigation' | 'screen-reader' | 'focus-management';
  severity: 'minor' | 'moderate' | 'serious' | 'critical';
  element: string;
  description: string;
  fix: string;
}

// Integration Validation Types
export interface IntegrationValidation {
  connectionStatus: {
    [integration: string]: {
      connected: boolean;
      lastChecked: Date;
      latency?: number;
      error?: string;
    };
  };
  permissionValidation: {
    [integration: string]: {
      requiredScopes: string[];
      grantedScopes: string[];
      missingScopes: string[];
      excessScopes: string[];
    };
  };
  rateLimit: {
    [integration: string]: {
      limit: number;
      remaining: number;
      resetTime: Date;
      status: 'ok' | 'warning' | 'exceeded';
    };
  };
}

// Quality Validation Types
export interface QualityValidation {
  codeReview: {
    score: number;
    issues: CodeIssue[];
    suggestions: CodeSuggestion[];
  };
  performance: {
    score: number;
    optimizations: PerformanceOptimization[];
  };
  testing: {
    coverage: number;
    recommendations: TestRecommendation[];
  };
  bestPractices: {
    score: number;
    violations: BestPracticeViolation[];
  };
}

export interface CodeIssue {
  type: 'syntax' | 'logic' | 'style' | 'security' | 'performance';
  severity: 'info' | 'warning' | 'error' | 'critical';
  file: string;
  line: number;
  column: number;
  message: string;
  fix?: string;
}

export interface CodeSuggestion {
  type: 'refactor' | 'optimize' | 'modernize' | 'simplify';
  description: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'minimal' | 'moderate' | 'significant';
}

export interface PerformanceOptimization {
  type: 'memory' | 'cpu' | 'network' | 'rendering';
  description: string;
  impact: string;
  implementation: string;
}

export interface TestRecommendation {
  type: 'unit' | 'integration' | 'e2e' | 'performance';
  description: string;
  priority: 'low' | 'medium' | 'high';
  template?: string;
}

export interface BestPracticeViolation {
  practice: string;
  description: string;
  recommendation: string;
  severity: 'minor' | 'major';
}