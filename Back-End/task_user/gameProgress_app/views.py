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

	def get_queryset(self):
		queryset = Games.objects.all()
		if self.request.method == 'GET':
			user_id = self.request.query_params.get('user_id')
			if user_id:
				My_progress = GameProgresses.objects.filter(user_id=user_id)
				queryset = queryset.exclude(id__in=[x.game.id for x in My_progress])
				return queryset
		return Games.objects.all()