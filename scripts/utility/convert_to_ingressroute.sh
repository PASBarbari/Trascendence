#!/bin/bash

# Script to convert Ingress resources to IngressRoute resources
# This will fix the cross-namespace middleware issues

echo "🔄 Converting Ingress to IngressRoute for better Traefik integration"
echo "=================================================================="

# Get the helm charts directory
CHARTS_DIR="/home/sgarigli/Desktop/TrascendenceNew/helm-charts/my-umbrella/charts"

# Function to create IngressRoute template
create_ingressroute_template() {
    local service_name="$1"
    local service_path="$2"
    local service_port="$3"
    local namespace_var="$4"
    
    cat > "${CHARTS_DIR}/${service_name}-service-chart/templates/ingressroute.yaml" << EOF
{{- if .Values.ingress.enabled }}
# HTTPS IngressRoute
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: {{ .Release.Name }}-${service_name}-ingressroute
  namespace: {{ include "${service_name}-service-chart.namespace" . }}
  annotations:
    cert-manager.io/cluster-issuer: {{ .Values.ingress.certManager.clusterIssuer }}
spec:
  entryPoints:
    - web
    - websecure
  routes:
    - match: Host(\`{{ .Values.ingress.host }}\`) && PathPrefix(\`${service_path}\`)
      kind: Rule
      priority: 1000
      services:
        - name: {{ .Release.Name }}-${service_name}-service
          port: ${service_port}
          {{- if eq "${service_name}" "chat" }}
          sticky:
            cookie:
              name: chat_sticky
          {{- end }}
      middlewares:
        - name: {{ .Release.Name }}-websocket-headers
          namespace: {{ include "${service_name}-service-chart.namespace" . }}
        - name: {{ .Release.Name }}-redirect-https
          namespace: {{ include "${service_name}-service-chart.namespace" . }}
  tls:
    {{- if .Values.ingress.tls.enabled }}
    secretName: {{ .Values.ingress.tls.secretName }}
    {{- end }}
---
# HTTP to HTTPS redirect IngressRoute
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: {{ .Release.Name }}-${service_name}-ingressroute-http
  namespace: {{ include "${service_name}-service-chart.namespace" . }}
spec:
  entryPoints:
    - web
  routes:
    - match: Host(\`{{ .Values.ingress.host }}\`) && PathPrefix(\`${service_path}\`)
      kind: Rule
      middlewares:
        - name: {{ .Release.Name }}-redirect-https
          namespace: {{ include "${service_name}-service-chart.namespace" . }}
      services:
        - name: {{ .Release.Name }}-${service_name}-service
          port: ${service_port}
{{- end }}
EOF
}

# Create IngressRoute for each service
echo "📝 Creating IngressRoute templates..."

create_ingressroute_template "chat" "/api/chat" "8001" "chat"
create_ingressroute_template "login" "/api/login" "8000" "login" 
create_ingressroute_template "user" "/api/user" "8002" "user"
create_ingressroute_template "notifications" "/api/notifications" "8003" "notifications"
create_ingressroute_template "pong" "/api/pong" "8004" "pong"

# Special case for frontend (no /api prefix)
cat > "${CHARTS_DIR}/front-end-chart/templates/ingressroute.yaml" << 'EOF'
{{- if .Values.ingress.enabled }}
# HTTPS IngressRoute for Frontend
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: {{ .Release.Name }}-frontend-ingressroute
  namespace: {{ include "front-end-chart.namespace" . }}
  annotations:
    cert-manager.io/cluster-issuer: {{ .Values.ingress.certManager.clusterIssuer }}
spec:
  entryPoints:
    - web
    - websecure
  routes:
    - match: Host(`{{ .Values.ingress.host }}`)
      kind: Rule
      priority: 500  # Lower priority than API routes
      services:
        - name: {{ .Release.Name }}-frontend-service
          port: 3000
      middlewares:
        - name: {{ .Release.Name }}-vite-hmr
          namespace: {{ include "front-end-chart.namespace" . }}
        - name: {{ .Release.Name }}-websocket-headers
          namespace: {{ include "front-end-chart.namespace" . }}
  tls:
    {{- if .Values.ingress.tls.enabled }}
    secretName: {{ .Values.ingress.tls.secretName }}
    {{- end }}
---
# HTTP to HTTPS redirect IngressRoute for Frontend
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: {{ .Release.Name }}-frontend-ingressroute-http
  namespace: {{ include "front-end-chart.namespace" . }}
spec:
  entryPoints:
    - web
  routes:
    - match: Host(`{{ .Values.ingress.host }}`)
      kind: Rule
      middlewares:
        - name: {{ .Release.Name }}-redirect-https
          namespace: {{ include "front-end-chart.namespace" . }}
      services:
        - name: {{ .Release.Name }}-frontend-service
          port: 3000
{{- end }}
EOF

# Function to backup and rename existing ingress files
backup_ingress_files() {
    echo "📦 Backing up existing Ingress files..."
    
    for chart_dir in "${CHARTS_DIR}"/*-service-chart "${CHARTS_DIR}/front-end-chart"; do
        if [ -d "$chart_dir/templates" ]; then
            chart_name=$(basename "$chart_dir")
            ingress_file="$chart_dir/templates/ingress.yaml"
            
            if [ -f "$ingress_file" ]; then
                echo "  📄 Backing up $chart_name/templates/ingress.yaml"
                mv "$ingress_file" "$chart_dir/templates/ingress.yaml.bak"
            fi
        fi
    done
}

# Ask user if they want to proceed
echo ""
echo "🤔 This will:"
echo "   1. Create IngressRoute templates for all services"
echo "   2. Backup existing Ingress files (.yaml.bak)"
echo "   3. Remove cross-namespace middleware issues"
echo ""
read -p "Do you want to proceed? (y/N): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    backup_ingress_files
    echo ""
    echo "✅ IngressRoute templates created successfully!"
    echo ""
    echo "🚀 Next steps:"
    echo "   1. Update values.yaml files if needed"
    echo "   2. Run: helm upgrade my-umbrella ./helm-charts/my-umbrella"
    echo "   3. Test: kubectl get ingressroute -A"
    echo ""
    echo "💡 Benefits:"
    echo "   ✓ No more cross-namespace middleware errors"
    echo "   ✓ Cleaner configuration syntax"
    echo "   ✓ Better WebSocket support"
    echo "   ✓ Native Traefik features"
else
    echo "❌ Operation cancelled"
fi
