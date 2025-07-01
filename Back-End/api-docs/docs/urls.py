"""
URLs for documentation app
"""
from django.urls import path, re_path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('status/', views.service_status, name='service_status'),
    path('docs/<str:service_name>/', views.service_docs, name='service_docs'),
    path('api/<str:service_name>/swagger.json', views.swagger_json, name='swagger_json'),
    path('api/combined/swagger.json', views.combined_docs, name='combined_docs'),
    path('docs/combined/', views.service_docs, {'service_name': 'combined'}, name='combined_docs_ui'),
    
    # Proxy endpoints for API testing
    re_path(r'^proxy/(?P<service_name>\w+)/(?P<path>.*)$', views.proxy_api, name='proxy_api'),
    path('proxy/<str:service_name>/', views.proxy_api, {'path': ''}, name='proxy_api_root'),
]
