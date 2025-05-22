from django.urls import re_path, path
from my_chat import consumers

websocket_urlpatterns = [
    # Remove the caret (^) from the beginning of the pattern
    # re_path(r'ws/chat/(?P<room_id>\d+)/$', consumers.ChatConsumer.as_asgi()),
    path('ws/chat/<int:room_id>', consumers.ChatConsumer.as_asgi()),
    
]