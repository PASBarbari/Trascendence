from django.http import JsonResponse
from django.shortcuts import render, get_object_or_404
from django.db import models
from django.utils import timezone
from datetime import timedelta
from rest_framework import permissions, status, generics, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from .serializer import *
from .models import UserProfile , Game, Tournament
from .middleware import ServiceAuthentication , JWTAuth
from django.contrib.auth.models import AnonymousUser
from django_filters.rest_framework import DjangoFilterBackend
from django.views.decorators.csrf import csrf_exempt
import logging



class IsAuthenticatedUserProfile(permissions.BasePermission):
    """
    Permesso personalizzato per il modello UserProfile.
    Verifica semplicemente se l'utente è autenticato (non è AnonymousUser).
    """
    def has_permission(self, request, view):
        return request.user is not None and not isinstance(request.user, AnonymousUser)

class IsOwnUserProfile(permissions.BasePermission):
    """
    Permesso che verifica se l'utente sta accedendo ai propri dati.
    Da usare per le richieste che manipolano dati utente.
    """
    def has_permission(self, request, view):
        # Verifica prima se l'utente è autenticato
        if not IsAuthenticatedUserProfile().has_permission(request, view):
            return False

        # Per le viste che usano l'ID utente nell'URL
        user_id = view.kwargs.get('user_id')
        if user_id and str(request.user.user_id) == str(user_id):
            return True

        # Per le richieste che usano l'ID utente nei parametri query
        user_id_param = request.query_params.get('user_id')
        if user_id_param and str(request.user.user_id) == str(user_id_param):
            return True

        return False


class MultipleFieldLookupMixin:
	"""
	Apply this mixin to any view or viewset to get multiple field filtering
	based on a `lookup_fields` attribute, instead of the default single field filtering.
	"""
	def get_object(self):
		queryset = self.get_queryset()			 # Get the base queryset
		queryset = self.filter_queryset(queryset)  # Apply any filter backends
		filter = {}
		for field in self.lookup_fields:
			if self.kwargs.get(field): # Ignore empty fields.
				filter[field] = self.kwargs[field]
		obj = get_object_or_404(queryset, **filter)  # Lookup the object
		self.check_object_permissions(self.request, obj)
		return obj

class PlayerGen(generics.ListCreateAPIView):
	permission_classes = [permissions.AllowAny]
	authentication_classes = [ServiceAuthentication]
	serializer_class = PlayerSerializer
	lookup_fields = ['user_id', 'tournaments__id']

class PlayerManage(generics.RetrieveUpdateDestroyAPIView):
	permission_classes = (IsAuthenticatedUserProfile,)
	authentication_classes = [JWTAuth]
	serializer_class = PlayerSerializer
	lookup_url_kwarg = 'user_id'
	queryset = UserProfile.objects.all()

class GameGen(generics.ListCreateAPIView):
	permission_classes = (IsAuthenticatedUserProfile,)
	authentication_classes = [JWTAuth]
	serializer_class = GamesSerializer
	filter_backends = [DjangoFilterBackend]
	filterset_fields = ['player_1__user_id', 'player_2__user_id', 'tournament_id']
	lookup_fields = ['id', 'player_1__user_id', 'player_2__user_id', 'tournament_id']
	queryset = Game.objects.all()

class GameManage(generics.RetrieveUpdateDestroyAPIView):
	permission_classes = (IsAuthenticatedUserProfile,)
	authentication_classes = [JWTAuth]
	serializer_class = GamesSerializer
	lookup_url_kwarg = 'id'
	queryset = Game.objects.all()

