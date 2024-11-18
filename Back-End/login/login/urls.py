"""
URL configuration for login project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
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
from django.urls import path, include
from oauth2_provider import urls as oauth2_urls
from oauth2_provider import views as oauth2_views
from my_login import views

urlpatterns = [
  path('admin/', admin.site.urls),
	path('login/', include('my_login.urls')),
	path('o/', include(oauth2_urls)),
]

oauth2_urls = [
	path('authorize/', oauth2_views.AuthorizationView.as_view(), name="authorize"),
	path('token/', oauth2_views.TokenView.as_view(), name="token"),
	path('revoke_token/', oauth2_views.RevokeTokenView.as_view(), name="revoke-token"),
	path('introspect/', views.IntrospectTokenView.as_view(), name="introspect"),
	path('applications/', oauth2_views.ApplicationList.as_view(), name="list"),
	path('applications/register/', oauth2_views.ApplicationRegistration.as_view(), name="register"),
]
