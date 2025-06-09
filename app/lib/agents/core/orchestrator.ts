/**
 * Multi-Agent Orchestration System
 */

import { generateText } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import type { 
  Agent, 
  AgentRole, 
  AgentResponse, 
  AgentContext, 
  OrchestrationRequest, 
  OrchestrationResponse,
  ToolCall,
  ToolResult,
  ValidationResult,
  ConversationMessage,
  AgentApprovalStep
} from '../types';
import { agentRegistry } from './agents';

/**
 * Agent Orchestrator - Coordinates multi-agent workflows
 */
export class AgentOrchestrator {
  private anthropicModel: any;
  private activeAgents: Set<string> = new Set();
  private executionMetrics: Map<string, { startTime: number; endTime?: number }> = new Map();
  private totalCost: number = 0;
  private costPerToken = 0.000003; // Approximate cost per token for Claude 3.5 Sonnet

  constructor(apiKey?: string) {
    try {
      // Use the same pattern as the default chat
      const key = apiKey || process.env.ANTHROPIC_API_KEY || '';
      
      if (!key) {
        throw new Error('ANTHROPIC_API_KEY is required but not provided');
      }
      
      // Create Anthropic instance with explicit API key like the default chat does
      const anthropic = createAnthropic({ apiKey: key });
      this.anthropicModel = anthropic('claude-3-7-sonnet-latest'); // Use same model as default chat
      
      // Validate that Anthropic is properly configured
      if (!this.anthropicModel) {
        throw new Error('Anthropic model not properly initialized');
      }
    } catch (error) {
      console.error('AgentOrchestrator initialization failed:', error);
      throw new Error(`Failed to initialize AgentOrchestrator: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process a workflow request using coordinated multi-agent approach
   */
  async processRequest(request: OrchestrationRequest): Promise<OrchestrationResponse> {
    console.log('AgentOrchestrator.processRequest called');
    const startTime = Date.now();
    const responses: AgentResponse[] = [];
    const validationResults: ValidationResult[] = [];
    const errors: string[] = [];
    this.totalCost = 0;

    // Check if approval mode is enabled
    const approvalMode = request.approvalMode || 'auto';
    const maxCost = request.maxCost || 1.0; // Default $1 limit

    try {
      console.log('Step 1: Getting orchestration agent');
      // Step 1: Orchestration agent analyzes the request
      const orchestrationAgent = agentRegistry.getOrchestrationAgent();
      if (!orchestrationAgent) {
        throw new Error('Orchestration agent not found in registry');
      }
      
      // Check cost limits for orchestration step
      const orchestrationCost = this.estimateAgentCost(4000);
      if (orchestrationCost > maxCost) {
        return {
          success: false,
          responses: [],
          finalOutput: `🛑 **Cannot start - orchestration step exceeds cost limit**\n\n` +
                      `• Cost limit: $${maxCost.toFixed(4)}\n` +
                      `• Orchestration cost: $${orchestrationCost.toFixed(4)}\n\n` +
                      `Please increase your cost limit to at least $${orchestrationCost.toFixed(4)} to proceed.`,
          executionTime: Date.now() - startTime,
          totalCost: 0,
          errors: [`Orchestration cost ${orchestrationCost.toFixed(4)} exceeds limit ${maxCost.toFixed(4)}`]
        };
      }
      
      console.log(`Proceeding with orchestration (estimated cost: $${orchestrationCost.toFixed(4)})`);
      
      console.log('Step 2: Executing orchestration agent');
      const orchestrationResponse = await this.executeAgent(
        orchestrationAgent,
        request.userMessage,
        request.context
      );
      responses.push(orchestrationResponse);

      console.log('Step 3: Determining required agents');
      // Step 2: Determine required agents based on orchestration analysis
      const requiredAgents = this.determineRequiredAgents(
        request.userMessage,
        request.requiredAgents,
        orchestrationResponse
      );
      console.log('Required agents:', requiredAgents);

      console.log('Step 4: Executing specialized agents');
      
      // Check cost limits before executing specialized agents
      if (requiredAgents.length > 0) {
        const estimatedCostPerAgent = this.estimateAgentCost(3000);
        const totalEstimatedCost = estimatedCostPerAgent * requiredAgents.length;
        
        console.log(`Estimated cost for ${requiredAgents.length} agents: $${totalEstimatedCost.toFixed(4)}`);
        console.log(`Current total cost: $${this.totalCost.toFixed(4)}`);
        console.log(`Cost limit: $${maxCost.toFixed(4)}`);
        
        if (this.totalCost + totalEstimatedCost > maxCost) {
          return {
            success: false,
            responses,
            finalOutput: `🛑 **Execution stopped to prevent cost overrun**\n\n` +
                        `• Cost limit: $${maxCost.toFixed(4)}\n` +
                        `• Cost so far: $${this.totalCost.toFixed(4)}\n` +
                        `• Estimated additional cost: $${totalEstimatedCost.toFixed(4)}\n` +
                        `• Total estimated: $${(this.totalCost + totalEstimatedCost).toFixed(4)}\n\n` +
                        `To continue, increase your cost limit or switch to approval mode to control each step.`,
            executionTime: Date.now() - startTime,
            totalCost: this.totalCost,
            errors: [`Cost limit exceeded: $${(this.totalCost + totalEstimatedCost).toFixed(4)} > $${maxCost.toFixed(4)}`]
          };
        }
        
        // For approval modes, we'll implement a future polling system
        if (approvalMode !== 'auto') {
          console.log(`⚠️  Approval mode '${approvalMode}' requested but not fully implemented yet`);
          console.log(`Proceeding with cost monitoring instead...`);
        }
      }
      
      // Step 3: Execute specialized agents in coordinated manner
      const agentResults = await this.executeSpecializedAgents(
        requiredAgents,
        request.userMessage,
        request.context,
        orchestrationResponse
      );

      responses.push(...agentResults.responses);
      validationResults.push(...agentResults.validations);
      errors.push(...agentResults.errors);

      console.log('Step 5: Synthesizing final response');
      // Step 4: Synthesize final response
      const finalOutput = await this.synthesizeFinalResponse(
        request.userMessage,
        responses,
        validationResults
      );

      // Step 5: Extract workflow code if generated
      const workflowCode = this.extractWorkflowCode(responses);

      const executionTime = Date.now() - startTime;

      return {
        success: errors.length === 0,
        responses,
        finalOutput,
        workflowCode,
        validationResults,
        suggestions: this.generateSuggestions(responses, validationResults),
        errors,
        executionTime
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        responses,
        finalOutput: `Failed to process request: ${errorMessage}`,
        validationResults,
        errors: [...errors, errorMessage],
        executionTime: Date.now() - startTime
      };
    } finally {
      // Cleanup active agents
      this.activeAgents.clear();
    }
  }

  /**
   * Execute an individual agent with the given message and context
   */
  private async executeAgent(
    agent: Agent,
    message: string,
    context: AgentContext,
    previousResponses?: AgentResponse[]
  ): Promise<AgentResponse> {
    console.log(`Executing agent: ${agent.id}`);
    const agentKey = `${agent.id}-${Date.now()}`;
    this.executionMetrics.set(agentKey, { startTime: Date.now() });
    this.activeAgents.add(agent.id);

    try {
      // Update agent status
      agentRegistry.updateAgentStatus(agent.id, 'active');

      // Build context with previous responses if available
      const enrichedContext = this.buildEnrichedContext(message, context, previousResponses);

      console.log(`Calling generateText for agent ${agent.id}`);
      // Generate agent response using Claude
      try {
        const result = await generateText({
          model: this.anthropicModel,
          messages: [
            {
              role: 'system',
              content: this.buildSystemPrompt(agent, enrichedContext)
            },
            {
              role: 'user',
              content: message
            }
          ],
          // Temporarily disable tools to isolate the issue
          // tools: this.buildToolsForAgent(agent),
          maxTokens: 4000,
          temperature: 0.3
        });
        
        console.log(`generateText completed for agent ${agent.id}`);
        
        // Calculate and track cost
        const tokenCount = result.usage?.totalTokens || 0;
        const stepCost = this.calculateCost(tokenCount);
        this.totalCost += stepCost;
        
        console.log(`Agent ${agent.id} cost: $${stepCost.toFixed(4)} (${tokenCount} tokens)`);
        console.log(`Total cost so far: $${this.totalCost.toFixed(4)}`);

        // Execute any tool calls
        const toolCalls = [] as ToolCall[]; // Temporarily disabled
        // const toolCalls = await this.executeToolCalls(result.toolCalls || [], agent, context);

        // Build agent response
        const response: AgentResponse = {
          agentId: agent.id,
          agentRole: agent.role,
          content: result.text,
          toolCalls,
          confidence: this.calculateConfidence(result.text, toolCalls),
          reasoning: this.extractReasoning(result.text),
          metadata: {
            executionTime: Date.now() - this.executionMetrics.get(agentKey)!.startTime,
            tokenCount,
            toolsUsed: toolCalls?.length || 0,
            cost: stepCost
          }
        };

        // Update agent status
        agentRegistry.updateAgentStatus(agent.id, 'completed');

        return response;
      } catch (innerError) {
        console.error('Error in generateText:', innerError);
        throw innerError;
      }

    } catch (error) {
      console.error(`Error executing agent ${agent.id}:`, error);
      console.error('Error type:', typeof error);
      console.error('Error stack:', error?.stack);
      agentRegistry.updateAgentStatus(agent.id, 'error');
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Agent ${agent.id} failed: ${errorMessage}`);
    } finally {
      this.activeAgents.delete(agent.id);
      const metrics = this.executionMetrics.get(agentKey);
      if (metrics) {
        metrics.endTime = Date.now();
      }
    }
  }

