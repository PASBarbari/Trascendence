from django.urls import path
from . import views

urlpatterns = [
	path('config/', views.GameConfigView.as_view(), name='game_config'),
	path('tournament', views.TournamentGen.as_view(), name='tournament_gen'),
	path('tournament/<int:id>/', views.TournamentManage.as_view(), name='tournament_manage'),
	path('game', views.GameGen.as_view(), name='game_gen'),
	path('game/<int:id>/', views.GameManage.as_view(), name='game_manage'),
	path('join', views.JoinTournament.as_view(), name='join_tournament'),
	path('history', views.PlayerMatchHistory.as_view(), name='history'),
	path('player', views.PlayerGen.as_view(), name='player_gen'),
]