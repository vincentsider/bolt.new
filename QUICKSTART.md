# WorkflowHub - Quick Start

## Run WorkflowHub in Production-Like Kubernetes (Recommended)

### Prerequisites
1. **Docker Desktop** must be running
2. **macOS** (the scripts use brew to install tools)

### Deploy Everything with One Command
```bash
./k8s-deploy.sh
```

This automatically:
- Builds the WorkflowHub Docker image
- Creates a local Kubernetes cluster
- Deploys PostgreSQL & Redis
- Deploys WorkflowHub (2 replicas)
- Sets up load balancing & ingress

### Access the Application
Open: **http://workflowhub.local** or **http://localhost**

### After Making Code Changes
```bash
./k8s-rebuild.sh
```
This rebuilds and redeploys your changes.

### View Logs
```bash
kubectl logs -f deployment/workflowhub -n workflowhub
```

### Check Status
```bash
kubectl get pods -n workflowhub
```

---

## Alternative: Simple Dev Mode (No Kubernetes)

If you just want to quickly run without Kubernetes:
```bash
pnpm install
pnpm run dev
```
Open: **http://localhost:5173**

**Note**: This doesn't include PostgreSQL, Redis, or other production services.

## Common Commands

### Check if everything is running
```bash
kubectl get pods -n workflowhub
```

### View logs
```bash
kubectl logs -f deployment/frontend -n workflowhub
```

### Restart a service
```bash
kubectl rollout restart deployment/frontend -n workflowhub
```

### Stop everything
```bash
# Stop port forwarding
pkill -f port-forward

# Delete the entire cluster
kind delete cluster --name workflowhub
```

### Start again
```bash
./launch.sh
```

## Troubleshooting

**"Docker is not running"**
→ Open Docker Desktop and wait for it to start

**"bind: address already in use"**
→ Run: `pkill -f port-forward` then try again

**"Pods are not ready"**
→ Wait 30 seconds, they're still starting

**Can't access http://localhost:8081**
→ Run: `kubectl port-forward svc/frontend 8081:80 -n workflowhub`

## That's It!
You now have a full Kubernetes environment running WorkflowHub locally.