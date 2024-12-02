from urllib.parse import urlencode
from django.contrib.auth import get_user_model, login, logout
from django.utils.decorators import method_decorator
from django.utils.decorators import method_decorator
import requests
from rest_framework.views import APIView
from rest_framework.response import Response
from .serializers import UserRegisterSerializer, UserLoginSerializer, UserSerializer
from rest_framework import permissions, status
from .validations import custom_validation, validate_email, validate_password
from oauth2_provider.contrib.rest_framework import OAuth2Authentication , TokenHasScope, TokenHasReadWriteScope
from .errors import error_codes
from oauth2_provider.models import AccessToken , Application, RefreshToken
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

def get_access_token():
	app = Application.objects.get(name='my_login')

	token = AccessToken.objects.create(
		user=app.user,
		token=generate_token(),
		application=app,
		scope='read write',
		expires=timezone.now() + timedelta(seconds=36000),
	)
	return token.token

def CreateOnOtherServices(user):
	Chat_url = Microservices['Chat'] + "/chat/new_user/"
	Notification_url = Microservices['Notifications'] + "/notification/add_user"
	User_url = Microservices['Users'] + "/user/user"
	headers = {
		'Content-Type': 'application/json',
		'Authorization': f'Bearer {get_access_token()}',
		'X-API-KEY': settings.API_KEY,
	}

	user_data = {
		'user_id': user.user_id,
		'username': user.username,
		'email': user.email,
	}
	user_response = requests.post(User_url, json=user_data, headers=headers)
	if user_response.status_code != 201:
		print(user_response.json())
		raise ValueError('User service failed to create user')
	chat_response = requests.post(Chat_url, json=user_data, headers=headers)
	if chat_response.status_code != 201:
		raise ValueError('Chat service failed to create user')
	notification_response = requests.post(Notification_url, json=user_data, headers=headers)
	if notification_response.status_code != 201:
		print(notification_response.json())
		raise ValueError('Notification service failed to create user')




class UserRegister(APIView):
	permission_classes = (permissions.AllowAny,)
	def post(self, request):
		try:
			clean_data = custom_validation(request.data)
			serializer = UserRegisterSerializer(data=clean_data)
			if serializer.is_valid(raise_exception=True):
				user = serializer.create(clean_data)
				if user:
					serializer.data['password'] = user.password
					CreateOnOtherServices(user)
					return Response({'user': serializer.data, 'user_id': user.user_id}, status=status.HTTP_201_CREATED)
		except Exception as e:
			return Response({'error': str(e)}, status=error_codes.get(str(e), status.HTTP_400_BAD_REQUEST))
		return Response(status=status.HTTP_400_BAD_REQUEST)



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
			
			# Prepare data for tocken request

			headers = {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Authorization': f'Basic {client["CLIENT_ID"]}:{client["CLIENT_SECRET"]}',
				'Accept': 'application/json',
				'X-CSRFToken': get_token(request),
			}

			token_data = {
				'grant_type': 'password',
				'username': data.get('email'),
				'password': data.get('password'),
				'client_id': client['CLIENT_ID'],
				'client_secret': client['CLIENT_SECRET'],
				'scope': 'read write',
			}

			# Make token request

			token_view = TokenView.as_view()
			token_request = HttpRequest()
			token_request.method = 'POST'
			token_request.POST = token_data
			token_request.META['CONTENT_TYPE'] = 'application/x-www-form-urlencoded'
			token_request.META['HTTP_AUTHORIZATION'] = f'Basic {client["CLIENT_ID"]}:{client["CLIENT_SECRET"]}'
			token_request.META['HTTP_X_CSRFTOKEN'] = get_token(request)

			token_response = token_view(token_request)


			return token_response
		except Exception as e:
				return Response({'error': str(e)}, status=error_codes.get(str(e), status.HTTP_400_BAD_REQUEST))
		return Response(status=status.HTTP_400_BAD_REQUEST)


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

					## Login the app as a staff user
					# if not AppUser.objects.filter(username=service_name).exists():
					# 	app_user = AppUser.objects.create(username=service_name, is_staff=True)
					# 	app_user.set_password(data.get('client_secret'))
					# 	app_user.save()
					## Get an access token
					# Tokenview = TokenView.as_view()
					# token_request = HttpRequest()
					# token_request.method = 'POST'
					# token_request.POST = {
					# 	'grant_type': 'client_credentials',
			#   'client_id': app.client_id,
		  #   'client_secret': app.client_secret,
		  # }
					# token_request.META['CONTENT_TYPE'] = 'application/x-www-form-urlencoded'
					# token_request.META['HTTP_AUTHORIZATION'] = f'Basic {app.client_id}:{app.client_secret}'
					# token_request.META['HTTP_X_CSRFTOKEN'] = data.get('csrf_token')
					# token_response = Tokenview(token_request)
					# ## Return the client_id and client_secret and token
					# token_response.data['client_id'] = app.client_id
					# token_response.data['client_secret'] = app.client_secret
					# return token_response
				else:
					return Response({'error': 'Service already exists'}, status=status.HTTP_400_BAD_REQUEST)
			else:
				return Response({'error': 'Invalid service password'}, status=status.HTTP_400_BAD_REQUEST)
		except Exception as e:
			return Response({'error': str(e)}, status=error_codes.get(str(e), status.HTTP_400_BAD_REQUEST))
		return Response(status=status.HTTP_400_BAD_REQUEST)



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
	permission_classes = (permissions.IsAuthenticated, TokenHasScope , TokenHasReadWriteScope)
	authentication_classes = (OAuth2Authentication,)
	##
	required_scopes = ['read']
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