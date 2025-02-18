from django.shortcuts import render, get_object_or_404
from rest_framework.views import APIView
from rest_framework import permissions, status, generics, filters
from rest_framework.response import Response
from .models import *
from .serializer import *
from user_app.models import Users
from .notification import ImmediateNotification, ScheduledNotification , SendNotification , SendNotificationSync
from django.db.models import Q
import asyncio
from .middleware import APIKeyPermission
from django_filters.rest_framework import DjangoFilterBackend

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

class AvatarGen(generics.ListCreateAPIView):
	permission_classes = (permissions.AllowAny,)
	serializer_class = AvatarsSerializer
	queryset = Avatars.objects.all()

class AvatarManage(generics.RetrieveUpdateDestroyAPIView):
	permission_classes = (permissions.AllowAny,)
	serializer_class = AvatarsSerializer
	lookup_url_kwarg = 'id'
	queryset = Avatars.objects.all()

class UserGen(generics.ListCreateAPIView):
	serializer_class = UsersSerializer
	filter_backends = [DjangoFilterBackend]
	filterset_fields = ['user_id']
	queryset = Users.objects.all()

	def get_permissions(self):
		if self.request.method == 'POST':
			print("POST here")
			self.permission_classes = [APIKeyPermission]
		else:
			self.permission_classes = (permissions.AllowAny,)
		return super().get_permissions()

class UserManage(generics.RetrieveUpdateDestroyAPIView):
	permission_classes = (permissions.AllowAny,)
	serializer_class = UsersSerializer
	lookup_url_kwarg = 'user_id'
	queryset = Users.objects.all()

class FriendList(generics.ListAPIView):
	permissions_classes = (permissions.AllowAny,)
	serializer_class = FriendshipsSerializer
	filter_backends = [DjangoFilterBackend]
	filterset_fields = ['user_1__user_id', 'user_2__user_id', 'accepted']
	queryset = Friendships.objects.all()
	def get_queryset(self):
		queryset = super().get_queryset()
		user_id = self.request.query_params.get('user_id')
		if user_id:
			queryset = queryset.filter(Q(user_1__user_id=user_id) | Q(user_2__user_id=user_id))
		return queryset

class LevelUp(APIView):
	""" Use this endpoint to add exp to a user.

		Args:
			user_id (int): The id of the user.
			exp (int): The amount of experience points to add.
	"""
	permission_classes = (permissions.AllowAny,)

	def post(self, request):
		user_id = request.data.get('user_id')
		exp = request.data.get('exp')
		if not user_id or not exp:
			return Response({'error': 'user_id and exp are required'}, status=status.HTTP_400_BAD_REQUEST)
		user = get_object_or_404(Users, user_id=user_id)
		user.exp += exp
		if user.exp >= user.level * 100:
			user.level += 1
			user.exp = 0
		user.save()
		return Response({'message': 'user level up'}, status=status.HTTP_200_OK)
		

from .notification import Microservices

class AddFriend(APIView):
	""" Use this endpoint to send a friend request, accept a friend request or delete a friendship.

		Args:
			user_1 (int): The id of the user sending the request.
			user_2 (int): The id of the user receiving the request.
	"""
	permission_classes = (permissions.AllowAny,)

	def post(self, request):
		serializer = FriendshipsSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		u1 = Users.objects.get(user_id=serializer.data['user_1'])
		u2 = Users.objects.get(user_id=serializer.data['user_2'])
		if Friendships.objects.filter(user_1=u1, user_2=u2) or Friendships.objects.filter(user_1=u2, user_2=u1):
			if Friendships.objects.get(user_1=u1, user_2=u2).accepted:
				return Response({
					'info': 'users are already friends'
				}, status=status.HTTP_200_OK)
			return Response({
				'info': 'friend request is pending'
			}, status=status.HTTP_200_OK)
		fs = Friendships.objects.create(
			user_1=u1,
			user_2=u2
		)
		fs.save()
		notifi = ImmediateNotification.objects.create(
			Sender="Users",
			message=f'Friend request from {u1.first_name} {u1.last_name}',
			user_id=u2.user_id,
			group_id=None,
		)
		SendNotificationSync(notifi)
		return Response({
			'info': 'friend request sent'
		}, status=status.HTTP_200_OK)

		def patch(self, request):
				try:
						serializer = FriendshipsSerializer(data=request.data)
						serializer.is_valid(raise_exception=True)
						u1 = Users.objects.get(user_id=serializer.data['user_1'])
						u2 = Users.objects.get(user_id=serializer.data['user_2'])
						if Friendships.objects.filter(user_1=u1, user_2=u2):
								fs = Friendships.objects.get(user_1=u1, user_2=u2)
								fs.accepted = True
								fs.save()
								notifi = ImmediateNotification.objects.create(
										Sender="Users",
										message=f'{u2.first_name} {u2.last_name} accepted your friend request',
										user_id=u1.user_id,
										group_id=None,
								)
								SendNotificationSync(notifi)
								return Response({
										'info': 'friend request accepted'
								}, status=status.HTTP_200_OK)
						else:
								return Response({
										'error': 'friend request not found'
								}, status=status.HTTP_400_BAD_REQUEST)
				except Exception as e:
						return Response({
								'error': str(e)
						}, status=status.HTTP_400_BAD_REQUEST)

		def delete(self, request):
				try:
						serializer = FriendshipsSerializer(data=request.data)
						serializer.is_valid(raise_exception=True)
						u1 = Users.objects.get(user_id=serializer.data['user_1'])
						u2 = Users.objects.get(user_id=serializer.data['user_2'])
						friendship = Friendships.objects.filter(
								(Q(user_1=u1) & Q(user_2=u2)) | (Q(user_1=u2) & Q(user_2=u1))
						).first()
						if friendship:
								friendship.delete()
								notifi = ImmediateNotification.objects.create(
										Sender="Users",
										message=f'deleted friendship with {u2.user_id}',
										user_id=u1.user_id,
										group_id=None,
								)
								SendNotificationSync(notifi)
								notifi = ImmediateNotification.objects.create(
										Sender="Users",
										message=f'deleted friendship with {u1.user_id}',
										user_id=u2.user_id,
										group_id=None,
								)
								SendNotificationSync(notifi)
								return Response({
										'info': 'friendship deleted'
								}, status=status.HTTP_200_OK)
						else:
								return Response({
										'error': 'friendship not found'
								}, status=status.HTTP_400_BAD_REQUEST)
				except Exception as e:
						return Response({
								'error': str(e)
						}, status=status.HTTP_400_BAD_REQUEST)
