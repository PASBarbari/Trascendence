from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions
from django_filters.rest_framework import DjangoFilterBackend
from django.http import HttpResponse, JsonResponse
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .models import ChatRoom, UserProfile, ChatMessage
from django.contrib.auth.models import AnonymousUser
from .serializers import chat_roomSerializer, chat_messageSerializer, userSerializer, userBlockedSerializer, userCreateSerializer
from .middleware import ServiceAuthentication, JWTAuthMiddleware , JWTAuth
from .authentications import TokenAuthentication
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
from rest_framework_simplejwt.authentication import JWTAuthentication
import logging
from .Permissions import ChatRoomPermissions , IsAuthenticatedUserProfile , IsOwnUserProfile
from django.views.decorators.csrf import csrf_exempt
from functools import wraps

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


class GetChatInfo(generics.RetrieveAPIView):
	serializer_class = chat_roomSerializer
	lookup_url_kwarg = 'room_id'

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
