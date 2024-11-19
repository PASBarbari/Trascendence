from rest_framework import serializers
from .models import Users, Avatars, Friendships
import datetime

class AvatarsSerializer(serializers.ModelSerializer):
	name = serializers.CharField(max_length=255)
	image = serializers.ImageField()

	class Meta:
		model = Avatars
		fields = '__all__'

class UsersSerializer(serializers.ModelSerializer):
	staff = serializers.BooleanField(default=False)
	account_id = serializers.IntegerField()
	first_name = serializers.CharField(max_length=255)
	last_name = serializers.CharField(max_length=255)
	birth_date = serializers.DateField()
	bio = serializers.CharField(default="")
	exp = serializers.IntegerField(default=0)
	level = serializers.IntegerField(default=0)
	avatar = serializers.PrimaryKeyRelatedField(queryset=Avatars.objects.all(), many=False)
	last_modified = serializers.DateTimeField(read_only=True)
    
	class Meta:
		model = Users
		fields = '__all__'


class FriendshipsSerializer(serializers.ModelSerializer):
	user_1 = serializers.PrimaryKeyRelatedField(queryset=Users.objects.all(), many=False)
	user_2 = serializers.PrimaryKeyRelatedField(queryset=Users.objects.all(), many=False)
	accepted = serializers.BooleanField(read_only=True)
	last_modified = serializers.DateTimeField(read_only=True)

	class Meta:
		model = Friendships
		fields = '__all__'
