# praticamente quando un modello viene creato ricveve il segnale e fa quello che gli chiedi
import math
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
ball_radius = 2.5
player_width = 2.5
class GameState:
	def __init__(self, player_1, player_2, game_id, player_length):
		self.game_id = game_id
		self.player_1 = player_1
		self.player_2 = player_2
		self.player_1_score = 0
		self.player_2_score = 0
		self.player_1_pos = [0 , 0]
		self.player_2_pos = [0 , 0]
		self.ball_pos = [0 , 0]
		self.p_length = player_length if player_length else 10
		self.is_started = [0 , 0]
  
	async def start(self):
		self.running = True
		tick_interval = 1 / tick_rate

		if random.choice([True, False]):
			self.angle = random.uniform(70, -70)
		else:
			self.angle = random.uniform(110, 250)

		self.ball_speed = 90 / 150

		while self.running:
			start_time = time.monotonic()
			
			await self.physics()

			await self.update()
			
			if self.player_1_score == 5 or self.player_2_score == 5: #TODO add different games scores
				self.running = False
				break
			time.sleep(max(0, tick_interval - (time.monotonic() - start_time)))
			await asyncio.sleep(tick_interval)
	
	def p1_is_hit(self):
		if (
			self.ball_pos[0] - self.ball_radius - self.ball_speed <= self.player1_pos[0] + self.player_width / 2 and
			self.ball_pos[0] - self.ball_speed > self.player1_pos[0] - self.player_width / 2 and
			self.ball_pos[1] - self.ball_radius <= self.player1_pos[1] + self.player_height / 2 and
			self.ball_pos[1] + self.ball_radius >= self.player1_pos[1] - self.player_height / 2
		):
			return True
		return False

	def p2_is_hit(self):
		if (
			self.ball_pos[0] + self.ball_radius + self.ball_speed >= self.player2_pos[0] - self.player_width / 2 and
			self.ball_pos[0] + self.ball_speed < self.player2_pos[0] + self.player_width / 2 and
			self.ball_pos[1] - self.ball_radius <= self.player2_pos[1] + self.player_height / 2 and
			self.ball_pos[1] + self.ball_radius >= self.player2_pos[1] - self.player_height / 2
		):
			return True
		return False

	def physics(self):
		self.ball_pos[0] += self.ball_speed * math.cos(math.radians(self.angle))
		self.ball_pos[1] += self.ball_speed * -math.sin(math.radians(self.angle))
		if self.ball_pos[0] < 0 and self.p1_is_hit():
				hit_pos = self.ball_position[1] - self.player1_pos[1]
				self.angle = hit_pos / self.p_length * -90
				if (self.ball_speed < 5 * self.p_length):
					self.ball_speed += 0.1
		elif self.ball_pos[0] > 0 and self.p2_is_hit():
				hit_pos = self.ball_position[1] - self.player2_pos[1]
				self.angle = 180 + hit_pos / self.p_length * 90
				if (self.ball_speed < 5 * self.p_length):
					self.ball_speed += 0.1
		elif self.ball_pos[1] - self.ball_radius <= 0 or self.ball_pos[1] + self.ball_radius >= ring_size[1]:
			self.angle = -self.angle
		elif self.ball_pos[0] - self.ball_radius <= 0:
			self.player_2_score += 1
			self.ball_pos = [ring_size[0] / 2, ring_size[1] / 2]
			self.angle = random.uniform(70, -70)
			self.ball_speed = 90 / 150
		elif self.ball_pos[0] + self.ball_radius >= ring_size[0]:
			self.player_1_score += 1
			self.ball_pos = [ring_size[0] / 2, ring_size[1] / 2]
			self.angle = random.uniform(110, 250)
			self.ball_speed = 90 / 150

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

	def up(self, player):
		if player == self.player_1:
			self.player_1_pos[1] += 1
		else:
			self.player_2_pos[1] += 1
	
	def down(self, player):
		if player == self.player_1:
			self.player_1_pos[1] -= 1
		else:
			self.player_2_pos[1] -= 1
	
	def __dict__(self):
		return {
			'player_1_score': self.player_1_score,
			'player_2_score': self.player_2_score,
			'player_1_pos': self.player_1_pos,
			'player_2_pos': self.player_2_pos,
			'ball_pos': self.ball_pos,
			'ball_speed': self.ball_speed,
			'angle': self.angle,
			'p_length': self.p_length,
		}


	def quit_game(self, player):
		self.running = False
		if player == self.player_1:
			self.player_1_score = -1
		else:
			self.player_2_score = -1

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
  