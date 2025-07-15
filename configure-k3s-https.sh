#!/bin/bash

# K3s Internal HTTPS Configuration Script
# This script configures K3s and Traefik for internal HTTPS communication

set -e

echo "🔧 Configuring K3s for internal HTTPS communication..."

# 1. Configure Traefik to trust self-signed certificates
echo "📝 Creating Traefik configuration for HTTPS backends..."

kubectl apply -f - <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: traefik-config
  namespace: kube-system
data:
  traefik.yml: |
    serversTransport:
      insecureSkipVerify: true
    
    entryPoints:
      web:
        address: ":80"
        http:
          redirections:
            entrypoint:
              to: websecure
              scheme: https
      websecure:
        address: ":443"
    
    certificatesResolvers:
      letsencrypt:
        acme:
          email: admin@trascendence.local
          storage: /data/acme.json
          httpChallenge:
            entryPoint: web
EOF

# 2. Create a global ServersTransport for HTTPS backends
echo "🔒 Creating global HTTPS transport configuration..."

kubectl apply -f - <<EOF
apiVersion: traefik.io/v1alpha1
kind: ServersTransport
metadata:
  name: default-https-transport
  namespace: default
spec:
  insecureSkipVerify: true
  maxIdleConnsPerHost: 10
---
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: secure-headers
  namespace: default
spec:
  headers:
    accessControlAllowMethods:
      - GET
      - OPTIONS
      - PUT
      - POST
      - DELETE
    accessControlAllowOriginList:
      - "https://"
      - "https://kibana.trascendence.local"
      - "https://grafana.trascendence.local"
    accessControlMaxAge: 100
    addVaryHeader: true
    customRequestHeaders:
      X-Forwarded-Proto: "https"
EOF

# 3. Patch Traefik deployment to use the config
echo "🔄 Updating Traefik deployment..."

kubectl patch deployment traefik -n kube-system --type='merge' -p='{
  "spec": {
    "template": {
      "spec": {
        "containers": [
          {
            "name": "traefik",
            "args": [
              "--configfile=/config/traefik.yml",
              "--api.dashboard=true",
              "--api.insecure=true",
              "--accesslog=true",
              "--entrypoints.web.address=:80",
              "--entrypoints.websecure.address=:443",
              "--providers.kubernetescrd=true",
              "--providers.kubernetesingress=true",
              "--certificatesresolvers.default.acme.email=admin@trascendence.local",
              "--certificatesresolvers.default.acme.storage=/data/acme.json",
              "--certificatesresolvers.default.acme.httpchallenge.entrypoint=web"
            ],
            "volumeMounts": [
              {
                "name": "config",
                "mountPath": "/config"
              },
              {
                "name": "data",
                "mountPath": "/data"
              }
            ]
          }
        ],
        "volumes": [
          {
            "name": "config",
            "configMap": {
              "name": "traefik-config"
            }
          },
          {
            "name": "data",
            "emptyDir": {}
          }
        ]
      }
    }
  }
}' || echo "⚠️  Traefik patch failed, continuing..."

# 4. Create NetworkPolicy for secure internal communication (optional)
echo "🛡️  Creating network policies for secure communication..."

kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-https-internal
  namespace: default
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector: {}
    ports:
    - protocol: TCP
      port: 443
    - protocol: TCP
      port: 5601  # Kibana
    - protocol: TCP
      port: 9200  # Elasticsearch
    - protocol: TCP
      port: 3000  # Grafana
  egress:
  - to:
    - namespaceSelector: {}
    ports:
    - protocol: TCP
      port: 443
    - protocol: TCP
      port: 5601
    - protocol: TCP
      port: 9200
    - protocol: TCP
      port: 3000
EOF

echo "✅ K3s HTTPS configuration completed!"
echo ""
echo "🔍 To verify the configuration:"
echo "   kubectl get serversTransport -A"
echo "   kubectl get middleware -A"
echo "   kubectl logs -n kube-system deployment/traefik"
echo ""
echo "🌐 Your services should now communicate over HTTPS internally"
