import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'chat.settings')
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
from django.urls import path

django.setup()

from my_chat.middleware import JWTAuthMiddleware
from my_chat import consumers
from .routing import websocket_urlpatterns


print("ASGI APPLICATION LOADED") 

application = ProtocolTypeRouter({
	"http": get_asgi_application(),
	"websocket": AllowedHostsOriginValidator(
		JWTAuthMiddleware(
			URLRouter(websocket_urlpatterns)
		)
	),
})

#path('ws/chat/<str:room_name>/', consumers.ChatConsumer.as_asgi()),

# application = ProtocolTypeRouter({
# 	"http": get_asgi_application(),
# 	"websocket":
# 		URLRouter([
# 			websocket_urlpatterns
# 		]),
# })
