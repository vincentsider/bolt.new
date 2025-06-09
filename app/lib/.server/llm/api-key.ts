export function getAPIKey(cloudflareEnv: Env) {
  /**
   * In Cloudflare Workers, environment variables are accessed through the Env object
   * passed to the worker, not through process.env
   * 
   * In local development, the cloudflareEnv might not have the API key,
   * so we fall back to process.env
   */
  return cloudflareEnv.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
}
