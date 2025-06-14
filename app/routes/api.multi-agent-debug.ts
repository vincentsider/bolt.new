/**
 * Multi-Agent Debug API Route
 * Provides diagnostic information about the multi-agent system
 */

import pkg from '@remix-run/node';
const { json } = pkg;
import type { ActionFunctionArgs } from '@remix-run/node';

export async function action({ context, request }: ActionFunctionArgs) {
  try {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      environment: {
        hasAnthropicKey: !!context.cloudflare?.env?.ANTHROPIC_API_KEY,
        anthropicKeyLength: context.cloudflare?.env?.ANTHROPIC_API_KEY?.length || 0,
        availableEnvVars: Object.keys(context.cloudflare?.env || {}),
        nodeEnv: process.env.NODE_ENV,
        hasProcessEnv: typeof process !== 'undefined' && !!process.env
      },
      imports: {
        agentsModule: null as any,
        anthropicModule: null as any,
        aiModule: null as any
      },
      errors: [] as string[]
    };

    // Test agent module import
    try {
      const agentsModule = await import('~/lib/agents');
      diagnostics.imports.agentsModule = {
        available: true,
        exports: Object.keys(agentsModule),
        hasProcessWorkflowWithAgents: typeof agentsModule.processWorkflowWithAgents === 'function',
        hasAgentOrchestrator: !!agentsModule.agentOrchestrator
      };
    } catch (error) {
      diagnostics.errors.push(`Failed to import agents module: ${error instanceof Error ? error.message : error}`);
      diagnostics.imports.agentsModule = { available: false, error: error instanceof Error ? error.message : String(error) };
    }

    // Test Anthropic module import
    try {
      const anthropicModule = await import('@ai-sdk/anthropic');
      diagnostics.imports.anthropicModule = {
        available: true,
        hasAnthropic: typeof anthropicModule.anthropic === 'function'
      };
    } catch (error) {
      diagnostics.errors.push(`Failed to import @ai-sdk/anthropic: ${error instanceof Error ? error.message : error}`);
      diagnostics.imports.anthropicModule = { available: false, error: error instanceof Error ? error.message : String(error) };
    }

    // Test AI module import
    try {
      const aiModule = await import('ai');
      diagnostics.imports.aiModule = {
        available: true,
        hasGenerateText: typeof aiModule.generateText === 'function'
      };
    } catch (error) {
      diagnostics.errors.push(`Failed to import ai module: ${error instanceof Error ? error.message : error}`);
      diagnostics.imports.aiModule = { available: false, error: error instanceof Error ? error.message : String(error) };
    }

    // Test agent orchestrator initialization
    try {
      const { AgentOrchestrator } = await import('~/lib/agents/core/orchestrator');
      new AgentOrchestrator();
      diagnostics.orchestrator = { canInitialize: true };
    } catch (error) {
      diagnostics.errors.push(`Failed to initialize AgentOrchestrator: ${error instanceof Error ? error.message : error}`);
      diagnostics.orchestrator = { 
        canInitialize: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }

    return json({
      success: diagnostics.errors.length === 0,
      diagnostics,
      recommendations: generateRecommendations(diagnostics)
    });

  } catch (error) {
    return json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}

function generateRecommendations(diagnostics: any): string[] {
  const recommendations: string[] = [];

  if (!diagnostics.environment.hasAnthropicKey) {
    recommendations.push('Add ANTHROPIC_API_KEY to your Cloudflare Workers environment variables');
  }

  if (diagnostics.environment.anthropicKeyLength > 0 && diagnostics.environment.anthropicKeyLength < 50) {
    recommendations.push('Anthropic API key seems too short - verify it\'s complete');
  }

  if (!diagnostics.imports.agentsModule?.available) {
    recommendations.push('Multi-agent module is not loading properly - check TypeScript compilation');
  }

  if (!diagnostics.imports.anthropicModule?.available) {
    recommendations.push('Anthropic SDK is not available - check if @ai-sdk/anthropic is installed');
  }

  if (!diagnostics.imports.aiModule?.available) {
    recommendations.push('AI SDK is not available - check if ai package is installed');
  }

  if (diagnostics.orchestrator && !diagnostics.orchestrator.canInitialize) {
    recommendations.push('AgentOrchestrator cannot be initialized - check environment configuration');
  }

  if (recommendations.length === 0) {
    recommendations.push('All systems appear to be configured correctly');
  }

  return recommendations;
}