class CheckPendingGames(APIView):
	permission_classes = (IsAuthenticatedUserProfile,)
	authentication_classes = [JWTAuth]
	def get(self, request, user_id):
		try:
			# Cerca giochi recenti che potrebbero essere pending (ultimi 10 minuti)
			recent_games = Game.objects.filter(
				models.Q(player_1__user_id=user_id) | models.Q(player_2__user_id=user_id),
				begin_date__gte=timezone.now() - timedelta(minutes=10)
			).order_by('-begin_date')

			games_data = []
			for game in recent_games:
				# Considera un gioco come "pending" se entrambi i punteggi sono 0
				is_pending = game.player_1_score == 0 and game.player_2_score == 0
				opponent_id = game.player_2.user_id if game.player_1.user_id == user_id else game.player_1.user_id

				games_data.append({
					'id': game.id,
					'opponent_id': opponent_id,
					'player_1_id': game.player_1.user_id,
					'player_2_id': game.player_2.user_id,
					'player_1_score': game.player_1_score,
					'player_2_score': game.player_2_score,
					'begin_date': game.begin_date,
					'is_pending': is_pending
				})

			# Trova il gioco più recente che è ancora pending
			active_game = None
			for game_data in games_data:
				if game_data['is_pending']:
					active_game = game_data
					break

			return Response({
				'active_game': active_game,
				'recent_games': games_data
			})

		except Exception as e:
			logging.error(f"Error checking pending games: {str(e)}")
			return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class TournamentGen(generics.ListCreateAPIView):
	permission_classes = (IsAuthenticatedUserProfile,)
	authentication_classes = [JWTAuth]
	serializer_class = TournamentSerializer
	filter_backends = [DjangoFilterBackend]
	filterset_fields = ['name', 'partecipants__user_id', 'level_required', 'max_partecipants', 'winner__user_id']
	lookup_fields = ['id', 'name', 'partecipants__user_id', 'level_required', 'max_partecipants', 'winner__user_id']

class TournamentManage(generics.RetrieveUpdateDestroyAPIView):
	permission_classes = (IsAuthenticatedUserProfile,)
	serializer_class = TournamentSerializer
	authentication_classes = [JWTAuth]
	lookup_url_kwarg = 'id'
	queryset = Tournament.objects.all()

class JoinTournament(APIView):
	""" Use this endpoint to join a tournament.

		Args:
			tournament_id (int): The id of the tournament.
			user_id (int): The id of the player.
	"""
	permission_classes = (permissions.AllowAny,)
	def post(self, request, *args, **kwargs):
		tournament_id = request.data.get('tournament_id')
		user_id = request.data.get('user_id')
		if not tournament_id or not user_id:
			return Response({'error': 'tournament_id and user_id are required'}, status=status.HTTP_400_BAD_REQUEST)
		tournament = get_object_or_404(Tournament, id=tournament_id)
		player = get_object_or_404(UserProfile, user_id=user_id)
		if tournament.partecipants >= tournament.max_partecipants:
			return Response({'error': 'tournament is full'}, status=status.HTTP_400_BAD_REQUEST)
		if tournament.winner != 0:
			return Response({'error': 'tournament is already finished'}, status=status.HTTP_400_BAD_REQUEST)
		player.tournaments.add(tournament)
		tournament.partecipants += 1
		tournament.save()
		return Response({'message': 'user joined tournament'}, status=status.HTTP_200_OK)

class EndTournament(APIView):
	""" Use this endpoint to end a tournament.

		Args:
			tournament_id (int): The id of the tournament.
			winner_id (int): The id of the player who won the tournament.
	"""
	permission_classes = (permissions.AllowAny,)
	def post(self, request, *args, **kwargs):
		tournament_id = request.data.get('tournament_id')
		winner_id = request.data.get('winner_id')
		if not tournament_id or not winner_id:
			return Response({'error': 'tournament_id and winner_id are required'}, status=status.HTTP_400_BAD_REQUEST)
		tournament = get_object_or_404(Tournament, id=tournament_id)
		winner = get_object_or_404(UserProfile, user_id=winner_id)
		if tournament.winner != 0:
			return Response({'error': 'tournament is already finished'}, status=status.HTTP_400_BAD_REQUEST)
		tournament.winner = winner.user_id
		tournament.save()
		return Response({'message': 'tournament ended'}, status=status.HTTP_200_OK)

class PlayerMatchHistory(APIView):
	""" Use this endpoint to get the match history of a player.'

		Args:
			user_id (int): The id of the player.
	"""
	permission_classes = (permissions.AllowAny,)

	def get(self, request, *args, **kwargs):
		user_id = request.query_params.get('user_id')
		if not user_id:
			return Response({'error': 'user_id is required'}, status=status.HTTP_400_BAD_REQUEST)
		games = Game.objects.filter(player_1=user_id) | Game.objects.filter(player_2=user_id)
		serializer = GamesSerializer(games, many=True)
		return Response(serializer.data, status=status.HTTP_200_OK)

@csrf_exempt
def health_check(request):
	return JsonResponse({'status': 'ok'})