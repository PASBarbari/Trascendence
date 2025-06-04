from django.shortcuts import render, get_object_or_404
from django.contrib.auth.models import AnonymousUser
from rest_framework.views import APIView
from rest_framework import permissions, status, generics
from rest_framework.response import Response
from .models import *
from .serializer import *
from user_app.models import UserProfile
from .notification import ImmediateNotification, ScheduledNotification , SendNotification , SendNotificationSync
from django.db.models import Q
import asyncio
from .middleware import ServiceAuthentication , JWTAuth
from django_filters.rest_framework import DjangoFilterBackend
from .minio_client import MinioService
from rest_framework.parsers import MultiPartParser, FormParser

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
		queryset = self.get_queryset()
		queryset = self.filter_queryset(queryset)	# Apply any filter backends
		filter = {}
		for field in self.lookup_fields:
			if self.kwargs.get(field): # Ignore empty fields.
				filter[field] = self.kwargs[field]
		obj = get_object_or_404(queryset, **filter)	# Lookup the object
		self.check_object_permissions(self.request, obj)
		return obj

# class AvatarGen(generics.ListCreateAPIView):
# 	permission_classes = (IsAuthenticatedUserProfile,)
# 	serializer_class = AvatarsSerializer
# 	queryset = Avatars.objects.all()

# class AvatarManage(generics.RetrieveUpdateDestroyAPIView):
# 	permission_classes = (IsAuthenticatedUserProfile,)
# 	serializer_class = AvatarsSerializer
# 	lookup_url_kwarg = 'id'
# 	queryset = Avatars.objects.all()
# cazzo

class UserGen(generics.ListCreateAPIView):
	serializer_class = UsersSerializer
	filter_backends = [DjangoFilterBackend]
	filterset_fields = ['user_id']
	queryset = UserProfile.objects.all()

	def get_permissions(self):
		if self.request.method == 'POST':
			self.permission_classes = []
			self.authentication_classes = [ServiceAuthentication]
		else:
			self.permission_classes = (IsAuthenticatedUserProfile,)
			self.authentication_classes = [JWTAuth]
		return super().get_permissions()

class UserManage(generics.RetrieveUpdateDestroyAPIView):
	permission_classes = (IsAuthenticatedUserProfile,)
	authentication_classes = [JWTAuth]
	serializer_class = UsersSerializer
	def get_object(self):
		return get_object_or_404(UserProfile, user_id=self.request.user.user_id)

class FriendList(generics.ListAPIView):
    permission_classes = (IsAuthenticatedUserProfile,)
    authentication_classes = [JWTAuth]
    serializer_class = FriendshipsSerializer
        
    def get_queryset(self):
        user = self.request.user
        
        status_filter = self.request.query_params.get('status')
        
        # Base query - all relationships involving current user
        queryset = Friendships.objects.filter(
            Q(user_1=user) | Q(user_2=user)
        )
        
        # Filter by acceptance status if requested
        if status_filter == 'accepted':
            queryset = queryset.filter(accepted=True)
        elif status_filter == 'pending':
            queryset = queryset.filter(accepted=False)
            
        return queryset

class LevelUp(APIView):
	""" Use this endpoint to add exp to a user.

		Args:
			user_id (int): The id of the user.
			exp (int): The amount of experience points to add.
	"""
	permission_classes = (IsAuthenticatedUserProfile,)

	def post(self, request):
		user_id = request.data.get('user_id')
		exp = request.data.get('exp')
		if not user_id or not exp:
			return Response({'error': 'user_id and exp are required'}, status=status.HTTP_400_BAD_REQUEST)
		user = get_object_or_404(UserProfile, user_id=user_id)
		user.exp += exp
		if user.exp >= user.level * 100:
			user.level += 1
			user.exp = 0
		user.save()
		return Response({'message': 'user level up'}, status=status.HTTP_200_OK)


