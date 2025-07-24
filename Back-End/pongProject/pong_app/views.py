from django.http import JsonResponse
from django.shortcuts import render, get_object_or_404
from django.db import models
from django.db.models import Q, Count, Case, When, IntegerField
from django.utils import timezone
from datetime import timedelta
from psycopg import logger
from rest_framework import permissions, status, generics, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from .serializer import *
from .models import UserProfile , Game, Tournament
from .middleware import ServiceAuthentication , JWTAuth
from django.contrib.auth.models import AnonymousUser
from django_filters.rest_framework import DjangoFilterBackend
from django.views.decorators.csrf import csrf_exempt
import logging

logger = logging.getLogger('pong_app')

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
		queryset = self.filter_queryset(queryset)	# Apply any filter backends
		filter = {}
		for field in self.lookup_fields:
			if self.kwargs.get(field): # Ignore empty fields.
				filter[field] = self.kwargs[field]
		obj = get_object_or_404(queryset, **filter)	# Lookup the object
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
	"""
	Tournament management endpoint.
	
	GET: List all tournaments with optional filtering
	POST: Create a new tournament
	
	When creating a tournament:
	- The authenticated user is automatically set as the creator
	- The creator is automatically joined to the tournament
	- max_partecipants is automatically adjusted to the nearest power of 2 (4, 8, 16, 32, 64)
	- partecipants count starts at 1 (the creator)
	
	Example request body for creation:
	{
		"name": "Summer Championship",
		"max_partecipants": 12,	// Will be adjusted to 16
	}
	"""
	permission_classes = (IsAuthenticatedUserProfile,)
	authentication_classes = [JWTAuth]
	serializer_class = TournamentSerializer
	filter_backends = [DjangoFilterBackend]
	filterset_fields = ['name', 'partecipants__user_id', 'max_partecipants', 'winner__user_id']
	lookup_fields = ['id', 'name', 'partecipants__user_id', 'max_partecipants', 'winner__user_id']
	
	def get_nearest_power_of_2(self, num):
		"""Get the nearest power of 2 for tournament partecipants"""
		if num <= 0:
			return 4	# Minimum tournament size
		
		# Find the nearest power of 2
		import math
		if num <= 4:
			return 4
		elif num <= 8:
			return 8
		elif num <= 16:
			return 16
		elif num <= 32:
			return 32
		elif num <= 64:
			return 64
		elif num <= 128:
			return 128
		else:
			return 128 # Maximum tournament size
	
	def perform_create(self, serializer):
		"""Override to auto-set creator and adjust max_partecipants to nearest power of 2"""
		# Get or create the user profile for the creator
		creator, created = UserProfile.objects.get_or_create(
			user_id=self.request.user.user_id,
			defaults={
				'username': getattr(self.request.user, 'username', f'User_{self.request.user.user_id}'),
				'email': getattr(self.request.user, 'email', f'user_{self.request.user.user_id}@example.com')
			}
		)
		
		# Get the requested max_partecipants and adjust to nearest power of 2
		max_partecipants = serializer.validated_data.get('max_partecipants', 8)
		adjusted_max_partecipants = self.get_nearest_power_of_2(max_partecipants)
		
		# Get initial partecipants from request data (if any)
		initial_partecipants = self.request.data.get('partecipants', [])
		logger.info(f"Creating tournament with initial partecipants: {initial_partecipants}")
		# Calculate the number of partecipants (creator + initial partecipants)
		participant_count = 1	# Start with creator
		if initial_partecipants:
			participant_count += len(initial_partecipants)
		
		# Save the tournament with auto-set creator and adjusted max partecipants
		tournament = serializer.save(
			creator=creator,
			max_partecipants=adjusted_max_partecipants,
			partecipants=participant_count
		)
		
		# Add the creator to the tournament partecipants
		creator.tournaments.add(tournament)

		# Add initial partecipants if provided
		if initial_partecipants:
			from .notification import SendNotificationSync, ImmediateNotification
			notification_data = {
				'type': 'tournament_created',
				'tournament_id': tournament.id,
				'name': tournament.name,
				'max_players': tournament.max_partecipants,
				'creator_id': tournament.creator.user_id,
				'begin_date': tournament.begin_date.isoformat() if tournament.begin_date else None,
			}
			for user_id in initial_partecipants:
				try:
					participant = UserProfile.objects.get(user_id=int(user_id))
					# Avoid adding duplicates (in case creator is in the list)
					if not participant.tournaments.filter(id=tournament.id).exists():
						participant.tournaments.add(tournament)
						try:
							notification = ImmediateNotification(
								Sender='Pong',
								message=notification_data,
								user_id=participant.user_id
							)
							SendNotificationSync(notification)
							logger.info(f'✅ Tournament notification sent to creator (ID: {tournament.creator.user_id}) for tournament {tournament.id}')
						except Exception as e:
							logger.error(f'❌ Failed to send tournament notification to creator (ID: {tournament.creator.user_id}): {str(e)}')
				except UserProfile.DoesNotExist:
					# Log the error but don't fail the entire creation
					logging.warning(f"User with ID {user_id} not found, skipping from tournament {tournament.id}")

