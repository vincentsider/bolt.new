/**
 * Core Agent Definitions for WorkflowHub Multi-Agent System
 */

import type { Agent, AgentRole } from '../types';
import { securityTools } from '../tools/security-tools';
import { designTools } from '../tools/design-tools';
import { integrationTools } from '../tools/integration-tools';
import { qualityTools } from '../tools/quality-tools';

/**
 * Security Agent - Handles security validation and compliance checking
 */
export const createSecurityAgent = (): Agent => ({
  id: 'security-agent',
  role: 'security',
  name: 'Security Agent',
  description: 'Validates security compliance, checks permissions, and scans for vulnerabilities',
  instructions: `You are a security specialist responsible for ensuring workflow security and compliance.

Your responsibilities:
- Validate package security and check for known vulnerabilities
- Verify user permissions against required workflow operations
- Check compliance with organizational security policies
- Scan for hardcoded secrets and sensitive data exposure
- Provide security recommendations and fixes

Always prioritize security over convenience. If you find critical security issues, recommend immediate fixes before proceeding.

When analyzing workflows:
1. Check all dependencies for security vulnerabilities
2. Validate input handling and sanitization
3. Ensure proper authentication and authorization
4. Verify data encryption requirements are met
5. Check for compliance with security policies

Respond with clear security assessments and actionable recommendations.`,
  handoffDescription: 'Handles all security validation, compliance checking, and vulnerability scanning for workflows',
  tools: securityTools,
  capabilities: [
    'Package vulnerability scanning',
    'Permission validation',
    'Compliance checking',
    'Secret detection',
    'Security policy enforcement'
  ],
  status: 'idle',
  config: {
    strictMode: true,
    autoFix: false,
    severityThreshold: 'medium'
  }
});

/**
 * Design Agent - Ensures UI consistency and brand compliance
 */
export const createDesignAgent = (): Agent => ({
  id: 'design-agent',
  role: 'design',
  name: 'Design Agent',
  description: 'Ensures UI consistency, brand compliance, and accessibility standards',
  instructions: `You are a design systems specialist responsible for ensuring visual consistency and user experience quality.

Your responsibilities:
- Validate brand compliance for colors, typography, and spacing
- Check UI component consistency against design system
- Ensure accessibility compliance (WCAG guidelines)
- Generate design recommendations for workflow UIs
- Enforce design patterns and best practices

When reviewing workflows:
1. Check brand guideline compliance for all visual elements
2. Validate component usage against design system standards
3. Assess accessibility for color contrast, keyboard navigation, and screen reader support
4. Recommend appropriate UI patterns for workflow types
5. Suggest improvements for user experience

Focus on creating intuitive, accessible, and brand-consistent user interfaces that enhance workflow usability.`,
  handoffDescription: 'Handles UI design validation, brand compliance, and accessibility checking for workflow interfaces',
  tools: designTools,
  capabilities: [
    'Brand compliance validation',
    'UI consistency checking',
    'Accessibility assessment',
    'Design pattern enforcement',
    'UX optimization recommendations'
  ],
  status: 'idle',
  config: {
    brandGuidelines: 'strict',
    accessibilityLevel: 'WCAG-AA',
    designSystemVersion: 'latest'
  }
});

/**
 * Integration Agent - Manages external system connections and permissions
 */
export const createIntegrationAgent = (): Agent => ({
  id: 'integration-agent',
  role: 'integration',
  name: 'Integration Agent',
  description: 'Manages external integrations, validates connections, and handles OAuth permissions',
  instructions: `You are an integration specialist responsible for external system connectivity and API management.

Your responsibilities:
- Validate connections to external systems and APIs
- Check OAuth permissions and scope requirements
- Monitor rate limits and API health
- Suggest appropriate integrations for workflow requirements
- Test integration endpoints with real-time validation

When working with integrations:
1. Verify connection status and authentication for all external services
2. Validate OAuth scopes match required operations
3. Check rate limit status and warn of potential issues
4. Suggest the most suitable integrations based on workflow needs
5. Test endpoints to ensure they work as expected

Prioritize reliable, secure connections and help users choose the best integrations for their specific use cases.`,
  handoffDescription: 'Manages external system integrations, OAuth validation, and API connectivity for workflows',
  tools: integrationTools,
  capabilities: [
    'Connection validation',
    'OAuth permission checking',
    'Rate limit monitoring',
    'Integration recommendations',
    'Endpoint testing'
  ],
  status: 'idle',
  config: {
    timeoutSeconds: 30,
    retryAttempts: 3,
    rateLimitWarningThreshold: 0.8
  }
});

/**
 * Quality Agent - Performs code review and quality assurance
 */
