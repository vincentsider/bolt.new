#!/bin/bash
# WorkflowHub - Kubernetes Deployment for Node.js

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 WorkflowHub Kubernetes Deployment (Node.js)${NC}"
echo "============================================"

# Step 1: Check prerequisites
echo -e "\n${YELLOW}1. Checking prerequisites...${NC}"
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running!${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker is running${NC}"

# Step 2: Run refactoring if needed
if grep -q "@remix-run/cloudflare" package.json; then
    echo -e "\n${YELLOW}2. Refactoring from Cloudflare to Node.js...${NC}"
    ./k8s/refactor-to-node.sh
else
    echo -e "\n${GREEN}2. App already refactored for Node.js${NC}"
fi

# Step 3: Build the application
echo -e "\n${YELLOW}3. Building WorkflowHub...${NC}"
pnpm install
pnpm run build
echo -e "${GREEN}✓ Build complete${NC}"

# Step 4: Create Docker image
echo -e "\n${YELLOW}4. Building Docker image...${NC}"
cat > Dockerfile.node << 'EOF'
FROM node:20-alpine AS builder
WORKDIR /app

# Install pnpm
RUN corepack enable pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY . .

# Build application
RUN pnpm run build

# Production stage
FROM node:20-alpine
WORKDIR /app

# Install pnpm for production
RUN corepack enable pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Copy built application
COPY --from=builder /app/build ./build
COPY --from=builder /app/server.js ./server.js

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001
USER nodejs

EXPOSE 3000

CMD ["node", "server.js"]
EOF

docker build -t workflowhub/node:latest -f Dockerfile.node .
echo -e "${GREEN}✓ Docker image built${NC}"

# Step 5: Setup Kubernetes cluster
echo -e "\n${YELLOW}5. Setting up Kubernetes...${NC}"
if ! kind get clusters | grep -q workflowhub; then
    kind create cluster --name workflowhub --config k8s/kind-config-simple.yaml
    kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml
    kubectl label nodes workflowhub-control-plane ingress-ready=true
    sleep 30
fi
echo -e "${GREEN}✓ Kubernetes cluster ready${NC}"

# Step 6: Load image into kind
echo -e "\n${YELLOW}6. Loading image into cluster...${NC}"
kind load docker-image workflowhub/node:latest --name workflowhub
echo -e "${GREEN}✓ Image loaded${NC}"

# Step 7: Deploy to Kubernetes
echo -e "\n${YELLOW}7. Deploying to Kubernetes...${NC}"

# Create namespace
kubectl create namespace workflowhub --dry-run=client -o yaml | kubectl apply -f -

# Create ConfigMap for environment variables
kubectl create configmap workflowhub-config -n workflowhub \
    --from-literal=NODE_ENV=production \
    --from-literal=PORT=3000 \
    --dry-run=client -o yaml | kubectl apply -f -

# Create secrets
kubectl create secret generic workflowhub-secrets -n workflowhub \
    --from-literal=SESSION_SECRET="kubernetes-dev-secret-min-32-chars" \
    --from-literal=ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY:-sk-ant-placeholder}" \
    --dry-run=client -o yaml | kubectl apply -f -

# Deploy application
kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: workflowhub
  namespace: workflowhub
  labels:
    app: workflowhub
spec:
  replicas: 3
  selector:
    matchLabels:
      app: workflowhub
  template:
    metadata:
      labels:
        app: workflowhub
    spec:
      containers:
      - name: app
        image: workflowhub/node:latest
        imagePullPolicy: Never
        ports:
        - containerPort: 3000
          name: http
        envFrom:
        - configMapRef:
            name: workflowhub-config
        - secretRef:
            name: workflowhub-secrets
        resources:
          requests:
            memory: "256Mi"
            cpu: "200m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: workflowhub
  namespace: workflowhub
spec:
  selector:
    app: workflowhub
  ports:
  - port: 80
    targetPort: 3000
    name: http
  type: ClusterIP
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: workflowhub
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
            name: workflowhub
            port:
              number: 80
EOF

echo -e "${GREEN}✓ Application deployed${NC}"

# Step 8: Wait for deployment
echo -e "\n${YELLOW}8. Waiting for pods to be ready...${NC}"
kubectl wait --for=condition=available --timeout=180s deployment/workflowhub -n workflowhub

# Step 9: Setup access
echo -e "\n${YELLOW}9. Setting up access...${NC}"
pkill -f "port-forward.*8080" || true
kubectl port-forward svc/workflowhub 8080:80 -n workflowhub > /dev/null 2>&1 &
sleep 3

# Final status
echo -e "\n${BLUE}============================================${NC}"
echo -e "${GREEN}🎉 WorkflowHub is running in Kubernetes!${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""
echo -e "Access at: ${GREEN}http://localhost:8080${NC}"
echo ""
echo -e "View logs:"
echo -e "  ${YELLOW}kubectl logs -f deployment/workflowhub -n workflowhub${NC}"
echo ""
echo -e "Scale deployment:"
echo -e "  ${YELLOW}kubectl scale deployment/workflowhub --replicas=5 -n workflowhub${NC}"
echo ""
echo -e "Current status:"
kubectl get pods -n workflowhub