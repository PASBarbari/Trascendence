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
from my_chat import consumers
from chat.routing import websocket_urlpatterns
# import shutil
import logging


logger = logging.getLogger('django')

# http_app = get_asgi_application()

# # Update the path to point to staticfiles directory instead of static
# static_app = BlackNoise(http_app)
# static_app.add(BASE_DIR / 'staticfiles', '/static/')



# swagger_files = []
# for root, dirs, files in os.walk(BASE_DIR / 'staticfiles'):
# 	for file in files:
# 		if 'swagger' in file:
# 			source_file = os.path.join(root, file)
# 			destination_file = os.path.join('/static', os.path.relpath(source_file, BASE_DIR / 'staticfiles'))
# 			os.makedirs(os.path.dirname(destination_file), exist_ok=True)
# 			shutil.copy2(source_file, destination_file)
# 			swagger_files.append(source_file)
# 			logger.info(f"Found and copied swagger file: {source_file}")
			
# print(f"Found and copied swagger files: {swagger_files[:5]}")  # Show first 5 files


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
