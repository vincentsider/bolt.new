# WorkflowHub Kubernetes Development Environment

## 🚀 Quick Start

### The Real Situation

**WorkflowHub is built for Cloudflare Workers**, not traditional servers. This makes Kubernetes deployment complex without major refactoring.

### Recommended: Local Development
```bash
pnpm install
pnpm run dev
```
Open: **http://localhost:5173**

This gives you:
- Hot reloading
- Full application functionality
- No Docker/Kubernetes complexity

### Why Kubernetes Deployment is Challenging

1. **Runtime Mismatch**: App uses Cloudflare Workers runtime (`workerd`), not Node.js
2. **Dependencies**: Built with `@remix-run/cloudflare`, not `@remix-run/node`
3. **Build Output**: Expects Cloudflare Workers environment

### Current Kubernetes Status

The `./k8s-deploy.sh` script will:
- ✅ Create a Kubernetes cluster
- ✅ Deploy PostgreSQL and Redis
- ❌ Fail to run WorkflowHub (due to Cloudflare Workers dependencies)

### Options

1. **For Development**: Use `pnpm run dev` (recommended)
2. **For Production**: Deploy to Cloudflare Workers
3. **For Kubernetes**: Would require significant refactoring to use Node.js instead of Workers

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Kind Cluster                          │
├─────────────────────────────────────────────────────────┤
│  Control Plane Node                                     │
│  - API Server                                          │
│  - Controller Manager                                  │
│  - Scheduler                                          │
│  - NGINX Ingress Controller                          │
├─────────────────────────────────────────────────────────┤
│  Worker Node 1                    Worker Node 2        │
│  - Frontend Pod                   - PostgreSQL Pod     │
│  - Builder API Pod                - Redis Pod          │
│  - Workflow Engine Pod            - Audit Service Pod  │
└─────────────────────────────────────────────────────────┘
```

## Prerequisites

### Required Tools
- Docker Desktop (must be running)
- kind (Kubernetes in Docker)
- kubectl (Kubernetes CLI)
- helm (Kubernetes package manager)

### Installation

```bash
# macOS
brew install kind kubectl helm

# Linux
curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.20.0/kind-linux-amd64
chmod +x ./kind
sudo mv ./kind /usr/local/bin/kind

# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl
sudo mv kubectl /usr/local/bin/

# Install Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

## Quick Start

### 1. Create Kubernetes Cluster

```bash
# Check Docker is running
docker info

# Create the cluster
make dev-cluster

# Or manually:
kind create cluster --name workflowhub --config k8s/kind-config-simple.yaml
```

### 2. Verify Cluster

```bash
# Check cluster info
kubectl cluster-info --context kind-workflowhub

# Check nodes
kubectl get nodes

# Expected output:
NAME                        STATUS   ROLES           AGE   VERSION
workflowhub-control-plane   Ready    control-plane   5m    v1.33.1
workflowhub-worker          Ready    <none>          5m    v1.33.1
workflowhub-worker2         Ready    <none>          5m    v1.33.1
```

### 3. Deploy Infrastructure

```bash
# Quick deployment with placeholder images
make quick-deploy

# Or step by step:
kubectl apply -f k8s/base/namespace.yaml
kubectl apply -f k8s/base/rbac.yaml
kubectl apply -f k8s/infrastructure/
kubectl apply -f k8s/apps/
```

### 4. Check Deployment Status

```bash
# Watch pods come up
kubectl get pods -n workflowhub -w

# Check all resources
kubectl get all -n workflowhub
```

## Accessing Services

### Frontend Application

```bash
# Option 1: Port forwarding
kubectl port-forward svc/frontend 8081:80 -n workflowhub
# Access at: http://localhost:8081

# Option 2: Via Ingress (requires /etc/hosts entry)
echo "127.0.0.1 app.workflowhub.local" | sudo tee -a /etc/hosts
# Access at: http://app.workflowhub.local
```

### PostgreSQL Database

```bash
# Port forward to access from local tools
kubectl port-forward svc/postgresql 5432:5432 -n workflowhub

# Connect with psql
psql -h localhost -U workflowhub -d workflowhub
# Password: dev-password-123
```

### Redis Cache

```bash
# Port forward
kubectl port-forward svc/redis-master 6379:6379 -n workflowhub

# Connect with redis-cli
redis-cli -h localhost -a dev-redis-123
```

## Development Workflow

### 1. Make Code Changes

Edit your code in the local repository.

### 2. Build Docker Images

```bash
# Build specific service
make build-frontend
make build-builder-api
make build-workflow-engine
make build-auth-service
make build-audit-service

# Or build all
make build-all
```

### 3. Load Images into Kind

```bash
# Load single image
kind load docker-image workflowhub/frontend:latest --name workflowhub

# Load all images (create this script)
for service in frontend builder-api workflow-engine auth-service audit-service; do
  kind load docker-image workflowhub/${service}:latest --name workflowhub
done
```

### 4. Update Deployment

```bash
# Restart deployment to use new image
kubectl rollout restart deployment/frontend -n workflowhub

# Watch the rollout
kubectl rollout status deployment/frontend -n workflowhub
```

## Useful Commands

### Viewing Logs

```bash
# Single pod logs
kubectl logs deployment/frontend -n workflowhub

# Follow logs
kubectl logs -f deployment/frontend -n workflowhub

# All pods logs
kubectl logs -n workflowhub -l app=frontend --all-containers=true

# Using stern (install: brew install stern)
stern -n workflowhub frontend
```

