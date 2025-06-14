#!/bin/bash
# WorkflowHub - Development Launch (Simplified)

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🚀 WorkflowHub Development Launch${NC}"
echo "================================="

# Option 1: Just run the dev server locally (no Kubernetes)
echo -e "\n${YELLOW}Option 1: Simple Local Development${NC}"
echo "Run these commands in separate terminals:"
echo ""
echo "Terminal 1 - Start the app:"
echo -e "  ${GREEN}pnpm install${NC}"
echo -e "  ${GREEN}pnpm run dev${NC}"
echo ""
echo "Then open: ${GREEN}http://localhost:5173${NC}"
echo ""
echo "---"

# Option 2: Run in Docker
echo -e "\n${YELLOW}Option 2: Run in Docker${NC}"
echo ""

# Create a dev Dockerfile
cat > Dockerfile.dev << 'EOF'
FROM node:20-alpine
WORKDIR /app

# Install pnpm
RUN corepack enable pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy app code
COPY . .

# Expose port
EXPOSE 5173

# Start dev server
CMD ["pnpm", "run", "dev", "--host", "0.0.0.0"]
EOF

echo "To run in Docker:"
echo -e "  ${GREEN}docker build -t workflowhub-dev -f Dockerfile.dev .${NC}"
echo -e "  ${GREEN}docker run -p 5173:5173 workflowhub-dev${NC}"
echo ""
echo "Then open: ${GREEN}http://localhost:5173${NC}"