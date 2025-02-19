import requests
from oauth2_provider.models import AccessToken
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.conf import settings
from datetime import datetime, timedelta
from pongProject.settings import oauth2_settings
import json

def login_self():
	login_url = 'http://localhost:8000/login/login'
	data = {
		'email': 'pong@pong.me',
		'password' : 'pong_password',
	}

	response = requests.post(login_url, json=data)

	if response.status_code != 200:
		raise Exception('Failed to login user')
	return response.json()

def user_register_self():
	register_url = 'http://localhost:8000/login/register'
	data = {
		'email': 'pong@pong.me',
		'username': 'my_pong',
		'password': 'pong_password',
	}
	response = requests.post(register_url, json=data)
	
	if response.status_code == 400:
		login_self()
	elif response.status_code != 201:
		raise Exception('Failed to register user')
	else:
		login_self()


def register_self():
	csrf_url = 'http://localhost:8000/login/get_csrf_token'
	register_url = 'http://localhost:8000/login/Serviceregister'
    
	data = {
		'name': 'pong_' + datetime.strftime(datetime.now(), '%Y-%m-%d:%H%M%S'),
		'service_password': oauth2_settings['SERVICE_PASSWORD'],
		'client_type': 'confidential',
		'authorization_grant_type': 'password',
		'redirect_uris': 'http://localhost:8000',
		'client_id': oauth2_settings['CLIENT_ID'],
		'client_secret': oauth2_settings['CLIENT_SECRET'],
	}

	session = requests.Session()
	csrf_resp = session.get(csrf_url)
    
	if 'csrftoken' not in csrf_resp.cookies:
		raise Exception('CSRF token not found in response cookies')
    
	csrf_token = csrf_resp.cookies['csrftoken']

	access_token = oauth2_settings['TOKEN']
	print("Access token:", access_token)
	headers = {
		'Content-Type': 'application/json',
		'X-CSRFToken': csrf_token,
		'Authorization': 'Bearer ' + access_token,
	}

	response = session.post(register_url, headers=headers, json=data)
	print("Response status code:", response.status_code)
	print("Response text:", response.json())
	if response.status_code != 200 and response.status_code != 201:
		raise Exception('Failed to register application')
	try:
		app_data = response.json()
	except json.JSONDecodeError:
		raise Exception('Failed to parse JSON response')


#auth classes
import requests
from django.conf import settings
from django.core.cache import cache
from django.contrib.auth.models import AnonymousUser
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
import base64 ,requests
from pongProject.settings import oauth2_settings
from .models import Player
from django.contrib.auth import get_user_model

class TokenAuthentication(BaseAuthentication):
		def authenticate(self, request):
				if request.path == '/pong/new_user/':
						request.user = AnonymousUser()
						return None
				token = request.META.get('HTTP_AUTHORIZATION')
				if not token:
						return None
				token = token.replace("Bearer ", "")
				user = self.get_user_from_token(token)

				if user is not None:
						return (user, token)	# Return tuple (user, auth) as required by DRF
				else:
						raise AuthenticationFailed("Invalid or inactive token")
		
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
					response = requests.post(introspection_url, headers=headers,data={
						'token': token,
					})
				
					if response.status_code == 200:
							data = response.json()
							if data.get('active'):
									email = data.get('username')
									User = Player.objects.get(email=email)
									try:
										# Cache the user with a timeout (e.g., 5 minutes)
											cache.set(token, User, timeout=300)
											return user
									except e:
										return AnonymousUser()
					else:
						print('Token introspection failed:' f'{response.status_code}')
						print(f"Response: {response}")
						return AnonymousUser()
			except requests.RequestException as e:
				# Log the exception if needed
				print(f"Token introspection failed: {e}")
				return None  # Default to None if authentication fails

			



		# def get_user_from_token(self, token):
    #     user = cache.get(token)
    #     if user:
    #         return user

    #     # Token introspection request
    #     introspection_url = oauth2_settings['OAUTH2_INTROSPECTION_URL']
    #     client_id = oauth2_settings['CLIENT_ID']
    #     client_secret = oauth2_settings['CLIENT_SECRET']

    #     try:
    #         response = requests.post(introspection_url, data={
    #             'token': token,
    #             'client_id': client_id,
    #             'client_secret': client_secret,
    #         })

    #         try:
    #             response_json = response.json()
    #             print(f'\033[96mResponse1 json: {response_json}\033[0m')  #DEBUG# # Testo ciano
    #         except requests.exceptions.JSONDecodeError:
    #             print('\033[91mFailed to decode JSON response\033[0m')  #DEBUG# # Testo rosso
    #             return AnonymousUser()

    #         if response.status_code == 200:
    #             data = response.json()
    #             if data.get('active'):
    #                 user_id = data.get('username')
    #                 User = get_user_model()
    #                 try:
    #                     user = User.objects.get(user_id=user_id)
    #                     # Cache user for token expiry duration (default to 5 min if not provided)
    #                     expires_in = data.get('expires_in', 300)
    #                     cache.set(token, user, timeout=expires_in)
    #                     return user
    #                 except User.DoesNotExist:
    #                     pass
    #     except requests.RequestException as e:
    #         raise AuthenticationFailed(f"Token introspection failed: {str(e)}")

