from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions
from django_filters.rest_framework import DjangoFilterBackend
from django.http import HttpResponse, JsonResponse
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .models import ChatRoom, UserProfile, ChatMessage, ChatMember
from django.contrib.auth.models import AnonymousUser
from .serializers import chat_roomSerializer, chat_messageSerializer, userSerializer, userBlockedSerializer, userCreateSerializer
from .middleware import ServiceAuthentication, JWTAuthMiddleware , JWTAuth
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
from rest_framework_simplejwt.authentication import JWTAuthentication
import logging
from .Permissions import ChatRoomPermissions , IsAuthenticatedUserProfile , IsOwnUserProfile
from django.views.decorators.csrf import csrf_exempt
from functools import wraps
from rest_framework.parsers import MultiPartParser, FormParser
from django.core.files.storage import default_storage
import os

logger = logging.getLogger('django')


def post_api_view(func):
	@wraps(func)
	def wrapper(self, request, *args, **kwargs):
		logger.info(f"POST API called: {func.__name__} by user {getattr(request.user, 'username', 'Anonymous')}")
		return func(self, request, *args, **kwargs)
	return wrapper

class GetChatMessage(generics.ListAPIView):
	"""
	API endpoint that allows users to be viewed or edited.

	get:
	Return a list of all messages in a chat room.

	Parameters:
	- room_id: the id of the chat room

	Response:
	- 200 OK: if the request is successful
	- 400 Bad Request: if the request is invalid
	"""
	serializer_class = chat_messageSerializer
	lookup_url_kwarg = 'room_id'
	authentication_classes = [JWTAuth]
	# permission_classes = [ChatRoomPermissions] TODO: samu fai le permissioni
	permission_classes = (IsAuthenticatedUserProfile,)

	def get_queryset(self):
		try:
			room_id = self.kwargs.get(self.lookup_url_kwarg)
			logger.info(f"GetChatMessage: Attempting to get messages for room_id={room_id}")
			if not room_id:
				logger.error("Missing room_id parameter in request")
				return ChatMessage.objects.none()
				
			user = self.request.user
			
			# First verify the user is a member of this room
			if isinstance(user, AnonymousUser) or not hasattr(user, 'user_id'):
				logger.warning("Unauthenticated user attempted to access chat messages")
				return ChatMessage.objects.none()
				
			# Check membership directly in the view
			room_exists = ChatRoom.objects.filter(
				room_id=room_id,
				users__user_id=user.user_id
			).exists()
			
			if not room_exists:
				logger.warning(f"User {user} attempted to access messages in room {room_id} but is not a member")
				return ChatMessage.objects.none()
				
			# Get user's blocked users
			try:
				user_profile = UserProfile.objects.get(user_id=user.user_id)
				blocked_user_ids = list(user_profile.blockedUsers.values_list('user_id', flat=True))
			except UserProfile.DoesNotExist:
				blocked_user_ids = []
			
			# User is a member, return messages excluding blocked users
			messages = ChatMessage.objects.filter(room__room_id=room_id).exclude(sender__user_id__in=blocked_user_ids)
			logger.info(f"Found {messages.count()} messages in room {room_id} (excluding blocked users)")
			return messages
			
		except Exception as e:
			import traceback
			logger.error(f"ERROR in get_queryset: {str(e)}\n{traceback.format_exc()}")
			return ChatMessage.objects.none()
			
	# def list(self, request, *args, **kwargs):
	# 	try:
	# 		# Use parent implementation but catch any exceptions
	# 		return super().list(request, *args, **kwargs)
	# 	except Exception as e:
	# 		logger.error(f"Error listing chat messages: {str(e)}")
	# 		# Return empty list on error
	# 		return Response([], status=status.HTTP_200_OK)


class GetChatInfo(generics.RetrieveUpdateDestroyAPIView):
	serializer_class = chat_roomSerializer
	lookup_url_kwarg = 'room_id'
	lookup_field = 'room_id'
	authentication_classes = [JWTAuth]
	permission_classes = (IsAuthenticatedUserProfile,)

	def get_queryset(self):
		room_id = self.kwargs.get(self.lookup_url_kwarg)
		user = self.request.user

		if isinstance(user, AnonymousUser):
			raise ValueError('User is not authenticated')

		if not ChatRoom.objects.filter(room_id=room_id, users=user).exists():
			raise ValueError('User is not in the room')

		return ChatRoom.objects.filter(room_id=room_id)