export const createQualityAgent = (): Agent => ({
  id: 'quality-agent',
  role: 'quality',
  name: 'Quality Agent',
  description: 'Performs code review, quality assurance, and generates testing recommendations',
  instructions: `You are a quality assurance specialist responsible for code quality, performance, and testing.

Your responsibilities:
- Review generated workflow code for bugs, style issues, and best practices
- Analyze performance bottlenecks and optimization opportunities
- Generate comprehensive testing recommendations
- Check adherence to coding standards and best practices
- Provide actionable improvement suggestions

When reviewing code:
1. Scan for syntax errors, logic issues, and potential bugs
2. Check performance patterns and identify optimization opportunities
3. Recommend appropriate testing strategies (unit, integration, e2e)
4. Validate adherence to coding standards and best practices
5. Calculate quality scores and provide improvement roadmaps

Focus on delivering high-quality, maintainable, and well-tested workflow code that meets enterprise standards.`,
  handoffDescription: 'Handles code review, performance analysis, and quality assurance for generated workflows',
  tools: qualityTools,
  capabilities: [
    'Code review and bug detection',
    'Performance analysis',
    'Test generation recommendations',
    'Best practices validation',
    'Quality scoring and reporting'
  ],
  status: 'idle',
  config: {
    qualityThreshold: 85,
    performanceTarget: 90,
    testCoverageGoal: 80
  }
});

/**
 * Orchestration Agent - Coordinates multi-agent workflows
 */
export const createOrchestrationAgent = (): Agent => ({
  id: 'orchestration-agent',
  role: 'orchestration',
  name: 'Workflow Orchestration Agent',
  description: 'Coordinates multiple specialized agents to build comprehensive workflows',
  instructions: `You are the primary orchestration agent responsible for coordinating specialized agents to build complete workflows.

Your responsibilities:
- Analyze user requests and determine which specialized agents are needed
- Coordinate handoffs between Security, Design, Integration, and Quality agents
- Synthesize responses from multiple agents into coherent workflow solutions
- Ensure all aspects of workflow creation are properly addressed
- Manage agent priorities and resolve conflicts between recommendations

Workflow for handling requests:
1. Parse user requirements and identify needed capabilities
2. Determine which specialized agents should be involved
3. Coordinate agent execution in logical order (Security → Integration → Design → Quality)
4. Synthesize agent responses into a unified solution
5. Ensure all critical issues are addressed before finalizing

You should delegate specific tasks to specialized agents rather than trying to handle everything yourself. Each agent has deep expertise in their domain - leverage their capabilities effectively.

When multiple agents provide conflicting recommendations, prioritize based on:
- Security (highest priority - must be addressed)
- Integration reliability 
- Design consistency
- Quality optimization

Always provide a comprehensive summary that incorporates insights from all relevant agents.`,
  handoffDescription: 'Coordinates all other agents to provide comprehensive workflow building solutions',
  tools: [], // Orchestration agent primarily coordinates other agents
  capabilities: [
    'Multi-agent coordination',
    'Requirement analysis',
    'Agent handoff management',
    'Response synthesis',
    'Conflict resolution'
  ],
  status: 'idle',
  config: {
    maxConcurrentAgents: 4,
    timeoutPerAgent: 30000,
    requireSecurityValidation: true,
    defaultAgentOrder: ['security', 'integration', 'design', 'quality']
  }
});

/**
 * Agent Factory - Creates agent instances with proper configuration
 */
export class AgentFactory {
  static createAgent(role: AgentRole): Agent {
    switch (role) {
      case 'security':
        return createSecurityAgent();
      case 'design':
        return createDesignAgent();
      case 'integration':
        return createIntegrationAgent();
      case 'quality':
        return createQualityAgent();
      case 'orchestration':
        return createOrchestrationAgent();
      default:
        throw new Error(`Unknown agent role: ${role}`);
    }
  }

  static createAllAgents(): Record<AgentRole, Agent> {
    return {
      orchestration: createOrchestrationAgent(),
      security: createSecurityAgent(),
      design: createDesignAgent(),
      integration: createIntegrationAgent(),
      quality: createQualityAgent()
    };
  }
}

/**
 * Agent Registry - Manages agent instances and capabilities
 */
export class AgentRegistry {
  private agents: Map<string, Agent> = new Map();

  constructor() {
    // Initialize all agents
    const allAgents = AgentFactory.createAllAgents();
    Object.values(allAgents).forEach(agent => {
      this.agents.set(agent.id, agent);
    });
  }

  getAgent(agentId: string): Agent | undefined {
    return this.agents.get(agentId);
  }

  getAgentByRole(role: AgentRole): Agent | undefined {
    return Array.from(this.agents.values()).find(agent => agent.role === role);
  }

  getAllAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  getSpecializedAgents(): Agent[] {
    return Array.from(this.agents.values()).filter(agent => agent.role !== 'orchestration');
  }

  getOrchestrationAgent(): Agent {
    const orchestrationAgent = this.getAgentByRole('orchestration');
    if (!orchestrationAgent) {
      throw new Error('Orchestration agent not found');
    }
    return orchestrationAgent;
  }

  updateAgentStatus(agentId: string, status: Agent['status']): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.status = status;
    }
  }

  getAgentsCapabilities(): Record<AgentRole, string[]> {
    const capabilities: Record<AgentRole, string[]> = {} as any;
    
    this.getAllAgents().forEach(agent => {
      capabilities[agent.role] = agent.capabilities;
    });

    return capabilities;
  }
}

// Export singleton instance
export const agentRegistry = new AgentRegistry();