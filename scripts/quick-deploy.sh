#!/bin/bash
set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}WorkflowHub Quick Deployment Script${NC}"
echo "===================================="

# Check if cluster exists
if ! kubectl cluster-info --context kind-workflowhub &> /dev/null; then
    echo -e "${RED}Error: kind cluster 'workflowhub' not found${NC}"
    echo "Run: make dev-cluster"
    exit 1
fi

echo -e "${GREEN}✓ Kubernetes cluster is running${NC}"

# Apply base resources
echo -e "${YELLOW}Creating base resources...${NC}"
kubectl apply -f k8s/base/namespace.yaml
kubectl apply -f k8s/base/rbac.yaml

# Create demo secrets (for development only)
echo -e "${YELLOW}Creating development secrets...${NC}"
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

kubectl create secret generic elasticsearch-secret -n workflowhub \
    --from-literal=username=elastic \
    --from-literal=password=dev-elastic-123 \
    --dry-run=client -o yaml | kubectl apply -f -

kubectl create secret generic rabbitmq-secret -n workflowhub \
    --from-literal=url="amqp://workflowhub:dev-rabbitmq-123@rabbitmq:5672" \
    --dry-run=client -o yaml | kubectl apply -f -

kubectl create secret generic azure-ad-secret -n workflowhub \
    --from-literal=tenant-id=dummy-tenant-id \
    --from-literal=client-id=dummy-client-id \
    --from-literal=client-secret=dummy-client-secret \
    --dry-run=client -o yaml | kubectl apply -f -

echo -e "${GREEN}✓ Secrets created${NC}"

# Deploy PostgreSQL
echo -e "${YELLOW}Deploying PostgreSQL...${NC}"
kubectl apply -f k8s/infrastructure/postgresql/configmap.yaml
kubectl apply -f k8s/infrastructure/postgresql/statefulset.yaml

# Deploy Redis (using bitnami helm chart would be better, but for quick setup)
echo -e "${YELLOW}Deploying Redis...${NC}"
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
        env:
        - name: REDIS_PASSWORD
          valueFrom:
            secretKeyRef:
              name: redis-secret
              key: password
        command: ["redis-server"]
        args: ["--requirepass", "\$(REDIS_PASSWORD)"]
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
    targetPort: 6379
EOF

echo -e "${GREEN}✓ Infrastructure deployed${NC}"

# Build and load images (for demo, using nginx as placeholder)
echo -e "${YELLOW}Loading placeholder images...${NC}"
# In real deployment, you would build and load actual images:
# make build-all
# kind load docker-image workflowhub/frontend:latest --name workflowhub
# etc...

# For now, we'll use nginx as a placeholder
docker pull nginx:alpine
docker tag nginx:alpine workflowhub/frontend:latest
docker tag nginx:alpine workflowhub/builder-api:latest
docker tag nginx:alpine workflowhub/workflow-engine:latest
docker tag nginx:alpine workflowhub/auth-service:latest
docker tag nginx:alpine workflowhub/audit-service:latest

kind load docker-image workflowhub/frontend:latest --name workflowhub
kind load docker-image workflowhub/builder-api:latest --name workflowhub
kind load docker-image workflowhub/workflow-engine:latest --name workflowhub
kind load docker-image workflowhub/auth-service:latest --name workflowhub
kind load docker-image workflowhub/audit-service:latest --name workflowhub

echo -e "${GREEN}✓ Images loaded${NC}"

# Deploy applications
echo -e "${YELLOW}Deploying applications...${NC}"
kubectl apply -f k8s/apps/builder-api/deployment.yaml
kubectl apply -f k8s/apps/frontend/deployment.yaml
kubectl apply -f k8s/apps/ingress.yaml

echo -e "${GREEN}✓ Applications deployed${NC}"

# Wait for deployments
echo -e "${YELLOW}Waiting for deployments to be ready...${NC}"
kubectl wait --for=condition=available --timeout=300s deployment/frontend -n workflowhub || true
kubectl wait --for=condition=available --timeout=300s deployment/builder-api -n workflowhub || true

# Show status
echo ""
echo -e "${GREEN}Deployment Status:${NC}"
kubectl get pods -n workflowhub
echo ""
kubectl get svc -n workflowhub
echo ""
kubectl get ingress -n workflowhub

echo ""
echo -e "${GREEN}✅ Quick deployment complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Build actual service images: make build-all"
echo "2. Load them into kind: kind load docker-image <image> --name workflowhub"
echo "3. Restart deployments: kubectl rollout restart deployment -n workflowhub"
echo ""
echo "Access the application:"
echo "- Frontend: http://localhost"
echo "- API: http://localhost/api"
echo ""
echo "Monitor pods: kubectl get pods -n workflowhub -w"