class AddFriend(APIView):
	""" Use this endpoint to send a friend request, accept a friend request or delete a friendship.

		methods:
		- POST: Send a friend request to another user.
		- PATCH: Accept a friend request from another user.
		- DELETE: Delete a friendship with another user.

		Args:
			receiver (int): The id of the user receiving the request.
	"""
	permission_classes = (IsAuthenticatedUserProfile,)
	authentication_classes = [JWTAuth]

	def post(self, request):
		try:
			u1 = request.user
			u2 = get_object_or_404(UserProfile, user_id=request.data.get('receiver'))
			if Friendships.objects.filter(user_1=u1, user_2=u2) or Friendships.objects.filter(user_1=u2, user_2=u1):
				# Check if already friends
				friendship = Friendships.objects.filter(user_1=u1, user_2=u2).first() or Friendships.objects.filter(user_1=u2, user_2=u1).first()
				if friendship and friendship.accepted:
					return Response({
						'info': 'users are already friends'
					}, status=status.HTTP_200_OK)
				return Response({
					'info': 'friend request is pending'
				}, status=status.HTTP_200_OK)
			if u1.user_id == u2.user_id:
				return Response({
					'error': 'You cannot send a friend request to yourself, lmao!'
				}, status=status.HTTP_400_BAD_REQUEST)
			fs = Friendships.objects.create(
				user_1=u1,
				user_2=u2
			)
			fs.save()
			notifi = ImmediateNotification.objects.create(
				Sender="Users",
				message={'friend_request': u1},
				user_id=u2.user_id,
				group_id=None,
			)
			SendNotificationSync(notifi)
			return Response({
				'info': 'friend request sent'
			}, status=status.HTTP_200_OK)
		except Exception as e:
			return Response({
				'error': str(e)
			}, status=status.HTTP_400_BAD_REQUEST)

	def patch(self, request):
		try:
			u1 = get_object_or_404(UserProfile, user_id=request.data.get('receiver'))
			u2 = request.user
			# Find the friendship in either direction
			friendship = Friendships.objects.filter(
				user_1=u1, user_2=u2
			).first()
			if friendship:
				friendship.accepted = True
				friendship.save()
				# Send notification
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
			u1 = request.user
			u2 = get_object_or_404(UserProfile, user_id=request.data.get('receiver'))
			if u1.user_id == u2.user_id:
				return Response({
					'error': 'You cannot delete a friendship with yourself, lmao!'
				}, status=status.HTTP_400_BAD_REQUEST)
			# Find the friendship in either direction
			# This will find the friendship regardless of who is user_1 or user_2
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
					return Response({
							'info': 'friendship deleted'
					}, status=status.HTTP_200_OK)
			else:
					return Response({
							'error': 'friendship not found'
					}, status=status.HTTP_400_BAD_REQUEST)
		except Exception as e:
			return Response({
					'errors': str(e)
			}, status=status.HTTP_400_BAD_REQUEST)


class BlockUser(APIView):
	""" Use this endpoint to block a user.

	post:
		Blocks a user.

	Parameters:
		user_id (int): The id of the user to block.
	
	Response:
	- 200 OK: User blocked successfully.
	- 400 Bad Request: Invalid request data.
	- 403 Forbidden: User is trying to block themselves.
	- 404 Not Found: User not found.


	delete:
		Unblocks a user.
	
	Parameters:
		user_id (int): The id of the user to unblock.

	Response:
	- 200 OK: User unblocked successfully.
	- 400 Bad Request: Invalid request data.
	- 403 Forbidden: User is trying to unblock themselves.
	- 404 Not Found: User not found.
	"""
	permission_classes = (IsAuthenticatedUserProfile,)
	authentication_classes = [JWTAuth]
	def post(self, request):
		user_id = request.data.get('user_id')
		if not user_id:
			return Response({'error': 'user_id is required'}, status=status.HTTP_400_BAD_REQUEST)
		if user_id == request.user.user_id:
			return Response({'error': 'You cannot block yourself'}, status=status.HTTP_403_FORBIDDEN)
		user_to_block = get_object_or_404(UserProfile, user_id=user_id)
		request.user.block_user(user_to_block)
		return Response({'message': 'User blocked'}, status=status.HTTP_200_OK)

	def delete(self, request):
		user_id = request.data.get('user_id')
		if not user_id:
			return Response({'error': 'user_id is required'}, status=status.HTTP_400_BAD_REQUEST)
		if user_id == request.user.user_id:
			return Response({'error': 'You cannot unblock yourself'}, status=status.HTTP_403_FORBIDDEN)
		user_to_unblock = get_object_or_404(UserProfile, user_id=user_id)
		request.user.unblock_user(user_to_unblock)
		return Response({'message': 'User unblocked'}, status=status.HTTP_200_OK)
	
	def get(self, request):
		blocked_users = request.user.blocked_users.all()
		serializer = BlockUserSerializer(blocked_users, many=True)
		return Response(serializer.data, status=status.HTTP_200_OK)


