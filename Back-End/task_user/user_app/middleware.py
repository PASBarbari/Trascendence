from django.contrib.auth.models import AnonymousUser
from django.core.cache import cache
from django.db import OperationalError, connections
from django.http import JsonResponse
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.authentication import JWTAuthentication
from .models import UserProfile
import logging
from rest_framework import authentication, exceptions
from rest_framework.permissions import BasePermission
from django.conf import settings

logger = logging.getLogger('django')

class ServiceAuthentication(authentication.BaseAuthentication):
	"""
	Authentication class for inter-service communication.
	Uses API keys instead of channels-based auth.
	"""
	def authenticate(self, request):
		# Only apply this authentication to specific endpoints
		if not request.path.endswith('/task/api/endpoint/') or request.method != 'POST':
			return None
			
		# Check for API key
		api_key = request.headers.get('X-API-KEY')
		if not api_key or api_key != settings.API_KEY:
			logger.warning(f"Invalid API key attempt: {api_key}")
			raise exceptions.AuthenticationFailed('Invalid API key')
		
		# Return anonymous user for service-to-service authentication
		return (AnonymousUser(), None)


def get_user_from_token(token):
	"""
	Synchronous version of token validation (no channels dependency)
	"""
	try:
		# Decode the token
		access_token = AccessToken(token)
		user_id = access_token['user_id']
		
		# Check if the user is already cached
		user = cache.get(token)
		if user:
			return user
		# Retrieve the user from the database
		try:
			user = UserProfile.objects.get(user_id=user_id)
			# Cache the user with a timeout (e.g., 5 minutes)
			cache.set(token, user, timeout=300)
			return user
		except UserProfile.DoesNotExist:
			return AnonymousUser()
	except Exception as e:
		return AnonymousUser()


class JWTAuth(JWTAuthentication):
	"""
	Enhanced JWT authentication class with caching support and improved error handling.
	"""
	user_id_claim = 'user_id'

	def authenticate(self, request):
		# Skip authentication for specific paths if needed
		if request.path.endswith('/chat/new_user/') and request.method == 'POST':
			logger.debug(f"Skipping JWT auth for {request.path}")
			return None
			
		logger.debug(f"Headers in request: {request.META}")  
		# Check for cached authentication result first
		auth_header = request.META.get('HTTP_AUTHORIZATION', '')
		if not auth_header or not auth_header.startswith('Bearer '):
			return None
			
		token = auth_header.replace('Bearer ', '')
		if not token:
			return None
			
		# Try to get from cache first
		cache_key = f"jwt_auth_{token}"
		cached_result = cache.get(cache_key)
		
		if cached_result is not None:
			logger.debug("Using cached JWT authentication result")
			if cached_result == "anonymous":
				return None
			return cached_result
			
		# If not in cache, validate the token using the more robust method from WebSocket middleware
		try:
			# Directly try to decode the JWT token first (like in WebSocket middleware)
			access_token = AccessToken(token)
			user_id = access_token.get('user_id')
			
			if not user_id:
				logger.warning("No user_id claim found in token")
				cache.set(cache_key, "anonymous", timeout=60)
				return None
				
			# Check if user exists in database
			try:
				user = UserProfile.objects.get(user_id=user_id)
				# Successfully authenticated
				auth_result = (user, token)
				cache.set(cache_key, auth_result, timeout=300)
				logger.debug(f"JWT auth successful for user {user}")
				return auth_result
			except UserProfile.DoesNotExist:
				logger.warning(f"User ID {user_id} from token not found in UserProfile")
				cache.set(cache_key, "anonymous", timeout=60)
				return None

		except Exception as e:
			# Log the error but don't cache exceptions
			logger.warning(f"JWT authentication failed: {str(e)}")
			logger.warning(f"Token details: {token[:10]}...{token[-10:] if len(token) > 20 else ''}")
			try:
				# Try to extract some debug info without validation
				decoded = AccessToken(token, verify=False)
				user_id = decoded.get('user_id')
				exp = decoded.get('exp', 'unknown')
				iat = decoded.get('iat', 'unknown')
				logger.warning(f"Token debug info - User ID: {user_id}, Expires: {exp}, Issued: {iat}")
				if user_id:
					logger.warning(f"User exists: {UserProfile.objects.filter(user_id=user_id).exists()}")
			except Exception as inner_e:
				logger.warning(f"Token decode failed: {str(inner_e)}")
				
			return None

	def get_user(self, validated_token):
		"""
		Returns user from validated token for DRF compatibility
		"""
		try:
			user_id = validated_token[self.user_id_claim]
			
			# Cerca l'utente nel modello UserProfile
			user = UserProfile.objects.get(user_id=user_id)
			
			return user
		except UserProfile.DoesNotExist:
			logger.warning(f"User ID {user_id} from token not found in UserProfile")
			return None
		except Exception as e:
			logger.error(f"Error getting user from token: {str(e)}")
			return None
class APIKeyPermission(BasePermission):
	"""
	Simple API key permission class
	"""
	def has_permission(self, request, view):
		api_key = request.headers.get('X-API-KEY')
		if api_key:
			return api_key == settings.API_KEY
		return False
		
class HealthCheckMiddleware:
	def __init__(self, get_response):
		self.get_response = get_response
		
	def __call__(self, request):
		# Allow health check endpoint regardless of host
		if request.path.endswith('/health'): # Liveness probe
			return JsonResponse({'status': 'ok'})
		elif request.path.endswith('/ready'): # Readiness probe
			db_ready = False
			try:
				# Check the default database connection
				db_conn = connections['default']
				db_conn.cursor() # Attempt to get a cursor to check connectivity
				# Optionally, you could execute a very simple query:
				# with db_conn.cursor() as cursor:
				#     cursor.execute("SELECT 1")
				#     cursor.fetchone()
				db_ready = True
			except OperationalError:
				logger.error("Readiness probe: Database connection failed.")
				# db_ready remains False

			if db_ready:
				return JsonResponse({'status': 'ready', 'database': 'ok'})
			else:
				return JsonResponse({'status': 'unready', 'database': 'unavailable'}, status=503)
			
		return self.get_response(request)