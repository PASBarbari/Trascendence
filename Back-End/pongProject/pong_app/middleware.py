from urllib.parse import parse_qs
from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from channels.auth import AuthMiddlewareStack
from django.core.cache import cache
from django.db import OperationalError, connections
from rest_framework.permissions import BasePermission
from .models import UserProfile
import logging
from rest_framework import authentication, exceptions
from django.conf import settings
import jwt

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
				# Validate the token manually
				decoded_payload = jwt.decode(
					token, 
					settings.SECRET_KEY, 
					algorithms=['HS256']
				)
				auth_logger.info(f"Request from authenticated service: {request.path}")
			except jwt.ExpiredSignatureError:
				auth_logger.warning("Service JWT token has expired")
			except jwt.InvalidTokenError as e:
				auth_logger.warning(f"Service JWT token validation failed: {str(e)}")
			except Exception as e:
				# Log but don't fail since API key was valid
				auth_logger.warning(f"JWT token validation failed in service auth: {str(e)}")
		
		# Return Anonymous user since this is service-to-service
		return (AnonymousUser(), None)

@database_sync_to_async
def get_user_from_token(token):
	try:
		# Decode the token manually without Django apps validation
		decoded_payload = jwt.decode(
			token, 
			settings.SECRET_KEY, 
			algorithms=['HS256']
		)
		
		user_id = decoded_payload.get('user_id')
		if not user_id:
			websocket_logger.warning("No user_id found in token payload")
			return AnonymousUser()

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


class JWTAuth(authentication.BaseAuthentication):
	"""
	Enhanced JWT authentication class with cross-microservice support.
	Uses manual JWT decoding to avoid Django app dependencies.
	"""
	user_id_claim = 'user_id'
	
	def authenticate(self, request):
		# Skip authentication for specific paths if needed
		if request.path.endswith('/health') and request.method == 'GET':
			auth_logger.debug(f"Skipping JWT auth for health check: {request.path}")
			return None
			
		# Log the auth attempt
		auth_logger.debug(f"JWT auth attempt: {request.path}")
		
		# Get Authorization header
		auth_header = request.META.get('HTTP_AUTHORIZATION', '')
		if not auth_header or not auth_header.startswith('Bearer '):
			auth_logger.debug("No Bearer token found in request")
			return None
			
		token = auth_header.replace('Bearer ', '')
		
		# Try to get from cache first
		cache_key = f"pong_jwt_auth_{token[:16]}"  # Use pong prefix and token prefix for unique key
		cached_result = cache.get(cache_key)
		
		if cached_result is not None:
			auth_logger.debug("Using cached JWT authentication result")
			if cached_result == "anonymous":
				return None
			return cached_result
			
		try:
			# Decode the JWT token manually
			decoded_payload = jwt.decode(
				token, 
				settings.SECRET_KEY, 
				algorithms=['HS256']
			)
			
			user_id = decoded_payload.get('user_id')
			if not user_id:
				auth_logger.warning("No user_id found in token payload")
				cache.set(cache_key, "anonymous", timeout=60)
				return None
			
			# Try to get user from database
			try:
				user = UserProfile.objects.get(user_id=user_id)
				auth_result = (user, token)
				
				# Cache successful authentications for 5 minutes
				cache.set(cache_key, auth_result, timeout=300)
				auth_logger.info(f"JWT auth successful for user {user_id}")
				return auth_result
				
			except UserProfile.DoesNotExist:
				auth_logger.warning(f"User {user_id} from token not found in database")
				cache.set(cache_key, "anonymous", timeout=60)
				return None
				
		except jwt.ExpiredSignatureError:
			auth_logger.warning("JWT token has expired")
			cache.set(cache_key, "anonymous", timeout=60)
			return None
		except jwt.InvalidTokenError as e:
			auth_logger.warning(f"Invalid JWT token: {str(e)}")
			cache.set(cache_key, "anonymous", timeout=60)
			return None
		except Exception as e:
			auth_logger.error(f"JWT authentication error: {str(e)}")
			return None

		# No auth header or not a Bearer token
		return None
		
	def get_user(self, validated_token):
		"""
		Override get_user to use UserProfile instead of standard User model
		"""
		try:
			user_id = validated_token[self.user_id_claim]
			
			# Look up user in UserProfile model
			user = UserProfile.objects.get(user_id=user_id)
			auth_logger.info(f"User {user_id} found in get_user")
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
			websocket_logger.debug("Starting JWT token decode")
			# Decode the JWT token manually
			decoded_payload = jwt.decode(
				token, 
				settings.SECRET_KEY, 
				algorithms=['HS256']
			)
			websocket_logger.debug("JWT token decoded successfully")
			
			user_id = decoded_payload.get('user_id')
			if not user_id:
				websocket_logger.warning("No user_id found in token payload")
				return AnonymousUser()
			
			websocket_logger.debug(f"Looking for user with user_id: {user_id}")
				# Check if the user is already cached
			cache_key = f"pong_jwt_ws_user_{user_id}_{token[:8]}"  # Use user_id and token prefix for unique key
			user = cache.get(cache_key)
			if user:
				websocket_logger.debug(f"WebSocket user {user_id} found in cache")
				return user

			websocket_logger.debug("User not in cache, querying database")
			# Retrieve the user from the database
			try:
				user = UserProfile.objects.get(user_id=user_id)
				# Cache the user with specific pong prefix
				cache.set(cache_key, user, timeout=300)
				websocket_logger.debug(f"WebSocket user {user_id} loaded from database and cached")
				return user
			except UserProfile.DoesNotExist:
				websocket_logger.warning(f"WebSocket user {user_id} not found in database")
				return AnonymousUser()
		except jwt.ExpiredSignatureError:
			websocket_logger.warning("WebSocket JWT token has expired")
			return AnonymousUser()
		except jwt.InvalidTokenError as e:
			websocket_logger.warning(f"WebSocket JWT token is invalid: {str(e)}")
			return AnonymousUser()
		except Exception as e:
			websocket_logger.error(f"WebSocket JWT validation failed: {str(e)}")
			import traceback
			websocket_logger.error(f"WebSocket JWT validation traceback: {traceback.format_exc()}")
			return AnonymousUser()