class AvatarManager(APIView):
	permission_classes = (IsAuthenticatedUserProfile,)
	authentication_classes = [JWTAuth]
	parser_classes = (MultiPartParser, FormParser)
	def post(self, request):
		try:
			if 'image' not in request.FILES:
				return Response({'error': 'image is required'}, status=status.HTTP_400_BAD_REQUEST)
			
			image = request.FILES['image']
			avatar_name = request.data.get('name', f'Avatar_for_{request.user.username}')
			user = request.user

			valid_types = ['image/jpeg', 'image/png', 'image/gif']
			if image.content_type not in valid_types:
				return Response({'error': 'Invalid image type'}, status=status.HTTP_400_BAD_REQUEST)
			if image.size > 10 * 1024 * 1024:
				return Response({'error': 'Image size too large (max 10MB)'}, status=status.HTTP_400_BAD_REQUEST)

			minio_serv = MinioService.get_instance()
			success, url = minio_serv.upload_avatar(user.user_id, image, filename=avatar_name)
			if success:
				# Update user's avatar
				avatar = Avatars.objects.create(
					user=user, 
					name=avatar_name, 
					image=url,
					is_current=True
				)
				return Response({'message': 'Avatar uploaded successfully', 'avatar': avatar.image}, status=status.HTTP_200_OK)
			else:
				return Response({'error': 'Error uploading avatar'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
		except Exception as e:
			return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
		
	def get(self, request):
		avatar_id = request.query_params.get('avatar_id')
		avatar = get_object_or_404(Avatars, id=avatar_id)
		serializer = AvatarsSerializer(avatar)
		return Response(serializer.data, status=status.HTTP_200_OK)

class Update2FAStatus(APIView):
	"""
	View to enable/disable two-factor authentication flag for a user.
	Used by the login microservice to update the 2FA status after verification.
		
	POST:
		Enable/disable 2FA for a specific user
		
	Parameters:
		user_id (int): The ID of the user to update
		enabled (bool): Whether 2FA should be enabled or disabled
		
	Returns:
		200 OK: Status updated successfully
		400 Bad Request: Invalid parameters
		404 Not Found: User not found
	"""
	# Allow both service authentication and JWT authentication
	authentication_classes = [ServiceAuthentication]
	permission_classes = []
		
	def post(self, request):
		user_id = request.data.get('user_id')
		enabled = request.data.get('enabled')
		
		if user_id is None or enabled is None:
			return Response(
				{'error': 'Both user_id and enabled fields are required'}, 
				status=status.HTTP_400_BAD_REQUEST
			)
			
		try:
			# Convert enabled to boolean if it comes as string
			if isinstance(enabled, str):
				enabled = enabled.lower() == 'true'
				
			user = get_object_or_404(UserProfile, user_id=user_id)
			user.has_two_factor_auth = enabled
			user.save(update_fields=['has_two_factor_auth'])
			
			return Response(
				{
					'message': f'2FA {"enabled" if enabled else "disabled"} for user {user_id}',
					'user_id': user_id,
					'has_two_factor_auth': enabled
				}, 
				status=status.HTTP_200_OK
			)
			
		except Exception as e:
			return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)