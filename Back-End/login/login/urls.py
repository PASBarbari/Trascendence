from django.contrib import admin
from django.urls import path, include
from oauth2_provider import urls as oauth2_urls
from oauth2_provider import views as oauth2_views
from my_login.views import CustomIntrospect

urlpatterns = [
  path('admin/', admin.site.urls),
	path('login/', include('my_login.urls')),
	path('o/', include(oauth2_urls)),
]

oauth2_urls = [
	path('authorize/', oauth2_views.AuthorizationView.as_view(), name="authorize"),
	path('token/', oauth2_views.TokenView.as_view(), name="token"),
	path('revoke_token/', oauth2_views.RevokeTokenView.as_view(), name="revoke-token"),
	path('introspect/', CustomIntrospect.as_view(), name="myintrospect"),
	path('applications/', oauth2_views.ApplicationList.as_view(), name="list"),
	path('applications/register/', oauth2_views.ApplicationRegistration.as_view(), name="register"),
]
