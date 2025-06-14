# WorkflowHub - Super Simple Quick Start

## The Absolute Simplest Way (2 commands)

```bash
pnpm install
pnpm run dev
```

**That's it!** Open http://localhost:5173

---

## Why Kubernetes is Failing

The current WorkflowHub app is built for **Cloudflare Workers** (edge runtime), not traditional Node.js servers. This is why:

1. `pnpm run dev` tries to use `workerd` (Cloudflare's runtime)
2. The build output expects Cloudflare Workers environment
3. Traditional Docker containers can't run this without major changes

## What You Can Do

### Option 1: Just Use Local Dev (Recommended)
```bash
pnpm install
pnpm run dev
```
This works perfectly for development.

### Option 2: Deploy to Cloudflare (Production)
```bash
pnpm run build
pnpm run deploy
```
This deploys to Cloudflare Workers where it's designed to run.

### Option 3: Kubernetes with Major Refactoring
Would require:
- Switching from `@remix-run/cloudflare` to `@remix-run/node`
- Rewriting all worker-specific code
- Creating new server entry points
- Significant testing

## Bottom Line

**For development**: Just use `pnpm run dev` - it's fast, works great, and includes hot reloading.

**For production**: Deploy to Cloudflare Workers as intended.

**Kubernetes**: Not worth the effort unless you refactor the entire app away from Cloudflare Workers.