from rest_framework import serializers
from .models import UserProfile, Avatars, Friendships
import datetime

class AvatarsSerializer(serializers.ModelSerializer):
	name = serializers.CharField(max_length=255)
	image = serializers.ImageField()

	class Meta:
		model = Avatars
		fields = '__all__'

class UsersSerializer(serializers.ModelSerializer):
	# staff = serializers.BooleanField(default=False)
	# first_name = serializers.CharField(max_length=255, default="")
	# last_name = serializers.CharField(max_length=255, default="")
	# birth_date = serializers.DateField(default=None)
	# bio = serializers.CharField(default="")
	# exp = serializers.IntegerField(default=0)
	# level = serializers.IntegerField(default=0)
	# # avatar = serializers.PrimaryKeyRelatedField(queryset=Avatars.objects.all(), many=False, default=Avatars.objects.get(id=1))
	# #TODO avatar = serializers.PrimaryKeyRelatedField(queryset=Avatars.objects.all(), many=False, default=Avatars.objects.get(id=1))
	# last_modified = serializers.DateTimeField(read_only=True)
    
	class Meta:
		model = UserProfile
		fields = '__all__'

class UserNotificationSerializer(serializers.ModelSerializer):
	"""Lightweight serializer for user data in notifications"""
	class Meta:
		model = UserProfile
		fields = ['user_id', 'username', 'first_name', 'last_name', 'current_avatar_url', 'level']

class FriendshipsSerializer(serializers.ModelSerializer):
		friend_info = serializers.SerializerMethodField()
		
		class Meta:
			model = Friendships
			fields = ['id', 'accepted', 'friend_info']

		def get_friend_info(self, obj):
			# Get the current user from context
			request = self.context.get('request')
			if not request or not request.user:
				return None
			current_user = request.user
			
			# Determine who is the friend (not the current user)
			if obj.user_1 == current_user:
				friend = obj.user_2
			else:
				friend = obj.user_1
			
			data = {
				'user_id': friend.user_id,
				'username': friend.username,
				'email': friend.email,
				'sent_by': UsersSerializer(obj.user_1).data
			}

			return data

class BlockUserSerializer(serializers.Serializer):
	user_id = serializers.IntegerField()

	class Meta:
		fields = ['user_id']
