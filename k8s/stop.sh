#!/bin/bash

# Simple stop script for WorkflowHub

echo "🛑 Stopping WorkflowHub..."

# Kill port forwarding
pkill -f "kubectl port-forward" || true

# Delete the deployment
kubectl delete deployment workflowhub --ignore-not-found
kubectl delete service workflowhub --ignore-not-found

# Optionally delete the cluster (uncomment if you want to clean everything)
# kind delete cluster --name workflowhub

echo "✅ WorkflowHub stopped"
echo ""
echo "To completely remove the Kubernetes cluster:"
echo "kind delete cluster --name workflowhub"