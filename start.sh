#!/bin/sh
# Start script for Railway deployment

# Use PORT env var or default to 5173
PORT=${PORT:-5173}

echo "Starting WorkflowHub on port $PORT..."

# Start the dev server with the correct config
exec pnpm vite --config vite.config.production.ts --host 0.0.0.0 --port $PORT