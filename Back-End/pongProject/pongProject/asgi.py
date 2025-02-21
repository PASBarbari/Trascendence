"""
ASGI config for pongProject project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.1/howto/deployment/asgi/
"""

import os
from pong_app.middleware import TokenAuthMiddlewareStack
from django.core.asgi import get_asgi_application
from pongProject.routing import websocket_urlpatterns
from channels.routing import ProtocolTypeRouter, URLRouter

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pongProject.settings')

application = ProtocolTypeRouter ({
	"http": get_asgi_application(),
	"websocket": TokenAuthMiddlewareStack(
		URLRouter(websocket_urlpatterns)
	),
})
