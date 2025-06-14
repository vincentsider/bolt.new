#!/bin/bash
# WorkflowHub - Complete Kubernetes Development Deploy

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 WorkflowHub Kubernetes Development Deploy${NC}"
echo "==========================================="

# Step 1: Check prerequisites
echo -e "\n${YELLOW}1. Checking prerequisites...${NC}"

# Check Docker
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running!${NC}"
    echo "Please start Docker Desktop and run this script again."
    exit 1
fi
echo -e "${GREEN}✓ Docker is running${NC}"

# Check/Install tools
for tool in kind kubectl; do
    if ! command -v $tool &> /dev/null; then
        echo "Installing $tool..."
        brew install $tool
    fi
done
echo -e "${GREEN}✓ All tools installed${NC}"

# Step 2: Build the WorkflowHub application
echo -e "\n${YELLOW}2. Building WorkflowHub application...${NC}"

# Build the Docker image
docker build -t workflowhub/app:latest -f k8s/Dockerfile.app .
echo -e "${GREEN}✓ Application built successfully${NC}"

# Step 3: Create/Update Kubernetes cluster
echo -e "\n${YELLOW}3. Setting up Kubernetes cluster...${NC}"

if ! kind get clusters | grep -q workflowhub; then
    echo "Creating new cluster..."
    kind create cluster --name workflowhub --config k8s/kind-config-simple.yaml
    
    echo "Installing NGINX Ingress..."
    kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml
    kubectl label nodes workflowhub-control-plane ingress-ready=true
    
    echo "Waiting for ingress controller..."
    kubectl wait --namespace ingress-nginx \
        --for=condition=ready pod \
        --selector=app.kubernetes.io/component=controller \
        --timeout=90s
else
    echo "Using existing cluster..."
fi
echo -e "${GREEN}✓ Kubernetes cluster ready${NC}"

# Step 4: Load image into kind
echo -e "\n${YELLOW}4. Loading application image into cluster...${NC}"
kind load docker-image workflowhub/app:latest --name workflowhub
echo -e "${GREEN}✓ Image loaded${NC}"

# Step 5: Create namespace and secrets
echo -e "\n${YELLOW}5. Setting up namespace and secrets...${NC}"

# Create namespace
kubectl apply -f - <<EOF
apiVersion: v1
kind: Namespace
metadata:
  name: workflowhub
EOF

# Create secrets
kubectl create secret generic app-secrets -n workflowhub \
    --from-literal=DATABASE_URL="postgresql://workflowhub:dev-password@postgresql:5432/workflowhub" \
    --from-literal=REDIS_URL="redis://:dev-redis@redis:6379" \
    --from-literal=JWT_SECRET="dev-jwt-secret-32-chars-minimum-length" \
    --from-literal=SESSION_SECRET="dev-session-secret-32-chars-minimum" \
    --dry-run=client -o yaml | kubectl apply -f -

echo -e "${GREEN}✓ Namespace and secrets created${NC}"

# Step 6: Deploy database services
echo -e "\n${YELLOW}6. Deploying database services...${NC}"

# PostgreSQL
kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgresql
  namespace: workflowhub
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgresql
  template:
    metadata:
      labels:
        app: postgresql
    spec:
      containers:
      - name: postgresql
        image: postgres:15-alpine
        env:
        - name: POSTGRES_USER
          value: workflowhub
        - name: POSTGRES_PASSWORD
          value: dev-password
        - name: POSTGRES_DB
          value: workflowhub
        ports:
        - containerPort: 5432
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
      volumes:
      - name: data
        emptyDir: {}
---
apiVersion: v1
kind: Service
metadata:
  name: postgresql
  namespace: workflowhub
spec:
  selector:
    app: postgresql
  ports:
  - port: 5432
    targetPort: 5432
EOF

# Redis
kubectl apply -f - <<EOF
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
        command: ["redis-server", "--requirepass", "dev-redis"]
        ports:
        - containerPort: 6379
---
apiVersion: v1
kind: Service
metadata:
  name: redis
  namespace: workflowhub
spec:
  selector:
    app: redis
  ports:
  - port: 6379
    targetPort: 6379
EOF

echo -e "${GREEN}✓ Database services deployed${NC}"

# Step 7: Deploy WorkflowHub application
echo -e "\n${YELLOW}7. Deploying WorkflowHub application...${NC}"

kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: workflowhub
  namespace: workflowhub
  labels:
    app: workflowhub
spec:
  replicas: 2
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
        image: workflowhub/app:latest
        imagePullPolicy: Never
        ports:
        - containerPort: 3000
          name: http
        env:
        - name: NODE_ENV
          value: production
        - name: PORT
          value: "3000"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: DATABASE_URL
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: REDIS_URL
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: JWT_SECRET
        - name: SESSION_SECRET
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: SESSION_SECRET
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
        resources:
          requests:
            memory: "256Mi"
            cpu: "200m"
          limits:
            memory: "512Mi"
            cpu: "500m"
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
  - host: workflowhub.local
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: workflowhub
            port:
              number: 80
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

echo -e "${GREEN}✓ WorkflowHub application deployed${NC}"

# Step 8: Wait for deployments
echo -e "\n${YELLOW}8. Waiting for services to be ready...${NC}"

kubectl wait --for=condition=available --timeout=120s deployment/postgresql -n workflowhub
kubectl wait --for=condition=available --timeout=120s deployment/redis -n workflowhub
kubectl wait --for=condition=available --timeout=120s deployment/workflowhub -n workflowhub

echo -e "${GREEN}✓ All services are ready${NC}"

# Step 9: Add hosts entry
echo -e "\n${YELLOW}9. Setting up local access...${NC}"

if ! grep -q "workflowhub.local" /etc/hosts; then
    echo "Adding workflowhub.local to /etc/hosts (requires sudo)..."
    echo "127.0.0.1 workflowhub.local" | sudo tee -a /etc/hosts
fi

# Step 10: Show status and access info
echo -e "\n${BLUE}============================================${NC}"
echo -e "${GREEN}🎉 WorkflowHub is now running in Kubernetes!${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""
echo -e "Access the application at:"
echo -e "  ${GREEN}http://workflowhub.local${NC}"
echo -e "  ${GREEN}http://localhost${NC}"
echo ""
echo -e "View application logs:"
echo -e "  ${YELLOW}kubectl logs -f deployment/workflowhub -n workflowhub${NC}"
echo ""
echo -e "Check deployment status:"
echo -e "  ${YELLOW}kubectl get pods -n workflowhub${NC}"
echo ""
echo -e "Port forward for direct access:"
echo -e "  ${YELLOW}kubectl port-forward svc/workflowhub 8080:80 -n workflowhub${NC}"
echo -e "  Then visit: ${GREEN}http://localhost:8080${NC}"
echo ""
echo -e "To completely remove everything:"
echo -e "  ${YELLOW}kind delete cluster --name workflowhub${NC}"

# Show current status
echo -e "\n${BLUE}Current deployment status:${NC}"
kubectl get pods -n workflowhub