### Debugging

```bash
# Describe pod (shows events)
kubectl describe pod <pod-name> -n workflowhub

# Get pod YAML
kubectl get pod <pod-name> -n workflowhub -o yaml

# Execute commands in pod
kubectl exec -it deployment/frontend -n workflowhub -- sh

# Check pod resource usage
kubectl top pods -n workflowhub
```

### Port Forwarding

```bash
# Find available ports first
lsof -i :8080  # Check if port is in use

# Kill existing port forward
pkill -f "port-forward.*8080"

# Forward to different port
kubectl port-forward svc/frontend 8081:80 -n workflowhub
```

## Monitoring

### Kubernetes Dashboard

```bash
# Deploy dashboard
kubectl apply -f https://raw.githubusercontent.com/kubernetes/dashboard/v2.7.0/aio/deploy/recommended.yaml

# Create admin user
kubectl create serviceaccount -n kubernetes-dashboard admin-user
kubectl create clusterrolebinding -n kubernetes-dashboard admin-user --clusterrole cluster-admin --serviceaccount=kubernetes-dashboard:admin-user

# Get token
kubectl -n kubernetes-dashboard create token admin-user

# Start proxy
kubectl proxy

# Access at: http://localhost:8001/api/v1/namespaces/kubernetes-dashboard/services/https:kubernetes-dashboard:/proxy/
```

### K9s (Terminal UI)

```bash
# Install
brew install k9s

# Run
k9s -n workflowhub
```

## Troubleshooting

### Common Issues

#### 1. Pods in ImagePullBackOff

```bash
# Check which image is failing
kubectl describe pod <pod-name> -n workflowhub

# Ensure image is loaded in kind
docker images | grep workflowhub
kind load docker-image <image-name> --name workflowhub
```

#### 2. Pods in CrashLoopBackOff

```bash
# Check logs
kubectl logs <pod-name> -n workflowhub --previous

# Check resource limits
kubectl describe pod <pod-name> -n workflowhub | grep -A 5 "Limits:"
```

#### 3. Service Not Accessible

```bash
# Check service endpoints
kubectl get endpoints -n workflowhub

# Check service selector matches pod labels
kubectl get svc frontend -n workflowhub -o yaml
kubectl get pods -n workflowhub --show-labels
```

#### 4. Ingress Not Working

```bash
# Check ingress controller is running
kubectl get pods -n ingress-nginx

# Check ingress resource
kubectl describe ingress -n workflowhub

# Test with curl
curl -H "Host: app.workflowhub.local" localhost
```

### Reset Environment

```bash
# Delete and recreate cluster
kind delete cluster --name workflowhub
make dev-cluster
make quick-deploy
```

## Environment Variables

The following environment variables are used in the development environment:

```bash
# Database
DATABASE_URL=postgresql://workflowhub:dev-password-123@postgresql:5432/workflowhub

# Redis
REDIS_HOST=redis-master
REDIS_PORT=6379
REDIS_PASSWORD=dev-redis-123

# JWT
JWT_SECRET=dev-jwt-secret-min-32-characters-long
JWT_REFRESH_SECRET=dev-jwt-refresh-secret-min-32-chars

# Services
API_URL=http://builder-api
AUTH_URL=http://auth-service
```

## Security Notes

⚠️ **Development Only Configuration**

The current setup uses:
- Hardcoded passwords (dev-password-123, etc.)
- Self-signed certificates
- Permissive network policies
- Debug logging enabled

**Never use these configurations in production!**

## Current Status

✅ **What's Working:**

1. **Kind cluster** with 3 nodes (1 control plane + 2 workers)
2. **NGINX Ingress Controller** installed and running
3. **Basic services deployed**:
   - Frontend (nginx placeholder) - accessible via port-forward
   - PostgreSQL database
   - Redis cache
4. **Namespaces and RBAC** configured
5. **Development secrets** created

📝 **Quick Commands:**

```bash
# Check pods
kubectl get pods -n workflowhub

# Access frontend (use different port if 8080 is busy)
kubectl port-forward svc/frontend 8081:80 -n workflowhub
# Then visit: http://localhost:8081

# View logs
kubectl logs -f deployment/frontend -n workflowhub
```

## Next Steps

1. **Build Actual Service Images**
   ```bash
   make build-frontend
   make build-builder-api
   make build-workflow-engine
   make build-auth-service
   make build-audit-service
   ```

2. **Load Images into Kind**
   ```bash
   kind load docker-image workflowhub/frontend:latest --name workflowhub
   # Repeat for other services
   ```

3. **Update Deployments**
   - Replace placeholder nginx images with actual service images
   - Configure proper environment variables
   - Set up inter-service communication

4. **Add Monitoring Stack**
   - Deploy Prometheus for metrics
   - Deploy Grafana for visualization
   - Set up alerts

5. **Enable Service Mesh**
   - Install Istio for mTLS between services
   - Configure traffic management
   - Enable distributed tracing

## Useful Resources

- [Kind Documentation](https://kind.sigs.k8s.io/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [kubectl Cheat Sheet](https://kubernetes.io/docs/reference/kubectl/cheatsheet/)
- [Helm Documentation](https://helm.sh/docs/)