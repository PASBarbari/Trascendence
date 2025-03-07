from urllib.parse import urlencode
from django.contrib.auth import get_user_model, login, logout
from django.utils.decorators import method_decorator
from django.shortcuts import redirect
from django.utils.decorators import method_decorator
import requests
from rest_framework.views import APIView
from rest_framework.response import Response
from .serializers import UserRegisterSerializer, UserLoginSerializer, UserSerializer
from rest_framework import permissions, status
from .validations import custom_validation, validate_email, validate_password
from oauth2_provider.contrib.rest_framework import OAuth2Authentication , TokenHasScope, TokenHasReadWriteScope
from .errors import error_codes
from oauth2_provider.models import AccessToken , Application
from oauthlib.common import generate_token
from django.http import HttpRequest, JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie, csrf_exempt
from django.middleware.csrf import get_token
from oauth2_provider.views import TokenView
from django.contrib.auth import login
from login.settings import client
from login.settings import SERVICE_PASSWORD
from oauth2_provider.models import AccessToken
from django.utils.decorators import method_decorator
from .models import AppUser
from login.settings import Microservices
from django.utils import timezone
from datetime import timedelta
from django.conf import settings
from rest_framework_simplejwt.tokens import RefreshToken
import logging, random, string, hashlib, base64
from django.views.decorators.csrf import csrf_exempt
from django.db import transaction
OAUTH2_PROVIDERS = settings.OAUTH2_PROVIDERS

def get_jwt_token_for_user(user):
	refresh = RefreshToken.for_user(user)
	return str(refresh.access_token)

# Update the CreateOnOtherServices function to handle errors properly
@transaction.atomic
def CreateOnOtherServices(user):
	"""Create user in all microservices with proper transaction handling"""
	Chat_url = Microservices['Chat'] + "/chat/new_user/"
	Notification_url = Microservices['Notifications'] + "/notification/add_user"
	User_url = Microservices['Users'] + "/user/user"
	pong_url = Microservices['Pong'] + "/pong/player"
		
	jwt_token = get_jwt_token_for_user(user)
	headers = {
		'Content-Type': 'application/json',
		'Authorization': f'Bearer {jwt_token}',
		'X-API-KEY': settings.API_KEY,
	}

	user_data = {
		'user_id': user.user_id,
		'username': user.username,
		'email': user.email,
	}
		
	# Create a savepoint for potential rollback
	sid = transaction.savepoint()
		
	try:
		# Create user in User service
		user_response = requests.post(User_url, json=user_data, headers=headers)
		if user_response.status_code != 201:
			logging.error(f"User service error: {user_response.status_code} - {user_response.text}")
			raise ValueError('User service failed to create user')
			
		# Create user in Chat service
		chat_response = requests.post(Chat_url, json=user_data, headers=headers)
		if chat_response.status_code != 201:
			logging.error(f"Chat service error: {chat_response.status_code} - {chat_response.text}")
			raise ValueError('Chat service failed to create user')
			
		# Create user in Notification service
		notification_response = requests.post(Notification_url, json=user_data, headers=headers)
		if notification_response.status_code != 201:
			logging.error(f"Notification service error: {notification_response.status_code} - {notification_response.text}")
			raise ValueError('Notification service failed to create user')
			
		# Create user in Pong service
		pong_response = requests.post(pong_url, json=user_data, headers=headers)
		if pong_response.status_code != 201:
			logging.error(f"Pong service error: {pong_response.status_code} - {pong_response.text}")
			raise ValueError('Pong service failed to create user')
			
		return True
		
	except Exception as e:
		# If any service fails, rollback the transaction including the user creation
		transaction.savepoint_rollback(sid)
		logging.error(f"Failed to create user in all services: {str(e)}")
		raise e

@method_decorator(csrf_exempt, name='dispatch')
class OAuthLoginView(APIView):
	"""
	Initiates OAuth2 authorization flow with PKCE for various providers.
		
	GET /login/oauth/{provider}/
	---
	parameters:
	  - name: provider
		in: path
		required: true
		type: string
		description: OAuth provider (google, github, facebook, etc.)
	"""
	permission_classes = (permissions.AllowAny,)

	def get(self, request, provider):
		provider = provider.upper()
		provider_config = OAUTH2_PROVIDERS.get(provider)
		
		if not provider_config:
			return Response(
				{"error": f"Provider '{provider}' not configured"}, 
				status=status.HTTP_400_BAD_REQUEST
			)
			
		code_verifier = self.generate_code_verifier()
		code_challenge = self.generate_code_challenge(code_verifier)
		
		request.session['code_verifier'] = code_verifier
		request.session['oauth_provider'] = provider
		
		if not provider == '42':
			authorization_url = (
				f"{provider_config.get('authorization_url')}?"
				f"client_id={provider_config.get('client_id')}&"
				"response_type=code&"
				f"redirect_uri={provider_config.get('redirect_uri')}&"
				f"scope={provider_config.get('scope')}&"
				f"code_challenge={code_challenge}&"
				"code_challenge_method=S256&"
				"access_type=offline"
			)
		else:
			authorization_url = (
				f"{provider_config.get('authorization_url')}?"
				f"client_id={provider_config.get('client_id')}&"
				f"redirect_uri={provider_config.get('redirect_uri')}&"
				"response_type=code&"
			)

		return redirect(authorization_url)

	def generate_code_verifier(self):
		"""Generates a code_verifier for PKCE"""
		return ''.join(random.choice(string.ascii_letters + string.digits) for _ in range(random.randint(43, 128)))

	def generate_code_challenge(self, code_verifier):
		"""Generates code_challenge from code_verifier"""
		sha256_hash = hashlib.sha256(code_verifier.encode('utf-8')).digest()
		return base64.urlsafe_b64encode(sha256_hash).decode('utf-8').replace('=', '')


