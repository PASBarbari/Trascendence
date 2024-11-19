from django.http import HttpRequest, HttpResponse
import requests
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .models import ChatRoom, UserProfile, ChatMessage
from django.contrib.auth.models import AnonymousUser
from .serializers import chat_roomSerializer, chat_messageSerializer, userSerializer
from rest_framework import generics
from notification import *
from chat.settings import Notification_url

class GetChatMessage(generics.ListAPIView):
    serializer_class = chat_messageSerializer
    lookup_url_kwarg = 'room_id'

    def get_queryset(self):
        room_id = self.kwargs.get(self.lookup_url_kwarg)
        # user = self.request.user

        # if isinstance(user, AnonymousUser):
        #     raise ValueError('User is not authenticated')

        # if not ChatRoom.objects.filter(room_id=room_id, users=user).exists():
        #     raise ValueError('User is not in the room')
        #     return ChatMessage.objects.none()

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
            return ChatRoom.objects.none()

        return ChatRoom.objects.filter(room_id=room_id)

class new_user(APIView):
    def post(self, request):
        serializer = userSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class CreateChat(generics.CreateAPIView):
    serializer_class = chat_roomSerializer
    queryset = ChatRoom.objects.all()

class GetChats(generics.ListAPIView):
    serializer_class = chat_roomSerializer
    
    def get_queryset(self):
        user = self.request.user
        if isinstance(user, AnonymousUser):
            return ChatRoom.objects.none()
        return ChatRoom.objects.filter(users=user)
    
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
            return Response({'error': 'No valid users found'}, status=status.HTTP_400_BAD_REQUEST)

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

class SendNotification(APIView):
	def SendImmidiateNotification(**kwargs):
		notification = ImmediateNotification.objects.create(
			user_id=kwargs.get('user_id'),
			group_id=kwargs.get('group_id'),
			Type = kwargs.get('Type'),
			message=kwargs.get('message'),
			is_read=kwargs.get('is_read'),
			creation_time=kwargs.get('creation_time')
		)
		notification_request = HttpRequest()
		notification_request.method = 'POST'
		notification_request.POST = notification