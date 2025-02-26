from django.urls import path
from .consumers import UserNotificationConsumer, GroupNotificationConsumer

websocket_urlpatterns = [
    path('ws/user_notifications/', UserNotificationConsumer.as_asgi()),
    path('ws/group_notifications/<int:group_id>/', GroupNotificationConsumer.as_asgi()),
]