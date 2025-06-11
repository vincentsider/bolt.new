export function getAPIKey(cloudflareEnv: Env) {
  /**
   * In Cloudflare Workers, environment variables are accessed through the Env object
   * passed to the worker, not through process.env
   * 
   * In local development, the cloudflareEnv might not have the API key,
   * so we fall back to process.env
   */
  const apiKey = cloudflareEnv?.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('No API key found in cloudflareEnv:', !!cloudflareEnv?.ANTHROPIC_API_KEY);
    console.error('No API key found in process.env:', !!process.env.ANTHROPIC_API_KEY);
  }
  return apiKey;
}
