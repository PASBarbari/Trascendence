from rest_framework import serializers
from .models import *
from user_app.models import Users
import datetime

class GamesSerializer(serializers.ModelSerializer):
	player_1 = serializers.PrimaryKeyRelatedField(queryset=Users.objects.all())
	player_2 = serializers.PrimaryKeyRelatedField(queryset=Users.objects.all(), required=False)
	player_1_score = serializers.IntegerField(min_value=0, default=0)
	player_2_score = serializers.IntegerField(min_value=0, default=0)
	begin_date = serializers.DateTimeField(read_only=True)
	tournament_id = serializers.PrimaryKeyRelatedField(queryset=Tournament.objects.all(), required=False)

	def validate_player_1_score(self, value):
		if int(value) < 0:
			raise serializers.ValidationError('player_1_score is not valid')
		return value
	
	def validate_player_2_score(self, value):
		if int(value) < 0:
			raise serializers.ValidationError('player_2_score is not valid')
		return value
	
	class Meta:
		model = Game
		fields = '__all__'

class TournamentSerializer(serializers.ModelSerializer):
	name = serializers.CharField(max_length=255)
	begin_date = serializers.DateTimeField(read_only=True)
	level_required = serializers.IntegerField(min_value=0)
	partecipants = serializers.PrimaryKeyRelatedField(queryset=Users.objects.all(), many=True, required=False)
	max_partecipants = serializers.IntegerField(min_value=4)
	winner = serializers.PrimaryKeyRelatedField(queryset=Users.objects.all(), required=False)

	def validate_name(self, value):
		if len(str(value)) < 1:
			raise serializers.ValidationError('name is not valid')
		return value
	
	class Meta:
		model = Tournament
		fields = '__all__'