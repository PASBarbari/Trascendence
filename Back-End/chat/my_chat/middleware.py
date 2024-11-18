from urllib.parse import parse_qs
from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from channels.auth import AuthMiddlewareStack
from django.conf import settings
from django.core.cache import cache
from django.contrib.auth import get_user_model
import requests

@database_sync_to_async
def get_user_from_token(token):
    # Check if the user is already cached
    user = cache.get(token)
    if user:
        return user

    introspection_url = settings.OAUTH2_INTROSPECTION_URL
    client_id = settings.OAUTH2_CLIENT_ID
    client_secret = settings.OAUTH2_CLIENT_SECRET

    try:
        response = requests.post(introspection_url, data={
            'token': token,
            'client_id': client_id,
            'client_secret': client_secret,
        })

        if response.status_code == 200:
            data = response.json()
            if data.get('active'):
                user_id = data.get('user_id')  # Ensure this matches your response key
                User = get_user_model()
                try:
                    user = User.objects.get(pk=user_id)  # Adjust based on your primary key field
                    # Cache the user with a timeout (e.g., 5 minutes)
                    cache.set(token, user, timeout=300)
                    return user
                except User.DoesNotExist:
                    return AnonymousUser()
    except requests.RequestException as e:
        # Log the exception if needed
        print(f"Token introspection failed: {e}")
    
    return AnonymousUser()

class TokenAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        query_string = parse_qs(scope["query_string"].decode())
        token = query_string.get("token")
        if token:
            # token = token[0].strip().replace("Bearer ", "")
            scope["user"] = await get_user_from_token(token[0]) #(token)
        else:
            scope["user"] = AnonymousUser()
        return await super().__call__(scope, receive, send)

def TokenAuthMiddlewareStack(inner):
    return TokenAuthMiddleware(AuthMiddlewareStack(inner))

# from django.utils.deprecation import MiddlewareMixin
# from django.contrib.auth.models import AnonymousUser
# from django.conf import settings
# import requests
# from django.core.cache import cache

# class TokenAuthMiddlewareHTTP(MiddlewareMixin):
#     def process_request(self, request):
#         token = request.META.get('HTTP_AUTHORIZATION')
#         if token:
#             token = token.replace("Bearer ", "")
#             user = self.get_user_from_token(token)
#             request.user = user
#         else:
#             request.user = AnonymousUser()

#     def get_user_from_token(self, token):
#         # Check if I cached the user
#         user = cache.get(token)
#         if user:
#             return user

#         introspection_url = settings.OAUTH2_INTROSPECTION_URL
#         client_id = settings.OAUTH2_CLIENT_ID
#         client_secret = settings.OAUTH2_CLIENT_SECRET

#         response = requests.post(introspection_url, data={
#             'token': token,
#             'client_id': client_id,
#             'client_secret': client_secret,
#         })

#         if response.status_code == 200:
#             data = response.json()
#             if data.get('active'):
#                 user_id = data.get('user_id')
#                 from django.contrib.auth import get_user_model
#                 User = get_user_model()
#                 try:
#                     user = User.objects.get(user_id=user_id)
#                     # Cache the user for the token refresh period)
#                     cache.set(token, user, timeout=token.get('expires_in', 300))
#                     return user
#                 except User.DoesNotExist:
#                     return AnonymousUser()
#         return AnonymousUser()