import stat
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
import pyotp
from django_ratelimit.decorators import ratelimit
import io
import urllib.parse
import hmac
import time
import struct
import os

OAUTH2_PROVIDERS = settings.OAUTH2_PROVIDERS

logger = logging.getLogger('light_login')

def get_jwt_token_for_user(user):
	refresh = RefreshToken.for_user(user)
	return str(refresh.access_token)

# Update the CreateOnOtherServices function to handle errors properly
@transaction.atomic
def CreateOnOtherServices(user, **kwargs):
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
		
		# Create user in User service
		if 'user_id' in kwargs:
			user_data.append({
				'first_name': kwargs.get('given_name'),
				'last_name': kwargs.get('family_name'),
				#'birth_date': kwargs.get('birth_date'),
				'current_avatar_url': kwargs.get('picture'),
			})
		user_response = requests.post(User_url, json=user_data, headers=headers)
		if user_response.status_code != 201:
			logging.error(f"User service error: {user_response.status_code} - {user_response.text}")
			raise ValueError('User service failed to create user')
			
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
		logger.info(f"OAuth2 login initiated for provider: {provider}")
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
				f"scope={provider_config.get('scope')}&"
				f"state={code_verifier}"
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
		state = request.GET.get("state")
		code_verifier = request.session.get('code_verifier')
		stored_provider = request.session.get('oauth_provider')
		
		provider = stored_provider if stored_provider else provider.upper()
		provider_config = OAUTH2_PROVIDERS.get(provider)
		
		if not provider_config:
			return Response(
				{"error": f"Provider '{provider}' not configured"}, 
				status=status.HTTP_400_BAD_REQUEST
			)
		
		if provider == '42':
			if not state or state != code_verifier:
				return Response(
					{"error": "Invalid state parameter"}, 
					status=status.HTTP_400_BAD_REQUEST
				)
		
		if not code or not code_verifier:
			return Response(
				{"error": "Missing authorization code or code_verifier"}, 
				status=status.HTTP_400_BAD_REQUEST
			)


		token_url = provider_config.get('token_url')

		if provider == '42':
			data = {
				'grant_type': 'authorization_code',
				'client_id': provider_config.get('client_id'),
				'client_secret': provider_config.get('client_secret'),
				'code': code,
				'redirect_uri': provider_config.get('redirect_uri'),
			}
			headers = {
				'Content-Type': 'application/x-www-form-urlencoded',
			}
			response = requests.post(token_url, data=data, headers=headers)
		else:
			data = {
				"client_id": provider_config.get('client_id'),
				"client_secret": provider_config.get('client_secret'),
				"grant_type": "authorization_code",
				"code": code,
				"redirect_uri": provider_config.get('redirect_uri'),
				"code_verifier": code_verifier
			}
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
		#  {'id': '103782231708470005867', 'email': 'samybravy@gmail.com', 'verified_email': True, 'name': 'Samy Bravy', 'given_name': 'Samy', 'family_name': 'Bravy', 'picture': 'https://lh3.googleusercontent.com/a/ACg8ocJdtisqsQ_rcRsSOrRvpO6v1iIIM8veaI51sVW7DQK_5CwprO0=s96-c'}
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
					logger.debug(f"||||||||||||User info: {user_info}||||||||||")
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
					user = User.objects.create_user(email=email, password=random_password)
					user.username = suggested_username
					user.set_password(random_password)
					user.save()
					created = True
				# Create user in other services if new
				if created:
					try:
						CreateOnOtherServices(user, user_info=user_info)
					except Exception as e:
						# This will rollback the transaction including the user creation
						raise ValueError(f"Failed to create user in all services: {str(e)}")
				# Log the user in
				login(request, user)
				# Generate JWT tokens
				refresh = RefreshToken.for_user(user)
				access_token = str(refresh.access_token)
				refresh_token = str(refresh)
				frontend_url = "https://trascendence.42firenze.it"
				redirect_url = f"{frontend_url}/#home?access_token={access_token}&refresh_token={refresh_token}&user_id={user.user_id}&username={user.username}&email={user.email}"
				return redirect(redirect_url)
				
		except Exception as e:
			return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@method_decorator(ratelimit(key='user', rate='50/m', method='GET'), name='get')
