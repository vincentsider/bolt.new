#!/bin/sh
# Start script for Railway deployment

# Use PORT env var or default to 5173
PORT=${PORT:-5173}

echo "Starting WorkflowHub on port $PORT..."

# Ensure host checking is disabled
export DANGEROUSLY_DISABLE_HOST_CHECK=true

# Start the dev server with host checking disabled
exec pnpm run dev:railway --host 0.0.0.0 --port $PORT