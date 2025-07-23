"""
URL configuration for Notifications project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include, re_path
from django.http import JsonResponse, HttpResponse
from rest_framework import permissions
from drf_yasg.views import get_schema_view
from drf_yasg import openapi

schema_view = get_schema_view(
    openapi.Info(
        title="Notifications API",
        default_version='v1',
        description="API for notification management and real-time messaging",
        contact=openapi.Contact(email="admin@trascendence.local"),
        license=openapi.License(name="MIT License"),
    ),
    public=True,
    permission_classes=(permissions.AllowAny,),
)

# Custom view that serves Swagger UI with JWT authentication
def custom_swagger_view(request):
    html = """<!DOCTYPE html>
<html>
<head>
    <title>Notifications API Documentation</title>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui.css">
    <link rel="icon" type="image/png" href="https://unpkg.com/swagger-ui-dist@5.9.0/favicon-32x32.png" sizes="32x32">
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-bundle.js"></script>
    <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-standalone-preset.js"></script>
    <script>
        window.onload = function() {
            const ui = SwaggerUIBundle({
                url: "/swagger.json",
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIStandalonePreset
                ],
                plugins: [
                    SwaggerUIBundle.plugins.DownloadUrl
                ],
                layout: "StandaloneLayout",
                requestInterceptor: function(request) {
                    const token = localStorage.getItem('jwt_token');
                    if (token) {
                        request.headers['Authorization'] = 'Bearer ' + token;
                    }
                    return request;
                }
            });
            
            // Add JWT authentication helper
            const authWrapper = document.createElement('div');
            authWrapper.style.cssText = 'padding: 15px; background: #f8f9fa; border: 1px solid #dee2e6; margin: 10px 0; border-radius: 5px;';
            authWrapper.innerHTML = `
                <h4 style="margin-top: 0; color: #495057;">🔐 JWT Authentication</h4>
                <div style="margin-bottom: 10px;">
                    <input type="text" id="jwt_token" placeholder="Paste your JWT token here" 
                           style="width: 100%; padding: 8px; border: 1px solid #ced4da; border-radius: 4px;">
                </div>
                <div style="display: flex; gap: 10px;">
                    <button id="set_token_button" style="padding: 8px 15px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Set Token
                    </button>
                    <button id="clear_token_button" style="padding: 8px 15px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Clear Token
                    </button>
                    <span id="token_status" style="padding: 8px; color: #6c757d;"></span>
                </div>
            `;
            
            document.getElementById('swagger-ui').prepend(authWrapper);
            
            // Set token functionality
            document.getElementById('set_token_button').addEventListener('click', function() {
                const token = document.getElementById('jwt_token').value.trim();
                if (token) {
                    localStorage.setItem('jwt_token', token);
                    document.getElementById('token_status').textContent = '✅ Token set successfully!';
                    document.getElementById('token_status').style.color = '#28a745';
                    // Authorize all endpoints
                    ui.preauthorizeApiKey('Bearer', token);
                } else {
                    alert('Please enter a valid JWT token');
                }
            });
            
            // Clear token functionality
            document.getElementById('clear_token_button').addEventListener('click', function() {
                localStorage.removeItem('jwt_token');
                document.getElementById('jwt_token').value = '';
                document.getElementById('token_status').textContent = '❌ Token cleared';
                document.getElementById('token_status').style.color = '#dc3545';
            });
            
            // Check if token exists and show status
            const existingToken = localStorage.getItem('jwt_token');
            if (existingToken) {
                document.getElementById('jwt_token').value = existingToken;
                document.getElementById('token_status').textContent = '✅ Token loaded from storage';
                document.getElementById('token_status').style.color = '#28a745';
                // Pre-authorize with existing token
                ui.preauthorizeApiKey('Bearer', existingToken);
            }
        }
    </script>
</body>
</html>"""
    return HttpResponse(html)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('notification/', include('my_notifications.urls')),
    path('', include('django_prometheus.urls')),  # Add metrics endpoint
    
    # Swagger/API documentation with JWT support
    path('swagger.json', schema_view.without_ui(cache_timeout=0), name='schema-json'),
    path('swagger/', custom_swagger_view, name='schema-swagger-ui'),
    re_path(r'^redoc/$', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),
    path('api/schema/', schema_view.without_ui(cache_timeout=0), name='schema-json-api'),
    path('health/', lambda request: JsonResponse({'status': 'healthy'}), name='health'),
]
