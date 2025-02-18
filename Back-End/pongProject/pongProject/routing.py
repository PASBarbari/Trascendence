from django.urls import re_path
from pong_app import consumers

websocket_urlpatterns = [
	re_path(r'ws/pong/(?P<room_id>\d+)/$', consumers.GameTableConsumer.as_asgi()),
]