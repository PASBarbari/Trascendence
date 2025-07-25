#!/bin/bash
# Script to update all service requirements.txt files with versions from main requirements.txt

MAIN_REQ="requirements.txt"

# Services and their specific requirements (only packages they actually need)
declare -A SERVICE_PACKAGES

# Login service packages
SERVICE_PACKAGES[login/requirements.txt]="asgiref certifi cffi charset-normalizer cryptography django django-cors-headers django-oauth-toolkit django-ratelimit djangorestframework idna jwcrypto oauthlib psycopg psycopg2-binary pycparser requests sqlparse typing-extensions urllib3 django-prometheus prometheus-client"

# Chat service packages  
SERVICE_PACKAGES[chat/requirements.txt]="amqp asgiref async-timeout attrs autobahn automat billiard celery certifi cffi channels channels-redis charset-normalizer click click-didyoumean click-plugins click-repl constantly cryptography daphne django django-cors-headers django-filter django-oauth-toolkit django-redis djangorestframework djangorestframework-simplejwt drf-yasg hyperlink idna incremental inflection itypes jinja2 kombu markupsafe msgpack multidict oauthlib packaging pillow prometheus-client psycopg psycopg2-binary pycparser pyjwt pyopenssl python-dateutil pytz pyyaml redis requests service-identity simplejson six sqlparse twisted txaio typing-extensions tzdata urllib3 vine yarl zope-interface django-prometheus"

# Task/User service packages
SERVICE_PACKAGES[task_user/requirements.txt]="asgiref certifi django django-cors-headers django-encrypted-model-fields django-fernet-fields django-filter django-minio-storage django-oauth-toolkit djangorestframework djangorestframework-simplejwt idna jwcrypto minio oauthlib pillow psycopg psycopg2-binary pyjwt requests sqlparse typing-extensions urllib3 django-prometheus prometheus-client"

# Pong service packages
SERVICE_PACKAGES[pongProject/requirements.txt]="asgiref async-timeout attrs autobahn automat certifi cffi channels channels-redis charset-normalizer click constantly cryptography daphne django django-cors-headers django-filter django-redis hyperlink idna incremental msgpack multidict pyopenssl redis requests service-identity sqlparse twisted txaio typing-extensions urllib3 yarl zope-interface django-prometheus prometheus-client"

# Notifications service packages
SERVICE_PACKAGES[Notifications/requirements.txt]="amqp asgiref async-timeout attrs autobahn automat billiard celery certifi cffi channels channels-redis charset-normalizer click click-didyoumean click-plugins click-repl constantly cryptography daphne django django-cors-headers django-filter django-oauth-toolkit django-redis djangorestframework idna incremental jwcrypto kombu markupsafe msgpack multidict oauthlib pyopenssl python-dateutil pytz redis requests service-identity six sqlparse twisted txaio typing-extensions tzdata urllib3 vine yarl zope-interface django-prometheus prometheus-client"

echo "🔄 Updating service requirements.txt files..."

# Function to get version from main requirements.txt
get_version() {
    local package=$1
    # First try exact match
    local result=$(grep "^${package}==" "$MAIN_REQ" | head -1)
    if [[ -z "$result" ]]; then
        # Try with [tls] suffix for twisted
        result=$(grep "^${package}\[tls\]==" "$MAIN_REQ" | head -1)
    fi
    echo "$result"
}

# Update each service requirements file
for service_req in "${!SERVICE_PACKAGES[@]}"; do
    echo "📦 Updating $service_req"
    
    # Create new requirements file
    > "$service_req.new"
    
    # Add header
    echo "# Updated requirements for $(dirname $service_req) service" >> "$service_req.new"
    echo "# Generated from main requirements.txt on $(date)" >> "$service_req.new"
    echo "" >> "$service_req.new"
    
    # Get packages for this service
    packages=${SERVICE_PACKAGES[$service_req]}
    
    # For each package, find its version in main requirements.txt
    for package in $packages; do
        version_line=$(get_version "$package")
        if [[ -n "$version_line" ]]; then
            echo "$version_line" >> "$service_req.new"
        else
            echo "⚠️  Package $package not found in main requirements.txt"
        fi
    done
    
    # Sort the requirements
    tail -n +4 "$service_req.new" | sort > "$service_req.new.sorted"
    head -3 "$service_req.new" > "$service_req.temp"
    cat "$service_req.new.sorted" >> "$service_req.temp"
    mv "$service_req.temp" "$service_req.new"
    rm -f "$service_req.new.sorted"
    
    # Replace the original file
    mv "$service_req.new" "$service_req"
    
    echo "✅ Updated $service_req"
done

echo ""
echo "🎉 All service requirements.txt files have been updated!"
echo ""
echo "📋 Summary of updated files:"
for service_req in "${!SERVICE_PACKAGES[@]}"; do
    echo "  - $service_req"
done
echo ""
echo "💡 Next steps:"
echo "  1. Review the updated files"
echo "  2. Test your services" 
echo "  3. Rebuild your Docker images"
