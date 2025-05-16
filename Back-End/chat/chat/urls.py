"""
URL configuration for chat project.

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
from rest_framework import permissions
from drf_yasg.views import get_schema_view
from drf_yasg import openapi
from django.http import HttpResponse

# Schema view for JSON
schema_view = get_schema_view(
    openapi.Info(
        title="Snippets API for Chat",
        default_version='v1',
        description="Chat API",
        terms_of_service="https://www.google.com/policies/terms/",
        contact=openapi.Contact(email="contact@snippets.local"),
        license=openapi.License(name="BSD License"),
    ),
    public=True,
    permission_classes=(permissions.AllowAny,),
    authentication_classes=[],
)

# Custom view that serves Swagger UI with CDN resources
def custom_swagger_view(request):
    html = """<!DOCTYPE html>
<html>
<head>
    <title>Chat API Documentation</title>
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
                url: "/api/chat/swagger.json",
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIStandalonePreset
                ],
                plugins: [
                    SwaggerUIBundle.plugins.DownloadUrl
                ],
                layout: "StandaloneLayout"
            });
            
            // Add authentication helper
            const authWrapper = document.createElement('div');
            authWrapper.style.cssText = 'padding: 15px; background: #f0f0f0; margin: 10px 0;';
            authWrapper.innerHTML = `
                <h3 style="margin-top: 0">JWT Authentication</h3>
                <input type="text" id="auth_token" placeholder="Paste your JWT token here" style="width: 100%; padding: 8px;">
                <button id="auth_button" style="margin-top: 10px; padding: 8px 15px;">Set Authentication Token</button>
            `;
            
            document.getElementById('swagger-ui').prepend(authWrapper);
            
            document.getElementById('auth_button').addEventListener('click', function() {
                const token = document.getElementById('auth_token').value;
                if (token) {
                    localStorage.setItem('auth_token', token);
                    alert('Authentication token set!');
                    window.location.reload();
                }
            });
            
            // Add authentication to requests
            ui.preauthorizeApiKey("Bearer", localStorage.getItem('auth_token') || "");
        }
    </script>
</body>
</html>"""
    return HttpResponse(html)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('chat/', include('my_chat.urls')),
    path('swagger.json', schema_view.without_ui(cache_timeout=0), name='schema-json'),
    path('swagger/', custom_swagger_view, name='schema-swagger-ui'),  # Use custom view
    path('redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),
    path('o/', include('oauth2_provider.urls', namespace='oauth2_provider')),
]