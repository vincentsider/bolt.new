export function getAPIKey(cloudflareEnv: Env) {
  /**
   * In Cloudflare Workers, environment variables are accessed through the Env object
   * passed to the worker, not through process.env
   */
  return cloudflareEnv.ANTHROPIC_API_KEY;
}
