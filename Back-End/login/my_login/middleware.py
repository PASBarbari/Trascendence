from django.conf import settings
from rest_framework.permissions import BasePermission

class APIKeyPermission(BasePermission):
	def has_permission(self, request, view):
		api_key = request.META.get('X-API-KEY')
		if api_key:
			return api_key == settings.API_KEY
		return False

	def has_permission(self, request, view):
		api_key = request.META.get('X-API-KEY')
		if api_key:
			return api_key == settings.API_KEY
		return False

from django.http import JsonResponse

class HealthCheckMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        
    def __call__(self, request):
        # Allow health check endpoint regardless of host
        if request.path.endswith('/health'):
            return JsonResponse({'status': 'ok'})
        return self.get_response(request)