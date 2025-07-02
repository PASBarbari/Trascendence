# praticamente quando un modello viene creato ricveve il segnale e fa quello che gli chiedi
import math
import random
from django.shortcuts import render, get_object_or_404
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import *
import logging
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import time, asyncio
from .serializer import *

# ring_size = [160 , 90]
tick_rate = 60
# self.ball_radius = 2.5
# self.p_width = 2
# ring_thickness = 3
# self.p_speed = 0.1
ball_acc = 0.1
class GameState:
	def __init__(self, player_1, player_2, game_id, player_length, tournament_id):
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
		self.avg_frame_time = [0 , 1]
		self.tournament_id = tournament_id

	async def start(self):
		self.running = True
		tick_interval = 1 / tick_rate

		if random.choice([True, False]):
			self.angle = random.uniform(70, -70)
		else:
			self.angle = random.uniform(110, 250)

		print(f"Game {self.__dict__} started")
		while self.ball_speed == 0:
			await asyncio.sleep(0.1)
		while self.running:
			start_time = time.monotonic()

			self.physics()
			self.movement()

			await self.update()

			if self.player_1_score == 5 or self.player_2_score == 5: #TODO add different games scores
				self.running = False
				break
			elapsed = time.monotonic() - start_time
			self.avg_frame_time += [elapsed, 1]
			await asyncio.sleep(max(0, tick_interval - elapsed))
		self.game_end()

	def game_end(self):
		if self.tournament_id:
			Game.objects.update_or_create(
				player_1_score = self.player_1_score,
				player_2_score = self.player_2_score,
				tournament_id = self.tournament_id
			)


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
		elif (self.wall_hit_pos <= 0 and self.ball_pos[1] + self.ball_radius + self.ring_thickness + self.ball_speed >= self.ring_height / 2) or (self.wall_hit_pos >= 0 and self.ball_pos[1] - self.ball_radius - self.ring_thickness - self.ball_speed <= -self.ring_height / 2):
			self.wall_hit_pos = self.ball_pos[1]
			self.angle = -self.angle
		self.check_score()
		if (self.player_1_move > 0 and self.player_1_pos[1] + self.p_length / 2 < self.ring_height / 2 - self.ring_thickness) or (self.player_1_move < 0 and self.player_1_pos[1] - self.p_length / 2 > -self.ring_height / 2 + self.ring_thickness):
			self.player_1_pos[1] += self.player_1_move
		if (self.player_2_move > 0 and self.player_2_pos[1] + self.p_length / 2 < self.ring_height / 2 - self.ring_thickness) or (self.player_2_move < 0 and self.player_2_pos[1] - self.p_length / 2 > -self.ring_height / 2 + self.ring_thickness):
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

	def check_score(self):
		if self.ball_pos[0] - self.ball_radius <= -self.ring_length / 2:
			self.player_2_score += 1
			self.reset_ball(random.uniform(70, -70))
		elif self.ball_pos[0] + self.ball_radius >= self.ring_length / 2 + self.ring_thickness:
			self.player_1_score += 1
			self.reset_ball(random.uniform(110, 250))

	def reset_ball(self, angle):
		self.ball_pos = [0, 0]
		self.angle = angle
		self.ball_speed = 90 / 150
		self.wall_hit_pos = 0


	def movement(self):
		if (self.player_1_move > 0 and self.player_1_pos[1] + self.p_length / 2 < self.ring_height / 2 - self.ring_thickness / 2):
			self.player_1_pos[1] += self.p_speed
		elif (self.player_1_move < 0 and self.player_1_pos[1] - self.p_length / 2 > -self.ring_height / 2 + self.ring_thickness / 2):
			self.player_1_pos[1] -= self.p_speed
		if (self.player_2_move > 0 and self.player_2_pos[1] + self.p_length / 2 < self.ring_height / 2 - self.ring_thickness / 2):
			self.player_2_pos[1] += self.p_speed
		elif (self.player_2_move < 0 and self.player_2_pos[1] - self.p_length / 2 > -self.ring_height / 2 + self.ring_thickness / 2):
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
		#TODO set to 0 who quit
# @receiver(post_save, sender=Game)
# def start_game(sender, instance, created, **kwargs):
# 	if created:
# 		game_state = GameState(instance.player_1, instance.player_2, instance.id, 10)
# 		instance.game_state = game_state
# 		instance.save()
# 		logger = logging.getLogger(__name__)
# 		logger.info(f'Game started: {instance}')
# 	else:
# 		logger = logging.getLogger(__name__)
# 		logger.info(f'Game already started: {instance}')

