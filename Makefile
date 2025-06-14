# WorkflowHub Kubernetes Makefile
.PHONY: help build push deploy clean test

# Variables
REGISTRY ?= docker.io/workflowhub
VERSION ?= latest
NAMESPACE ?= workflowhub
ENVIRONMENT ?= development

# Color output
RED=\033[0;31m
GREEN=\033[0;32m
YELLOW=\033[1;33m
NC=\033[0m # No Color

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# Check prerequisites
check-docker:
	@if ! docker info > /dev/null 2>&1; then \
		echo "$(RED)Error: Docker is not running$(NC)"; \
		echo "Please start Docker Desktop and try again"; \
		exit 1; \
	fi

check-tools:
	@echo "$(YELLOW)Checking required tools...$(NC)"
	@which docker > /dev/null || (echo "$(RED)Docker not found. Run: ./scripts/setup-dev.sh$(NC)" && exit 1)
	@which kind > /dev/null || (echo "$(RED)kind not found. Run: ./scripts/setup-dev.sh$(NC)" && exit 1)
	@which kubectl > /dev/null || (echo "$(RED)kubectl not found. Run: ./scripts/setup-dev.sh$(NC)" && exit 1)
	@which helm > /dev/null || (echo "$(RED)helm not found. Run: ./scripts/setup-dev.sh$(NC)" && exit 1)
	@echo "$(GREEN)All tools are installed!$(NC)"

setup-tools: ## Install required development tools
	@echo "$(YELLOW)Setting up development tools...$(NC)"
	@./scripts/setup-dev.sh

# Development
dev-cluster: check-docker check-tools ## Create local k8s cluster (kind)
	@echo "$(YELLOW)Creating local Kubernetes cluster...$(NC)"
	@if kind get clusters | grep -q workflowhub; then \
		echo "$(YELLOW)Cluster already exists, skipping creation$(NC)"; \
	else \
		kind create cluster --name workflowhub --config k8s/kind-config-simple.yaml; \
		echo "$(GREEN)Cluster created!$(NC)"; \
		echo "$(YELLOW)Installing NGINX Ingress...$(NC)"; \
		kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml; \
		kubectl label nodes workflowhub-control-plane ingress-ready=true; \
		echo "$(GREEN)Waiting for ingress controller...$(NC)"; \
		sleep 30; \
	fi

dev-setup: dev-cluster ## Setup development environment
	@echo "$(YELLOW)Installing Istio...$(NC)"
	istioctl install --set profile=demo -y
	kubectl label namespace default istio-injection=enabled
	@echo "$(YELLOW)Installing cert-manager...$(NC)"
	kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
	@echo "$(GREEN)Development environment ready!$(NC)"

# Building
build-frontend: ## Build frontend image
	@echo "$(YELLOW)Building frontend...$(NC)"
	docker build -t $(REGISTRY)/frontend:$(VERSION) -f Dockerfile.frontend .

build-builder-api: ## Build builder API image
	@echo "$(YELLOW)Building builder API...$(NC)"
	docker build -t $(REGISTRY)/builder-api:$(VERSION) -f services/builder-api/Dockerfile services/builder-api

build-workflow-engine: ## Build workflow engine image
	@echo "$(YELLOW)Building workflow engine...$(NC)"
	docker build -t $(REGISTRY)/workflow-engine:$(VERSION) -f services/workflow-engine/Dockerfile services/workflow-engine

build-auth-service: ## Build auth service image
	@echo "$(YELLOW)Building auth service...$(NC)"
	docker build -t $(REGISTRY)/auth-service:$(VERSION) -f services/auth-service/Dockerfile services/auth-service

build-audit-service: ## Build audit service image
	@echo "$(YELLOW)Building audit service...$(NC)"
	docker build -t $(REGISTRY)/audit-service:$(VERSION) -f services/audit-service/Dockerfile services/audit-service

build-all: build-frontend build-builder-api build-workflow-engine build-auth-service build-audit-service ## Build all images

# Pushing
push-all: ## Push all images to registry
	@echo "$(YELLOW)Pushing images to registry...$(NC)"
	docker push $(REGISTRY)/frontend:$(VERSION)
	docker push $(REGISTRY)/builder-api:$(VERSION)
	docker push $(REGISTRY)/workflow-engine:$(VERSION)
	docker push $(REGISTRY)/auth-service:$(VERSION)
	docker push $(REGISTRY)/audit-service:$(VERSION)
	@echo "$(GREEN)All images pushed!$(NC)"

# Deployment
deploy-base: ## Deploy base resources (namespaces, CRDs)
	@echo "$(YELLOW)Deploying base resources...$(NC)"
	kubectl apply -f k8s/base/

deploy-infrastructure: ## Deploy infrastructure (DB, Redis, etc)
	@echo "$(YELLOW)Deploying infrastructure...$(NC)"
	kubectl apply -k k8s/infrastructure/

deploy-apps: ## Deploy application services
	@echo "$(YELLOW)Deploying applications...$(NC)"
	kubectl apply -k k8s/apps/

deploy-all: deploy-base deploy-infrastructure deploy-apps ## Deploy everything

quick-deploy: ## Quick deployment with placeholder images
	@echo "$(YELLOW)Running quick deployment...$(NC)"
	@./scripts/quick-deploy.sh

# Helm deployment
helm-deps: ## Update Helm dependencies
	@echo "$(YELLOW)Updating Helm dependencies...$(NC)"
	helm dependency update helm/workflowhub

helm-deploy: helm-deps ## Deploy using Helm
	@echo "$(YELLOW)Deploying with Helm...$(NC)"
	helm upgrade --install workflowhub helm/workflowhub \
		--namespace $(NAMESPACE) \
		--create-namespace \
		--values helm/workflowhub/values.yaml \
		--values helm/workflowhub/values-$(ENVIRONMENT).yaml

# Testing
test-unit: ## Run unit tests
	@echo "$(YELLOW)Running unit tests...$(NC)"
	pnpm test

test-integration: ## Run integration tests
	@echo "$(YELLOW)Running integration tests...$(NC)"
	pnpm test:integration

test-e2e: ## Run end-to-end tests
	@echo "$(YELLOW)Running E2E tests...$(NC)"
	pnpm test:e2e

test-security: ## Run security tests
	@echo "$(YELLOW)Running security tests...$(NC)"
	trivy image $(REGISTRY)/frontend:$(VERSION)
	trivy image $(REGISTRY)/builder-api:$(VERSION)

# Monitoring
port-forward-grafana: ## Port forward to Grafana
	kubectl port-forward -n istio-system svc/grafana 3000:3000

port-forward-prometheus: ## Port forward to Prometheus
	kubectl port-forward -n istio-system svc/prometheus 9090:9090

port-forward-jaeger: ## Port forward to Jaeger
	kubectl port-forward -n istio-system svc/tracing 16686:16686

# Cleanup
clean-cluster: ## Delete local k8s cluster
	@echo "$(RED)Deleting local cluster...$(NC)"
	kind delete cluster --name workflowhub

clean-all: clean-cluster ## Clean everything
	@echo "$(RED)Cleaning up...$(NC)"
	docker system prune -af

# Production
prod-deploy: ## Deploy to production (requires confirmation)
	@echo "$(RED)⚠️  WARNING: This will deploy to PRODUCTION$(NC)"
	@echo "Press Ctrl+C to cancel, or Enter to continue..."
	@read confirm
	$(MAKE) helm-deploy ENVIRONMENT=production NAMESPACE=workflowhub

# Utilities
logs: ## Tail logs from all pods
	kubectl logs -f -n $(NAMESPACE) -l app.kubernetes.io/part-of=workflowhub --all-containers=true --prefix=true

status: ## Check deployment status
	@echo "$(YELLOW)Checking deployment status...$(NC)"
	kubectl get all -n $(NAMESPACE)
	@echo ""
	@echo "$(YELLOW)Pod status:$(NC)"
	kubectl get pods -n $(NAMESPACE) -o wide
	@echo ""
	@echo "$(YELLOW)Service endpoints:$(NC)"
	kubectl get endpoints -n $(NAMESPACE)

shell: ## Open shell in builder-api pod
	kubectl exec -it -n $(NAMESPACE) deployment/builder-api -- /bin/sh

# GitOps
argocd-install: ## Install ArgoCD
	kubectl create namespace argocd || true
	kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

argocd-app: ## Create ArgoCD application
	kubectl apply -f k8s/argocd/application.yaml