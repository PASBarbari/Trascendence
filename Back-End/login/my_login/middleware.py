from rest_framework.permissions import BasePermission
import logging
from django.conf import settings
logger = logging.getLogger('django')
class APIKeyPermission(BasePermission):
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

from urllib.parse import parse_qs
from django.http import JsonResponse
from rest_framework_simplejwt.tokens import AccessToken
from django.contrib.auth import get_user_model

class TwoFAMiddleware:
	def __init__(self, get_response):
		self.get_response = get_response

	def __call__(self, request):
		# Check if the user is authenticated and 2FA is enabled
		query_string = parse_qs(scope["query_string"].decode())
		if 'token' in query_string:
			try:
				token = query_string['token'][0]
				decoded_token = AccessToken(token)
				if decoded_token.get('2fa_pending') and decoded_token.is_valid():
					if request.path != '/2fa/verify':
						return JsonResponse({'error': '2FA verification required'}, status=403)
					else:
						User = get_user_model()
						request.user = User.objects.get(user_id=decoded_token['user_id'])
			except Exception as e:
				logger.error(f"Error decoding token: {e}")
				return JsonResponse({'error': 'Invalid token'}, status=403)
		return self.get_response(request)			
			