@method_decorator(csrf_exempt, name='dispatch')
class OAuthCallbackView(APIView):
	"""
	Handles OAuth2 callback and token exchange from various providers.
		
	GET /login/oauth/callback/{provider}/
	---
	parameters:
	  - name: provider
		in: path
		required: true
		type: string
		description: OAuth provider (google, github, facebook, etc.)
	  - name: code
		in: query
		required: true
		type: string
		description: Authorization code returned by OAuth provider
	"""
	permission_classes = (permissions.AllowAny,)

	def get(self, request, provider):
		code = request.GET.get("code")
		code_verifier = request.session.get('code_verifier') #
		stored_provider = request.session.get('oauth_provider') #
		
		# Use stored provider if available, otherwise use the one from the URL
		provider = stored_provider if stored_provider else provider.upper()
		provider_config = OAUTH2_PROVIDERS.get(provider)
		
		if not provider_config:
			return Response(
				{"error": f"Provider '{provider}' not configured"}, 
				status=status.HTTP_400_BAD_REQUEST
			)
			
		if not code or not code_verifier:
			return Response(
				{"error": "Missing authorization code or code_verifier"}, 
				status=status.HTTP_400_BAD_REQUEST
			)

		token_url = provider_config.get('token_url')
		data = {
			"client_id": provider_config.get('client_id'),
			"client_secret": provider_config.get('client_secret'),
			"grant_type": "authorization_code",
			"code": code,
			"redirect_uri": provider_config.get('redirect_uri'),
			"code_verifier": code_verifier
		}

		# Get access token
		response = requests.post(token_url, data=data)
		token_data = response.json()

		if "access_token" not in token_data:
			return Response(
				{"error": "Failed to obtain access token", "details": token_data}, 
				status=status.HTTP_400_BAD_REQUEST
			)
			
		# Get user info from provider
		access_token = token_data['access_token']
		user_info_url = provider_config.get('user_info_url')
		
		headers = {"Authorization": f"Bearer {access_token}"}
		user_info_response = requests.get(user_info_url, headers=headers)
		user_info = user_info_response.json()

		# Different providers have different response formats
		user_id = user_info.get('id') or user_info.get('sub')
		if not user_id:
			return Response(
				{"error": "Could not fetch user information", "details": user_info}, 
				status=status.HTTP_400_BAD_REQUEST
			)

		try:
			# Extract user details - adapting to different provider response formats
			email = user_info.get('email')
			if not email and 'emails' in user_info and len(user_info['emails']) > 0:
				email = user_info['emails'][0]['value']  # GitHub format
			
			# If still no email, create one based on ID
			if not email:
				return Response(
					{"error": "Could not fetch user email"}, 
					status=status.HTTP_400_BAD_REQUEST
				)
				
			# Get username from various possible fields
			suggested_username = (user_info.get('name') or 
						user_info.get('login') or 
						user_info.get('displayName') or
						email.split('@')[0])
			
			User = get_user_model()
			
			with transaction.atomic():
				# First, check if the user already exists by email
				try:
					user = User.objects.get(email=email)
					# User exists - just log them in (don't update username to avoid conflicts)
					created = False
				except User.DoesNotExist:
					# Check if username is already taken
					if User.objects.filter(username=suggested_username).exists():
						return Response(
							{"error": "Username already exists", "email": email, "suggested_username": suggested_username}, 
							status=status.HTTP_409_CONFLICT
						)
					
					# Create a new user
					random_password = ''.join(random.choice(string.ascii_letters + string.digits) for _ in range(16))
					user = User.objects.create_user(email=email)
					user.username = suggested_username
					user.set_password(random_password)
					user.save()
					created = True
					
				# Create user in other services if new
				if created:
					try:
						CreateOnOtherServices(user)
					except Exception as e:
						# This will rollback the transaction including the user creation
						raise ValueError(f"Failed to create user in all services: {str(e)}")
				
				# Log the user in
				login(request, user)
				
				# Generate JWT tokens
				refresh = RefreshToken.for_user(user)
				
				return Response({
					'access_token': str(refresh.access_token),
					'refresh_token': str(refresh),
					'user_id': user.user_id,
					'username': user.username,
					'email': user.email,
					'is_new_user': created
				}, status=status.HTTP_200_OK)
				
		except Exception as e:
			return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# Update the UserRegister class to handle potential oauth users
