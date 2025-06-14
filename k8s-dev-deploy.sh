#!/bin/bash
# WorkflowHub - Kubernetes Development Deploy (Using Dev Server)

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 WorkflowHub Kubernetes Dev Deploy${NC}"
echo "===================================="

# Step 1: Check Docker
echo -e "\n${YELLOW}Checking Docker...${NC}"
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running!${NC}"
    echo "Please start Docker Desktop and run this script again."
    exit 1
fi
echo -e "${GREEN}✓ Docker is running${NC}"

# Step 2: Build the dev image
echo -e "\n${YELLOW}Building WorkflowHub dev image...${NC}"
docker build -t workflowhub/dev:latest -f k8s/Dockerfile.dev .
echo -e "${GREEN}✓ Dev image built${NC}"

# Step 3: Check/Create cluster
echo -e "\n${YELLOW}Setting up Kubernetes cluster...${NC}"
if ! kind get clusters | grep -q workflowhub; then
    kind create cluster --name workflowhub --config k8s/kind-config-simple.yaml
    kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml
    kubectl label nodes workflowhub-control-plane ingress-ready=true
    sleep 30
fi
echo -e "${GREEN}✓ Cluster ready${NC}"

# Step 4: Load image
echo -e "\n${YELLOW}Loading image into cluster...${NC}"
kind load docker-image workflowhub/dev:latest --name workflowhub
echo -e "${GREEN}✓ Image loaded${NC}"

# Step 5: Deploy everything
echo -e "\n${YELLOW}Deploying WorkflowHub...${NC}"

# Delete old deployments if they exist
kubectl delete deployment workflowhub -n workflowhub 2>/dev/null || true

kubectl apply -f - <<EOF
apiVersion: v1
kind: Namespace
metadata:
  name: workflowhub
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: workflowhub-dev
  namespace: workflowhub
spec:
  replicas: 1
  selector:
    matchLabels:
      app: workflowhub-dev
  template:
    metadata:
      labels:
        app: workflowhub-dev
    spec:
      containers:
      - name: app
        image: workflowhub/dev:latest
        imagePullPolicy: Never
        ports:
        - containerPort: 5173
          name: http
        env:
        - name: NODE_ENV
          value: development
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
---
apiVersion: v1
kind: Service
metadata:
  name: workflowhub-dev
  namespace: workflowhub
spec:
  selector:
    app: workflowhub-dev
  ports:
  - port: 80
    targetPort: 5173
    name: http
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: workflowhub-dev
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
            name: workflowhub-dev
            port:
              number: 80
EOF

echo -e "${GREEN}✓ Application deployed${NC}"

# Step 6: Wait for deployment
echo -e "\n${YELLOW}Waiting for application to start...${NC}"
kubectl wait --for=condition=available --timeout=120s deployment/workflowhub-dev -n workflowhub || true

# Step 7: Port forward
echo -e "\n${YELLOW}Setting up port forwarding...${NC}"
pkill -f "port-forward.*8080" || true
kubectl port-forward svc/workflowhub-dev 8080:80 -n workflowhub > /dev/null 2>&1 &
sleep 3

# Final status
echo -e "\n${BLUE}=====================================${NC}"
echo -e "${GREEN}✅ WorkflowHub is running!${NC}"
echo -e "${BLUE}=====================================${NC}"
echo ""
echo -e "Access at: ${GREEN}http://localhost:8080${NC}"
echo ""
echo -e "View logs:"
echo -e "  ${YELLOW}kubectl logs -f deployment/workflowhub-dev -n workflowhub${NC}"
echo ""
echo -e "Check status:"
echo -e "  ${YELLOW}kubectl get pods -n workflowhub${NC}"
echo ""

# Show current status
kubectl get pods -n workflowhub