  /**
   * Execute specialized agents in coordinated manner
   */
  private async executeSpecializedAgents(
    requiredAgents: AgentRole[],
    message: string,
    context: AgentContext,
    orchestrationResponse: AgentResponse
  ): Promise<{
    responses: AgentResponse[];
    validations: ValidationResult[];
    errors: string[];
  }> {
    const responses: AgentResponse[] = [];
    const validations: ValidationResult[] = [];
    const errors: string[] = [];

    // Execute agents in logical order
    const executionOrder = this.getExecutionOrder(requiredAgents);

    for (const agentRole of executionOrder) {
      try {
        const agent = agentRegistry.getAgentByRole(agentRole);
        if (!agent) {
          errors.push(`Agent not found for role: ${agentRole}`);
          continue;
        }

        const response = await this.executeAgent(agent, message, context, responses);
        responses.push(response);

        // Extract validation results from agent response
        const agentValidations = this.extractValidationResults(response);
        validations.push(...agentValidations);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Failed to execute ${agentRole} agent: ${errorMessage}`);
      }
    }

    return { responses, validations, errors };
  }

  /**
   * Execute tool calls for an agent
   */
  private async executeToolCalls(
    toolCalls: any[],
    agent: Agent,
    context: AgentContext
  ): Promise<ToolCall[]> {
    const results: ToolCall[] = [];

    for (const toolCall of toolCalls) {
      try {
        const tool = agent.tools.find(t => t.name === toolCall.toolName);
        if (!tool) {
          results.push({
            toolName: toolCall.toolName,
            parameters: toolCall.args,
            result: {
              success: false,
              error: `Tool ${toolCall.toolName} not found`
            }
          });
          continue;
        }

        const result = await tool.execute(toolCall.args, context);
        results.push({
          toolName: toolCall.toolName,
          parameters: toolCall.args,
          result
        });

      } catch (error) {
        results.push({
          toolName: toolCall.toolName,
          parameters: toolCall.args,
          result: {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        });
      }
    }

    return results;
  }

  /**
   * Determine which agents are required for the request
   */
  private determineRequiredAgents(
    message: string,
    explicitAgents?: AgentRole[],
    orchestrationResponse?: AgentResponse
  ): AgentRole[] {
    if (explicitAgents) {
      return explicitAgents;
    }

    const requiredAgents: Set<AgentRole> = new Set();
    const messageLower = message.toLowerCase();

    // Always include security for workflow creation
    if (messageLower.includes('workflow') || messageLower.includes('create') || messageLower.includes('build')) {
      requiredAgents.add('security');
    }

    // Check for integration needs
    if (messageLower.includes('integration') || messageLower.includes('api') || 
        messageLower.includes('connect') || messageLower.includes('salesforce') ||
        messageLower.includes('slack') || messageLower.includes('email')) {
      requiredAgents.add('integration');
    }

    // Check for UI/design needs
    if (messageLower.includes('form') || messageLower.includes('ui') || 
        messageLower.includes('interface') || messageLower.includes('design') ||
        messageLower.includes('dashboard')) {
      requiredAgents.add('design');
    }

    // Always include quality for code generation
    if (messageLower.includes('code') || messageLower.includes('workflow') || 
        messageLower.includes('function') || messageLower.includes('script')) {
      requiredAgents.add('quality');
    }

    // Default to all agents if none specifically determined
    if (requiredAgents.size === 0) {
      return ['security', 'integration', 'design', 'quality'];
    }

    return Array.from(requiredAgents);
  }

  /**
   * Get execution order for agents based on dependencies
   */
  private getExecutionOrder(requiredAgents: AgentRole[]): AgentRole[] {
    const order: AgentRole[] = [];
    const defaultOrder: AgentRole[] = ['security', 'integration', 'design', 'quality'];

    // Maintain logical order while only including required agents
    for (const role of defaultOrder) {
      if (requiredAgents.includes(role)) {
        order.push(role);
      }
    }

    return order;
  }

  /**
   * Build system prompt for an agent
   */
  private buildSystemPrompt(agent: Agent, context: string): string {
    return `${agent.instructions}

Available Tools:
${agent.tools.map(tool => 
  `- ${tool.name}: ${tool.description}`
).join('\n')}

Context Information:
${context}

Your response should be structured and actionable. If you identify issues, provide clear recommendations for resolution.`;
  }

  /**
   * Build enriched context with previous responses
   */
  private buildEnrichedContext(
    message: string,
    context: AgentContext,
    previousResponses?: AgentResponse[]
  ): string {
    let enrichedContext = `
User Request: ${message}
Organization: ${context.organizationId}
User Role: ${context.userRole}
Session: ${context.sessionId}
`;

    if (previousResponses && previousResponses.length > 0) {
      enrichedContext += '\n\nPrevious Agent Responses:\n';
      previousResponses.forEach(response => {
        enrichedContext += `\n${response.agentRole.toUpperCase()} Agent: ${response.content}\n`;
        if (response.toolCalls && response.toolCalls.length > 0) {
          enrichedContext += `Tools Used: ${response.toolCalls.map(tc => tc.toolName).join(', ')}\n`;
        }
      });
    }

    return enrichedContext;
  }

  /**
   * Build tools configuration for Claude AI SDK
   */
  private buildToolsForAgent(agent: Agent): Record<string, any> {
    const tools: Record<string, any> = {};

    agent.tools.forEach(tool => {
      tools[tool.name] = {
        description: tool.description,
        parameters: this.convertToolParametersToSchema(tool.parameters)
      };
    });

    return tools;
  }

  /**
   * Convert tool parameters to Claude schema format
   */
  private convertToolParametersToSchema(parameters: any[]): any {
    const properties: any = {};
    const required: string[] = [];

    parameters.forEach(param => {
      properties[param.name] = {
        type: param.type,
        description: param.description
      };

      if (param.required) {
        required.push(param.name);
      }
    });

    return {
      type: 'object',
      properties,
      required
    };
  }

  /**
   * Extract validation results from agent response
   */
  private extractValidationResults(response: AgentResponse): ValidationResult[] {
    const validations: ValidationResult[] = [];

    // Extract validation results from tool calls
    response.toolCalls?.forEach(toolCall => {
      if (toolCall.result?.success === false) {
        validations.push({
          agentRole: response.agentRole,
          type: this.getValidationType(response.agentRole),
          status: 'failed',
          message: toolCall.result.error || 'Tool execution failed',
          details: { toolName: toolCall.toolName, parameters: toolCall.parameters }
        });
      } else if (toolCall.result?.warnings && toolCall.result.warnings.length > 0) {
        validations.push({
          agentRole: response.agentRole,
          type: this.getValidationType(response.agentRole),
          status: 'warning',
          message: toolCall.result.warnings.join(', '),
          details: { toolName: toolCall.toolName }
        });
      }
    });

    return validations;
  }

  /**
   * Get validation type for agent role
   */
  private getValidationType(agentRole: AgentRole): 'security' | 'design' | 'integration' | 'quality' {
    switch (agentRole) {
      case 'security': return 'security';
      case 'design': return 'design';
      case 'integration': return 'integration';
      case 'quality': return 'quality';
      default: return 'quality';
    }
  }

  /**
   * Synthesize final response from all agent responses
   */
  private async synthesizeFinalResponse(
    originalMessage: string,
    responses: AgentResponse[],
    validationResults: ValidationResult[]
  ): Promise<string> {
    const synthesisPrompt = `
Synthesize the following agent responses into a comprehensive final response for the user's request: "${originalMessage}"

Agent Responses:
${responses.map(response => `
${response.agentRole.toUpperCase()} AGENT:
${response.content}
${response.toolCalls?.length ? `Tools Used: ${response.toolCalls.map(tc => tc.toolName).join(', ')}` : ''}
`).join('\n')}

Validation Results:
${validationResults.map(validation => `
- ${validation.type.toUpperCase()}: ${validation.status} - ${validation.message}
`).join('\n')}

Provide a clear, comprehensive response that:
1. Summarizes what has been accomplished
2. Highlights any important findings or recommendations
3. Lists any issues that need to be addressed
4. Provides next steps or action items
`;

    try {
      const result = await generateText({
        model: this.anthropicModel,
        messages: [{ role: 'user', content: synthesisPrompt }],
        maxTokens: 2000,
        temperature: 0.4
      });

      return result.text;
    } catch (error) {
      // Fallback to simple synthesis if AI synthesis fails
      return this.generateFallbackSynthesis(responses, validationResults);
    }
  }

  /**
   * Generate fallback synthesis without AI
   */
  private generateFallbackSynthesis(
    responses: AgentResponse[],
    validationResults: ValidationResult[]
  ): string {
    const agentSummaries = responses.map(response => 
      `**${response.agentRole.toUpperCase()} Agent**: ${response.content.substring(0, 200)}...`
    ).join('\n\n');

    const issues = validationResults.filter(v => v.status === 'failed' || v.status === 'warning');
    const issuesSummary = issues.length > 0 
      ? `\n\n**Issues Found**: ${issues.map(i => `${i.type}: ${i.message}`).join(', ')}`
      : '';

    return `## Multi-Agent Analysis Complete

${agentSummaries}${issuesSummary}

The workflow has been analyzed by ${responses.length} specialized agents. Please review the recommendations above and address any identified issues.`;
  }

  /**
   * Extract workflow code from agent responses
   */
  private extractWorkflowCode(responses: AgentResponse[]): string | undefined {
    // Look for code in responses (this would be enhanced based on actual response format)
    for (const response of responses) {
      if (response.content.includes('```') || response.content.includes('function') || response.content.includes('const ')) {
        // Extract code blocks or return full content if it looks like code
        const codeMatch = response.content.match(/```[\s\S]*?```/);
        if (codeMatch) {
          return codeMatch[0].replace(/```\w*\n?/g, '').replace(/\n```/g, '');
        }
      }
    }
    return undefined;
  }

