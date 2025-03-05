from urllib.parse import parse_qs
from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from channels.auth import AuthMiddlewareStack
from django.core.cache import cache
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import BasePermission
from .models import UserProfile
import logging
from rest_framework import authentication, exceptions
from django.conf import settings

# Get dedicated loggers for different components
logger = logging.getLogger('pong_app')
auth_logger = logging.getLogger('django.request')
websocket_logger = logging.getLogger('websockets')

class ServiceAuthentication(authentication.BaseAuthentication):
	"""
	Authentication class specifically for inter-service communication.
	Authenticates requests from other microservices using API keys and optionally JWT tokens.
	"""
	def authenticate(self, request):
		# Only apply this authentication to specific endpoints
		if not request.path.endswith('/pong/api/endpoint/') or request.method != 'POST':
			return None
			
		# Check for API key
		api_key = request.headers.get('X-API-KEY')
		if not api_key or api_key != settings.API_KEY:
			auth_logger.warning(f"Invalid API key attempt: {api_key}, path: {request.path}")
			raise exceptions.AuthenticationFailed('Invalid API key')
			
		# For additional security, validate JWT token
		auth_header = request.headers.get('Authorization')
		if auth_header and auth_header.startswith('Bearer '):
			token = auth_header.replace('Bearer ', '')
			try:
				# Validate the token
				decoded_token = AccessToken(token)
				auth_logger.info(f"Request from authenticated service: {request.path}")
			except Exception as e:
				# Log but don't fail since API key was valid
				auth_logger.warning(f"JWT token validation failed in service auth: {str(e)}")
		
		# Return Anonymous user since this is service-to-service
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
			websocket_logger.debug(f"User {user_id} found in cache")
			return user

		# Retrieve the user from the database
		try:
			user = UserProfile.objects.get(user_id=user_id)
			# Cache the user with a timeout (e.g., 5 minutes)
			cache.set(token, user, timeout=300)
			websocket_logger.debug(f"User {user_id} loaded from database and cached")
			return user
		except UserProfile.DoesNotExist:
			websocket_logger.warning(f"User {user_id} from token not found in database")
			return AnonymousUser()
	except Exception as e:
		websocket_logger.error(f"Error processing token: {str(e)}")
		return AnonymousUser()


class JWTAuth(JWTAuthentication):
	"""
	Enhanced JWT authentication class with caching support and improved error handling.
	"""
	user_id_claim = 'user_id'
	
	def authenticate(self, request):
		# Skip authentication for specific paths if needed
		if request.path.endswith('/pong/health/') and request.method == 'GET':
			logger.debug(f"Skipping JWT auth for health check: {request.path}")
			return (AnonymousUser(), None)
			
		# Log the auth attempt
		auth_logger.debug(f"JWT auth attempt: {request.path}")
		
		# Check for cached authentication result first
		auth_header = request.META.get('HTTP_AUTHORIZATION', '')
		if auth_header and auth_header.startswith('Bearer '):
			token = auth_header.replace('Bearer ', '')
			
			# Try to get from cache first
			cache_key = f"jwt_auth_{token}"
			cached_result = cache.get(cache_key)
			
			if cached_result is not None:
				auth_logger.debug("Using cached JWT authentication result")
				if cached_result == "anonymous":
					return None
				return cached_result
				
			try:
				# Call parent class to validate token
				auth_result = super().authenticate(request)
				
				# Cache the result (None results don't need caching)
				if auth_result:
					# Cache successful authentications for 5 minutes
					cache.set(cache_key, auth_result, timeout=300)
					auth_logger.debug(f"JWT auth successful for user {auth_result[0]}")
					return auth_result
				else:
					# Cache negative results for a shorter time
					cache.set(cache_key, "anonymous", timeout=60)
					auth_logger.debug("JWT auth failed - no valid user")
					return None
					
			except Exception as e:
				# Log the error but don't cache exceptions
				auth_logger.warning(f"JWT authentication failed: {str(e)}")
				try:
					# Additional debug information
					decoded = AccessToken(token)
					user_id = decoded.get('user_id')
					auth_logger.debug(f"Token user_id={user_id}, exists={UserProfile.objects.filter(user_id=user_id).exists()}")
				except Exception as inner_e:
					auth_logger.warning(f"Token decode failed: {str(inner_e)}")
				return None
		
		# No auth header or not a Bearer token
		return super().authenticate(request)
		
	def get_user(self, validated_token):
		"""
		Override get_user to use UserProfile instead of standard User model
		"""
		try:
			user_id = validated_token[self.user_id_claim]
			
			# Look up user in UserProfile model
			user = UserProfile.objects.get(user_id=user_id)
			auth_logger.debug(f"User {user_id} found in get_user")
			return user
		except UserProfile.DoesNotExist:
			auth_logger.warning(f"User ID {user_id} from token not found in UserProfile")
			return None
		except Exception as e:
			auth_logger.error(f"Error getting user from token: {str(e)}")
			return None

class JWTAuthMiddleware(BaseMiddleware):
	"""
	JWT Authentication middleware for WebSocket connections.
	Extracts the JWT token from query parameters or headers and authenticates the user.
	"""
	async def __call__(self, scope, receive, send):
		# Record connection attempt
		websocket_logger.debug(f"WebSocket connection attempt: {scope['path']}")
		
		# Skip authentication for specific paths if needed
		if scope['path'].endswith('/health/'):
			websocket_logger.debug(f"Skipping auth for: {scope['path']}")
			scope['user'] = AnonymousUser()
			return await super().__call__(scope, receive, send)
		
		# Try to get token from query string first
		query_string = parse_qs(scope["query_string"].decode())
		token = None
		
		if 'token' in query_string:
			# Token from query param
			token = query_string['token'][0]
			websocket_logger.debug("Found token in query string")
		else:
			# Try to get token from headers
			headers = dict(scope['headers'])
			auth_header = headers.get(b'authorization')
			if auth_header:
				token_str = auth_header.decode()
				if token_str.startswith('Bearer '):
					token = token_str[7:]  # Remove 'Bearer ' prefix
					websocket_logger.debug("Found token in authorization header")
		
		if token:
			# Get user from token
			try:
				scope['user'] = await self.get_user_from_jwt(token)
				websocket_logger.info(f"WebSocket authenticated: user={getattr(scope['user'], 'user_id', 'anonymous')}, path={scope['path']}")
			except Exception as e:
				websocket_logger.error(f"WebSocket JWT auth failed: {str(e)}")
				scope['user'] = AnonymousUser()
		else:
			websocket_logger.warning(f"No token found for WebSocket connection: {scope['path']}")
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
				websocket_logger.debug(f"WebSocket user {user_id} found in cache")
				return user
				
			# Retrieve the user from the database
			try:
				user = UserProfile.objects.get(user_id=user_id)
				# Cache the user
				cache.set(f"jwt_ws_user_{token}", user, timeout=300)
				websocket_logger.debug(f"WebSocket user {user_id} loaded from database and cached")
				return user
			except UserProfile.DoesNotExist:
				websocket_logger.warning(f"WebSocket user {user_id} not found in database")
				return AnonymousUser()
		except Exception as e:
			websocket_logger.error(f"WebSocket JWT validation failed: {str(e)}")
			return AnonymousUser()

def JWTAuthMiddlewareStack(inner):
	"""
	Helper function that returns a JWT auth middleware wrapped with AuthMiddlewareStack.
	"""
	return JWTAuthMiddleware(AuthMiddlewareStack(inner))