"""
ASGI config for Notifications project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.1/howto/deployment/asgi/
"""

import os, django
from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Notifications.settings')

django.setup()

from my_notifications.routing import websocket_urlpatterns
from my_notifications.middleware import JWTAuthMiddlewareStack


application = ProtocolTypeRouter({
	'http': get_asgi_application(),
	'websocket': JWTAuthMiddlewareStack(
		URLRouter(websocket_urlpatterns)
	),
})
