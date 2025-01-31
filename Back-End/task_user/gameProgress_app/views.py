from django.shortcuts import render, get_object_or_404
from rest_framework import permissions, status, generics, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import *
from .serializer import *
from django_filters.rest_framework import DjangoFilterBackend
from user_app.notification import *


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

class NewGame(APIView):
	# permission_classes = [permissions.IsAuthenticated]
	def post(self, request):
		try:
			serializer = GameInviteSerializer(data=request.data)
			if serializer.is_valid():
				serializer.save()
				notify = ImmediateNotification.objects.create(
					Sender="Users",
					message=f'You have been invited to a game from {serializer.data["player_1"]}',
					user_id=serializer.data['player_2'],
					group_id=None,
				)
				SendNotificationSync(notify)
				return Response(serializer.data, status=status.HTTP_201_CREATED)
			return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
		except Exception as e:
			return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

	def patch(self, request):
		try:
			serializer = GameInviteSerializer(data=request.data)
			if serializer.is_valid():
				serializer.save()
				notify = ImmediateNotification.objects.create(
					Sender="Users",
					message=f'{serializer.data["player_2"]} has accepted your game invite',
					user_id=serializer.data['player_1'],
					group_id=None,
				)
				SendNotificationSync(notify)
    #adesso entrambi si connettono al webSocket
    #TODO aggiungere logica per i tornei
				gm = Game.objects.create(
					player_1=serializer.data['player_1'],
					player_2=serializer.data['player_2']
				)
				game_serializer = GameSerializer(gm)
				return Response(game_serializer.data, status=status.HTTP_201_CREATED)
			return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
		except Exception as e:
			return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def delete (self, request):
	try:
		serializer = GameInviteSerializer(data=request.data)
		if serializer.is_valid():
			serializer.save()
			notify = ImmediateNotification.objects.create(
				Sender="Users",
				message=f'{serializer.data["player_2"]} has declined your game invite',
				user_id=serializer.data['player_1'],
				group_id=None,
			)
			SendNotificationSync(notify)
			return Response(serializer.data, status=status.HTTP_201_CREATED)
		return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
	except Exception as e:
		return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)