  /**
   * Generate suggestions based on agent responses
   */
  private generateSuggestions(
    responses: AgentResponse[],
    validationResults: ValidationResult[]
  ): string[] {
    const suggestions: string[] = [];

    // Add suggestions from agent tool calls
    responses.forEach(response => {
      response.toolCalls?.forEach(toolCall => {
        if (toolCall.result?.suggestions) {
          suggestions.push(...toolCall.result.suggestions);
        }
      });
    });

    // Add suggestions based on validation results
    validationResults.forEach(validation => {
      if (validation.suggestions) {
        suggestions.push(...validation.suggestions);
      }
    });

    // Remove duplicates and return unique suggestions
    return Array.from(new Set(suggestions)).slice(0, 10); // Limit to top 10 suggestions
  }

  /**
   * Calculate confidence score for agent response
   */
  private calculateConfidence(content: string, toolCalls?: ToolCall[]): number {
    let confidence = 0.7; // Base confidence

    // Increase confidence if tools were used successfully
    if (toolCalls && toolCalls.length > 0) {
      const successfulTools = toolCalls.filter(tc => tc.result?.success).length;
      confidence += (successfulTools / toolCalls.length) * 0.2;
    }

    // Increase confidence for detailed responses
    if (content.length > 500) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Extract reasoning from agent response
   */
  private extractReasoning(content: string): string | undefined {
    // Look for reasoning indicators in the response
    const reasoningKeywords = ['because', 'since', 'due to', 'therefore', 'as a result'];
    const hasReasoning = reasoningKeywords.some(keyword => content.toLowerCase().includes(keyword));
    
    if (hasReasoning) {
      // Return first paragraph that contains reasoning
      const sentences = content.split('. ');
      for (const sentence of sentences) {
        if (reasoningKeywords.some(keyword => sentence.toLowerCase().includes(keyword))) {
          return sentence + '.';
        }
      }
    }

    return undefined;
  }

  /**
   * Get current agent statuses
   */
  getAgentStatuses(): Record<string, { status: string; isActive: boolean }> {
    const statuses: Record<string, { status: string; isActive: boolean }> = {};
    
    agentRegistry.getAllAgents().forEach(agent => {
      statuses[agent.id] = {
        status: agent.status,
        isActive: this.activeAgents.has(agent.id)
      };
    });

    return statuses;
  }

  /**
   * Get execution metrics
   */
  getExecutionMetrics(): Record<string, { executionTime: number; isComplete: boolean }> {
    const metrics: Record<string, { executionTime: number; isComplete: boolean }> = {};
    
    this.executionMetrics.forEach((metric, key) => {
      const executionTime = metric.endTime 
        ? metric.endTime - metric.startTime
        : Date.now() - metric.startTime;
      
      metrics[key] = {
        executionTime,
        isComplete: !!metric.endTime
      };
    });

    return metrics;
  }

  /**
   * Calculate cost based on token count
   */
  private calculateCost(tokens: number): number {
    return tokens * this.costPerToken;
  }

  /**
   * Estimate cost for an agent execution
   */
  private estimateAgentCost(estimatedTokens: number): number {
    return this.calculateCost(estimatedTokens);
  }

  /**
   * Get current total cost
   */
  getTotalCost(): number {
    return this.totalCost;
  }

  /**
   * Reset cost tracking
   */
  resetCost(): void {
    this.totalCost = 0;
  }
}

// Export singleton instance
// Create a singleton that can be initialized with API key
let _agentOrchestrator: AgentOrchestrator | null = null;

export function getAgentOrchestrator(apiKey?: string): AgentOrchestrator {
  if (!_agentOrchestrator) {
    _agentOrchestrator = new AgentOrchestrator(apiKey);
  }
  return _agentOrchestrator;
}