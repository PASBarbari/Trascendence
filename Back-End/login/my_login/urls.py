from django.urls import path
from . import views

urlpatterns = [
	path('register', views.UserRegister.as_view(), name='register'),
	path('login', views.UserLogin.as_view(), name='login'),
	path('logout', views.UserLogout.as_view(), name='logout'),
	path('user', views.UserView.as_view(), name='user'),
	path('get_csrf_token', views.get_csrf_token, name='get_csrf_token'),
	path('Serviceregister', views.ServiceRegister.as_view(), name='Serviceregister'),
    path('oauth/<str:provider>/', views.OAuthLoginView.as_view(), name='oauth_login'),
    path('oauth/callback/<str:provider>/', views.OAuthCallbackView.as_view(), name='oauth_callback'),
    path('2fa/setup/', views.Setup2FAView.as_view(), name='setup_2fa'),
    path('2fa/verify/', views.Verify2FALoginView.as_view(), name='verify_2fa'),
    path('2fa/disable/', views.Disable2FAView.as_view(), name='disable_2fa'),
]