class TournamentManage(generics.RetrieveUpdateDestroyAPIView):
	permission_classes = (IsAuthenticatedUserProfile,)
	serializer_class = TournamentSerializer
	authentication_classes = [JWTAuth]
	lookup_url_kwarg = 'id'
	lookup_fields = ['id']
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
		
		# Check if tournament is full
		if tournament.partecipants >= tournament.max_partecipants:
			return Response({'error': 'tournament is full'}, status=status.HTTP_400_BAD_REQUEST)
		
		# Check if tournament has already started or is completed
		if tournament.status == 'active':
			return Response({'error': 'tournament has already started'}, status=status.HTTP_400_BAD_REQUEST)
		
		if tournament.status == 'completed':
			return Response({'error': 'tournament is already finished'}, status=status.HTTP_400_BAD_REQUEST)
		
		# Check if player is already in the tournament
		if player.tournaments.filter(id=tournament_id).exists():
			return Response({'error': 'user is already in this tournament'}, status=status.HTTP_400_BAD_REQUEST)
		
		# Add player to tournament
		player.tournaments.add(tournament)
		tournament.partecipants += 1
		tournament.save()
		
		return Response({
			'message': 'user joined tournament',
			'tournament_id': tournament_id,
			'current_partecipants': tournament.partecipants,
			'max_partecipants': tournament.max_partecipants
		}, status=status.HTTP_200_OK)

