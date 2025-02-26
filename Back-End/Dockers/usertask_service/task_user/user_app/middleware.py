from django.conf import settings
from rest_framework.permissions import BasePermission

class APIKeyPermission(BasePermission):
	def has_permission(self, request, view):
		api_key = request.headers.get('X-API-KEY')
		print("API Key:", api_key)
		if api_key:
			return api_key == settings.API_KEY
		return False

