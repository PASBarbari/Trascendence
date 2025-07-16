#!/bin/bash

# Trascendence K3s Setup Script
# This script sets up K3s with all necessary components for the Trascendence project

set -e  # Exit on any error

echo "🚀 Starting Trascendence K3s Setup..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Step 1: Update system packages
print_status "Updating system packages..."
sudo apt update -y
sudo apt upgrade -y
sudo apt install -y curl git wget

# Step 2: Install K3s if not already installed
if ! command -v k3s &> /dev/null; then
    print_status "Installing K3s..."
    curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="--disable=traefik" sh -
    
    # Configure kubectl for current user
    mkdir -p ~/.kube
    sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
    sudo chown $(id -u):$(id -g) ~/.kube/config
    export KUBECONFIG=~/.kube/config
    
    print_success "K3s installed successfully"
else
    print_success "K3s is already installed"
fi

# Step 3: Install kubectl if not already installed
if ! command -v kubectl &> /dev/null; then
    print_status "Installing kubectl..."
    curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
    sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
    rm kubectl
    print_success "kubectl installed successfully"
else
    print_success "kubectl is already installed"
fi

# Step 4: Install Helm if not already installed
if ! command -v helm &> /dev/null; then
    print_status "Installing Helm..."
    curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
    print_success "Helm installed successfully"
else
    print_success "Helm is already installed"
fi
sleep 5

# Step 5: Wait for K3s to be ready
print_status "Waiting for K3s to be ready..."
kubectl wait --for=condition=Ready nodes --all --timeout=300s

# Step 6: Add all necessary Helm repositories
print_status "Adding Helm repositories..."

# Essential repositories for the project
helm repo add jetstack https://charts.jetstack.io                    # cert-manager
helm repo add elastic https://helm.elastic.co                        # Elasticsearch, Kibana
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts  # Prometheus, Grafana
helm repo add grafana https://grafana.github.io/helm-charts          # Grafana
helm repo add bitnami https://charts.bitnami.com/bitnami            # Redis, PostgreSQL
helm repo add minio https://helm.min.io/                            # MinIO

# Update all repositories
helm repo update

print_success "All Helm repositories added and updated"

# Step 7: Create necessary namespaces
print_status "Creating namespaces..."
kubectl create namespace cert-manager --dry-run=client -o yaml | kubectl apply -f -
kubectl create namespace monitoring --dry-run=client -o yaml | kubectl apply -f -
# Create monitoring and logging namespaces (cert-manager creates its own)
kubectl create namespace monitoring --dry-run=client -o yaml | kubectl apply -f -
kubectl create namespace logging --dry-run=client -o yaml | kubectl apply -f -

# Note: Application namespaces (login, front-end, chat, etc.) will be created by the Helm umbrella chart

Step 8: Install CRDs via Helm chart
print_status "Installing Custom Resource Definitions..."
cd helm-charts/my-umbrella
if helm list -A | grep -q "crds-only"; then
     print_status "Upgrading existing deployment..."
     helm upgrade crds-only . --timeout=15m --wait --debug --namespace default --create-namespace
else
     print_status "Installing new deployment..."
     helm install crds-only . --timeout=15m --wait --debug --namespace default --create-namespace
fi
cd ../..

print_success "CRDs installed successfully"

# Step 9: Set up /etc/hosts entries for local development
print_status "Setting up /etc/hosts entries..."

# Check if entries already exist
if ! grep -q "trascendence.42firenze.it" /etc/hosts; then
    echo "# Trascendence local development entries" | sudo tee -a /etc/hosts
    echo "127.0.0.1 trascendence.42firenze.it" | sudo tee -a /etc/hosts
    echo "127.0.0.1 kibana.trascendence.local" | sudo tee -a /etc/hosts
    echo "127.0.0.1 grafana.trascendence.local" | sudo tee -a /etc/hosts
    print_success "/etc/hosts entries added"
else
    print_warning "/etc/hosts entries already exist"
fi

# Step 10: Navigate to helm charts directory
if [ -d "helm-charts/my-umbrella" ]; then
    print_status "Deploying Trascendence application..."
    cd helm-charts/my-umbrella
    
    # Update dependencies
    helm dependency update
    
    # Install or upgrade the application
    if helm list -A | grep -q "my-umbrella"; then
        print_status "Upgrading existing deployment..."
        helm upgrade my-umbrella . --timeout=15m --wait --debug --namespace default --create-namespace
    else
        print_status "Installing new deployment..."
        helm install my-umbrella . --timeout=15m --wait --debug --namespace default --create-namespace
    fi
    
    print_success "Trascendence application deployed successfully"
    
    cd ../..
else
    print_error "helm-charts/my-umbrella directory not found. Please run this script from the project root."
    exit 1
fi

# Step 11: Display useful information
print_success "🎉 Setup completed successfully!"
echo ""
echo -e "${BLUE}📋 Useful Information:${NC}"
echo "• Frontend: https://trascendence.42firenze.it"
echo "• Kibana: https://kibana.trascendence.local"
echo "• Grafana: https://grafana.trascendence.local (admin/admin123)"
echo ""
echo -e "${BLUE}🔧 Useful Commands:${NC}"
echo "• Check pods: kubectl get pods --all-namespaces"
echo "• Check services: kubectl get services --all-namespaces"
echo "• Check ingresses: kubectl get ingresses --all-namespaces"
echo "• View logs: kubectl logs -f deployment/<deployment-name>"
echo "• Port forward: kubectl port-forward svc/<service-name> <local-port>:<service-port>"
echo ""
echo -e "${BLUE}🚨 Troubleshooting:${NC}"
echo "• If services are not accessible, check if K3s is running: sudo systemctl status k3s"
echo "• Check Traefik dashboard: kubectl port-forward -n kube-system svc/traefik 9000:9000"
echo "• Check certificate status: kubectl get certificates --all-namespaces"
echo ""
echo -e "${GREEN}Ready to use! 🚀${NC}"
