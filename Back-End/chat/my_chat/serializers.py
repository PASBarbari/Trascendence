from rest_framework import serializers
from .models import ChatRoom, ChatMessage, UserProfile

class userSerializer(serializers.ModelSerializer):
	class Meta:
		model = UserProfile
		fields = '__all__'


class chat_roomSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatRoom
        fields = ['room_id', 'room_name', 'room_description', 'creator', 'users']
	
class chat_messageSerializer(serializers.ModelSerializer):
	message_id = serializers.IntegerField()
	room_id = serializers.PrimaryKeyRelatedField(queryset=ChatRoom.objects.all())
	message = serializers.CharField()
	sender = serializers.PrimaryKeyRelatedField(queryset=UserProfile.objects.all())
	timestamp = serializers.DateTimeField()
	class Meta:
		model = ChatMessage
		fields = '__all__'