class TournamentState:
	def __init__(self, *args, **kwargs):
		self.id = kwargs['tournament_id']
		self.name = kwargs['name']
		self.max_p = kwargs['max_p']
		self.req_lvl = kwargs['req_lvl']
		self.nbr_player = 1
		self.players = []
		self.next_round = []
		self.players.append(kwargs['player_id'])
		self.creator = kwargs['player_id']

	def add_player(self, player):
		p = get_object_or_404(UserProfile, user_id=player['user_id'])
		if player['user_id'] in self.players:
			return 'Player already in the tournament'
		if p.level < self.req_lvl:
			return 'Player level is too low'
		if self.nbr_player >= self.max_p:
			return 'Tournament is full'
		self.nbr_player += 1
		self.players.append(player['user_id'])
		return 'Player added to the tournament'

	def start(self):
		if self.nbr_player < 3:
			return {
				"type": "error",
				'error':'Not enough players'
			}
		self.players = random.shuffle(self.players)
		self.max_p = len(self.players)
		next_2pow = int(math.pow(2, math.ceil(math.log2(self.nbr_player))))
		nbr_bye = next_2pow - self.nbr_player
		self.partecipants = self.players
		self.partecipants.extend([0] * nbr_bye)
		self.half = len(self.partecipants) / 2
		first = self.partecipants[0:self.half]
		last = self.partecipants[self.half:]
		self.next_round = []
		for pair in zip(first, last):
			if pair[0] == 0:
				self.next_round.append(pair[1])
			elif pair[1] == 0:
				self.next_round.append(pair[0])
			else:
				self.create_game(pair[0], pair[1])
		return {
			'type' : 'success',
			'success' : 'Tournament started'
		}

	def brackets(self, *args, **kwargs):
		try:
			if self.partecipants.get(kwargs['winner']) == None:
				return 'Player not in the tournament'
			self.next_round.append(kwargs['winner'])
			if len(self.next_round) == self.half:
				self.partecipants = self.next_round
				self.next_round = []
				if len(self.partecipants) == 1:
					self.winner = self.partecipants[0]
					self.save_tournament()
					return 'Tournament ended'
				else:
					self.half = len(self.partecipants) / 2
					first = self.partecipants[0:self.half]
					last = self.partecipants[self.half:]
					for pair in zip(first, last):
						if pair[0] == 0:
							self.next_round.append(pair[1])
						elif pair[1] == 0:
							self.next_round.append(pair[0])
						else:
							self.create_game(pair[0], pair[1])
			else:
				return 'Game registered successfully'
		except Exception as e:
			return f'Error registering game: {e}'


	def save_tournament(self):
		t = get_object_or_404(Tournament, id=self.id)
		t.winner = self.winner
		t.save()

	def create_game(self, player_1, player_2):
		get_channel_layer().group_send(
			f'tournament_{self.id}',
			{
				'type': 'create_game',
				'player_1': player_1,
				'player_2': player_2,
				'tournament_id': self.id
			}
		)

@receiver(post_save, sender=Game)
def start_game(sender, instance, created, **kwargs):
	from .notification import SendNotificationSync, ImmediateNotification
	from .serializer import PlayerSerializer
	logger = logging.getLogger(__name__)

	if created:
		logger.info(f'🎮 Creating new game {instance.id} between player {instance.player_1.user_id} and player {instance.player_2.user_id}')

		# Prepare notification data
		notification_data = {
			'type': 'game_created',
			'game_id': instance.id,
			'player_1': PlayerSerializer(instance.player_1).data,
			'player_2': PlayerSerializer(instance.player_2).data,
			'tournament_id': getattr(instance, 'tournament_id', None)
		}

		# Send notification to player 1
		try:
			notification_p1 = ImmediateNotification(
				Sender='Pong',
				message=notification_data,
				user_id=instance.player_1.user_id
			)
			SendNotificationSync(notification_p1)
			logger.info(f'✅ Game notification sent to player 1 (ID: {instance.player_1.user_id}) for game {instance.id}')
		except Exception as e:
			logger.error(f'❌ Failed to send game notification to player 1 (ID: {instance.player_1.user_id}): {str(e)}')
			print(f"❌ Error sending notification to player 1: {str(e)}")

		# Send notification to player 2
		try:
			notification_p2 = ImmediateNotification(
				Sender='Pong',
				message=notification_data,
				user_id=instance.player_2.user_id
			)
			SendNotificationSync(notification_p2)
			logger.info(f'✅ Game notification sent to player 2 (ID: {instance.player_2.user_id}) for game {instance.id}')
		except Exception as e:
			logger.error(f'❌ Failed to send game notification to player 2 (ID: {instance.player_2.user_id}): {str(e)}')
			print(f"❌ Error sending notification to player 2: {str(e)}")

		logger.info(f'✅ Game {instance.id} created successfully')

	else:
		logger.debug(f'🔄 Game {instance.id} updated (not created)')