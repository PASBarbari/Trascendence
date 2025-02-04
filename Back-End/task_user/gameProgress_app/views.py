from django.shortcuts import render, get_object_or_404
from rest_framework import permissions, status, generics, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import *
from .serializer import *
from django_filters.rest_framework import DjangoFilterBackend

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

class GameGen(generics.ListCreateAPIView):
	permission_classes = (permissions.AllowAny,)
	serializer_class = GamesSerializer
	lookup_fields = ['id', 'player_1__user_id', 'player_2__user_id', 'tournament_id']

class GameManage(generics.RetrieveUpdateDestroyAPIView):
	permission_classes = (permissions.AllowAny,)
	serializer_class = GamesSerializer
	lookup_url_kwarg = 'id'
	queryset = Game.objects.all()

class TournamentGen(generics.ListCreateAPIView):
	permission_classes = (permissions.AllowAny,)
	serializer_class = TournamentSerializer
	lookup_fields = ['id', 'name', 'partecipants__user_id', 'level_required', 'max_partecipants', 'winner__user_id']

class TournamentManage(generics.RetrieveUpdateDestroyAPIView):
	permission_classes = (permissions.AllowAny,)
	serializer_class = TournamentSerializer
	lookup_url_kwarg = 'id'
	queryset = Tournament.objects.all()

class JoinTournament(APIView):
	permission_classes = (permissions.AllowAny,)

	def post(self, request, *args, **kwargs):
		tournament_id = request.data.get('tournament_id')
		user_id = request.data.get('user_id')
		if not tournament_id or not user_id:
			return Response({'error': 'tournament_id and user_id are required'}, status=status.HTTP_400_BAD_REQUEST)
		tournament = get_object_or_404(Tournament, id=tournament_id)
		user = get_object_or_404(Users, user_id=user_id)
		if user in tournament.partecipants.all():
			return Response({'error': 'user is already registered to this tournament'}, status=status.HTTP_400_BAD_REQUEST)
		if tournament.partecipants.count() >= tournament.max_partecipants:
			return Response({'error': 'tournament is full'}, status=status.HTTP_400_BAD_REQUEST)
		tournament.partecipants.add(user)
		return Response({'message': 'user added to tournament'}, status=status.HTTP_200_OK)