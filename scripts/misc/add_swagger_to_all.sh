#!/bin/bash

# Script to add Swagger/OpenAPI documentation to all microservices

SERVICES=("login" "chat" "Notifications" "pongProject")
BACKEND_DIR="/home/lorenzo/Documents/Trascendence/Back-End"

echo "Adding Swagger documentation to all microservices..."

for service in "${SERVICES[@]}"; do
    echo "Processing $service..."
    
    # Add drf-yasg to requirements.txt if not already present
    if [ -f "$BACKEND_DIR/$service/requirements.txt" ]; then
        if ! grep -q "drf-yasg" "$BACKEND_DIR/$service/requirements.txt"; then
            echo "drf-yasg==1.21.7" >> "$BACKEND_DIR/$service/requirements.txt"
            echo "  ✓ Added drf-yasg to $service/requirements.txt"
        else
            echo "  ✓ drf-yasg already in $service/requirements.txt"
        fi
    fi
    
    # Find the main app directory (the one with settings.py)
    settings_file=$(find "$BACKEND_DIR/$service" -name "settings.py" -path "*/settings.py" | head -1)
    
    if [ -n "$settings_file" ]; then
        settings_dir=$(dirname "$settings_file")
        
        # Add drf_yasg to INSTALLED_APPS if not already present
        if ! grep -q "drf_yasg" "$settings_file"; then
            # Find the INSTALLED_APPS line and add drf_yasg
            sed -i "/INSTALLED_APPS = \[/,/\]/ {
                /rest_framework/a\\
    'drf_yasg',
            }" "$settings_file"
            echo "  ✓ Added drf_yasg to INSTALLED_APPS in $service"
        else
            echo "  ✓ drf_yasg already in INSTALLED_APPS in $service"
        fi
        
        # Find the main urls.py file
        urls_file="$settings_dir/urls.py"
        
        if [ -f "$urls_file" ]; then
            # Add Swagger imports and schema view if not already present
            if ! grep -q "drf_yasg" "$urls_file"; then
                # Backup original file
                cp "$urls_file" "$urls_file.backup"
                
                # Add imports at the top
                sed -i '1i\
from django.http import JsonResponse\
from rest_framework import permissions\
from drf_yasg.views import get_schema_view\
from drf_yasg import openapi\
' "$urls_file"
                
                # Add schema view definition after imports
                sed -i '/from drf_yasg import openapi/a\\n\
schema_view = get_schema_view(\
    openapi.Info(\
        title="'$(echo $service | sed 's/.*/\u&/')' API",\
        default_version="v1",\
        description="API documentation for '$(echo $service | sed 's/.*/\u&/')' microservice",\
        contact=openapi.Contact(email="admin@trascendence.local"),\
        license=openapi.License(name="MIT License"),\
    ),\
    public=True,\
    permission_classes=(permissions.AllowAny,),\
)' "$urls_file"
                
                # Add Swagger URLs to urlpatterns if not already present
                if ! grep -q "swagger" "$urls_file"; then
                    sed -i '/urlpatterns = \[/,/\]/ {
                        /admin/a\\
    # Swagger/API documentation\
    re_path(r"^swagger(?P<format>\.json|\.yaml)$", schema_view.without_ui(cache_timeout=0), name="schema-json"),\
    re_path(r"^swagger/$", schema_view.with_ui("swagger", cache_timeout=0), name="schema-swagger-ui"),\
    re_path(r"^redoc/$", schema_view.with_ui("redoc", cache_timeout=0), name="schema-redoc"),\
    path("api/schema/", schema_view.without_ui(cache_timeout=0), name="schema-json-api"),\
    path("health/", lambda request: JsonResponse({"status": "healthy"}), name="health"),
                    }' "$urls_file"
                fi
                
                # Add re_path import if not present
                if ! grep -q "re_path" "$urls_file"; then
                    sed -i 's/from django.urls import path/from django.urls import path, re_path/g' "$urls_file"
                fi
                
                echo "  ✓ Added Swagger configuration to $service/urls.py"
            else
                echo "  ✓ Swagger already configured in $service/urls.py"
            fi
        fi
    fi
    
    echo "  Completed $service"
    echo "---"
done

echo "✅ Swagger documentation setup completed for all services!"
echo ""
echo "Next steps:"
echo "1. Install requirements: pip install -r requirements.txt (in each service)"
echo "2. Start the API documentation service: cd api-docs && python manage.py runserver 8005"
echo "3. Visit http://localhost:8005 to see all API documentation"
echo ""
echo "Individual service Swagger UIs will be available at:"
for service in "${SERVICES[@]}"; do
    case $service in
        "login") port="8000" ;;
        "chat") port="8001" ;;
        "Notifications") port="8003" ;;
        "pongProject") port="8004" ;;
    esac
    echo "  - $service: http://localhost:$port/swagger/"
done
