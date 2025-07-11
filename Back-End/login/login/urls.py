from django.contrib import admin
from django.urls import path, include, re_path
from django.http import JsonResponse
from rest_framework import permissions
from drf_yasg.views import get_schema_view
from drf_yasg import openapi
from oauth2_provider import urls as oauth2_urls
from oauth2_provider import views as oauth2_views
from my_login.views import CustomIntrospect

schema_view = get_schema_view(
    openapi.Info(
        title="Login & Authentication API",
        default_version='v1',
        description="API for user authentication, OAuth2, and login management",
        contact=openapi.Contact(email="admin@trascendence.local"),
        license=openapi.License(name="MIT License"),
    ),
    public=True,
    permission_classes=(permissions.AllowAny,),
)

urlpatterns = [
	path('admin/', admin.site.urls),
	path('login/', include('my_login.urls')),
	path('o/', include(oauth2_urls)),
	path('', include('django_prometheus.urls')),  # Add metrics endpoint
	
	# Swagger/API documentation
	re_path(r'^swagger(?P<format>\.json|\.yaml)$', schema_view.without_ui(cache_timeout=0), name='schema-json'),
	re_path(r'^swagger/$', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
	re_path(r'^redoc/$', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),
	path('api/schema/', schema_view.without_ui(cache_timeout=0), name='schema-json-api'),
	path('health/', lambda request: JsonResponse({'status': 'healthy'}), name='health'),
]

oauth2_urls = [
	path('authorize/', oauth2_views.AuthorizationView.as_view(), name="authorize"),
	path('token/', oauth2_views.TokenView.as_view(), name="token"),
	path('revoke_token/', oauth2_views.RevokeTokenView.as_view(), name="revoke-token"),
	path('introspect/', CustomIntrospect.as_view(), name="myintrospect"),
	path('applications/', oauth2_views.ApplicationList.as_view(), name="list"),
	path('applications/register/', oauth2_views.ApplicationRegistration.as_view(), name="register"),
]
