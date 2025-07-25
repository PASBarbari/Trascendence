#!/bin/bash
set -e

echo "Adding Helm repositories..."
helm repo add jetstack https://charts.jetstack.io
helm repo update

echo "Updating dependencies..."
helm dependency update ./helm-charts/my-umbrella

echo "Ready to install with: helm install trascendence ./helm-charts/my-umbrella"