@method_decorator(csrf_exempt, name='dispatch')
class UserRegister(APIView):
	permission_classes = (permissions.AllowAny,)
		
	def post(self, request):
		try:
			clean_data = custom_validation(request.data)
			email = clean_data.get('email')
			username = clean_data.get('username')
			
			User = get_user_model()
			
			# Check if email already exists
			if User.objects.filter(email=email).exists():
				return Response(
					{'error': 'Email already registered. Please login instead.'}, 
					status=status.HTTP_409_CONFLICT
				)
				
			# Check if username already exists
			if User.objects.filter(username=username).exists():
				return Response(
					{'error': 'Username already taken. Please choose another.'}, 
					status=status.HTTP_409_CONFLICT
				)
				
			with transaction.atomic():
				# Create the user
				serializer = UserRegisterSerializer(data=clean_data)
				if serializer.is_valid(raise_exception=True):
					user = serializer.create(clean_data)
					
					# Try to create user in other services
					try:
						CreateOnOtherServices(user)
					except Exception as e:
						# If creating on other services fails, the transaction will roll back
						raise ValueError(f"User creation failed: {str(e)}")
						
					return Response({
						'user': {
							'email': user.email,
							'username': user.username,
							'user_id': user.user_id
						}
					}, status=status.HTTP_201_CREATED)
					
		except Exception as e:
			return Response(
				{'error': str(e)}, 
				status=error_codes.get(str(e), status.HTTP_400_BAD_REQUEST)
			)
			
		return Response(status=status.HTTP_400_BAD_REQUEST)

# Update the UserLogin class to work with both email/password and OAuth users
@method_decorator(csrf_exempt, name='dispatch')
class UserLogin(APIView):
	permission_classes = (permissions.AllowAny,)
	authentication_classes = (OAuth2Authentication,)
		
	def post(self, request):
		try:
			data = request.data
			# Validate email and password
			if not validate_email(data):
				return Response({'error': 'Invalid email'}, status=status.HTTP_400_BAD_REQUEST)
			if not validate_password(data):
				return Response({'error': 'Invalid password'}, status=status.HTTP_400_BAD_REQUEST)

			# Serialize and validate user data
			serializer = UserLoginSerializer(data=data)
			serializer.is_valid(raise_exception=True)
			user = serializer.check_user(data)
			login(request, user)
			
			# Generate tokens for the user
			refresh = RefreshToken.for_user(user)
			access_token = str(refresh.access_token)
			refresh_token = str(refresh)

			return Response({
				'access_token': access_token,
				'refresh_token': refresh_token,
				'user_id': user.user_id,
				'username': user.username,
				'email': user.email
			}, status=status.HTTP_200_OK)

		except Exception as e:
			return Response({'error': str(e)}, status=error_codes.get(str(e), status.HTTP_400_BAD_REQUEST))



class UserLogout(APIView):
	permission_classes = (permissions.AllowAny,)
	authentication_classes = ()
	def post(self, request):
		try:
			access_token = AccessToken.objects.get(token=request.auth.token)
			RefreshToken.objects.get(access_token=access_token).delete()
			access_token.delete()
			logout(request)
			return Response(status=status.HTTP_200_OK)
		except AccessToken.DoesNotExist:
			return Response({'error': 'invalid token'}, status=status.HTTP_400_BAD_REQUEST)
		except Exception as e:
			return Response({'error': str(e)}, status=error_codes.get(str(e), status.HTTP_400_BAD_REQUEST))
		return Response(status=status.HTTP_400_BAD_REQUEST)
		

class UserView(APIView):
	permission_classes = (permissions.IsAuthenticated,)
	##
	def get(self, request):
		serializer = UserSerializer(request.user)
		user = AppUser.objects.get(username=serializer.data['username'])
		return Response({'user': serializer.data, 'user_id': user.user_id}, status=status.HTTP_200_OK)

@ensure_csrf_cookie
def get_csrf_token(request):
	return JsonResponse({'detail': 'CSRF cookie set'})

from oauth2_provider.views import IntrospectTokenView
from oauth2_provider.models import AccessToken

class CustomIntrospect(IntrospectTokenView):
	permissions = (permissions.AllowAny,)
	def get_token_response(self, token):
		try:
			token = AccessToken.objects.get(token=token)
			if token:
				return {
					'active': True,
					'scope': token.scope,
					'user_id': token.user.user_id,
					'username': token.user.username,
					'exp': token.expires.timestamp(),
				}
		except AccessToken.DoesNotExist:
			return {'active': False}

@csrf_exempt
def health_check(request):
	return JsonResponse({'status': 'ok'})
