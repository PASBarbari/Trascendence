from django.db import models
from django.conf import settings

# Create your models here.


class Tournament(models.Model):
	id = models.AutoField(primary_key=True)
	name = models.CharField(max_length=255)
	begin_date = models.DateTimeField(auto_now_add=True)
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
	
	@property
	def winner(self):
		"""Return the winner of the game based on scores"""
		if self.player_1_score > self.player_2_score:
			return self.player_1
		elif self.player_2_score > self.player_1_score:
			return self.player_2
		else:
			return None  # Tie or no scores yet
	
	@property
	def winner_id(self):
		"""Return the winner's user_id"""
		winner = self.winner
		return winner.user_id if winner else None
	
	@property
	def loser(self):
		"""Return the loser of the game based on scores"""
		if self.player_1_score > self.player_2_score:
			return self.player_2
		elif self.player_2_score > self.player_1_score:
			return self.player_1
		else:
			return None  # Tie or no scores yet
	
	@property
	def loser_id(self):
		"""Return the loser's user_id"""
		loser = self.loser
		return loser.user_id if loser else None
	
	@property
	def status(self):
		"""Return the current status of the game"""
		if self.player_1_score == 0 and self.player_2_score == 0:
			return 'pending'
		elif self.player_1_score < 5 and self.player_2_score < 5:
			return 'active'
		else:
			return 'completed'
