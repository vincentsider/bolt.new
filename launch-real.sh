#!/bin/bash
# WorkflowHub - Launch with Real Application

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🚀 WorkflowHub Full Launch${NC}"
echo "=========================="

# Step 1: Check if Docker is running
echo -e "\n${YELLOW}Checking Docker...${NC}"
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running!${NC}"
    echo "Please start Docker Desktop and run this script again."
    exit 1
fi
echo -e "${GREEN}✓ Docker is running${NC}"

# Step 2: Build the actual WorkflowHub app
echo -e "\n${YELLOW}Building WorkflowHub application...${NC}"

# Create a simple Dockerfile for the existing app
cat > Dockerfile.k8s << 'EOF'
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package.json pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the app
RUN pnpm run build

# Production image
FROM node:20-alpine
WORKDIR /app

# Copy built app
COPY --from=builder /app/build ./build
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules

# Create a simple server
RUN echo 'const express = require("express"); \
const path = require("path"); \
const app = express(); \
app.use(express.static(path.join(__dirname, "build/client"))); \
app.get("*", (req, res) => { \
  res.sendFile(path.join(__dirname, "build/client", "index.html")); \
}); \
const PORT = process.env.PORT || 3000; \
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));' > server.js

EXPOSE 3000
CMD ["node", "server.js"]
EOF

# Build the Docker image
docker build -t workflowhub/app:latest -f Dockerfile.k8s .
echo -e "${GREEN}✓ Application built${NC}"

# Step 3: Create/Check Kubernetes cluster
echo -e "\n${YELLOW}Setting up Kubernetes...${NC}"
if ! kind get clusters | grep -q workflowhub; then
    # Create cluster
    kind create cluster --name workflowhub --config k8s/kind-config-simple.yaml
    
    # Install Ingress
    kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml
    kubectl label nodes workflowhub-control-plane ingress-ready=true
    sleep 30
fi

# Load image into kind
echo -e "\n${YELLOW}Loading application image...${NC}"
kind load docker-image workflowhub/app:latest --name workflowhub
echo -e "${GREEN}✓ Image loaded${NC}"

# Step 4: Deploy everything
echo -e "\n${YELLOW}Deploying WorkflowHub...${NC}"

# Create namespace
kubectl apply -f k8s/base/namespace.yaml

# Create deployment for the real app
cat <<EOF | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: workflowhub-app
  namespace: workflowhub
spec:
  replicas: 1
  selector:
    matchLabels:
      app: workflowhub-app
  template:
    metadata:
      labels:
        app: workflowhub-app
    spec:
      containers:
      - name: app
        image: workflowhub/app:latest
        imagePullPolicy: Never
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "3000"
---
apiVersion: v1
kind: Service
metadata:
  name: workflowhub-app
  namespace: workflowhub
spec:
  selector:
    app: workflowhub-app
  ports:
  - port: 80
    targetPort: 3000
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: workflowhub-app
  namespace: workflowhub
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "false"
spec:
  ingressClassName: nginx
  rules:
  - http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: workflowhub-app
            port:
              number: 80
EOF

echo -e "${GREEN}✓ Application deployed${NC}"

# Step 5: Wait for deployment
echo -e "\n${YELLOW}Waiting for application to start...${NC}"
kubectl wait --for=condition=available --timeout=120s deployment/workflowhub-app -n workflowhub

# Step 6: Port forward
echo -e "\n${YELLOW}Starting port forwarding...${NC}"
pkill -f "port-forward.*8082" || true
kubectl port-forward svc/workflowhub-app 8082:80 -n workflowhub > /dev/null 2>&1 &
sleep 3

# Final message
echo -e "\n${GREEN}🎉 WorkflowHub is ready!${NC}"
echo ""
echo "Access the application at:"
echo -e "  ${GREEN}http://localhost:8082${NC}"
echo ""
echo "View logs:"
echo -e "  ${YELLOW}kubectl logs -f deployment/workflowhub-app -n workflowhub${NC}"
echo ""
echo "To stop everything:"
echo -e "  ${YELLOW}pkill -f port-forward${NC}"
echo -e "  ${YELLOW}kind delete cluster --name workflowhub${NC}"