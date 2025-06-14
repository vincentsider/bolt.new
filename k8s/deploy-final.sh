#!/bin/bash

echo "🚀 Final WorkflowHub Kubernetes Deployment"
echo "=========================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

cd /Users/vincentsider/2-Projects/1-KEY\ PROJECTS/workflowhub

# Clean up old stuff
echo -e "${YELLOW}Cleaning up...${NC}"
pkill -f "kubectl port-forward" || true
kubectl delete deployment workflowhub --ignore-not-found
kubectl delete service workflowhub --ignore-not-found

# Build the app
echo -e "${YELLOW}Building application...${NC}"
pnpm run build

# Build Docker image
echo -e "${YELLOW}Building Docker image...${NC}"
docker build -f Dockerfile.production -t workflowhub:production .

# Load to kind
echo -e "${YELLOW}Loading image to Kubernetes...${NC}"
kind load docker-image workflowhub:production --name workflowhub

# Deploy
echo -e "${YELLOW}Deploying to Kubernetes...${NC}"
kubectl apply -f - <<'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: workflowhub
  labels:
    app: workflowhub
spec:
  replicas: 1
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
        image: workflowhub:production
        imagePullPolicy: Never
        ports:
        - containerPort: 3000
          name: http
        env:
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "3000"
        - name: SUPABASE_URL
          value: "https://cbesetqaazrqiqxeofwz.supabase.co"
        - name: SUPABASE_ANON_KEY
          value: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNiZXNldHFhYXpycWlxeGVvZnd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM1NTAzNDEsImV4cCI6MjA0OTEyNjM0MX0.1BXs4NOilcqFH0i-3H5BVIGPNvxKz0mSl2LXMcrRaWk"
        - name: SUPABASE_SERVICE_KEY
          value: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNiZXNldHFhYXpycWlxeGVvZnd6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMzU1MDM0MSwiZXhwIjoyMDQ5MTI2MzQxfQ.rNLb8AojMxL5B78UM_U0eFrOy88YBdV7D1RKLfKdP4Q"
        - name: ANTHROPIC_API_KEY
          value: "sk-ant-api03-t75Vxp6Rc11J7u8n8fT5gWO7cHJnrxo7Yz17v4nJCXYgJaW3T-qLK5sEa4RP-sLPQJJSyaOHG5MFiQ-n5NHVA-CwIdVQAA"
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
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: workflowhub
spec:
  selector:
    app: workflowhub
  ports:
  - name: http
    port: 80
    targetPort: 3000
    protocol: TCP
  type: ClusterIP
EOF

# Wait for deployment
echo -e "${YELLOW}Waiting for deployment to be ready...${NC}"
kubectl wait --for=condition=available deployment/workflowhub --timeout=120s

# Get pod status
kubectl get pods -l app=workflowhub

# Start port forwarding
echo -e "${YELLOW}Starting port forwarding...${NC}"
kubectl port-forward service/workflowhub 9090:80 &
PF_PID=$!

sleep 3

# Test the deployment
echo -e "${YELLOW}Testing deployment...${NC}"
if curl -s -f http://localhost:9090/health > /dev/null; then
    echo -e "${GREEN}✅ Health check passed!${NC}"
    echo -e "${GREEN}✅ WorkflowHub is running at: http://localhost:9090${NC}"
else
    echo -e "${YELLOW}⚠️  Health check failed, checking logs...${NC}"
    kubectl logs -l app=workflowhub --tail=20
fi

echo ""
echo "Commands:"
echo "  View logs:  kubectl logs -f -l app=workflowhub"
echo "  Stop:       kill $PF_PID && kubectl delete deployment workflowhub"
echo ""

# Keep running
wait $PF_PID