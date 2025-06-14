#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}WorkflowHub Development Environment Setup${NC}"
echo "=========================================="

# Detect OS
OS="$(uname -s)"
case "${OS}" in
    Linux*)     OS_TYPE=Linux;;
    Darwin*)    OS_TYPE=Mac;;
    *)          OS_TYPE="UNKNOWN:${OS}"
esac

echo -e "Detected OS: ${GREEN}${OS_TYPE}${NC}"

# Check if running on Mac
if [[ "$OS_TYPE" == "Mac" ]]; then
    # Check if Homebrew is installed
    if ! command -v brew &> /dev/null; then
        echo -e "${RED}Homebrew is not installed. Please install it first:${NC}"
        echo "/bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
        exit 1
    fi
fi

# Function to check if a command exists
command_exists() {
    command -v "$1" &> /dev/null
}

# Function to install on Mac
install_mac() {
    local package=$1
    local brew_package=${2:-$1}
    
    if ! command_exists "$package"; then
        echo -e "${YELLOW}Installing $package...${NC}"
        brew install "$brew_package"
    else
        echo -e "${GREEN}✓ $package is already installed${NC}"
    fi
}

# Function to install on Linux
install_linux() {
    local package=$1
    local apt_package=${2:-$1}
    
    if ! command_exists "$package"; then
        echo -e "${YELLOW}Installing $package...${NC}"
        sudo apt-get update && sudo apt-get install -y "$apt_package"
    else
        echo -e "${GREEN}✓ $package is already installed${NC}"
    fi
}

# Install Docker
if ! command_exists docker; then
    echo -e "${YELLOW}Installing Docker...${NC}"
    if [[ "$OS_TYPE" == "Mac" ]]; then
        brew install --cask docker
        echo -e "${YELLOW}Please start Docker Desktop and wait for it to be ready, then run this script again.${NC}"
        exit 0
    else
        curl -fsSL https://get.docker.com | sh
        sudo usermod -aG docker $USER
        echo -e "${YELLOW}Please log out and back in for Docker permissions, then run this script again.${NC}"
        exit 0
    fi
else
    echo -e "${GREEN}✓ Docker is already installed${NC}"
    
    # Check if Docker is running
    if ! docker info &> /dev/null; then
        echo -e "${RED}Docker is not running. Please start Docker and try again.${NC}"
        exit 1
    fi
fi

# Install kind
if ! command_exists kind; then
    echo -e "${YELLOW}Installing kind...${NC}"
    if [[ "$OS_TYPE" == "Mac" ]]; then
        brew install kind
    else
        curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.20.0/kind-linux-amd64
        chmod +x ./kind
        sudo mv ./kind /usr/local/bin/kind
    fi
else
    echo -e "${GREEN}✓ kind is already installed${NC}"
fi

# Install kubectl
if ! command_exists kubectl; then
    echo -e "${YELLOW}Installing kubectl...${NC}"
    if [[ "$OS_TYPE" == "Mac" ]]; then
        brew install kubectl
    else
        curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
        chmod +x kubectl
        sudo mv kubectl /usr/local/bin/
    fi
else
    echo -e "${GREEN}✓ kubectl is already installed${NC}"
fi

# Install Helm
if ! command_exists helm; then
    echo -e "${YELLOW}Installing Helm...${NC}"
    if [[ "$OS_TYPE" == "Mac" ]]; then
        brew install helm
    else
        curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
    fi
else
    echo -e "${GREEN}✓ Helm is already installed${NC}"
fi

# Install istioctl (optional, for service mesh)
if ! command_exists istioctl; then
    echo -e "${YELLOW}Installing istioctl (optional)...${NC}"
    if [[ "$OS_TYPE" == "Mac" ]]; then
        brew install istioctl
    else
        curl -L https://istio.io/downloadIstio | sh -
        sudo mv istio-*/bin/istioctl /usr/local/bin/
        rm -rf istio-*
    fi
else
    echo -e "${GREEN}✓ istioctl is already installed${NC}"
fi

# Install k9s (optional, for cluster management)
if ! command_exists k9s; then
    echo -e "${YELLOW}Installing k9s (optional Kubernetes CLI UI)...${NC}"
    if [[ "$OS_TYPE" == "Mac" ]]; then
        brew install k9s
    else
        curl -sS https://webinstall.dev/k9s | bash
    fi
else
    echo -e "${GREEN}✓ k9s is already installed${NC}"
fi

echo ""
echo -e "${GREEN}All dependencies are installed!${NC}"
echo ""
echo "Next steps:"
echo "1. Make sure Docker is running"
echo "2. Run: make dev-setup"
echo "3. Run: make build-all"
echo "4. Run: make deploy-all"
echo ""
echo "Useful commands:"
echo "- kubectl get pods -n workflowhub    # Check pod status"
echo "- k9s                                # Interactive Kubernetes UI"
echo "- make logs                          # Tail all pod logs"
echo "- make port-forward-grafana          # Access Grafana UI"