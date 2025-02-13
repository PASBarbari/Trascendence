# praticamente quando un modello viene creato ricveve il segnale e fa quello che gli chiedi
import random
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Game
import logging
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import time, asyncio

ring_size = [160 , 90]
tick_rate = 30
class GameState:
	def __init__(self, player_1, player_2, game_id):
		self.game_id = game_id
		self.player_1 = player_1
		self.player_2 = player_2
		self.player_1_score = 0
		self.player_2_score = 0
		self.player1_pos = 0
		self.player2_pos = 0
		self.ball_pos = [0,0]
		self.ball_vel = [0,0]
  
	async def start(self):
		self.running = True
		tick_interval = 1 / tick_rate

		ball_vel = [random.choice([-1, 1]), random.choice([-1, 1])]

		while self.running:
			start_time = time.monotonic()
			
			await self.physics()

			await self.update()
			
			time.sleep(max(0, tick_interval - (time.monotonic() - start_time)))
			await asyncio.sleep(tick_interval)
	

	def physics(self):


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
  