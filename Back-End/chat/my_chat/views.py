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
from .serializers import chat_roomSerializer, chat_messageSerializer, userSerializer
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
				
			# User is a member, return messages (even if empty)
			messages = ChatMessage.objects.filter(room__room_id=room_id)
			logger.info(f"Found {messages.count()} messages in room {room_id}")
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
	serializer_class = userSerializer
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
	serializer_class = chat_roomSerializer
	queryset = ChatRoom.objects.all()

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
            # Filtraggio usando specificamente l'user_id invece dell'oggetto intero
            return ChatRoom.objects.filter(users__user_id=user.user_id)
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

class CreateChannelGroupView(APIView):
	def post(self, request, *args, **kwargs):
		room_id = request.data.get('room_id')
		user_ids = request.data.get('user_ids', [])

		if not room_id:
			return Response({'error': 'Room name is required'}, status=status.HTTP_400_BAD_REQUEST)

		try:
			room = ChatRoom.objects.get(room_id=room_id)
		except ChatRoom.DoesNotExist:
			return Response({'error': 'Room does not exist'}, status=status.HTTP_404_NOT_FOUND)

		users = UserProfile.objects.filter(user_id__in=user_ids)
		if not users.exists():
			return Response({'error': 'No valid users found with user_id: ' + user_ids}, status=status.HTTP_400_BAD_REQUEST)
	
		room.users.add(*users)
		room.save()

		channel_layer = get_channel_layer()
		group_name = f'chat_{room.room_name}'

		for user in users:
			async_to_sync(channel_layer.group_add)(
				group_name,
				f'user_{user.user_id}'
			)

		return Response({'message': 'Users added to group'}, status=status.HTTP_200_OK)

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

@csrf_exempt
def health_check(request):
	return JsonResponse({'status': 'ok'})