from rest_framework import serializers
from .models import *
import datetime


class PlayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = '__all__'

class GamesSerializer(serializers.ModelSerializer):
    def validate(self, data):
        if data['player_1'] == data['player_2']:
            raise serializers.ValidationError('player_1 and player_2 cannot be the same')
        return data
    class Meta:
        model = Game
        fields = '__all__'

class gamesCreateSerializer(serializers.ModelSerializer):
    def validate(self, data):
        if data['player_1'] == data['player_2']:
            raise serializers.ValidationError('player_1 and player_2 cannot be the same')
        return data
    class Meta:
        model = Game
        fields = [
			'player_1',
			'player_2',
			'tournament_id'
		]

class TournamentSerializer(serializers.ModelSerializer):
    name = serializers.CharField(max_length=255)
    begin_date = serializers.DateTimeField(read_only=True, default=datetime.datetime.now)
    level_required = serializers.IntegerField(min_value=0)
    participants = serializers.IntegerField(min_value=0, default=0)
    max_participants = serializers.IntegerField(min_value=4)
    winner = serializers.IntegerField(min_value=0, default=0)

    def validate_name(self, value):
        if len(str(value)) < 1:
            raise serializers.ValidationError('name is not valid')
        return value
    
    def validate_participants(self, value):
        if value < 0:
            raise serializers.ValidationError('participants is not valid')
        return value

    class Meta:
        model = Tournament
        fields = '__all__'
        
class GameStateSerializer(serializers.Serializer):
    player_1_score = serializers.IntegerField()
    player_2_score = serializers.IntegerField()
    player_1_pos = serializers.ListField(child=serializers.IntegerField())
    player_2_pos = serializers.ListField(child=serializers.IntegerField())
    ball_pos = serializers.ListField(child=serializers.FloatField())
    ball_speed = serializers.FloatField()
    angle = serializers.FloatField()
    ring_length = serializers.IntegerField()
    ring_height = serializers.IntegerField()
    
class UserStatisticsSerializer(serializers.Serializer):
    """Simple serializer for user statistics response"""
    user_id = serializers.IntegerField()
    username = serializers.CharField()
    total_games = serializers.IntegerField()
    total_wins = serializers.IntegerField()
    total_losses = serializers.IntegerField()
    win_rate = serializers.FloatField()
    total_tournaments = serializers.IntegerField()
    total_tournament_wins = serializers.IntegerField()