class new_user(generics.ListCreateAPIView):
	serializer_class = userCreateSerializer
	queryset = UserProfile.objects.all()

	def get_permissions(self):
		if self.request.method == 'POST':
			self.permission_classes = []  # No need for permissions as authentication will handle it
			self.authentication_classes = [ServiceAuthentication]
		else:
			self.permission_classes = (IsAuthenticatedUserProfile,)
			self.authentication_classes = (JWTAuthentication,)
		return super().get_permissions()
		
	def perform_create(self, serializer):
		# You can add additional logging for audit purposes
		# logger.info(f"Creating new user from service: {self.request.headers.get('User-Agent')}")
		return serializer.save()

class CreateChat(generics.ListCreateAPIView):
	authentication_classes = [JWTAuth]
	permission_classes = (IsAuthenticatedUserProfile,)
	serializer_class = chat_roomSerializer
	queryset = ChatRoom.objects.all()
	
	def perform_create(self, serializer):
		"""Override to add bidirectional blocking checks when creating chats"""
		creator = self.request.user
		user_ids = self.request.data.get('users', [])
		
		# Get creator's user profile
		try:
			creator_profile = UserProfile.objects.get(user_id=creator.user_id)
			blocked_user_ids = list(creator_profile.blockedUsers.values_list('user_id', flat=True))
			
			# Filter out users that the creator has blocked
			filtered_user_ids = [uid for uid in user_ids if uid not in blocked_user_ids]
			
			if len(filtered_user_ids) != len(user_ids):
				logger.warning(f"User {creator.user_id} attempted to create chat with blocked users. Filtered {len(user_ids) - len(filtered_user_ids)} blocked users.")
			
			# Also check if any of the remaining users have blocked the creator
			users_to_add = UserProfile.objects.filter(user_id__in=filtered_user_ids)
			final_user_ids = []
			
			for user_to_add in users_to_add:
				# Check if user_to_add has blocked the creator
				if not user_to_add.blockedUsers.filter(user_id=creator.user_id).exists():
					final_user_ids.append(user_to_add.user_id)
				else:
					logger.warning(f"User {user_to_add.user_id} has blocked creator {creator.user_id}, cannot add to chat")
			
			# Update the serializer data with final filtered users
			mutable_data = self.request.data.copy()
			mutable_data['users'] = final_user_ids
			serializer.validated_data['users'] = final_user_ids
			
		except UserProfile.DoesNotExist:
			logger.error(f"Creator profile not found for user {creator.user_id}")
		except Exception as e:
			logger.error(f"Error checking blocked users in CreateChat: {str(e)}")
		
		return serializer.save()

class GetChats(generics.ListAPIView):
    serializer_class = chat_roomSerializer
    permission_classes = (IsAuthenticatedUserProfile,)
    authentication_classes = [JWTAuth]
    
    def get_queryset(self):
        user = self.request.user
        
        # Gestione sicura di utenti non autenticati
        if isinstance(user, AnonymousUser) or not hasattr(user, 'user_id'):
            logger.warning("Unauthenticated user attempted to access chats")
            return ChatRoom.objects.none()
        
        # Log per debugging
        logger.info(f"Retrieving chats for user: {user.user_id} ({getattr(user, 'username', 'unknown')})")
        
        try:
            # Get user's blocked users
            try:
                user_profile = UserProfile.objects.get(user_id=user.user_id)
                blocked_user_ids = list(user_profile.blockedUsers.values_list('user_id', flat=True))
            except UserProfile.DoesNotExist:
                blocked_user_ids = []
            
            # Get chats where user is a member
            user_chats = ChatRoom.objects.filter(users__user_id=user.user_id)
            
            # Filter out chats that contain only blocked users (excluding the current user)
            filtered_chats = []
            for chat in user_chats:
                # Get all users in this chat except the current user
                other_users = chat.users.exclude(user_id=user.user_id)
                # Check if there are any non-blocked users in the chat
                non_blocked_users = other_users.exclude(user_id__in=blocked_user_ids)
                
                # Include the chat if:
                # 1. It has non-blocked users, OR
                # 2. It's a single-user chat (only the current user)
                if non_blocked_users.exists() or not other_users.exists():
                    filtered_chats.append(chat.room_id)
            
            return ChatRoom.objects.filter(room_id__in=filtered_chats)
            
        except Exception as e:
            logger.error(f"Error retrieving chats for user {user.user_id}: {str(e)}")
            return ChatRoom.objects.none()

