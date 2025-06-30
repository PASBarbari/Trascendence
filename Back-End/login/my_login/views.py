from math import log
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
from django.http import HttpRequest, HttpResponseRedirect, JsonResponse
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
from django.http import HttpResponse #use rest
import requests
import secrets
import logging
import html
import json

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
		if 'given_name' in kwargs or 'family_name' in kwargs or 'picture' in kwargs:
			user_data.update({
				'first_name': kwargs.get('given_name'),
				'last_name': kwargs.get('family_name'),
				'current_avatar_url': kwargs.get('picture'),
			})
		
		user_response = requests.post(User_url, json=user_data, headers=headers)
		if user_response.status_code != 201:
			logging.error(f"User service error: {user_response.status_code} - {user_response.text}")
			raise ValueError('User service failed to create user')
		logger.debug(f"User {user.email} created in all microservices successfully")
		logger.debug(f"Chat response: {chat_response.json()}")
		logger.debug(f"Notification response: {notification_response.json()}")
		logger.debug(f"Pong response: {pong_response.json()}")
		logger.debug(f"User service response: {user_response.json()}")
		return True
		
	except Exception as e:
		# If any service fails, rollback the transaction including the user creation
		transaction.savepoint_rollback(sid)
		logging.error(f"Failed to create user in all services: {str(e)}")
		raise e

@method_decorator(csrf_exempt, name='dispatch')
class OAuthLoginView(APIView):
	permission_classes = (permissions.AllowAny,)
		
	def get(self, request, provider):
		logger.info(f"OAuth2 login initiated for provider: {provider}")
		
		provider_config = OAUTH2_PROVIDERS.get(provider.upper())
		if not provider_config:
			return Response(
				{"error": f"Provider '{provider}' not configured"}, 
				status=status.HTTP_400_BAD_REQUEST
			)
		
		# Genera code_verifier e code_challenge per PKCE
		code_verifier = self.generate_code_verifier()
		code_challenge = self.generate_code_challenge(code_verifier)
		
		# Salva il code_verifier nella sessione
		request.session['code_verifier'] = code_verifier
		request.session['oauth_provider'] = provider.upper()
		
		if provider.upper() == 'GOOGLE':
			redirect_url = (
				f"{provider_config.get('authorization_url')}?"
				f"client_id={provider_config.get('client_id')}&"
				f"redirect_uri={provider_config.get('redirect_uri')}&"
				"response_type=code&"
				f"scope={provider_config.get('scope')}&"
				f"code_challenge={code_challenge}&"
				"code_challenge_method=S256&"
				f"state={code_verifier}"
			)
		else:  # 42
			redirect_url = (
				f"{provider_config.get('authorization_url')}?"
				f"client_id={provider_config.get('client_id')}&"
				f"redirect_uri={provider_config.get('redirect_uri')}&"
				"response_type=code&"
				f"scope={provider_config.get('scope')}&"
				f"state={code_verifier}"
			)
		
		logger.info(f"Generated redirect URL for {provider}")
		return Response({"redirect_url": redirect_url}, status=status.HTTP_200_OK)

	def generate_code_verifier(self):
		"""Generates a code_verifier for PKCE"""
		return ''.join(random.choice(string.ascii_letters + string.digits + '-._~') for _ in range(128))

	def generate_code_challenge(self, code_verifier):
		"""Generates code_challenge from code_verifier using SHA256"""
		sha256_hash = hashlib.sha256(code_verifier.encode('utf-8')).digest()
		return base64.urlsafe_b64encode(sha256_hash).decode('utf-8').replace('=', '')

