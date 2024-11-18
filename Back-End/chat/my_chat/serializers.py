from rest_framework import serializers
from .models import ChatRoom, ChatMessage, UserProfile

class userSerializer(serializers.ModelSerializer):
	class Meta:
		model = UserProfile
		fields = '__all__'


class chat_roomSerializer(serializers.ModelSerializer):
	room_id = serializers.IntegerField(required=False)
	room_name = serializers.CharField(max_length=100)
	room_description = serializers.CharField()
	users = serializers.PrimaryKeyRelatedField(many=True, read_only=True)
	starttime = serializers.DateTimeField(required=False)
	creator = serializers.PrimaryKeyRelatedField(queryset=UserProfile.objects.all())

#	def validate_room_name(self, value):	
#		if len(value) < 3:
#			raise serializers.ValidationError("Room name must be at least 3 characters long")
#		return value

	def validate_users(self, value):
		if len(value) < 1:
			raise serializers.ValidationError("Number of users must be at least 1")
	class Meta:
		model = ChatRoom
		fields = '__all__'

	def number_of_users(self):
		return self.users.count()

class chat_messageSerializer(serializers.ModelSerializer):
	message_id = serializers.IntegerField()
	room_id = serializers.PrimaryKeyRelatedField(queryset=ChatRoom.objects.all())
	message = serializers.CharField()
	sender = serializers.PrimaryKeyRelatedField(queryset=UserProfile.objects.all())
	timestamp = serializers.DateTimeField()
	class Meta:
		model = ChatMessage
		fields = '__all__'
