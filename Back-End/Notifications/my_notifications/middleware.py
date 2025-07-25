# filepath: /home/lollo/Documents/Fides/Back-End/chat/my_chat/middleware.py
from urllib.parse import parse_qs
from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from channels.auth import AuthMiddlewareStack
from django.core.cache import cache
from django.db import OperationalError, connections
from django.http import JsonResponse
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import BasePermission
from .models import UserProfile
import logging
from rest_framework import authentication, exceptions
from django.conf import settings
logger = logging.getLogger('django')

class ServiceAuthentication(authentication.BaseAuthentication):
	"""
	Authentication class specifically for inter-service communication.
	Authenticates requests from other microservices using API keys and optionally JWT tokens.
	"""
	def authenticate(self, request):
		# Only apply this authentication to the new_user endpoint
		if not request.path.endswith('/chat/new_user/') or request.method != 'POST':
			return None
			
		# Check for API key
		api_key = request.headers.get('X-API-KEY')
		if not api_key or api_key != settings.API_KEY:
			logger.warning(f"Invalid API key attempt: {api_key}")
			raise exceptions.AuthenticationFailed('Invalid API key')
			
		# For additional security, you could also validate the JWT token
		# if you want to ensure the request comes from an authenticated service
		auth_header = request.headers.get('Authorization')
		if auth_header and auth_header.startswith('Bearer '):
			token = auth_header.replace('Bearer ', '')
			try:
				# You could validate the token or extract service info
				# This is optional since we're already validating with API key
				decoded_token = AccessToken(token)
				# You could check for specific claims that identify the service
				# service_name = decoded_token.get('service_name')
				logger.info(f"Request from authenticated service")
			except Exception as e:
				# We don't fail here since API key was valid
				logger.warning(f"JWT token validation failed: {str(e)}")
		
		# Return None for user since this is service-to-service authentication
		# The view will handle creating the user based on the request data
		return (AnonymousUser(), None)

@database_sync_to_async
def get_user_from_token(token):
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
			return (AnonymousUser(), None)
			
		# Check for cached authentication result first
		auth_header = request.META.get('HTTP_AUTHORIZATION', '')
		if auth_header and auth_header.startswith('Bearer '):
			token = auth_header.replace('Bearer ', '')
			
			# Try to get from cache first
			cache_key = f"jwt_auth_{token}"
			cached_result = cache.get(cache_key)
			
			if cached_result is not None:
				logger.debug("Using cached JWT authentication result")
				if cached_result == "anonymous":
					return None
				return cached_result
				
			try:
				# Call parent class to validate token
				auth_result = super().authenticate(request)
				
				# Cache the result (None results don't need caching)
				if auth_result:
					# Cache successful authentications for 5 minutes (adjust as needed)
					cache.set(cache_key, auth_result, timeout=300)
					logger.debug(f"JWT auth successful for user {auth_result[0]}")
					return auth_result
				else:
					# Cache negative results for a shorter time (1 minute)
					cache.set(cache_key, "anonymous", timeout=60)
					return None
					
			except Exception as e:
				# Log the error but don't cache exceptions
				logger.warning(f"JWT authentication failed: {str(e)}")
				logger.warning(f"Token details: {token[:10]}...{token[-10:]}")
				try:
					decoded = AccessToken(token)
					user_id = decoded.get('user_id')
					logger.warning(f"User ID from token: {user_id}, exists: {UserProfile.objects.filter(user_id=user_id).exists()}")
				except Exception as inner_e:
							logger.warning(f"Token decode failed: {str(inner_e)}")
				return None
		
		# No auth header or not a Bearer token
		return super().authenticate(request)
	def get_user(self, validated_token):
		"""
		Sovrascrive il metodo get_user per utilizzare UserProfile invece del modello User standard
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

class JWTAuthMiddleware(BaseMiddleware):
	"""
	JWT Authentication middleware for WebSocket connections.
	Extracts the JWT token from query parameters or headers and authenticates the user.
	"""
	async def __call__(self, scope, receive, send):
		# Skip authentication for specific paths if needed
		if scope['path'] == '/chat/new_user/':
			scope['user'] = AnonymousUser()
			return await super().__call__(scope, receive, send)
		
		# Try to get token from query string first
		query_string = parse_qs(scope["query_string"].decode())
		token = None
		
		if 'token' in query_string:
			# Token from query param: ws://example.com/ws/chat/1/?token=<jwt_token>
			token = query_string['token'][0]
		else:
			# Try to get token from headers (less common for WebSockets but possible)
			headers = dict(scope['headers'])
			auth_header = headers.get(b'authorization')
			if auth_header:
				token_str = auth_header.decode()
				if token_str.startswith('Bearer '):
					token = token_str[7:]  # Remove 'Bearer ' prefix
		
		if token:
			# Get user from token
			try:
				scope['user'] = await self.get_user_from_jwt(token)
				logger.info(f"WebSocket authenticated user: {scope['user']}")
			except Exception as e:
				logger.error(f"WebSocket JWT authentication failed: {str(e)}")
				scope['user'] = AnonymousUser()
		else:
			scope['user'] = AnonymousUser()
			
		return await super().__call__(scope, receive, send)
		
	@database_sync_to_async
	def get_user_from_jwt(self, token):
		try:
			# Decode the JWT token
			access_token = AccessToken(token)
			user_id = access_token['user_id']
			
			# Check if the user is already cached
			user = cache.get(f"jwt_ws_user_{token}")
			if user:
				return user
				
			# Retrieve the user from the database
			try:
				user = UserProfile.objects.get(user_id=user_id)
				# Cache the user with a timeout (e.g., 5 minutes)
				cache.set(f"jwt_ws_user_{token}", user, timeout=300)
				return user
			except UserProfile.DoesNotExist:
				return AnonymousUser()
		except Exception as e:
			logger.error(f"JWT token validation failed: {str(e)}")
			return AnonymousUser()

class DebugMiddleware(BaseMiddleware):
	"""
	Debug middleware to log WebSocket connection attempts and details
	"""
	async def __call__(self, scope, receive, send):
		logger.info(f"=== WebSocket Debug Info ===")
		logger.info(f"Path: {scope.get('path')}")
		logger.info(f"Query string: {scope.get('query_string', b'').decode()}")
		logger.info(f"Headers: {dict(scope.get('headers', []))}")
		logger.info(f"User: {scope.get('user', 'Not set')}")
		logger.info(f"User type: {type(scope.get('user', 'Not set'))}")
		if hasattr(scope.get('user'), 'user_id'):
			logger.info(f"User ID: {scope['user'].user_id}")
		logger.info(f"=== End Debug Info ===")
		
		return await super().__call__(scope, receive, send)

def JWTAuthMiddlewareStack(inner):
	"""
	Helper function that returns a JWT auth middleware wrapped with AuthMiddlewareStack.
	"""
	return JWTAuthMiddleware(AuthMiddlewareStack(inner))


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