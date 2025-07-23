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
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.filters import SearchFilter
from rest_framework.pagination import PageNumberPagination
from .online_status import online_status_service

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
	queryset = UserProfile.objects.all()
    
	def get_object(self):
		return self.request.user

class UserSearchPagination(PageNumberPagination):
	"""Custom pagination for user search results."""
	page_size = 10  # Number of users per page
	page_size_query_param = 'page_size'  # Allow client to override page size
	max_page_size = 50  # Maximum allowed page size
	page_query_param = 'page'  # URL parameter name for page number

class UserSearch(generics.ListAPIView):
	"""
	Search for users by username or email with partial matching.
	
	This endpoint allows authenticated users to search for other users in the system.
	The search is performed on both username and email fields using partial matching.
	Current user and blocked users are automatically excluded from search results.
	
	Query Parameters:
		search (str): Search term to match against username or email. 
					 Supports partial matching (case-insensitive).
					 Example: ?search=john will match "john_doe" and "john@example.com"
		page (int): Page number for pagination (default: 1)
		page_size (int): Number of results per page (default: 10, max: 50)
	
	Returns:
		200 OK: Paginated list of users matching the search criteria
		{
			"count": 45,
			"next": "http://localhost:8000/api/users/search/?search=john&page=2",
			"previous": null,
			"results": [
				{
					"user_id": 1,
					"username": "john_doe",
					"email": "john@example.com",
					"level": 5,
					"exp": 250,
					...
				}
			]
		}
		
		401 Unauthorized: User is not authenticated
		
	Examples:
		GET /api/users/search/?search=john
		GET /api/users/search/?search=admin&page=2&page_size=20
		GET /api/users/search/?search=@gmail.com&page_size=5
	
	Notes:
		- Search is case-insensitive
		- Minimum search term length: 1 character
		- Current user is excluded from results
		- Blocked users are excluded from results
		- Results are ordered by username for consistent pagination
	"""
	permission_classes = (IsAuthenticatedUserProfile,)
	authentication_classes = [JWTAuth]
	serializer_class = UsersSerializer
	filter_backends = [SearchFilter]
	search_fields = ['username', 'email']
	queryset = UserProfile.objects.all()
	pagination_class = UserSearchPagination
	
	def get_queryset(self):
		"""Exclude current user and blocked users from search results."""
		queryset = super().get_queryset()
		
		# Exclude current user from search results
		if self.request.user:
			queryset = queryset.exclude(user_id=self.request.user.user_id)
			
			# Exclude blocked users if the relationship exists
			if hasattr(self.request.user, 'blocked_users'):
				blocked_user_ids = self.request.user.blocked_users.values_list('user_id', flat=True)
				queryset = queryset.exclude(user_id__in=blocked_user_ids)
		
		# Order by username for consistent pagination
		return queryset.order_by('username')
	
	def list(self, request, *args, **kwargs):
		"""Override list to add online status to search results"""
		response = super().list(request, *args, **kwargs)
		
		# Get user IDs from results and check their online status
		if response.data and 'results' in response.data:
			user_ids = [user['user_id'] for user in response.data['results']]
			online_statuses = online_status_service.get_multiple_users_online_status(user_ids)
			
			# Add online status to each user
			for user in response.data['results']:
				user['is_online'] = online_statuses.get(user['user_id'], False)
		
		return response

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
    
    def list(self, request, *args, **kwargs):
        """Override list to add online status to friend_info"""
        # Get the serialized data
        response = super().list(request, *args, **kwargs)
        
        # Extract friend IDs from the friend_info
        friend_ids = []
        for friendship_data in response.data:
            friend_info = friendship_data.get('friend_info')
            if friend_info and 'user_id' in friend_info:
                friend_ids.append(friend_info['user_id'])
        
        # Batch check online status
        online_statuses = {}
        if friend_ids:
            try:
                online_statuses = online_status_service.get_multiple_users_online_status(friend_ids)
            except Exception as e:
                print(f"Error getting online statuses: {e}")
        
        # Add online status to each friend_info
        for friendship_data in response.data:
            friend_info = friendship_data.get('friend_info')
            if friend_info and 'user_id' in friend_info:
                friend_id = friend_info['user_id']
                friend_info['is_online'] = online_statuses.get(friend_id, False)
        
        return response

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
				user_2=u2,
				accepted=False,
			)
			fs.save()
			notifi = ImmediateNotification.objects.create(
				Sender="Users",
				message={
					'type': 'friend_request',
					'data': UserNotificationSerializer(u1).data
				},
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


class OnlineStatusView(APIView):
	"""
	Quick API endpoint to check online status of users.
	
	GET: Check online status of multiple users
	Query Parameters:
		user_ids: Comma-separated list of user IDs
		
	POST: Check online status of specific users
	Body:
		{
			"user_ids": [1, 2, 3]
		}
	"""
	permission_classes = (IsAuthenticatedUserProfile,)
	authentication_classes = [JWTAuth]
	
	def get(self, request):
		"""Check online status via query parameters"""
		user_ids_str = request.query_params.get('user_ids', '')
		if not user_ids_str:
			return Response({'error': 'user_ids parameter required'}, status=400)
		
		try:
			user_ids = [int(uid.strip()) for uid in user_ids_str.split(',') if uid.strip()]
			online_statuses = online_status_service.get_multiple_users_online_status(user_ids)
			
			return Response({
				'online_statuses': online_statuses,
				'total_online': sum(1 for status in online_statuses.values() if status)
			})
		except ValueError:
			return Response({'error': 'Invalid user_ids format'}, status=400)
	
	def post(self, request):
		"""Check online status via POST body"""
		user_ids = request.data.get('user_ids', [])
		if not user_ids:
			return Response({'error': 'user_ids required'}, status=400)
		
		online_statuses = online_status_service.get_multiple_users_online_status(user_ids)
		
		return Response({
			'online_statuses': online_statuses,
			'total_online': sum(1 for status in online_statuses.values() if status)
		})

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
					message={ 'type': 'friend_request_accepted', 'data': UserNotificationSerializer(u2).data },
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
							message={
									'type': 'friendship_deleted',
									'data': UserNotificationSerializer(u1).data
							},
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

			# Create the avatar object first to use the upload_to function
			avatar = Avatars(
				user=user, 
				name=avatar_name,
				is_current=True
			)
			
			# Save the image using Django's ImageField
			avatar.image = image
			avatar.save()
			
			return Response({
				'message': 'Avatar uploaded successfully', 
				'avatar': avatar.get_image_url(),
				'avatar_id': avatar.id
			}, status=status.HTTP_200_OK)
			
		except Exception as e:
			return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
		
	def get(self, request):
		avatar_id = request.query_params.get('avatar_id')
		if avatar_id:
			avatar = get_object_or_404(Avatars, id=avatar_id)
			serializer = AvatarsSerializer(avatar)
			return Response(serializer.data, status=status.HTTP_200_OK)
		else:
			# Return all avatars for the user
			avatars = Avatars.objects.filter(user=request.user)
			serializer = AvatarsSerializer(avatars, many=True)
			return Response(serializer.data, status=status.HTTP_200_OK)
	
	def delete(self, request):
		"""Delete an avatar"""
		try:
			avatar_id = request.data.get('avatar_id')
			if not avatar_id:
				return Response({'error': 'avatar_id is required'}, status=status.HTTP_400_BAD_REQUEST)
			
			avatar = get_object_or_404(Avatars, id=avatar_id, user=request.user)
			
			# If this was the current avatar, we need to handle that
			was_current = avatar.is_current
			
			# Delete the avatar (this will also delete the file due to our model's delete method)
			avatar.delete()
			
			# If this was the current avatar, set a default or another avatar as current
			if was_current:
				# Try to find another avatar to set as current
				other_avatar = Avatars.objects.filter(user=request.user).first()
				if other_avatar:
					other_avatar.is_current = True
					other_avatar.save()
				else:
					# Reset to default avatar URL
					request.user.current_avatar_url = 'https://drive.google.com/file/d/1MDi_OPO_HtWyKTmI_35GQ4KjA7uh0Z9U/view?usp=drive_link'
					request.user.save(update_fields=['current_avatar_url'])
			
			return Response({'message': 'Avatar deleted successfully'}, status=status.HTTP_200_OK)
			
		except Exception as e:
			return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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