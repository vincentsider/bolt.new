import { createAnthropic } from '@ai-sdk/anthropic';

export function getAnthropicModel(apiKey: string) {
  const anthropic = createAnthropic({
    apiKey,
  });

  return anthropic('claude-3-7-sonnet-latest');
}

export function getWorkflowAnthropicModel(apiKey: string) {
  const anthropic = createAnthropic({
    apiKey,
  });

  return anthropic('claude-3-7-sonnet-latest');
}
