# filepath: /home/lollo/Documents/Fides/Back-End/chat/my_chat/middleware.py
from urllib.parse import parse_qs
from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from channels.auth import AuthMiddlewareStack
from django.core.cache import cache
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework.permissions import BasePermission
from .models import UserProfile
from django.utils.deprecation import MiddlewareMixin

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
            user = UserProfile.objects.get(id=user_id)
            # Cache the user with a timeout (e.g., 5 minutes)
            cache.set(token, user, timeout=300)
            return user
        except UserProfile.DoesNotExist:
            return AnonymousUser()
    except Exception as e:
        return AnonymousUser()

class TokenAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        query_string = parse_qs(scope["query_string"].decode())
        # if scope['path'] == '/chat/new_user/':
        #     scope['user'] = AnonymousUser()
        #     return await super().__call__(scope, receive, send)
        try:
            token = query_string.get("token")
            if token:
                scope["user"] = await get_user_from_token(token[0])
            else:
                scope["user"] = AnonymousUser()
        except Exception as e:
            scope["user"] = AnonymousUser()
        return await super().__call__(scope, receive, send)

def TokenAuthMiddlewareStack(inner):
    return TokenAuthMiddleware(AuthMiddlewareStack(inner))

class TokenAuthMiddlewareHTTP(BaseMiddleware):
	async def __call__(self, scope, receive, send):
		# if scope['path'] == '/chat/new_user/':
		# 	scope['user'] = AnonymousUser()
		# 	return await super().__call__(scope, receive, send)

		headers = dict(scope['headers'])
		token = headers.get(b'authorization')
		if token:
			token = token.decode().replace("Bearer ", "")
			scope['user'] = await self.get_user_from_token(token)
		else:
			scope['user'] = AnonymousUser()

		return await super().__call__(scope, receive, send)

	@database_sync_to_async
	def get_user_from_token(self, token):
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
				user = UserProfile.objects.get(id=user_id)
				# Cache the user with a timeout (e.g., 5 minutes)
				cache.set(token, user, timeout=300)
				return user
			except UserProfile.DoesNotExist:
				return AnonymousUser()
		except Exception as e:
			return AnonymousUser()


class TokenAuthPermission(BasePermission):
    def get_user_from_token(self, token):
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
                user = UserProfile.objects.get(id=user_id)
                # Cache the user with a timeout (e.g., 5 minutes)
                cache.set(token, user, timeout=300)
                return user
            except UserProfile.DoesNotExist:
                return AnonymousUser()
        except Exception as e:
            return AnonymousUser()

    def has_permission(self, request, view):
        # if request.path == '/chat/new_user/':
        #     request.user = AnonymousUser()
        #     return True
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