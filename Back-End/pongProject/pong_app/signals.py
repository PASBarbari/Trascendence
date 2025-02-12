# praticamente quando un modello viene creato ricveve il segnale e fa quello che gli chiedi
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Game
import logging
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

#TODO implementa i logging schiavo, e' un solo file e' facile

class GameState:
	def __init__(self, player1_id, player2_id, game_id, player1_pos, player2_pos, ball_pos):
		self.game_id = game_id
		self.player1 = {"id": player1_id, "score": 0, "x": 0, "y": 0}
		self.player2 = {"id": player2_id, "score": 0, "x": 0, "y": 0}
		self.ball_pos = ball_pos
  
	def movement(self, player, dir, player_speed):
		if player == self.player1.id:
			self.player1.y += player_speed * dir
		else:
			self.player2.y += player_speed * dir
    
	def update(self):
		channel_layer = get_channel_layer()
		try:
			async_to_sync(channel_layer.group_send)(
				f'game_{self.game_id}',
				{
					'type': 'game_state',
					'game_state': self.__dict__
				}
			)
		except Exception as e:
			print(f"Error sending game state: {e}") #TODO logg

@receiver(post_save, sender=Game)
def start_game(sender, instance, created, **kwargs):
	if created:
		game_state = GameState(instance.player_1, instance.player_2)
		instance.game_state = game_state
		instance.save()
		logger = logging.getLogger(__name__)
		logger.info(f'Game started: {instance}')
	else:
		logger = logging.getLogger(__name__)
		logger.info(f'Game already started: {instance}')
  