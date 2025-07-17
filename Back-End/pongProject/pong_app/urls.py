from django.urls import path
from . import views

from django.urls import path
from . import views

urlpatterns = [
    # Tournament endpoints
    path('tournament', views.TournamentGen.as_view(), name='tournament_gen'),
    path('tournament/<int:id>/', views.TournamentManage.as_view(), name='tournament_manage'),
    path('tournament/join', views.JoinTournament.as_view(), name='join_tournament'),
    path('tournament/end', views.EndTournament.as_view(), name='end_tournament'),
    path('tournament/match-history', views.TournamentMatchHistory.as_view(), name='tournament_match_history'),
    
    # Game endpoints
    path('game', views.GameGen.as_view(), name='game_gen'),
    path('game/<int:id>/', views.GameManage.as_view(), name='game_manage'),
    path('games/pending/<int:user_id>/', views.CheckPendingGames.as_view(), name='check_pending_games'),
    path('games/history', views.PlayerMatchHistory.as_view(), name='player_match_history'),
    
    # Player endpoints
    path('player', views.PlayerGen.as_view(), name='player_gen'),
    path('player/<int:user_id>/', views.PlayerManage.as_view(), name='player_manage'),
    path('player/stats', views.UserStatistics.as_view(), name='user_statistics'),
    
    # Health check
    path('health', views.health_check, name='health_check'),
]