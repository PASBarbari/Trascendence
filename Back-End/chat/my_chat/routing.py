from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    # Usa un pattern semplice senza room_id nell'URL
    re_path(r'^chat/?$', consumers.ChatConsumer.as_asgi()),
]