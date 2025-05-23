import os, django
from pathlib import Path
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'chat.settings')
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
from django.urls import path
from django.conf import settings
from chat.settings import BASE_DIR


django.setup()

BASE_DIR = Path('/app')

from my_chat.middleware import JWTAuthMiddleware
from my_chat import routing
# import shutil
import logging


logger = logging.getLogger('django')

print("ASGI APPLICATION LOADED")

from my_chat.middleware import DebugMiddleware

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AllowedHostsOriginValidator(
        (
            JWTAuthMiddleware(
                URLRouter(routing.websocket_urlpatterns)
            )
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
