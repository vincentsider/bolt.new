#!/bin/bash

echo "🔄 Preparing for Railway deployment..."

# Copy Node.js entry server
cp app/entry.server.node.tsx app/entry.server.tsx

# Replace all @remix-run/cloudflare imports with @remix-run/node
find app -name "*.ts*" -type f -exec sed -i.bak 's/@remix-run\/cloudflare/@remix-run\/node/g' {} \;

# Clean up backup files
find app -name "*.bak" -type f -delete

echo "✅ Railway preparation complete!"