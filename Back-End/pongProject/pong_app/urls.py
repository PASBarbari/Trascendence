from django.urls import path
from . import views

urlpatterns = [
	path('tournament', views.TournamentGen.as_view(), name='tournament_gen'),
	path('tournament/<int:id>/', views.TournamentManage.as_view(), name='tournament_manage'),
	path('game', views.GameGen.as_view(), name='game_gen'),
	path('game/<int:id>/', views.GameManage.as_view(), name='game_manage'),
	path('games/pending/<int:user_id>/', views.CheckPendingGames.as_view(), name='check_pending_games'),
	path('join', views.JoinTournament.as_view(), name='join_tournament'),
	path('history', views.PlayerMatchHistory.as_view(), name='history'),
	path('player', views.PlayerGen.as_view(), name='player_gen'),
]