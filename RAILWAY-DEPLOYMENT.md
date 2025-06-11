# Railway Deployment Guide for WorkflowHub

## Prerequisites
- Railway account (https://railway.app)
- Railway CLI installed (`brew install railway` on Mac)
- Git repository

## Deployment Steps

### 1. Login to Railway
```bash
railway login
```

### 2. Create New Project
```bash
railway init
```
Select "Create new project" when prompted.

### 3. Set Environment Variables
In the Railway dashboard or via CLI:

```bash
# Required variables
railway variables set ANTHROPIC_API_KEY=your_key_here
railway variables set SUPABASE_URL=https://eyjhpaaumnvwwlwrotgg.supabase.co
railway variables set SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5amhwYWF1bW52d3dsd3JvdGdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyNzY3NzYsImV4cCI6MjA2NDg1Mjc3Nn0.dwCixK3vhobT9SkzV-lVjHSla_6yZFcdQPkuXswBais
```

### 4. Deploy
```bash
railway up
```

This will:
- Build the Docker image
- Deploy to Railway
- Provide you with a deployment URL

### 5. View Deployment
```bash
railway open
```

## Project Structure
- `Dockerfile` - Production Docker configuration
- `server.cjs` - Express server for production
- `railway.json` - Railway configuration
- `.env.example` - Environment variable documentation

## Monitoring
- View logs: `railway logs`
- Check status: `railway status`
- Open dashboard: `railway open`

## Custom Domain (Optional)
In Railway dashboard:
1. Go to Settings > Domains
2. Add your custom domain
3. Update DNS records as instructed

## Troubleshooting

### Port Issues
Railway automatically sets the PORT environment variable. The app is configured to use it.

### Build Failures
Check logs with `railway logs` and ensure all dependencies are in package.json.

### Environment Variables
Verify all required env vars are set with `railway variables`

## Rollback
If deployment fails, you can rollback:
```bash
railway down
```

Then redeploy previous version or fix issues and redeploy.