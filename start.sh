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
cd Manifests
minikube addons enable ingress
minikube addons enable metrics-server

# Step 4: Create Kubernetes namespaces from namespace.yaml
echo "Creating namespaces"
kubecolor apply -f configmaps/namespaces.yaml

# Step 4.5: Create Kubernetes configmaps from configmaps.yaml
echo "Creating configmaps"
kubecolor apply -f configmaps/Configmap.yaml
kubectl apply -f https://github.com/jetstack/cert-manager/releases/download/v1.11.0/cert-manager.crds.yaml
kubectl create namespace cert-manager
kubectl apply -f https://github.com/jetstack/cert-manager/releases/download/v1.11.0/cert-manager.yaml

# Step 5: Apply pre-created secrets from USB drive
echo "Applying secrets"
if [ ! -f secrets.yaml ]; then
  echo "Secrets not found. Please copy the secrets to the secrets folder and run the script again."
  exit 1
fi
kubecolor apply -f secrets.yaml

# # Step 6: Install Helm if not already installed
# if ! command -v helm &> /dev/null; then
#   echo "Helm is not installed. Installing Helm..."
#   curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
# fi

# # Step 7: Deploy the Helm chart for each namespace
# echo "Deploying Helm chart..."
# for namespace in $NAMESPACES; do
#   helm install project-$namespace ./helm-chart --namespace $namespace --create-namespace
# done
# # helm repo add minio https://helm.min.io/
# # Step 8: Verify deployment
# echo "Verifying deployment..."
# for namespace in $NAMESPACES; do
#   kubectl get all -n $namespace
# done

# Step 6: Setup volumes
echo "Setting up volumes..."
kubecolor apply -f Volumes/

# Step 7: Setup ingresses
echo "Setting up ingresses..."
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=90s
kubecolor apply -f Ingresses/

# Step 8: Setup microservices
echo "Setting up microservices..."
dir=("Certs" "Chat" "Login" "Redis" "Notifications" "Pong" "User")
for service in $(dir):
do
  kubecolor apply -f $service/
done

echo "Project setup complete! Access Minikube services using:"

# PASS=kubectl get secret -nelk trascendence-kibana-user -o=jsonpath='{.data}'
# echo "Elastic pswd: $(echo $PASS | jq -r '.password' | base64 -d)"
minikube service list