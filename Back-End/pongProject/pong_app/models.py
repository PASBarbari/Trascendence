from django.db import models
from django.conf import settings

# Create your models here.


class Tournament(models.Model):
	id = models.AutoField(primary_key=True)
	name = models.CharField(max_length=255)
	begin_date = models.DateTimeField(auto_now_add=True)
	level_required = models.IntegerField()
	partecipants = models.IntegerField(default=0)
	max_partecipants = models.IntegerField()
	winner = models.ForeignKey('UserProfile', on_delete=models.SET_NULL, related_name='winner', null=True)
	creator = models.ForeignKey('UserProfile', on_delete=models.SET_NULL, related_name='creator', null=True)

class UserProfile(models.Model):
	user_id = models.IntegerField(primary_key=True)
	username = models.CharField(max_length=255)
	email = models.EmailField()
	tournaments = models.ManyToManyField(Tournament, related_name='player', blank=True)

class Game(models.Model):
	id = models.AutoField(primary_key=True)
	player_1 = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name='player_1', null=True)
	player_2 = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name='player_2', null=True)
	player_1_score = models.IntegerField(default=0)
	player_2_score = models.IntegerField(default=0)
	begin_date = models.DateTimeField(auto_now_add=True)
	tournament_id = models.ForeignKey(Tournament, on_delete=models.CASCADE, related_name='game', null=True)