def JWTAuthMiddlewareStack(inner):
	"""
	Helper function that returns a JWT auth middleware wrapped with AuthMiddlewareStack.
	"""
	return JWTAuthMiddleware(AuthMiddlewareStack(inner))

def UnhandledExceptionMiddleware(inner):
    """
    Middleware to catch unhandled exceptions and log them.
    """
    async def middleware(scope, receive, send):
        try:
            return await inner(scope, receive, send)
        except Exception as e:
            # Add connection type to the log
            conn_type = scope.get('type', 'unknown')
            path = scope.get('path', 'unknown_path')
            
            if conn_type == 'websocket':
                websocket_logger.error(f"Unhandled WebSocket exception in {path}: {str(e)}", exc_info=True)
                
                if scope.get('websocket_state', None) == 'connected':
                    try:
                        await send({
                            'type': 'websocket.close',
                            'code': 1011,
                            'reason': 'Server error occurred'
                        })
                    except:
                        websocket_logger.error("Failed to send close frame", exc_info=True)
            else:
                logger.error(f"Unhandled {conn_type} exception in {path} from {scope.get('client', 'unknown')}: {str(e)}", exc_info=True)
                
            raise
    return middleware

import sys
import traceback
from django.http import JsonResponse
from django.conf import settings
import logging

logger = logging.getLogger('django.request')

class ExceptionMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        return self.get_response(request)

    def process_exception(self, request, exception):
        # Stampa l'errore dettagliato sulla console
        print("="*80)
        print(f"ERRORE NON GESTITO: {str(exception)}")
        print("Traceback completo:")
        traceback.print_exc()
        print("="*80)
        
        # Log dettagliato
        logger.error(
            f"Errore non gestito nella richiesta {request.path}: {str(exception)}",
            exc_info=True,
            extra={'request': request}
        )

        # if settings.DEBUG:
        #     # In modalità debug, restituisci i dettagli dell'errore
        #     return JsonResponse({
        #         'error': str(exception),
        #         'traceback': traceback.format_exc(),
        #         'request_path': request.path,
        #         'request_method': request.method,
        #         'request_data': getattr(request, 'data', {})
        #     }, status=500)
        
        return None  # Lascia che Django gestisca la risposta in produzione
	
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