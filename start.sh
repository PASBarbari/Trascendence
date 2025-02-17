#!/bin/bash

sudo apt update -y
sudo apt upgrade -y
sudo apt install gnome-terminal kubectl docker.io -y
sudo apt install curl git -y

# Exit immediately if a command exits with a non-zero status
set -eux

sudo apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release
curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.32/deb/Release.key | sudo gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg
sudo chmod 644 /etc/apt/keyrings/kubernetes-apt-keyring.gpg # allow unprivileged APT programs to read this keyring
echo 'deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.32/deb/ /' | sudo tee /etc/apt/sources.list.d/kubernetes.list
sudo chmod 644 /etc/apt/sources.list.d/kubernetes.list
sudo apt-get update
sudo apt-get install -y kubectl
sudo apt install kubecolor kubelet -y
echo "Starting project setup..."

# Step 1: Install Minikube if not already installed
if ! command -v minikube &> /dev/null; then
  echo "Minikube is not installed. Installing Minikube..."
  curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
  sudo install minikube-linux-amd64 /usr/local/bin/minikube
  rm minikube-linux-amd64
fi

# Step 2: Start Minikube
echo "Starting Minikube..."
minikube start --cpus=8 --memory=8192 --driver=docker

# Step 3: Set Minikube context for kubectl
echo "Setting up Minikube context..."
kubecolor config use-context minikube

# Step 4: Create Kubernetes namespaces from namespace.yaml
echo "Creating namespaces from namespace.yaml..."
kubecolor apply -f namespace.yaml

# Extract namespaces from namespace.yaml
NAMESPACES=$(grep 'name:' namespace.yaml | awk '{print $2}')

# Step 5: Apply pre-created secrets from USB drive
echo "Applying secrets from directory..."
SECRETS_DIR=./secrets
if [ -d "$SECRETS_DIR" ]; then
  kubecolor apply -f $SECRETS_DIR/secrets.yaml
else
  echo "Secrets directory not found at $SECRETS_DIR. Please check the path."
  exit 1
fi

# Step 6: Install Helm if not already installed
if ! command -v helm &> /dev/null; then
  echo "Helm is not installed. Installing Helm..."
  curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
fi

# Step 7: Deploy the Helm chart for each namespace
echo "Deploying Helm chart..."
for namespace in $NAMESPACES; do
  helm install project-$namespace ./helm-chart --namespace $namespace --create-namespace
done

# Step 8: Verify deployment
echo "Verifying deployment..."
for namespace in $NAMESPACES; do
  kubectl get all -n $namespace
done

echo "Project setup complete! Access Minikube services using:"

PASS=kubectl get secret -nelk trascendence-kibana-user -o=jsonpath='{.data}'
echo "Elastic pswd: $(echo $PASS | jq -r '.password' | base64 -d)"
minikube service list
