#!/bin/bash

# Simple start script for WorkflowHub in Kubernetes

echo "🚀 Starting WorkflowHub..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop first."
    exit 1
fi

# Check if kind cluster exists
if ! kind get clusters | grep -q workflowhub; then
    echo "📦 Creating Kubernetes cluster..."
    kind create cluster --name workflowhub
fi

# Switch to cluster context
kubectl config use-context kind-workflowhub

# Build the app (use existing build if present)
if [ ! -d "build" ]; then
    echo "🔨 Building application..."
    pnpm run build
fi

# Create simple server that works
cat > server-k8s.js << 'EOF'
const express = require('express');
const { createRequestHandler } = require('@remix-run/express');

const app = express();

app.use(express.static('build/client'));
app.use(express.static('public'));

app.all('*', createRequestHandler({
  build: require('./build/server'),
  mode: process.env.NODE_ENV
}));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
EOF

# Create simple Dockerfile
cat > Dockerfile.simple << 'EOF'
FROM node:20-alpine
WORKDIR /app

# Copy everything
COPY . .

# Install dependencies
RUN npm install express compression morgan @remix-run/express

EXPOSE 3000
CMD ["node", "server-k8s.js"]
EOF

# Build Docker image
echo "🐳 Building Docker image..."
docker build -f Dockerfile.simple -t workflowhub:latest .

# Load into kind
echo "📤 Loading image into Kubernetes..."
kind load docker-image workflowhub:latest --name workflowhub

# Deploy to Kubernetes
echo "🚀 Deploying to Kubernetes..."
kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: workflowhub
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
        image: workflowhub:latest
        imagePullPolicy: Never
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: SUPABASE_URL
          value: "https://cbesetqaazrqiqxeofwz.supabase.co"
        - name: SUPABASE_ANON_KEY
          value: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNiZXNldHFhYXpycWlxeGVvZnd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM1NTAzNDEsImV4cCI6MjA0OTEyNjM0MX0.1BXs4NOilcqFH0i-3H5BVIGPNvxKz0mSl2LXMcrRaWk"
        - name: SUPABASE_SERVICE_KEY
          value: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNiZXNldHFhYXpycWlxeGVvZnd6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMzU1MDM0MSwiZXhwIjoyMDQ5MTI2MzQxfQ.rNLb8AojMxL5B78UM_U0eFrOy88YBdV7D1RKLfKdP4Q"
        - name: ANTHROPIC_API_KEY
          value: "sk-ant-api03-t75Vxp6Rc11J7u8n8fT5gWO7cHJnrxo7Yz17v4nJCXYgJaW3T-qLK5sEa4RP-sLPQJJSyaOHG5MFiQ-n5NHVA-CwIdVQAA"
---
apiVersion: v1
kind: Service
metadata:
  name: workflowhub
spec:
  selector:
    app: workflowhub
  ports:
  - port: 80
    targetPort: 3000
EOF

# Wait for deployment
echo "⏳ Waiting for deployment..."
kubectl wait --for=condition=available --timeout=60s deployment/workflowhub

# Start port forwarding
echo "🌐 Starting port forwarding..."
kubectl port-forward service/workflowhub 8080:80 &
PF_PID=$!

echo "
✅ WorkflowHub is running!

📍 Access at: http://localhost:8080

To view logs in another terminal:
kubectl logs -f -l app=workflowhub

To stop everything:
./k8s/stop.sh
"

# Keep script running to maintain port forward
wait $PF_PID