from rest_framework import serializers
from .models import UserProfile, Avatars, Friendships
import datetime

class AvatarsSerializer(serializers.ModelSerializer):
	name = serializers.CharField(max_length=255)
	image = serializers.ImageField()
	image_url = serializers.SerializerMethodField()

	class Meta:
		model = Avatars
		fields = ['id', 'name', 'image', 'image_url', 'user', 'is_current', 'last_modified']
	
	def get_image_url(self, obj):
		"""Get the full URL for the image"""
		return obj.get_image_url()

class UsersSerializer(serializers.ModelSerializer):
	current_avatar = serializers.SerializerMethodField()
	
	class Meta:
		model = UserProfile
		fields = '__all__'
	
	def get_current_avatar(self, obj):
		"""Get the current avatar object for the user"""
		try:
			current_avatar = Avatars.objects.filter(user=obj, is_current=True).first()
			if current_avatar:
				return AvatarsSerializer(current_avatar).data
			return None
		except Exception:
			return None

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
