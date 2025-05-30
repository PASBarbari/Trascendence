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
					token = token_str[7:]
		
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

def JWTAuthMiddlewareStack(inner):
	"""
	Helper function that returns a JWT auth middleware wrapped with AuthMiddlewareStack.
	"""
	return JWTAuthMiddleware(AuthMiddlewareStack(inner))


import logging
from channels.middleware import BaseMiddleware

logger = logging.getLogger('django')

class DebugMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        # Log dettagli della richiesta
        if scope['type'] == 'websocket':
            logger.info(f"⭐ WEBSOCKET REQUEST ⭐")
            logger.info(f"PATH: {scope['path']}")
            logger.info(f"HEADERS: {scope.get('headers', [])}")
            logger.info(f"QUERY_STRING: {scope.get('query_string', b'').decode()}")
            
        # Passa al middleware successivo
        return await super().__call__(scope, receive, send)

class ErrorLoggingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        try:
            response = self.get_response(request)
            return response
        except Exception as e:
            import traceback
            logger.error(f"Uncaught exception: {str(e)}\n{traceback.format_exc()}")
            raise

# class TokenAuthMiddleware(BaseMiddleware):
# 	async def __call__(self, scope, receive, send):
# 		query_string = parse_qs(scope["query_string"].decode())
# 		if scope['path'] == '/chat/new_user/':
# 			scope['user'] = AnonymousUser()
# 			return await super().__call__(scope, receive, send)
# 		try:
# 			token = query_string.get("token")
# 			if token:
# 				scope["user"] = await get_user_from_token(token[0])
# 			else:
# 				scope["user"] = AnonymousUser()
# 		except Exception as e:
# 			scope["user"] = AnonymousUser()
# 		return await super().__call__(scope, receive, send)

# def TokenAuthMiddlewareStack(inner):
# 	return TokenAuthMiddleware(AuthMiddlewareStack(inner))

# class TokenAuthMiddlewareHTTP(BaseMiddleware):
# 	async def __call__(self, scope, receive, send):
# 		if scope['path'] == '/chat/new_user/':
# 			scope['user'] = AnonymousUser()
# 			return await super().__call__(scope, receive, send)

# 		headers = dict(scope['headers'])
# 		token = headers.get(b'authorization')
# 		if token:
# 			token = token.decode().replace("Bearer ", "")
# 			scope['user'] = await self.get_user_from_token(token)
# 		else:
# 			scope['user'] = AnonymousUser()

# 		return await super().__call__(scope, receive, send)

# 	@database_sync_to_async
# 	def get_user_from_token(self, token):
# 		try:
# 			# Decode the token
# 			access_token = AccessToken(token)
# 			user_id = access_token['user_id']
			
# 			# Check if the user is already cached
# 			user = cache.get(token)
# 			if user:
# 				return user

# 			# Retrieve the user from the database
# 			try:
# 				user = UserProfile.objects.get(user_id=user_id)
# 				# Cache the user with a timeout (e.g., 5 minutes)
# 				cache.set(token, user, timeout=300)
# 				return user
# 			except UserProfile.DoesNotExist:
# 				return AnonymousUser()
# 		except Exception as e:
# 			return AnonymousUser()


# class TokenAuthPermission(BasePermission):
# 	def get_user_from_token(self, token):
# 		try:
# 			# Decode the token
# 			access_token = AccessToken(token)
# 			user_id = access_token['user_id']
			
# 			# Check if the user is already cached
# 			user = cache.get(token)
# 			if user:
# 				return user

# 			# Retrieve the user from the database
# 			try:
# 				user = UserProfile.objects.get(user_id=user_id)
# 				# Cache the user with a timeout (e.g., 5 minutes)
# 				cache.set(token, user, timeout=300)
# 				return user
# 			except UserProfile.DoesNotExist:
# 				return AnonymousUser()
# 		except Exception as e:
# 			return AnonymousUser()

# 	def has_permission(self, request, view):
# 		if request.path == '/chat/new_user/' and request.method == 'POST':
# 			request.user = AnonymousUser()
# 			return True
# 		token = request.META.get('HTTP_AUTHORIZATION')
# 		if token:
# 			token = token.replace("Bearer ", "")
# 			user = self.get_user_from_token(token)
# 			if user and not isinstance(user, AnonymousUser):
# 				request.user = user
# 				return True
# 		return False

# from django.conf import settings
# from rest_framework.permissions import BasePermission

# class APIKeyPermission(BasePermission):
# 	def has_permission(self, request, view):
# 		api_key = request.headers.get('X-API-KEY')
# 		if api_key:
# 			return api_key == settings.API_KEY
# 		return False