from rest_framework import generics, permissions
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.http import HttpResponse
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
from .Permissions import ChatRoomPermissions
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
	permission_classes = [ChatRoomPermissions]

	@swagger_auto_schema(
		manual_parameters=[
			openapi.Parameter('Authorization', openapi.IN_HEADER, description="OAuth2 Token", type=openapi.TYPE_STRING)
		]
	)
	def get_queryset(self):
		room_id = self.kwargs.get(self.lookup_url_kwarg)
		return ChatMessage.objects.filter(room_id=room_id)



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
            self.permission_classes = (permissions.IsAuthenticated,)
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
	permission_classes = [IsAuthenticated]
	filter_backends = [DjangoFilterBackend]
	filterset_fields = ['users__user_id']
	queryset = ChatRoom.objects.all()

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