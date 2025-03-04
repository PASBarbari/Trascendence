from django.contrib.auth.models import AnonymousUser
from django.core.cache import cache
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

class APIKeyPermission(BasePermission):
	"""
	Simple API key permission class
	"""
	def has_permission(self, request, view):
		api_key = request.headers.get('X-API-KEY')
		if api_key:
			return api_key == settings.API_KEY
		return False
		
# 		# Try to get token from query string first
# 		query_string = parse_qs(scope["query_string"].decode())
# 		token = None
		
# 		if 'token' in query_string:
# 			# Token from query param: ws://example.com/ws/chat/1/?token=<jwt_token>
# 			token = query_string['token'][0]
# 		else:
# 			# Try to get token from headers (less common for WebSockets but possible)
# 			headers = dict(scope['headers'])
# 			auth_header = headers.get(b'authorization')
# 			if auth_header:
# 				token_str = auth_header.decode()
# 				if token_str.startswith('Bearer '):
# 					token = token_str[7:]  # Remove 'Bearer ' prefix
		
# 		if token:
# 			# Get user from token
# 			try:
# 				scope['user'] = await self.get_user_from_jwt(token)
# 				logger.info(f"WebSocket authenticated user: {scope['user']}")
# 			except Exception as e:
# 				logger.error(f"WebSocket JWT authentication failed: {str(e)}")
# 				scope['user'] = AnonymousUser()
# 		else:
# 			scope['user'] = AnonymousUser()
			
# 		return await super().__call__(scope, receive, send)
		
# 	@database_sync_to_async
# 	def get_user_from_jwt(self, token):
# 		try:
# 			# Decode the JWT token
# 			access_token = AccessToken(token)
# 			user_id = access_token['user_id']
			
# 			# Check if the user is already cached
# 			user = cache.get(f"jwt_ws_user_{token}")
# 			if user:
# 				return user

# def JWTAuthMiddlewareStack(inner):
# 	"""
# 	Helper function that returns a JWT auth middleware wrapped with AuthMiddlewareStack.
# 	"""
# 	return JWTAuthMiddleware(AuthMiddlewareStack(inner))

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