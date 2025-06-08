// see https://docs.anthropic.com/en/docs/about-claude/models
export const MAX_TOKENS = 8192;

// For workflow generation with Claude 3.7 Sonnet and 128k output capability
export const MAX_WORKFLOW_TOKENS = 65536; // 64k tokens for workflow generation

// limits the number of model responses that can be returned in a single request
export const MAX_RESPONSE_SEGMENTS = 2;
