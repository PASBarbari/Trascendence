from django.urls import re_path , path
"""
This module defines the URL routing for WebSocket connections in the pongProject application.

Routes:
	websocket_urlpatterns (list): A list of URL patterns for WebSocket connections.
		- re_path(r'pong/ws/pong/(?P<room_id>\\d+)/$', consumers.GameTableConsumer.as_asgi()):
		  Routes WebSocket connections to the GameTableConsumer based on the room_id parameter.
		- re_path(r'pong/ws/tournament/(?P<tournament_id>\\d+)/$', consumers.TournamentConsumer.as_asgi()):
		  Routes WebSocket connections to the TournamentConsumer based on the tournament_id parameter.
			example: /pong/ws/pong/123/ or /tournament/456/
"""
from pong_app import consumers

websocket_urlpatterns = [
	re_path(r'pong/ws/pong/(?P<room_id>\d+)/$', consumers.GameTableConsumer.as_asgi()),
	re_path(r'pong/ws/tournament/(?P<tournament_id>\d+)/$', consumers.TournamentConsumer.as_asgi()),
]