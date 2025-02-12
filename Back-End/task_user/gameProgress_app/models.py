from django.db import models
from django.conf import settings
from user_app.models import Users

# Create your models here.

class Tournament(models.Model):
	id = models.AutoField(primary_key=True)
	name = models.CharField(max_length=255)
	begin_date = models.DateTimeField(auto_now_add=True)
	level_required = models.IntegerField(min_value=0)
	partecipants = models.ManyToManyField(Users, related_name='players', null=True)
	max_partecipants = models.IntegerField(min_value=4)
	winner = models.ForeignKey(Users, on_delete=models.CASCADE, related_name='winner', null=True)

class Game(models.Model):
	id = models.AutoField(primary_key=True)
	player_1 = models.ForeignKey(Users, on_delete=models.CASCADE, related_name='p1')
	player_2 = models.ForeignKey(Users, on_delete=models.CASCADE, null=True, related_name='p2')
	player_1_score = models.IntegerField(min_value=0, default=0)
	player_2_score = models.IntegerField(min_value=0, default=0)
	begin_date = models.DateTimeField(auto_now_add=True)
	tournament_id = models.ForeignKey(Tournament, on_delete=models.CASCADE, related_name='game', null=True)