class AddUsersToChat(generics.UpdateAPIView):
	serializer_class = chat_roomSerializer
	lookup_url_kwarg = 'room_id'

	def get_queryset(self):
		room_id = self.kwargs.get(self.lookup_url_kwarg)
		user = self.request.user

		if isinstance(user, AnonymousUser):
			raise ValueError('User is not authenticated')

		if not ChatRoom.objects.filter(room_id=room_id, users=user).exists():
			raise ValueError('User is not in the room')
			return ChatRoom.objects.none()

		return ChatRoom.objects.filter(room_id=room_id)
	
	def perform_update(self, serializer):
		"""Override to add blocking checks when adding users to existing chats"""
		user = self.request.user
		user_ids = self.request.data.get('users', [])
		
		# Get current user's blocked users
		try:
			user_profile = UserProfile.objects.get(user_id=user.user_id)
			blocked_user_ids = list(user_profile.blockedUsers.values_list('user_id', flat=True))
			
			# Filter out blocked users from the user_ids list
			filtered_user_ids = [uid for uid in user_ids if uid not in blocked_user_ids]
			
			if len(filtered_user_ids) != len(user_ids):
				logger.warning(f"User {user.user_id} attempted to add blocked users to chat. Filtered {len(user_ids) - len(filtered_user_ids)} blocked users.")
			
			# Also check if any of the users to be added have blocked the current user
			users_to_add = UserProfile.objects.filter(user_id__in=filtered_user_ids)
			final_user_ids = []
			
			for user_to_add in users_to_add:
				# Check if user_to_add has blocked the current user
				if not user_to_add.blockedUsers.filter(user_id=user.user_id).exists():
					final_user_ids.append(user_to_add.user_id)
				else:
					logger.warning(f"User {user_to_add.user_id} has blocked {user.user_id}, cannot add to chat")
			
			# Update the serializer data with final filtered users
			mutable_data = self.request.data.copy()
			mutable_data['users'] = final_user_ids
			serializer.validated_data['users'] = final_user_ids
			
		except UserProfile.DoesNotExist:
			logger.error(f"User profile not found for user {user.user_id}")
		except Exception as e:
			logger.error(f"Error checking blocked users in AddUsersToChat: {str(e)}")
		
		return serializer.save()

class DownloadChatRoomData(APIView):
	def get(self, request):
		with open('random_chats_data.csv', 'r') as file:
			data = file.read()
		if not data:
			return Response({'error': 'No data found'}, status=status.HTTP_404_NOT_FOUND)
		headers = {
			'Content-Type': 'text/csv',
			'Content-Disposition': 'attachment; filename=random_chats_data.csv'
		}
		response = HttpResponse(data, headers)
		return Response(response, status=status.HTTP_200_OK)

class DownloadSimilaritiesData(APIView):
	def get(self, request):
		with open('similarities_data.csv', 'r') as file:
			data = file.read()
		if not data:
			return Response({'error': 'No data found'}, status=status.HTTP_404_NOT_FOUND)
		headers = {
			'Content-Type': 'text/csv',
			'Content-Disposition': 'attachment; filename=similarities_data.csv'
		}
		response = HttpResponse(data, headers)
		return Response(response, status=status.HTTP_200_OK)

