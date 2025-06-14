#!/bin/bash
# Quick rebuild and redeploy after code changes

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Rebuilding and redeploying WorkflowHub...${NC}"

# Rebuild the Docker image
echo "Building new image..."
docker build -t workflowhub/app:latest -f k8s/Dockerfile.app .

# Load into kind
echo "Loading image into cluster..."
kind load docker-image workflowhub/app:latest --name workflowhub

# Restart the deployment
echo "Restarting application..."
kubectl rollout restart deployment/workflowhub -n workflowhub

# Wait for rollout
kubectl rollout status deployment/workflowhub -n workflowhub

echo -e "${GREEN}✓ Application updated!${NC}"
echo "Access at: http://workflowhub.local or http://localhost"