class LeaveTournament(APIView):
	""" Use this endpoint to leave a tournament (only before it starts).

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
		
		# Check if tournament has already started or completed
		if tournament.status == 'active':
			return Response({'error': 'tournament has already started, cannot leave'}, status=status.HTTP_400_BAD_REQUEST)
		
		# Check if tournament is already completed
		if tournament.status == 'completed':
			return Response({'error': 'tournament has already finished'}, status=status.HTTP_400_BAD_REQUEST)
		
		# Check if player is actually in the tournament
		if not player.tournaments.filter(id=tournament_id).exists():
			return Response({'error': 'user is not in this tournament'}, status=status.HTTP_400_BAD_REQUEST)
		
		# Check if user is the creator
		if tournament.creator and tournament.creator.user_id == user_id:
			return Response({'error': 'tournament creator cannot leave the tournament'}, status=status.HTTP_400_BAD_REQUEST)
		
		# Remove player from tournament
		player.tournaments.remove(tournament)
		tournament.partecipants -= 1
		tournament.save()
		
		return Response({
			'message': 'user left tournament',
			'tournament_id': tournament_id,
			'current_partecipants': tournament.partecipants,
			'max_partecipants': tournament.max_partecipants
		}, status=status.HTTP_200_OK)

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
		
		# Check if tournament is already completed
		if tournament.status == 'completed':
			return Response({'error': 'tournament is already finished'}, status=status.HTTP_400_BAD_REQUEST)
		
		# Check if winner is actually a participant in the tournament
		if not winner.tournaments.filter(id=tournament_id).exists():
			return Response({'error': 'winner must be a participant in the tournament'}, status=status.HTTP_400_BAD_REQUEST)
		
		# Set the winner and mark tournament as completed
		tournament.winner = winner
		tournament.status = 'completed'
		tournament.save()
		
		return Response({
			'message': 'tournament ended',
			'tournament_id': tournament_id,
			'winner': {
				'user_id': winner.user_id,
				'username': winner.username
			}
		}, status=status.HTTP_200_OK)




class GamePagination(PageNumberPagination):
		"""Simple pagination for game history"""
		page_size = 10
		page_size_query_param = 'page_size'
		max_page_size = 50

class PlayerMatchHistory(generics.ListAPIView):
		""" Use this endpoint to get the match history of a player.
		
		URL: /api/player-match-history/?user_id=123
		Optional params: ?page=2&page_size=20
		"""
		permission_classes = (IsAuthenticatedUserProfile,)
		authentication_classes = [JWTAuth]
		serializer_class = GamesSerializer
		pagination_class = GamePagination
		
		def get_queryset(self):
				user_id = self.request.query_params.get('user_id')
				if not user_id:
						return Game.objects.none()
				
				# Get games where user is either player_1 or player_2
				# Order by most recent first
				return Game.objects.filter(
						models.Q(player_1__user_id=user_id) | models.Q(player_2__user_id=user_id)
				).select_related('player_1', 'player_2', 'tournament_id').order_by('-begin_date')


class TournamentMatchHistory(APIView):
	""" Use this endpoint to get the match history of a tournament.

		URL: /api/tournament-match-history/?tournament_id=123
	"""
	permission_classes = (IsAuthenticatedUserProfile,)
	authentication_classes = [JWTAuth]
	serializer_class = TournamentSerializer
	pagination_class = GamePagination

	def get_queryset(self):
		tournament_id = self.request.query_params.get('tournament_id')
		if not tournament_id:
			return Game.objects.none()

		# Get games for the specified tournament
		return Game.objects.filter(tournament_id=tournament_id).select_related('player_1', 'player_2').order_by('-begin_date')


class UserTournaments(generics.ListAPIView):
		"""
		Get tournaments for a specific user.
		
		Query Parameters:
		- user_id: User ID to get tournaments for (optional, defaults to authenticated user)
		- current_only: Set to 'true' to get only active/pending tournaments (optional)
		- status: Filter by tournament status - 'pending', 'active', 'finished' (optional)
		
		Examples:
		- GET /api/user-tournaments/ - Get all tournaments for authenticated user
		- GET /api/user-tournaments/?user_id=123 - Get all tournaments for user 123
		- GET /api/user-tournaments/?current_only=true - Get only current tournaments
		- GET /api/user-tournaments/?status=active - Get only active tournaments
		"""
		permission_classes = (IsAuthenticatedUserProfile,)
		authentication_classes = [JWTAuth]
		serializer_class = TournamentSerializer
		pagination_class = GamePagination

		def get_queryset(self):
				# Get user_id from query params or use authenticated user
				user_id = self.request.query_params.get('user_id', self.request.user.user_id)
				current_only = self.request.query_params.get('current_only', '').lower() == 'true'
				status_filter = self.request.query_params.get('status', '').lower()
				
				try:
						# Get tournaments where user is a participant
						queryset = Tournament.objects.filter(
								player__user_id=user_id
						).select_related('creator', 'winner').prefetch_related('player').order_by('-begin_date')
						
						# Apply filters
						if current_only:
								# Get only tournaments that are not completed
								queryset = queryset.exclude(status='completed')
						
						if status_filter in ['pending', 'active', 'completed']:
								queryset = queryset.filter(status=status_filter)
						
						return queryset
						
				except Exception as e:
						logger.error(f"Error getting user tournaments: {str(e)}")
						return Tournament.objects.none()

		def list(self, request, *args, **kwargs):
				"""Override to add extra metadata"""
				queryset = self.get_queryset()
				page = self.paginate_queryset(queryset)
				
				if page is not None:
						serializer = self.get_serializer(page, many=True)
						response_data = self.get_paginated_response(serializer.data)
						
						# Add summary statistics using status choices
						total_tournaments = queryset.count()
						pending_count = queryset.filter(status='pending').count()
						active_count = queryset.filter(status='active').count()
						completed_count = queryset.filter(status='completed').count()
						
						response_data.data['summary'] = {
								'total_tournaments': total_tournaments,
								'pending': pending_count,
								'active': active_count,
								'completed': completed_count
						}
						
						return response_data
				
				serializer = self.get_serializer(queryset, many=True)
				return Response({
						'results': serializer.data,
						'summary': {
								'total_tournaments': queryset.count(),
								'pending': queryset.filter(status='pending').count(),
								'active': queryset.filter(status='active').count(),
								'completed': queryset.filter(status='completed').count()
						}
				})

class StartTournament(APIView):
		"""
		Start a tournament (only creator can start it).
		
		POST /api/start-tournament/
		Body: {"tournament_id": 123}
		"""
		permission_classes = (IsAuthenticatedUserProfile,)
		authentication_classes = [JWTAuth]
		
		def post(self, request, *args, **kwargs):
				tournament_id = request.data.get('tournament_id')
				if not tournament_id:
						return Response({'error': 'tournament_id is required'}, status=status.HTTP_400_BAD_REQUEST)
				
				try:
						tournament = get_object_or_404(Tournament, id=tournament_id)
						
						# Check if user is the creator
						if not tournament.creator or tournament.creator.user_id != request.user.user_id:
								return Response({'error': 'Only tournament creator can start the tournament'}, status=status.HTTP_403_FORBIDDEN)
						
						# Check if tournament is already started
						if tournament.status == 'active':
								return Response({'error': 'Tournament has already started'}, status=status.HTTP_400_BAD_REQUEST)
						
						# Check if tournament is already finished
						if tournament.status == 'completed':
								return Response({'error': 'Tournament is already completed'}, status=status.HTTP_400_BAD_REQUEST)
						
						# Check if tournament has enough participants (minimum 2)
						if tournament.partecipants < 2:
								return Response({'error': 'Tournament needs at least 2 participants to start'}, status=status.HTTP_400_BAD_REQUEST)
						
						# Start the tournament by changing status to active
						tournament.status = 'active'
						tournament.save()
						
						# Serialize and return updated tournament
						serializer = TournamentSerializer(tournament)
						
						return Response({
								'message': 'Tournament started successfully',
								'tournament': serializer.data
						}, status=status.HTTP_200_OK)
						
				except Exception as e:
						logger.error(f"Error starting tournament: {str(e)}")
						return Response({'error': 'An error occurred while starting the tournament'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class UserStatistics(APIView):
	""" Use this endpoint to get the statistics of a user.

		args:
			user_id (int): The id of the user. (optional, if not provided, the authenticated user will be used)
	"""
	permission_classes = (IsAuthenticatedUserProfile,)
	authentication_classes = [JWTAuth] 
	
	def get(self, request, *args, **kwargs):
		user_id = request.query_params.get('user_id', request.user.user_id)

		if not user_id:
			return Response({'error': 'user_id is required'}, status=status.HTTP_400_BAD_REQUEST)
		# elif not isinstance(user_id, int):
		# 	return Response({'error': 'user_id must be an integer'}, status=status.HTTP_400_BAD_REQUEST)
		try:
			user = get_object_or_404(UserProfile, user_id=int(user_id))
			games_stats = Game.objects.filter(
						Q(player_1__user_id=user_id) | Q(player_2__user_id=user_id)
				).aggregate(
						total_games=Count('id'),
						total_wins=Count(Case(
								When(Q(player_1__user_id=user_id) & Q(player_1_score__gt=models.F('player_2_score')), then=1),
								When(Q(player_2__user_id=user_id) & Q(player_2_score__gt=models.F('player_1_score')), then=1),
								output_field=IntegerField()
						)),
						total_losses=Count(Case(
								When(Q(player_1__user_id=user_id) & Q(player_1_score__lt=models.F('player_2_score')), then=1),
								When(Q(player_2__user_id=user_id) & Q(player_2_score__lt=models.F('player_1_score')), then=1),
								output_field=IntegerField()
						))
				)
						
			# Tournament statistics
			tournament_stats = user.tournaments.aggregate(
				total_tournaments=Count('id'),
				total_tournament_wins=Count('id', filter=Q(winner__user_id=user_id))
			)
						
			# Calculate win rate
			total_games = games_stats['total_games'] or 0
			total_wins = games_stats['total_wins'] or 0
			win_rate = (total_wins / total_games * 100) if total_games > 0 else 0
						
			stats_data = {
				'user_id': user.user_id,
				'username': user.username,
				'total_games': total_games,
				'total_wins': total_wins,
				'total_losses': games_stats['total_losses'] or 0,
				'win_rate': round(win_rate, 2),
				'total_tournaments': tournament_stats['total_tournaments'] or 0,
				'total_tournament_wins': tournament_stats['total_tournament_wins'] or 0
			}
						
			return Response(stats_data, status=status.HTTP_200_OK)
		except Exception as e:
			logging.error(f"An error occurred: {str(e)}")
			return Response({'error': 'An internal error occurred.'}, status=status.HTTP_400_BAD_REQUEST)


@csrf_exempt
def health_check(request):
	return JsonResponse({'status': 'ok'})