class BlockUser(APIView):
	"""
	API endpoint to block a user

	post:
		Blocks a user

		Parameters:
		- user_id: the id of the user to block

		Response:
		- 200 OK: if the request is successful
		- 400 Bad Request: if the request is invalid
	delete:
		Unblocks a user

		Parameters:
		- user_id: the id of the user to unblock

		Response:
		- 200 OK: if the request is successful
		- 400 Bad Request: if the request is invalid
	"""
	authentication_classes = [JWTAuth]
	permission_classes = (IsAuthenticatedUserProfile,)
	def post(self, request, *args, **kwargs):
		try:
			#get the user id for url
			user_id = self.kwargs.get('user_id')

			if not user_id:
				return Response({'error': 'user_id is required'}, status=status.HTTP_400_BAD_REQUEST)
			toBlock = get_object_or_404(UserProfile, user_id=user_id)
			user = request.user
			
			user.blockedUsers.add(toBlock)
			user.save()
			return Response({'message': f'User {toBlock.username} blocked successfully'}, status=status.HTTP_200_OK)

		except UserProfile.DoesNotExist:
			return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
		except Exception as e:
			logger.error(f"Error retrieving user: {str(e)}")
			return Response({'error': 'An error occurred while retrieving the user'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
	

	def delete(self, request, *args, **kwargs):
		try:
			#get the user id for url
			user_id = self.kwargs.get('user_id')

			if not user_id:
				return Response({'error': 'user_id is required'}, status=status.HTTP_400_BAD_REQUEST)
			toUnblock = get_object_or_404(UserProfile, user_id=user_id)
			user = request.user
			if toUnblock not in user.blockedUsers.all():
				return Response({'error': 'User is not blocked'}, status=status.HTTP_400_BAD_REQUEST)
			# Remove the user from the blocked list
			user.blockedUsers.remove(toUnblock)
			user.save()
			return Response({'message': f'User {toUnblock.username} unblocked successfully'}, status=status.HTTP_200_OK)

		except UserProfile.DoesNotExist:
			return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
		except Exception as e:
			logger.error(f"Error retrieving user: {str(e)}")
			return Response({'error': 'An error occurred while retrieving the user'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
	
	def get(self, request):
		user = request.user
		if not user.is_authenticated:
			return Response({'error': 'User is not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)

		blocked_users = user.blockedUsers.all()
		if not blocked_users:
			return Response({'message': 'No blocked users found'}, status=status.HTTP_404_NOT_FOUND)
		blocked_users = userBlockedSerializer(blocked_users, many=True).data
		# Return the list of blocked users
		return Response({'blocked_users': blocked_users}, status=status.HTTP_200_OK)


class allBlockedUsers(generics.ListAPIView):
	"""
	API endpoint to get all blocked users

	get:
		Retrieves a list of all blocked users for the authenticated user

	Response:
	- 200 OK: if the request is successful
	- 401 Unauthorized: if the user is not authenticated
	"""
	authentication_classes = [JWTAuth]
	permission_classes = (IsAuthenticatedUserProfile,)
	serializer_class = userBlockedSerializer

	def get_queryset(self):
		user = self.request.user
		return user.blockedUsers.all() if user.is_authenticated else UserProfile.objects.none()

class ChatMediaUpload(APIView):
	"""
	Upload media files (images, videos, files) for chat messages.
	Similar to AvatarManager but for chat media uploads.
	
	POST: Upload a media file and create a chat message
	Parameters:
		- room_id (int): The ID of the chat room
		- media_type (str): Type of media ('image', 'video', 'file')
		- file: The media file to upload
		- message (str, optional): Additional text message
	
	Returns:
		200 OK: Media uploaded successfully with message details
		400 Bad Request: Invalid request data or file type
		403 Forbidden: User not authorized to post in this room
		404 Not Found: Chat room not found
	"""
	authentication_classes = [JWTAuth]
	permission_classes = (IsAuthenticatedUserProfile,)
	parser_classes = (MultiPartParser, FormParser)
	
	def post(self, request):
		try:
			room_id = request.data.get('room_id')
			media_type = request.data.get('media_type')
			uploaded_file = request.FILES.get('file')
			message_text = request.data.get('message', '')
			
			# Validate required fields
			if not room_id:
				return Response({'error': 'room_id is required'}, status=status.HTTP_400_BAD_REQUEST)
			if not media_type:
				return Response({'error': 'media_type is required'}, status=status.HTTP_400_BAD_REQUEST)
			if not uploaded_file:
				return Response({'error': 'file is required'}, status=status.HTTP_400_BAD_REQUEST)
			if media_type not in ['image', 'video', 'file']:
				return Response({'error': 'media_type must be image, video, or file'}, status=status.HTTP_400_BAD_REQUEST)
			
			# Check if user is member of the chat room
			user = request.user
			try:
				chat_room = ChatRoom.objects.get(room_id=room_id)
				if not chat_room.users.filter(user_id=user.user_id).exists():
					return Response({'error': 'You are not a member of this chat room'}, status=status.HTTP_403_FORBIDDEN)
			except ChatRoom.DoesNotExist:
				return Response({'error': 'Chat room not found'}, status=status.HTTP_404_NOT_FOUND)
			
			# Validate file type and size based on media_type
			file_size = uploaded_file.size
			max_size = 10 * 1024 * 1024  # 10MB default
			
			if media_type == 'image':
				valid_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
				if uploaded_file.content_type not in valid_types:
					return Response({'error': 'Invalid image type. Allowed: JPEG, PNG, GIF, WebP'}, status=status.HTTP_400_BAD_REQUEST)
				max_size = 5 * 1024 * 1024  # 5MB for images
			elif media_type == 'video':
				valid_types = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime']
				if uploaded_file.content_type not in valid_types:
					return Response({'error': 'Invalid video type. Allowed: MP4, WebM, OGG, MOV'}, status=status.HTTP_400_BAD_REQUEST)
				max_size = 50 * 1024 * 1024  # 50MB for videos
			elif media_type == 'file':
				# Allow most common file types but exclude potentially dangerous ones
				blocked_types = ['application/x-executable', 'application/x-msdownload', 'application/x-dosexec']
				if uploaded_file.content_type in blocked_types:
					return Response({'error': 'File type not allowed for security reasons'}, status=status.HTTP_400_BAD_REQUEST)
				max_size = 20 * 1024 * 1024  # 20MB for general files
			
			if file_size > max_size:
				return Response({
					'error': f'File size too large. Maximum allowed: {max_size // (1024 * 1024)}MB'
				}, status=status.HTTP_400_BAD_REQUEST)
			
			# Create the chat message with the uploaded file
			chat_message = ChatMessage(
				room=chat_room,
				sender=user,
				message_type=media_type,
				message=message_text
			)
			
			# Set the appropriate field based on media type
			if media_type == 'image':
				chat_message.image = uploaded_file
			elif media_type == 'video':
				chat_message.video = uploaded_file
			elif media_type == 'file':
				chat_message.file = uploaded_file
			
			chat_message.save()
			
			# Send WebSocket notification to chat room members
			channel_layer = get_channel_layer()
			message_data = {
				'message_id': chat_message.message_id,
				'room_id': room_id,
				'sender_id': user.user_id,
				'sender_username': user.username,
				'message_type': media_type,
				'message': message_text,
				'content': chat_message.content,
				'timestamp': chat_message.timestamp.isoformat(),
			}
			
			async_to_sync(channel_layer.group_send)(
				f'chat_{room_id}',
				{
					'type': 'chat_message',
					'message': message_data
				}
			)
			
			return Response({
				'message': f'{media_type.capitalize()} uploaded successfully',
				'message_id': chat_message.message_id,
				'content_url': chat_message.content,
				'message_type': media_type
			}, status=status.HTTP_200_OK)
			
		except Exception as e:
			logger.error(f"Error uploading chat media: {str(e)}")
			return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
	
	def get(self, request):
		"""
		Get media file by message_id for download/viewing
		"""
		try:
			message_id = request.query_params.get('message_id')
			if not message_id:
				return Response({'error': 'message_id is required'}, status=status.HTTP_400_BAD_REQUEST)
			
			# Get the message and verify user has access
			try:
				chat_message = ChatMessage.objects.get(message_id=message_id)
				
				# Check if user is member of the chat room
				user = request.user
				if not chat_message.room.users.filter(user_id=user.user_id).exists():
					return Response({'error': 'You do not have access to this message'}, status=status.HTTP_403_FORBIDDEN)
				
				# Return the file URL
				file_url = chat_message.content
				if file_url:
					return Response({
						'message_id': message_id,
						'file_url': file_url,
						'message_type': chat_message.message_type,
						'filename': os.path.basename(file_url) if file_url else None
					}, status=status.HTTP_200_OK)
				else:
					return Response({'error': 'No media file found for this message'}, status=status.HTTP_404_NOT_FOUND)
					
			except ChatMessage.DoesNotExist:
				return Response({'error': 'Message not found'}, status=status.HTTP_404_NOT_FOUND)
				
		except Exception as e:
			logger.error(f"Error retrieving chat media: {str(e)}")
			return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ChatMediaManager(APIView):
	"""
	Media file management for chat messages - similar to AvatarManager pattern.
	
	GET: Retrieve media file information by message_id
	DELETE: Delete a media message (only by sender or room admin)
	"""
	authentication_classes = [JWTAuth]
	permission_classes = (IsAuthenticatedUserProfile,)
	
	def get(self, request):
		"""Get media file information and URL"""
		try:
			message_id = request.query_params.get('message_id')
			if not message_id:
				return Response({'error': 'message_id is required'}, status=status.HTTP_400_BAD_REQUEST)
			
			try:
				chat_message = ChatMessage.objects.get(message_id=message_id)
				
				# Check if user has access to this message
				user = request.user
				if not chat_message.room.users.filter(user_id=user.user_id).exists():
					return Response({'error': 'You do not have access to this message'}, status=status.HTTP_403_FORBIDDEN)
				
				# Check if this is a media message
				if chat_message.message_type not in ['image', 'video', 'file']:
					return Response({'error': 'This message does not contain media'}, status=status.HTTP_400_BAD_REQUEST)
				
				# Get file info
				file_field = None
				filename = None
				file_size = None
				
				if chat_message.message_type == 'image' and chat_message.image:
					file_field = chat_message.image
				elif chat_message.message_type == 'video' and chat_message.video:
					file_field = chat_message.video
				elif chat_message.message_type == 'file' and chat_message.file:
					file_field = chat_message.file
				
				if file_field:
					filename = os.path.basename(file_field.name)
					try:
						file_size = file_field.size
					except:
						file_size = None
				
				return Response({
					'message_id': message_id,
					'message_type': chat_message.message_type,
					'file_url': chat_message.content,
					'filename': filename,
					'file_size': file_size,
					'sender': chat_message.sender.username,
					'timestamp': chat_message.timestamp.isoformat(),
					'room_id': chat_message.room.room_id,
					'text_message': chat_message.message
				}, status=status.HTTP_200_OK)
				
			except ChatMessage.DoesNotExist:
				return Response({'error': 'Message not found'}, status=status.HTTP_404_NOT_FOUND)
				
		except Exception as e:
			logger.error(f"Error retrieving chat media info: {str(e)}")
			return Response({'error': 'An internal error occurred. Please contact support.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
	
	def delete(self, request):
		"""Delete a media message (only by sender or room admin)"""
		try:
			message_id = request.data.get('message_id')
			if not message_id:
				return Response({'error': 'message_id is required'}, status=status.HTTP_400_BAD_REQUEST)
			
			try:
				chat_message = ChatMessage.objects.get(message_id=message_id)
				user = request.user
				
				# Check if user has access to this message
				if not chat_message.room.users.filter(user_id=user.user_id).exists():
					return Response({'error': 'You do not have access to this message'}, status=status.HTTP_403_FORBIDDEN)
				
				# Check if user can delete this message (sender or room admin)
				is_sender = chat_message.sender.user_id == user.user_id
				is_admin = False
				
				try:
					member = ChatMember.objects.get(user=user, chat_room=chat_message.room)
					is_admin = member.role in ['admin', 'moderator']
				except ChatMember.DoesNotExist:
					pass
				
				if not (is_sender or is_admin):
					return Response({'error': 'You can only delete your own messages or you must be a room admin'}, status=status.HTTP_403_FORBIDDEN)
				
				# Store info before deletion
				room_id = chat_message.room.room_id
				deleted_message_id = chat_message.message_id
				
				# Delete the message (this will also delete the file due to Django's file field cleanup)
				chat_message.delete()
				
				# Send WebSocket notification about message deletion
				channel_layer = get_channel_layer()
				async_to_sync(channel_layer.group_send)(
					f'chat_{room_id}',
					{
						'type': 'message_deleted',
						'message': {
							'deleted_message_id': deleted_message_id,
							'deleted_by': user.username,
							'room_id': room_id
						}
					}
				)
				
				return Response({
					'message': 'Media message deleted successfully',
					'deleted_message_id': deleted_message_id
				}, status=status.HTTP_200_OK)
				
			except ChatMessage.DoesNotExist:
				return Response({'error': 'Message not found'}, status=status.HTTP_404_NOT_FOUND)
				
		except Exception as e:
			logger.error(f"Error deleting chat media: {str(e)}")
			return Response({'error': 'An internal error occurred. Please contact support.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)