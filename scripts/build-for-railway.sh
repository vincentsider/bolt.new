#!/bin/bash

echo "🔄 Building for Railway..."

# Copy Node.js entry server
cp app/entry.server.node.tsx app/entry.server.tsx

# Build with Vite
RAILWAY_ENVIRONMENT=production NODE_ENV=production remix vite:build

# The server.mjs will handle the rest
echo "✅ Build complete!"