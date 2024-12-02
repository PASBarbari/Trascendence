from urllib.parse import parse_qs
from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from channels.auth import AuthMiddlewareStack
from django.core.cache import cache
from django.contrib.auth import get_user_model
import requests , base64
from .models import UserProfile
from django.utils.deprecation import MiddlewareMixin
from chat.settings import oauth2_settings

@database_sync_to_async
def get_user_from_token(token, scope):
	user = cache.get(token)
	if user:
		return user

	introspection_url = oauth2_settings['OAUTH2_INTROSPECTION_URL']
	client_id = oauth2_settings['CLIENT_ID']
	client_secret = oauth2_settings['CLIENT_SECRET']

	credentials = f"{client_id}:{client_secret}"
	encoded_credentials = base64.b64encode(credentials.encode()).decode()

	headers = {
		'Authorization': f'Basic {encoded_credentials}',
		'Content-Type': 'application/x-www-form-urlencoded',
	}
	try:
			response = requests.post(introspection_url, headers=headers,data={
			  'token': token,
		})
			if response.status_code == 200:
					data = response.json()
					if data.get('active'):
							email = data.get('username')
							try:
								User = UserProfile.objects.get(email=email)
								# Cache the user with a timeout (e.g., 5 minutes)
								cache.set(token, User, timeout=300)
								return user
							except UserProfile.DoesNotExist:
								return AnonymousUser()
			else:
				return AnonymousUser()
	except requests.RequestException as e:
		return AnonymousUser()
		
	return AnonymousUser()

class TokenAuthMiddleware(BaseMiddleware):
		async def __call__(self, scope, receive, send):
			query_string = parse_qs(scope["query_string"].decode())
			if scope['path'] == '/chat/new_user/':
						scope['user'] = AnonymousUser()
						return await super().__call__(scope, receive, send)
			try:
					token = query_string.get("token")
					if token:
						scope["user"] = await get_user_from_token(token[0], scope)
					else:
						scope["user"] = AnonymousUser()
			except Exception as e:
						scope["user"] = AnonymousUser()
			return await super().__call__(scope, receive, send)

def TokenAuthMiddlewareStack(inner):
    return TokenAuthMiddleware(AuthMiddlewareStack(inner))

class TokenAuthMiddlewareHTTP(MiddlewareMixin):
		def process_request(self, request):
				if request.path == '/chat/new_user/':
						print(request.path)
						request.user = AnonymousUser()
						return
				
		
				token = request.META.get('HTTP_AUTHORIZATION')
				if token:
						token = token.replace("Bearer ", "")
						user = self.get_user_from_token_sync(token)
						request.user = user
				else:
						request.user = AnonymousUser()

		def get_user_from_token_sync(self, token):
       # Check if the user is already cached
			user = cache.get(token)
			if user:
					return user

			introspection_url = oauth2_settings['OAUTH2_INTROSPECTION_URL']
			client_id = oauth2_settings['CLIENT_ID']
			client_secret = oauth2_settings['CLIENT_SECRET']

			credentials = f"{client_id}:{client_secret}"
			encoded_credentials = base64.b64encode(credentials.encode()).decode()

			headers = {
				'Authorization': f'Basic {encoded_credentials}',
				'Content-Type': 'application/x-www-form-urlencoded',
			}
			try:
					response = requests.post(introspection_url, headers=headers,data={
					  'token': token,
					})
				
					if response.status_code == 200:
							data = response.json()
							if data.get('active'):
									email = data.get('username')
									try:
										User = UserProfile.objects.get(email=email)
										# Cache the user with a timeout (e.g., 5 minutes)
										cache.set(token, User, timeout=300)
										return user
									except UserProfile.DoesNotExist:
										return AnonymousUser()
					else:
						print('Token introspection failed:' f'{response.status_code}')
						print(f"Response: {response}")
						return AnonymousUser()
			except requests.RequestException as e:
				# Log the exception if needed
				print(f"Token introspection failed: {e}")
				return AnonymousUser()
			

from rest_framework.permissions import BasePermission
from django.contrib.auth.models import AnonymousUser
from django.core.cache import cache
from chat.settings import oauth2_settings
import requests
import base64
from .models import UserProfile

class TokenAuthPermission(BasePermission):
		def get_user_from_token(self, token):
				
				# Check if the user is already cached
				user = cache.get(token)
				if user:
						return user

				introspection_url = oauth2_settings['OAUTH2_INTROSPECTION_URL']
				client_id = oauth2_settings['CLIENT_ID']
				client_secret = oauth2_settings['CLIENT_SECRET']

				credentials = f"{client_id}:{client_secret}"
				encoded_credentials = base64.b64encode(credentials.encode()).decode()

				headers = {
						'Authorization': f'Basic {encoded_credentials}',
						'Content-Type': 'application/x-www-form-urlencoded',
				}
				try:
						response = requests.post(introspection_url, headers=headers, data={
								'token': token,
						})

						if response.status_code == 200:
								data = response.json()
								if data.get('active'):
										email = data.get('username')
										try:
											user = UserProfile.objects.get(email=email)
												# Cache the user with a timeout (e.g., 5 minutes)
											cache.set(token, user, timeout=300)
											return user
										except UserProfile.DoesNotExist:
												print('qua')
												return AnonymousUser()
						else:
								print('Token introspection failed:', f'{response.status_code}')
								print(f"Response: {response}")
								return AnonymousUser()
				except requests.RequestException as e:
						# Log the exception if needed
						print(f"Token introspection failed: {e}")
						return AnonymousUser()

				return AnonymousUser()

		def has_permission(self, request, view):
				if request.path == '/chat/new_user/':
						request.user = AnonymousUser()
						return True
				token = request.META.get('HTTP_AUTHORIZATION')
				if token:
						token = token.replace("Bearer ", "")
						user = self.get_user_from_token(token)
						if user and not isinstance(user, AnonymousUser):
								request.user = user
								return True
				return False

from django.conf import settings
from rest_framework.permissions import BasePermission

class APIKeyPermission(BasePermission):
	def has_permission(self, request, view):
		api_key = request.headers.get('X-API-KEY')
		if api_key:
			return api_key == settings.API_KEY
		return False