class Setup2FAView(APIView):
	permission_classes = [permissions.IsAuthenticated]

	def get(self, request):
		logger.info("Setting up 2FA for user")
		user = request.user
		
		user.two_factor_secret = generate_random_base32()
		user.save()

		otp_uri = create_manual_totp_uri(user.two_factor_secret, user.email)

		# Return the OTP URI as a URL for the frontend to generate the QR code
		return Response({"otp_uri": otp_uri}, status=status.HTTP_200_OK)

	def post(self, request):
		user = request.user
		otp = request.data.get('otp_code')
		if not otp:
			return Response({"error": "OTP code is required"}, status=status.HTTP_400_BAD_REQUEST)
		
		if verify_otp(user, otp):
			user.has_two_factor_auth = True
			user.save()
			# Update the has_two_factor_auth flag in user microservice
			user_service_url = f"{Microservices['Users']}/user/user/update-2fa/"
		
			response = requests.post(
				user_service_url,
				json={
					'user_id': user.user_id,
					'enabled': True
				},
				headers={
					'Authorization': f'Bearer {get_jwt_token_for_user(user)}',
					'Content-Type': 'application/json',
					'X-API-KEY': settings.API_KEY,
				}
			)
		
			if response.status_code == 200:
				return redirect('https://trascendence.42firenze.it/#home')
			else:
				return Response({"error": "Failed to update 2FA status"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
		else:
			return Response({"error": "Invalid OTP code"}, status=status.HTTP_400_BAD_REQUEST)
			
def verify_otp(user, otp):
	try:
		if not user.two_factor_secret:
			return False
		
		# 1. Ottieni il timestamp corrente
		timestamp = int(time.time())
		
		# 2. Calcola time counter (intervalli di 30 secondi dal 1970)
		time_counter = timestamp // 30
		
		# 3. Verifica il codice corrente e un intervallo prima/dopo (per compensare desincronizzazioni di orario)
		for i in range(-1, 2):
			current_counter = time_counter + i
			
			# 4. Converti il counter in bytes (formato big-endian 8-byte)
			time_bytes = struct.pack(">Q", current_counter)
			
			# 5. Decodifica il secret dalla base32
			key = base64.b32decode(user.two_factor_secret.upper() + '=' * ((8 - len(user.two_factor_secret) % 8) % 8))
			
			# 6. Calcola l'HMAC-SHA1
			h = hmac.new(key, time_bytes, hashlib.sha1).digest()
			
			# 7. Applica "dynamic truncation" per ottenere 4 bytes
			offset = h[-1] & 0x0F
			truncated_hash = h[offset:offset+4]
			
			# 8. Converti in un numero intero, elimina il bit più significativo
			code = struct.unpack('>I', truncated_hash)[0] & 0x7FFFFFFF
			
			# 9. Prendi solo le ultime 6 cifre
			code = code % 1000000
			
			# 10. Formatta come stringa con zeri iniziali
			code_str = '{:06d}'.format(code)
			
			# 11. Confronta con il codice inserito dall'utente
			if code_str == otp:
				return True
		
		return False
	except Exception as e:
		logger.error(f"Error verifying OTP: {str(e)}")
		return False

def create_manual_totp_uri(secret, email, issuer="Transcendence"):
	# Codifica il label (issuer:account) per URL
	label = f"{issuer}:{email}"
	encoded_label = urllib.parse.quote(label)
		
	# Crea l'URI con i parametri necessari
	uri = f"otpauth://totp/{encoded_label}?secret={secret}&issuer={urllib.parse.quote(issuer)}"
		
	# Parametri opzionali (questi sono i valori predefiniti)
	uri += "&algorithm=SHA1&digits=6&period=30"
		
	return uri

def generate_random_base32(length=16):
	"""
	Genera una stringa casuale in formato base32.
		
	Args:
		length: Lunghezza in byte dei dati casuali prima della codifica
		
	Returns:
		Una stringa base32 (caratteri A-Z, 2-7)
	"""
	# Ottieni byte casuali sicuri usando os.urandom
	random_bytes = os.urandom(length)
		
	# Codifica in base32
	base32_str = base64.b32encode(random_bytes).decode('utf-8')
		
	# Rimuovi eventuali padding '='
	base32_str = base32_str.rstrip('=')
		
	return base32_str

class Verify2FALoginView(APIView):
	permission_classes = [permissions.AllowAny]
	authentication_classes = [] # Use empty list to bypass DRF's authentication

	def post(self, request):
		auth_header = request.META.get('HTTP_AUTHORIZATION', '')
		if not auth_header.startswith('Bearer '):
			return Response({"error": "Invalid authorization header"}, status=status.HTTP_401_UNAUTHORIZED)
		
		token = auth_header.split('Bearer ')[1]
		otp_code = request.data.get('otp_code')

		if not otp_code:
			logger.error("OTP code not provided")
			return Response({"error": "OTP code is required"}, status=status.HTTP_400_BAD_REQUEST)

		try:
			# Decodifica il token per ottenere user_id
			decoded_token = RefreshToken(token)
			user_id = decoded_token.get('user_id')

			# Ottieni l'utente direttamente dal database
			User = get_user_model()
			user = User.objects.get(user_id=user_id)
			
			logger.info(f"Verifying 2FA for user {user.username} with OTP code: {otp_code}")
	
			# Verify OTP code
			if not verify_otp(user, otp_code):
				logger.warning(f"Invalid OTP code for user {user.username}")
				return Response({"error": "Invalid OTP code"}, 
							   status=status.HTTP_400_BAD_REQUEST)

			# OTP verified, log the user in
			login(request, user)

			# Generate JWT tokens
			refresh = RefreshToken.for_user(user)
			access_token = str(refresh.access_token)
			refresh_token = str(refresh)
			
			logger.info(f"User {user.username} logged in with 2FA")
			return Response({
				'access_token': access_token,
				'refresh_token': refresh_token,
				'user_id': user.user_id,
				'username': user.username,
				'email': user.email
			}, status=status.HTTP_200_OK)

		except User.DoesNotExist:
			return Response({"error": "User not found"}, 
						  status=status.HTTP_404_NOT_FOUND)
		except Exception as e:
			logger.error(f"Error during 2FA verification: {str(e)}")
			return Response({"error": str(e)}, 
						  status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class Disable2FAView(APIView):
	permission_classes = [permissions.IsAuthenticated]

	def post(self, request):
		user = request.user
		if user.has_two_factor_auth:
			# First update the local model
			user.has_two_factor_auth = False
			user.two_factor_secret = None
			user.save()
			
			# Then update the user microservice
			user_service_url = f"{Microservices['Users']}/user/user/update-2fa/"
			
			response = requests.post(
				user_service_url,
				json={
					'user_id': user.user_id,
					'enabled': False
				},
				headers={
					'Authorization': f'Bearer {get_jwt_token_for_user(user)}',
					'Content-Type': 'application/json',
					'X-API-KEY': settings.API_KEY,
				}
			)
			
			if response.status_code == 200:
				return redirect('https://trascendence.42firenze.it/#home')
			else:
				# If the user service update fails, we should revert our local change
				user.has_two_factor_auth = True
				user.save()
				return Response({"error": "Failed to disable 2FA in user service"}, 
							   status=status.HTTP_500_INTERNAL_SERVER_ERROR)
		else:
			return Response({"error": "2FA is not enabled"}, status=status.HTTP_400_BAD_REQUEST)
		
class Is2FAEnabledView(APIView):
	permission_classes = [permissions.IsAuthenticated]

	def get(self, request):
		user = request.user
		return Response({"is_enabled": user.has_two_factor_auth}, status=status.HTTP_200_OK)


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

			# Check if 2FA is enabled for this user
			if user.has_two_factor_auth:
				# Generate a temporary token valid only for 2FA verification
				temp_token = RefreshToken.for_user(user)
				temp_token['2fa_pending'] = True	# Add a custom claim to indicate this token is for 2FA verification only
				temp_token.set_exp(lifetime=timedelta(minutes=5))  # Set a short expiration time for the temp token
				response = {
					'temp_token': str(temp_token),
					'message': '2FA is enabled. Please verify your OTP code.',
				}
				return Response(response, status=status.HTTP_200_OK)

			# If 2FA is not enabled, proceed with normal login
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

			# headers = {
			# 	'Content-Type': 'application/x-www-form-urlencoded',
			# 	'Authorization': f'Basic {client["CLIENT_ID"]}:{client["CLIENT_SECRET"]}',
			# 	'Accept': 'application/json',
			# 	'X-CSRFToken': get_token(request),
			# }

			# token_data = {
			# 	'grant_type': 'password',
			# 	'username': data.get('email'),
			# 	'password': data.get('password'),
			# 	'client_id': client['CLIENT_ID'],
			# 	'client_secret': client['CLIENT_SECRET'],
			# 	'scope': 'read write',
			# }

			# # Make token request

			# token_view = TokenView.as_view()
			# token_request = HttpRequest()
			# token_request.method = 'POST'
			# token_request.POST = token_data
			# token_request.META['CONTENT_TYPE'] = 'application/x-www-form-urlencoded'
			# token_request.META['HTTP_AUTHORIZATION'] = f'Basic {client["CLIENT_ID"]}:{client["CLIENT_SECRET"]}'
			# token_request.META['HTTP_X_CSRFTOKEN'] = get_token(request)

			# token_response = token_view(token_request)


			# return token_response


class ServiceRegister(APIView):
	permission_classes = (permissions.AllowAny,)
	authentication_classes = (OAuth2Authentication,)
	##
	def post(self, request):
		try:
			data = request.data
			service_name = data.get('name')
			service_password = data.get('service_password')
			if service_password == SERVICE_PASSWORD:
				# Create an app
				if not Application.objects.filter(name=service_name).exists():
					app = Application.objects.create(
						name=service_name,
						client_type=Application.CLIENT_CONFIDENTIAL,
						client_id=data.get('client_id'),
						client_secret=data.get('client_secret'),
						authorization_grant_type=Application.GRANT_PASSWORD,
						redirect_uris='http://localhost:8000',
					)
					app.scope = '__all__'
					app.save()
					return Response({'message': 'Service created successfully', 'client_id': app.client_id, 'client_secret': app.client_secret},
						status=status.HTTP_201_CREATED)
				else:
					return Response({'error': 'Service already exists'}, status=status.HTTP_400_BAD_REQUEST)
			else:
				return Response({'error': 'Invalid service password'}, status=status.HTTP_400_BAD_REQUEST)
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
