#!/bin/bash

echo "🔧 Quick fix to get WorkflowHub running..."

# Stop everything first
./k8s/stop.sh

# Build the app
echo "🔨 Building app..."
cd /Users/vincentsider/2-Projects/1-KEY\ PROJECTS/workflowhub
pnpm run build

# Create a working Dockerfile
cat > Dockerfile.working << 'EOF'
FROM node:20-alpine
WORKDIR /app

# Copy package files and install
COPY package*.json ./
COPY pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile

# Copy everything including build
COPY . .

# Simple server
RUN echo 'const express = require("express"); \
const app = express(); \
app.use(express.static("build/client")); \
app.use(express.static("public")); \
app.get("/health", (req, res) => res.json({status: "ok"})); \
app.all("*", (req, res) => { \
  res.sendFile(__dirname + "/build/client/index.html"); \
}); \
app.listen(3000, () => console.log("Server on port 3000"));' > simple-server.js

EXPOSE 3000
CMD ["node", "simple-server.js"]
EOF

# Build Docker image
echo "🐳 Building Docker image..."
docker build -f Dockerfile.working -t workflowhub:working .

# Load into kind
echo "📤 Loading image..."
kind load docker-image workflowhub:working --name workflowhub

# Deploy
echo "🚀 Deploying..."
kubectl apply -f - <<'YAML'
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
        image: workflowhub:working
        imagePullPolicy: Never
        ports:
        - containerPort: 3000
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
YAML

# Wait for it
sleep 5

# Port forward
echo "🌐 Setting up access..."
kubectl port-forward service/workflowhub 8080:80 &

echo "
✅ Done! Try http://localhost:8080

To see logs: kubectl logs -f -l app=workflowhub
To stop: ./k8s/stop.sh
"