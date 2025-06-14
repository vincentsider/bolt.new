#!/bin/bash

echo "🚀 Final working solution..."

# Stop everything
pkill -f "kubectl port-forward" || true
kubectl delete deployment workflowhub --ignore-not-found
kubectl delete service workflowhub --ignore-not-found

# Create a simple server that works
cd /Users/vincentsider/2-Projects/1-KEY\ PROJECTS/workflowhub

cat > server-final.cjs << 'EOF'
const express = require('express');
const path = require('path');
const app = express();

// Serve static files
app.use(express.static('build/client'));
app.use(express.static('public'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Serve index.html for all routes (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build/client/index.html'));
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
EOF

# Create Dockerfile
cat > Dockerfile.final << 'EOF'
FROM node:20-alpine
WORKDIR /app

# Copy everything
COPY . .

# Install express
RUN npm install express

EXPOSE 3000
CMD ["node", "server-final.cjs"]
EOF

# Build and deploy
docker build -f Dockerfile.final -t workflowhub:final .
kind load docker-image workflowhub:final --name workflowhub

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
        image: workflowhub:final
        imagePullPolicy: Never
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
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

echo "⏳ Waiting for deployment..."
sleep 10

echo "🌐 Starting port forwarding..."
kubectl port-forward service/workflowhub 8080:80