@method_decorator(csrf_exempt, name='dispatch')
class OAuthCallbackView(APIView):
	permission_classes = (permissions.AllowAny,)

	
	def get(self, request, provider):
		try:
			code = request.GET.get('code')
			state = request.GET.get('state')
			error = request.GET.get('error')
			
			# ✅ DEBUG SPECIFICO PER 42
			if provider.lower() == '42':
				logger.info(f"🔧 42 OAuth Debug - Code: {code[:20]}..." if code else "No code")
				logger.info(f"🔧 42 OAuth Debug - State: {state[:20]}..." if state else "No state")

			if error:
				logger.error(f'OAuth error: {error}')
				return self.handle_popup_response(error=error)
			
			if not code:
				logger.error('No authorization code received')
				return self.handle_popup_response(error='no_code')
			
			# Get provider configuration
			provider_config = settings.OAUTH2_PROVIDERS.get(provider.upper())
			if not provider_config:
				logger.error(f'Unsupported provider: {provider}')
				return self.handle_popup_response(error='unsupported_provider')
			
			# ✅ DEBUG CONFIGURAZIONE 42
			if provider.lower() == '42':
				logger.info(f"🔧 42 Config - Client ID: {provider_config['client_id'][:10]}...")
				logger.info(f"🔧 42 Config - Client Secret present: {bool(provider_config['client_secret'])}")
				logger.info(f"🔧 42 Config - Token URL: {provider_config['token_url']}")
				logger.info(f"🔧 42 Config - Redirect URI: {provider_config['redirect_uri']}")

			# recupero code_verifier dalla sessione
			code_verifier = request.session.get('code_verifier')
			if not code_verifier:
				logger.error('No code_verifier found in session')
				return self.handle_popup_response(error='no_code_verifier')
			
			# dati del token in base al provider
			if provider.upper() == 'GOOGLE':
				token_data = {
					'client_id': provider_config['client_id'],
					'client_secret': provider_config['client_secret'],
					'code': code,
					'grant_type': 'authorization_code',
					'redirect_uri': provider_config['redirect_uri'],
					'code_verifier': code_verifier,  # PKCE richiesto da Google
				}
			else:  # 42
				token_data = {
					'client_id': provider_config['client_id'],
					'client_secret': provider_config['client_secret'],
					'code': code,
					'grant_type': 'authorization_code',
					'redirect_uri': provider_config['redirect_uri'],
				}
			
		# ✅ DEBUG TOKEN DATA PER 42
			if provider.lower() == '42':
				logger.info("🔧 42 Token Request Data: [REDACTED]")
				logger.info("   - Sensitive fields have been redacted for security.")

			logger.info(f"Making token request to: {provider_config['token_url']}")
			logger.info("Token data keys: [REDACTED]")
			logger.info("   - Sensitive keys have been excluded from logging for security.")
			
			# Exchange code for access token
			token_response = requests.post(provider_config['token_url'], data=token_data)
			
			logger.info(f"Token response status: {token_response.status_code}")
			logger.info(f"Token response text: {token_response.text}")
			
			# ✅ DEBUG RISPOSTA TOKEN PER 42
			if provider.lower() == '42':
				logger.error(f"🔧 42 Token Response:")
				logger.error(f"   - Status: {token_response.status_code}")
				logger.error(f"   - Headers: {dict(token_response.headers)}")
				logger.error(f"   - Text: {token_response.text}")

			if not token_response.ok:
				logger.error(f'Token exchange failed: {token_response.text}')
				return self.handle_popup_response(error='token_exchange_failed')
			
			token_response_data = token_response.json()
			access_token = token_response_data.get('access_token')
			
			if not access_token:
				logger.error('No access token in response')
				return self.handle_popup_response(error='no_access_token')
			
			# Get user info from provider
			user_info_response = requests.get(
				provider_config['user_info_url'],
				headers={'Authorization': f'Bearer {access_token}'}  
			)
			
			if not user_info_response.ok:
				logger.error(f'User info request failed: {user_info_response.text}')
				return self.handle_popup_response(error='user_info_failed')
			
			user_info = user_info_response.json()
			logger.info(f"User info received: {user_info}")
			
			# Create or get user
			if provider.lower() == 'google':
				email = user_info.get('email')
				username = user_info.get('name', email.split('@')[0] if email else 'user')
			elif provider.lower() == '42':
				email = user_info.get('email')
				username = user_info.get('login', email.split('@')[0] if email else 'user')
			else:
				return self.handle_popup_response(error='unsupported_provider')
			
			if not email:
				logger.error('No email found in user info')
				return self.handle_popup_response(error='no_email')
			
			# Get or create user
			user, created = AppUser.objects.get_or_create(
				email=email,
				defaults={'username': username}
			)
			
			if created:
				# Set a random password for OAuth users
				user.set_password(secrets.token_urlsafe(32))
				user.save()
				logger.info(f"New user created: {user.email}")

				# ✅ AGGIUNGI: Crea l'utente negli altri microservizi
				try:
					# Prepara dati aggiuntivi per i microservizi (da user_info se disponibili)
					oauth_data = {}
					if provider.lower() == 'google':
						oauth_data = {
							'given_name': user_info.get('given_name'),
							'family_name': user_info.get('family_name'),
							'picture': user_info.get('picture'),
						}
					elif provider.lower() == '42':
						oauth_data = {
							'given_name': user_info.get('first_name'),
							'family_name': user_info.get('last_name'),
							'picture': user_info.get('image', {}).get('link') if user_info.get('image') else None,
						}
					
					CreateOnOtherServices(user, **oauth_data)
					logger.info(f"User {user.email} created in all microservices")
					
				except Exception as e:
					# Se fallisce la creazione negli altri servizi, elimina l'utente locale
					logger.error(f"Failed to create user in microservices: {str(e)}")
					user.delete()
					return self.handle_popup_response(error='microservices_creation_failed')
					# Se l'utente esiste già, non fare nulla

			else:
				logger.info(f"Existing user found: {user.email}")
			
			# PULISCI la sessione
			request.session.pop('code_verifier', None)
			request.session.pop('oauth_provider', None)
			
			# Generate JWT tokens
			refresh = RefreshToken.for_user(user)
			access_token_jwt = str(refresh.access_token)
			refresh_token = str(refresh)
			
			logger.info(f"JWT tokens generated for user: {user.email}")
			
			# Return popup response with tokens
			return self.handle_popup_response(
				access_token=access_token_jwt,
				refresh_token=refresh_token,
				user_id=user.user_id,
				username=user.username,
				email=user.email
			)
			
		except Exception as e:
			logger.error(f'OAuth callback error: {str(e)}', exc_info=True)
			return self.handle_popup_response(error='callback_failed')
	
	def handle_popup_response(self, access_token=None, refresh_token=None, 
							 user_id=None, username=None, email=None, error=None):
		"""
		Restituisce una pagina HTML che comunica con la finestra parent e si chiude
		"""
		if error:
			# SANITIZZA l'errore per HTML
			error_escaped = html.escape(str(error))
			
			html_content = f"""
			<!DOCTYPE html>
			<html>
			<head>
				<title>OAuth Error</title>
				<style>
					body {{ font-family: Arial, sans-serif; text-align: center; padding: 20px; background: #f8f9fa; }}
					.error {{ color: #dc3545; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
				</style>
			</head>
			<body>
				<div class="error">
					<h2>Authentication Error</h2>
					<p>Error: {error_escaped}</p>
					<p>This window will close automatically...</p>
				</div>
				<script>
					console.log('OAuth Error in popup');
					
					// JSON.stringify per sanitizzazione automatica
					try {{
						const errorData = {{
							type: 'OAUTH_ERROR',
							error: {json.dumps(str(error))},
							timestamp: Date.now()
						}};
						
						console.log('Saving error to localStorage:', errorData);
						localStorage.setItem('oauth_result', JSON.stringify(errorData));
						
						console.log('Error saved to localStorage');
					}} catch (e) {{
						console.error('Error saving to localStorage:', e);
					}}
					
					setTimeout(() => {{
						console.log('Closing popup window');
						window.close();
					}}, 2000);
				</script>
			</body>
			</html>
			"""
		else:
			# SANITIZZA tutti i dati per HTML
			username_html = html.escape(str(username)) if username else ''
			
			html_content = f"""
			<!DOCTYPE html>
			<html>
			<head>
				<title>OAuth Success</title>
				<style>
					body {{ font-family: Arial, sans-serif; text-align: center; padding: 20px; background: #f8f9fa; }}
					.success {{ color: #28a745; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
				</style>
			</head>
			<body>
				<div class="success">
					<h2>Authentication Successful!</h2>
					<p>Welcome, {username_html}!</p>
					<p>This window will close automatically...</p>
				</div>
				<script>
					console.log('OAuth Success in popup');
					
					// JSON.stringify per sanitizzazione completa
					try {{
						const successData = {{
							type: 'OAUTH_SUCCESS',
							access_token: {json.dumps(str(access_token)) if access_token else 'null'},
							refresh_token: {json.dumps(str(refresh_token)) if refresh_token else 'null'},
							user_id: {json.dumps(str(user_id)) if user_id else 'null'},
							username: {json.dumps(str(username)) if username else 'null'},
							email: {json.dumps(str(email)) if email else 'null'},
							timestamp: Date.now()
						}};
						
						console.log('Saving success data to localStorage:', successData);
						localStorage.setItem('oauth_result', JSON.stringify(successData));
						
						console.log('Success data saved to localStorage');
					}} catch (e) {{
						console.error('Error saving to localStorage:', e);
					}}
					
					setTimeout(() => {{
						console.log('Closing popup window');
						window.close();
					}}, 2000);
				</script>
			</body>
			</html>
			"""
		
		return HttpResponse(html_content, content_type='text/html')

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
				return redirect('https://trascendence.42firenze.it/oauth-callback.html')
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
				return redirect('https://trascendence.42firenze.it/oauth-callback.html')
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
