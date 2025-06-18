#!/bin/bash

# Script to update the copied service charts

# Function to update a service chart
update_service_chart() {
    local service_name=$1
    local port=$2
    local django_module=$3
    local chart_dir="/home/lorenzo/Documents/Trascendence/helm-charts/my-umbrella/charts/${service_name}-service-chart"
    
    echo "Updating ${service_name} service chart..."
    
    # Update Chart.yaml
    sed -i "s/login-service-chart/${service_name}-service-chart/g" "${chart_dir}/Chart.yaml"
    sed -i "s/A Helm chart for Kubernetes/A Helm chart for ${service_name^} Service/g" "${chart_dir}/Chart.yaml"
    
    # Update values.yaml
    sed -i "s/login-service-chart/${service_name}-service-chart/g" "${chart_dir}/values.yaml"
    sed -i "s/namespace: login/namespace: ${service_name}/g" "${chart_dir}/values.yaml"
    sed -i "s/bombatomica\/login/bombatomica\/${service_name}/g" "${chart_dir}/values.yaml"
    sed -i "s/port: 8000/port: ${port}/g" "${chart_dir}/values.yaml"
    sed -i "s/targetPort: 8000/targetPort: ${port}/g" "${chart_dir}/values.yaml"
    sed -i "s/my-umbrella-login-sa/my-umbrella-${service_name}-sa/g" "${chart_dir}/values.yaml"
    sed -i "s/login-db-service-account/${service_name}-db-service-account/g" "${chart_dir}/values.yaml"
    sed -i "s/\/api\/login/\/api\/${service_name}/g" "${chart_dir}/values.yaml"
    sed -i "s/login-tls/${service_name}-tls/g" "${chart_dir}/values.yaml"
    sed -i "s/login\.settings/${django_module}/g" "${chart_dir}/values.yaml"
    sed -i "s/LOGIN_PORT/${service_name^^}_PORT/g" "${chart_dir}/values.yaml"
    sed -i "s/LOGIN_HOST/${service_name^^}_HOST/g" "${chart_dir}/values.yaml"
    sed -i "s/login-db-service/${service_name}-db-service/g" "${chart_dir}/values.yaml"
    
    # Update _helpers.tpl
    sed -i "s/login-service-chart/${service_name}-service-chart/g" "${chart_dir}/templates/_helpers.tpl"
    
    # Update template files
    cd "${chart_dir}/templates"
    
    # Rename files
    if [ -f "login-deployment.yaml" ]; then
        mv login-deployment.yaml ${service_name}-deployment.yaml
    fi
    if [ -f "login-db-deployment.yaml" ]; then
        mv login-db-deployment.yaml ${service_name}-db-deployment.yaml
    fi
    if [ -f "login-db-service.yaml" ]; then
        mv login-db-service.yaml ${service_name}-db-service.yaml
    fi
    
    # Update all template files
    for file in *.yaml; do
        sed -i "s/login-service-chart/${service_name}-service-chart/g" "$file"
        sed -i "s/login-db/${service_name}-db/g" "$file"
        sed -i "s/login-service/${service_name}-service/g" "$file"
    done
    
    echo "${service_name^} service chart updated successfully!"
}

# Update the three services
update_service_chart "user" "8002" "task_user.settings"
update_service_chart "notifications" "8003" "Notifications.settings"  
update_service_chart "pong" "8004" "pongProject.settings"

echo "All service charts updated!"
