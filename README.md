# Installation Instructions

[kubectl create -f crds.yaml](https://download.elastic.co/downloads/eck/2.2.0/crds.yaml)
[kubectl apply -f operator.yaml](https://download.elastic.co/downloads/eck/2.2.0/operator.yaml)

## Prerequisites

Before installing this chart, add the required Helm repositories:

### 1. Install CRDs first

kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.2/cert-manager.crds.yaml
kubectl apply -f https://raw.githubusercontent.com/traefik/traefik/v2.10/docs/content/reference/dynamic-configuration/kubernetes-crd-definition-v1.yml

### 2. Add Helm repos

helm repo add jetstack https://charts.jetstack.io
helm repo update

### 3. Install chart with dependencies

helm install trascendence ./helm-charts/my-umbrella

# TODO 

add health check on each django server
Front end post support
Index db
Back end post support
going from RESTAPI to gRPC
Devops
Argocd and jenkins
