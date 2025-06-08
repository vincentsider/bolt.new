import { streamText as _streamText, convertToCoreMessages } from 'ai';
import { getAPIKey } from '~/lib/.server/llm/api-key';
import { getAnthropicModel, getWorkflowAnthropicModel } from '~/lib/.server/llm/model';
import { MAX_TOKENS, MAX_WORKFLOW_TOKENS } from './constants';
import { getSystemPrompt } from './prompts';
import { getWorkflowSystemPrompt } from './workflow-prompts';

interface ToolResult<Name extends string, Args, Result> {
  toolCallId: string;
  toolName: Name;
  args: Args;
  result: Result;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  toolInvocations?: ToolResult<string, unknown, unknown>[];
}

export type Messages = Message[];

export type StreamingOptions = Omit<Parameters<typeof _streamText>[0], 'model'>;

export function streamText(messages: Messages, env: Env, options?: StreamingOptions) {
  return _streamText({
    model: getAnthropicModel(getAPIKey(env)),
    system: getSystemPrompt(),
    maxTokens: MAX_TOKENS,
    headers: {
      'anthropic-beta': 'max-tokens-3-5-sonnet-2024-07-15',
    },
    messages: convertToCoreMessages(messages),
    ...options,
  });
}

export function streamWorkflowText(messages: Messages, env: Env, options?: StreamingOptions) {
  return _streamText({
    model: getWorkflowAnthropicModel(getAPIKey(env)),
    system: getWorkflowSystemPrompt(),
    maxTokens: MAX_WORKFLOW_TOKENS,
    headers: {
      'anthropic-beta': 'output-128k-2025-02-19',
    },
    messages: convertToCoreMessages(messages),
    ...options,
  });
}
