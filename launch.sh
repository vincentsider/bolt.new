#!/bin/bash
# WorkflowHub - One-Click Launch Script

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🚀 WorkflowHub Quick Launch${NC}"
echo "=========================="

# Step 1: Check if Docker is running
echo -e "\n${YELLOW}Checking Docker...${NC}"
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running!${NC}"
    echo "Please start Docker Desktop and run this script again."
    exit 1
fi
echo -e "${GREEN}✓ Docker is running${NC}"

# Step 2: Install required tools if missing
echo -e "\n${YELLOW}Checking required tools...${NC}"
if ! command -v kind &> /dev/null; then
    echo "Installing kind..."
    brew install kind
fi
if ! command -v kubectl &> /dev/null; then
    echo "Installing kubectl..."
    brew install kubectl
fi
echo -e "${GREEN}✓ All tools installed${NC}"

# Step 3: Create Kubernetes cluster
echo -e "\n${YELLOW}Creating Kubernetes cluster...${NC}"
if kind get clusters | grep -q workflowhub; then
    echo "Cluster already exists!"
else
    kind create cluster --name workflowhub --config k8s/kind-config-simple.yaml
    
    # Install Ingress
    echo -e "\n${YELLOW}Installing Ingress controller...${NC}"
    kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml
    kubectl label nodes workflowhub-control-plane ingress-ready=true
    
    echo "Waiting for Ingress to be ready..."
    sleep 30
fi
echo -e "${GREEN}✓ Cluster ready${NC}"

# Step 4: Deploy everything
echo -e "\n${YELLOW}Deploying WorkflowHub...${NC}"

# Create namespace
kubectl apply -f k8s/base/namespace.yaml

# Create secrets (dev only)
kubectl create secret generic postgresql-secret -n workflowhub \
    --from-literal=username=workflowhub \
    --from-literal=password=dev-password-123 \
    --from-literal=url="postgresql://workflowhub:dev-password-123@postgresql:5432/workflowhub?sslmode=disable" \
    --dry-run=client -o yaml | kubectl apply -f -

kubectl create secret generic redis-secret -n workflowhub \
    --from-literal=password=dev-redis-123 \
    --dry-run=client -o yaml | kubectl apply -f -

kubectl create secret generic jwt-secret -n workflowhub \
    --from-literal=secret=dev-jwt-secret-min-32-characters-long \
    --from-literal=refresh-secret=dev-jwt-refresh-secret-min-32-chars \
    --dry-run=client -o yaml | kubectl apply -f -

# Deploy services
kubectl apply -f k8s/infrastructure/postgresql/deployment-simple.yaml
kubectl apply -f k8s/apps/frontend/deployment-simple.yaml
kubectl apply -f k8s/apps/ingress-dev.yaml

# Deploy Redis
cat <<EOF | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: workflowhub
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        ports:
        - containerPort: 6379
---
apiVersion: v1
kind: Service
metadata:
  name: redis-master
  namespace: workflowhub
spec:
  selector:
    app: redis
  ports:
  - port: 6379
EOF

echo -e "${GREEN}✓ Services deployed${NC}"

# Step 5: Wait for everything to be ready
echo -e "\n${YELLOW}Waiting for services to start...${NC}"
kubectl wait --for=condition=available --timeout=120s deployment/frontend -n workflowhub || true
kubectl wait --for=condition=available --timeout=120s deployment/postgresql -n workflowhub || true

# Step 6: Show status
echo -e "\n${GREEN}=== DEPLOYMENT STATUS ===${NC}"
kubectl get pods -n workflowhub

# Step 7: Start port forwarding
echo -e "\n${YELLOW}Starting port forwarding...${NC}"
# Kill any existing port forwards
pkill -f "port-forward.*8081" || true
pkill -f "port-forward.*5432" || true

# Start new port forwards
kubectl port-forward svc/frontend 8081:80 -n workflowhub > /dev/null 2>&1 &
kubectl port-forward svc/postgresql 5432:5432 -n workflowhub > /dev/null 2>&1 &

sleep 3

# Final message
echo -e "\n${GREEN}🎉 WorkflowHub is ready!${NC}"
echo ""
echo "Access the application at:"
echo -e "  ${GREEN}http://localhost:8081${NC}"
echo ""
echo "Database connection:"
echo -e "  Host: ${GREEN}localhost:5432${NC}"
echo -e "  User: ${GREEN}workflowhub${NC}"
echo -e "  Pass: ${GREEN}dev-password-123${NC}"
echo ""
echo "To stop port forwarding, run:"
echo -e "  ${YELLOW}pkill -f port-forward${NC}"
echo ""
echo "To delete everything, run:"
echo -e "  ${YELLOW}kind delete cluster --name workflowhub${NC}"