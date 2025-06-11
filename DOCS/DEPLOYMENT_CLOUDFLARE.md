🚀 Deployment Steps for Cloudflare Workers

  1. First, ensure you're logged in to Cloudflare

  npx wrangler login

  2. Set your secrets (if not already done)

  # Set your Anthropic API key
  npx wrangler secret put ANTHROPIC_API_KEY
  # It will prompt you to enter the key

  # Set your Supabase service role key (if needed)
  npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY

  3. Build and Deploy

  cd "/Users/vincentsider/2-Projects/1-KEY PROJECTS/workflowhub"
  pnpm run deploy

  This command will:
  - Build the project using Remix/Vite
  - Deploy to Cloudflare Pages with Workers

  4. Alternative: Deploy with specific project name

  If you want to deploy to a specific project:
  pnpm run build
  npx wrangler pages deploy --project-name=workflowhub

  5. Check your deployment

  After deployment, you'll get a URL like:
  - https://workflowhub.pages.dev (production)
  - https://<hash>.workflowhub.pages.dev (preview)