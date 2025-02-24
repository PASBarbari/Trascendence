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
from .serializer import GameStateSerializer

ring_size = [160 , 90]
tick_rate = 30
# self.ball_radius = 2.5
# self.p_width = 2
# ring_thickness = 3
# self.p_speed = 0.1
ball_acc = 0.1
class GameState:
	def __init__(self, player_1, player_2, game_id, player_length):
		self.game_id = game_id
		self.player_1 = player_1
		self.player_2 = player_2
		self.player_1_score = 0
		self.player_2_score = 0
		self.player_1_pos = [0 , 0]
		self.player_2_pos = [0 , 0]
		self.player_1_move = 0
		self.player_2_move = 0
		self.ball_pos = [0 , 0]
		self.p_length = 0
		self.p_height = 0
		self.p_width = 0
		self.p_speed = 0
		self.ball_radius = 0
		self.ball_speed = 0
		self.ring_length = 0
		self.ring_height = 0
		self.ring_width = 0
		self.ring_thickness = 0
		self.is_started = [0 , 0]
		self.wall_hit_pos = 0

	async def start(self):
		self.running = True
		tick_interval = 1 / tick_rate

		if random.choice([True, False]):
			self.angle = random.uniform(70, -70)
		else:
			self.angle = random.uniform(110, 250)

		# print(f"Game {self.__dict__} started")
		while self.ball_speed == 0:
			await asyncio.sleep(1)
		while self.running:
			start_time = time.monotonic()

			self.physics()
			self.movement()

			await self.update()
			
			if self.player_1_score == 5 or self.player_2_score == 5: #TODO add different games scores
				self.running = False
				break
			elapsed = time.monotonic() - start_time
			await asyncio.sleep(max(0, tick_interval - elapsed))
	
	def p1_is_hit(self):
		if (
			self.ball_pos[0] - self.ball_radius - self.ball_speed <= self.player_1_pos[0] + self.p_width / 2 and
			self.ball_pos[0] - self.ball_speed > self.player_1_pos[0] - self.p_width / 2 and
			self.ball_pos[1] - self.ball_radius <= self.player_1_pos[1] + self.p_length / 2 and
			self.ball_pos[1] + self.ball_radius >= self.player_1_pos[1] - self.p_length / 2
		):
			return True
		return False

	def p2_is_hit(self):
		if (
			self.ball_pos[0] + self.ball_radius + self.ball_speed >= self.player_2_pos[0] - self.p_width / 2 and
			self.ball_pos[0] + self.ball_speed < self.player_2_pos[0] + self.p_width / 2 and
			self.ball_pos[1] - self.ball_radius <= self.player_2_pos[1] + self.p_length / 2 and
			self.ball_pos[1] + self.ball_radius >= self.player_2_pos[1] - self.p_length / 2
		):
			return True
		return False

	#TODO fixing radius and thickness and create function for score

	def physics(self):
		self.ball_pos[0] += self.ball_speed * math.cos(math.radians(self.angle))
		self.ball_pos[1] += self.ball_speed * -math.sin(math.radians(self.angle))
		if self.ball_pos[0] < 0 and self.p1_is_hit():
			hit_pos = self.ball_pos[1] - self.player_1_pos[1]
			self.wall_hit_pos = 0
			self.angle = hit_pos / self.p_length * -90
			if (self.ball_speed < 5 * self.p_length):
				self.ball_speed += ball_acc
		elif self.ball_pos[0] > 0 and self.p2_is_hit():
			hit_pos = self.ball_pos[1] - self.player_2_pos[1]
			self.wall_hit_pos = 0
			self.angle = 180 + hit_pos / self.p_length * 90
			if (self.ball_speed < 5 * self.p_length):
				self.ball_speed += ball_acc
		elif (self.wall_hit_pos <= 0 and self.ball_pos[1] + self.ball_radius + self.ring_thickness + self.ball_speed >= ring_size[1] / 2) or (self.wall_hit_pos >= 0 and self.ball_pos[1] - self.ball_radius - self.ring_thickness - self.ball_speed <= -ring_size[1] / 2):
			self.wall_hit_pos = self.ball_pos[1]
			self.angle = -self.angle 
		elif self.ball_pos[0] - self.ball_radius < - ring_size[0] / 2 + self.ring_thickness:
			self.player_2_score += 1
			self.ball_pos = [0, 0]
			self.angle = random.uniform(70, -70)
			self.ball_speed = 90 / 150
			self.wall_hit_pos = 0
		elif self.ball_pos[0] + self.ball_radius > ring_size[0] / 2 - self.ring_thickness:
			self.player_1_score += 1
			self.ball_pos = [0, 0]
			self.angle = random.uniform(110, 250)
			self.ball_speed = 90 / 150
			self.wall_hit_pos = 0
		if (self.player_1_move > 0 and self.player_1_pos[1] + self.p_length / 2 < ring_size[1] / 2 - self.ring_thickness) or (self.player_1_move < 0 and self.player_1_pos[1] - self.p_length / 2 > -ring_size[1] / 2 + self.ring_thickness):
			self.player_1_pos[1] += self.player_1_move
		if (self.player_2_move > 0 and self.player_2_pos[1] + self.p_length / 2 < ring_size[1] / 2 - self.ring_thickness) or (self.player_2_move < 0 and self.player_2_pos[1] - self.p_length / 2 > -ring_size[1] / 2 + self.ring_thickness):
			self.player_2_pos[1] += self.player_2_move
	
	async def update(self):
		channel_layer = get_channel_layer()
		try:
			serialized_data = GameStateSerializer(self.to_dict()).data
			# print(f"Sent game state: {serialized_data}")
			await channel_layer.group_send(
				f'game_{self.game_id}',
				{
					'type': 'game_state',
					'game_state': serialized_data
				}
			)
		except Exception as e:
			print(f"Error sending game state: {e}") #TODO logg

	def movement(self):
		if (self.player_1_move > 0 and self.player_1_pos[1] + self.p_length / 2 < ring_size[1] / 2 - self.ring_thickness / 2):
			self.player_1_pos[1] += self.p_speed
		elif (self.player_1_move < 0 and self.player_1_pos[1] - self.p_length / 2 > -ring_size[1] / 2 + self.ring_thickness / 2):
			self.player_1_pos[1] -= self.p_speed
		if (self.player_2_move > 0 and self.player_2_pos[1] + self.p_length / 2 < ring_size[1] / 2 - self.ring_thickness / 2):
			self.player_2_pos[1] += self.p_speed
		elif (self.player_2_move < 0 and self.player_2_pos[1] - self.p_length / 2 > -ring_size[1] / 2 + self.ring_thickness / 2):
			self.player_2_pos[1] -= self.p_speed

	def up(self, player):
		print(f"Player {player} up")
		if player == self.player_1.user_id:
			self.player_1_move = 1
		elif player == self.player_2.user_id:
			self.player_2_move = 1
	
	def down(self, player):
		if player == self.player_1.user_id:
			self.player_1_move = -1
		elif player == self.player_2.user_id:
			self.player_2_move = -1
   
	def stop(self, player):
		if player == self.player_1.user_id:
			self.player_1_move = 0
		elif player == self.player_2.user_id:
			self.player_2_move = 0
	
	def to_dict(self):
		return {
			'player_1_score': self.player_1_score,
			'player_2_score': self.player_2_score,
			'player_1_pos': self.player_1_pos,
			'player_2_pos': self.player_2_pos,
			'ball_pos': self.ball_pos,
			'ball_speed': self.ball_speed,
			'angle': self.angle,
			'ring_length': self.ring_length,
			'ring_height': self.ring_height,
			'ring_width': self.ring_width,
			'ring_thickness': self.ring_thickness,
			'p_length': self.p_length,
			'p_height': self.p_height,
			'p_width': self.p_width,
			'ball_radius': self.ball_radius,
			'p_speed': self.p_speed
		}


	def quit_game(self):
		print(f"Game {self.game_id} quit")
		self.running = False
		# if player == self.player_1:
		# 	self.player_1_score = -1
		# else:
		# 	self.player_2_score = -1

@receiver(post_save, sender=Game)
def start_game(sender, instance, created, **kwargs):
	if created:
		game_state = GameState(instance.player_1, instance.player_2, instance.id, 10)
		instance.game_state = game_state
		instance.save()
		logger = logging.getLogger(__name__)
		logger.info(f'Game started: {instance}')
	else:
		logger = logging.getLogger(__name__)
		logger.info(f'Game already started: {instance}')
  