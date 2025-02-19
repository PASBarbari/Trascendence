from rest_framework import serializers
from .models import *
import datetime

class PlayerSerializer(serializers.ModelSerializer):
    # def validate_username(self, value):
    #     if len(str(value)) < 1:
    #         raise serializers.ValidationError('username is not valid')
    #     return value
    
    class Meta:
        model = Player
        fields = '__all__'

class GamesSerializer(serializers.ModelSerializer):
    # player_1 = serializers.PrimaryKeyRelatedField(queryset=Player.objects.all())
    # player_2 = serializers.PrimaryKeyRelatedField(queryset=Player.objects.all(), required=False)
    # player_1_score = serializers.IntegerField(min_value=0, default=0)
    # player_2_score = serializers.IntegerField(min_value=0, default=0)
    # begin_date = serializers.DateTimeField(read_only=True, default=datetime.datetime.now)
    # tournament_id = serializers.PrimaryKeyRelatedField(queryset=Tournament.objects.all(), required=False)
    
    def validate(self, data):
        if data['player_1'] == data['player_2']:
            raise serializers.ValidationError('player_1 and player_2 cannot be the same')
        return data
    class Meta:
        model = Game
        fields = '__all__'

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