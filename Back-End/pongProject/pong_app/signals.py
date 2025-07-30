# praticamente quando un modello viene creato ricveve il segnale e fa quello che gli chiedi
import inspect
import json
import math
from pdb import post_mortem
import random
import logging
from django.shortcuts import render, get_object_or_404
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import *
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import time, asyncio
from .serializer import *
from .physics_integration import create_physics_manager

logger = logging.getLogger('pong_app')

# ✅ CRITICAL: Reduce tick rate to prevent lag and channel overflow
tick_rate = 30	# Reduced from 60 to 30 FPS for better performance
websocket_update_rate = 20	# Send WebSocket updates at 20 FPS (every 3rd frame)

# ring_size = [160 , 90]
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
		self.player_1_pos = [-60 , 0]
		self.player_2_pos = [60 , 0]
		self.player_1_move = 0
		self.player_2_move = 0
		self.ball_pos = [0 , 0]
		# Initialize with safe defaults to prevent NaN values
		self.p_length = 20
		self.p_height = 2.5
		self.p_width = 2
		self.p_speed = 1.0
		self.ball_radius = 2.5
		self.ball_speed = 0.6
		self.ring_length = 160
		self.ring_height = 90	# Critical: Initialize to prevent division by zero
		self.ring_width = 200
		self.ring_thickness = 3
		self.is_started = [0 , 0]
		self.wall_hit_pos = 0
		self.avg_frame_time = [0 , 1]
		self.tournament_id = tournament_id
		
		# ✅ CRITICAL: Add frame tracking for reduced WebSocket update frequency
		self.frame_count = 0
		self.last_websocket_update = 0
		
		# 🚀 NEW: Physics engine integration (can switch between legacy/modern)
		# Set via environment variable or default to modern for better performance
		engine_type = "modern"	# Using modern physics engine!
		self.physics = create_physics_manager(
			engine_type=engine_type,
			ring_length=self.ring_length,
			ring_height=self.ring_height,
			ring_thickness=self.ring_thickness
		)


	async def start(self):
		self.running = True
		tick_interval = 1 / tick_rate
		if random.choice([True, False]):
			self.angle = random.uniform(70, -70)
		else:
			self.angle = random.uniform(110, 250)

		try:
			from django.utils import timezone
			from asgiref.sync import sync_to_async
			await sync_to_async(Game.objects.filter(id=self.game_id).update)(
					status='active'
			)
			logger.info(f"Game {self.game_id} database updated: status=active")
		except Exception as e:
				logger.error(f"Failed to update game {self.game_id} start in database: {e}")
		
		logger.info(f"Game {self.game_id} starting with angle: {self.angle}")
		# Wait a bit longer for game_init, but don't wait forever
		await asyncio.sleep(1.5)	# Wait max 1.5 seconds for initialization
		
		self.ball_speed = 1.0
		
		logger.info(f"Game {self.game_id} starting main loop with ball_speed: {self.ball_speed}")
		start_time = time.monotonic()
		frame_count = 0
		
		while self.running:
			self.physics_step()
			self.movement()

			await self.update()

			if self.player_1_score == 5 or self.player_2_score == 5:
				logger.info(f"Game {self.game_id} ended due to score limit")
				self.running = False
				break
			
			frame_count += 1
			# Log periodically to confirm game is running
			if frame_count % (tick_rate * 10) == 0:	# Every 10 seconds
				logger.info(f"Game {self.game_id} running - Frame {frame_count}")
			
			start_time += tick_interval
			await asyncio.sleep(max(0, start_time - time.monotonic()))
		
		logger.info(f"Game {self.game_id} ended with scores: Player 1: {self.player_1_score}, Player 2: {self.player_2_score}")
		await self.game_end()

	async def game_end(self):
		logger = logging.getLogger(__name__)
		logger.info(f"Game {self.game_id} ending with scores: Player 1: {self.player_1_score}, Player 2: {self.player_2_score}")

		# Save game to database asynchronously
		try:
			from django.utils import timezone
			from asgiref.sync import sync_to_async
			await sync_to_async(Game.objects.filter(id=self.game_id).update)(
						player_1_score=self.player_1_score,
						player_2_score=self.player_2_score,
						status='completed'
				)
			logger.info(f"Game {self.game_id} saved to database with scores P1:{self.player_1_score} P2:{self.player_2_score}")
			
			# Get the updated game object to access properties
			game = await sync_to_async(Game.objects.get)(id=self.game_id)

		except Exception as e:
			logger.error(f"Error saving game {self.game_id} to database: {str(e)}")

		# Determine winner and loser based on scores
		if self.player_1_score > self.player_2_score:
			winner_id = self.player_1.user_id
			loser_id = self.player_2.user_id
		else:
			winner_id = self.player_2.user_id
			loser_id = self.player_1.user_id
		# If this is a tournament game, register the result
		if self.tournament_id:
			logger.info(f"Game {self.game_id} is part of tournament {self.tournament_id}, registering result")
			try:
				from .tournament_manager import tournament_manager
				tournament = await tournament_manager.get_tournament(self.tournament_id.id)
				logger.info(f"Registering tournament result for game {self.game_id} ")
				if tournament:
					await tournament.register_game_result(self.game_id, winner_id, loser_id)
					logger.info(f"Tournament game result registered for game {self.game_id}")
					
					# Notify tournament about game completion
					channel_layer = get_channel_layer()
					if channel_layer:
						await channel_layer.group_send(
							f'tournament_{self.tournament_id.id}',
							{
								'type': 'tournament_game_completed',
								'game_id': self.game_id,
								'winner': winner_id,
								'loser': loser_id,
								'scores': {
									'player_1_score': self.player_1_score,
									'player_2_score': self.player_2_score
								}
							}
						)
				else:
					logger.warning(f"Tournament {self.tournament_id.id} not found in active tournaments")
			except Exception as e:
				logger.error(f"Error registering tournament result: {str(e)}")
		
		# Send game over message to players
		try:
			channel_layer = get_channel_layer()
			if channel_layer:	
				await channel_layer.group_send(
					f'game_{self.game_id}',
					{
						'type': 'game_over',
						'winner': winner_id,
						'loser': loser_id,
						'final_scores': {
							'player_1_score': self.player_1_score,
							'player_2_score': self.player_2_score
						}
					}
				)
		except Exception as e:
			logger.error(f"Error sending game over message: {str(e)}")


	# Legacy collision detection methods (kept for compatibility)
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

	def physics_step(self):
		"""🚀 NEW: Use physics manager instead of inline physics"""
		# Sync game state to physics engine
		if self.physics.engine_type == "legacy":
			self.physics.engine.player_1_pos = self.player_1_pos.copy()
			self.physics.engine.player_2_pos = self.player_2_pos.copy()
			self.physics.engine.ball_pos = self.ball_pos.copy()
			self.physics.engine.ball_speed = self.ball_speed
		else:	# modern
			self.physics.engine.player_1_pos.x = self.player_1_pos[0]
			self.physics.engine.player_1_pos.y = self.player_1_pos[1]
			self.physics.engine.player_2_pos.x = self.player_2_pos[0]
			self.physics.engine.player_2_pos.y = self.player_2_pos[1]
			self.physics.engine.ball_pos.x = self.ball_pos[0]
			self.physics.engine.ball_pos.y = self.ball_pos[1]
		
		# Execute physics step
		result = self.physics.physics_step(ball_acc=ball_acc)
		
		# Sync back to game state
		self.ball_pos = self.physics.get_ball_position()
		
		# Sync angle from physics engine
		if hasattr(self.physics.engine, 'angle'):
			self.angle = self.physics.engine.angle
		
		# Handle scoring
		if result == "player_1_scores":
			self.player_1_score += 1
			self.reset_ball(random.uniform(110, 250))
		elif result == "player_2_scores":
			self.player_2_score += 1
			self.reset_ball(random.uniform(70, -70))
		
		# Log physics stats occasionally for debugging
		if self.frame_count % 300 == 0:	# Every 10 seconds
			stats = self.physics.get_engine_stats()
			logger.debug(f"Game {self.game_id} physics stats: {stats}")
	
	def switch_physics_engine(self, engine_type):
		"""🔧 Switch physics engine (for testing)"""
		logger.info(f"Game {self.game_id} switching to {engine_type} physics engine")
		self.physics.switch_engine(engine_type, preserve_state=True)

	async def update(self):
		# ✅ PERFORMANCE: Throttle WebSocket updates to reduce lag
		self.frame_count += 1
		
		# Only send WebSocket updates every 3rd frame (10 FPS instead of 30 FPS)
		if self.frame_count % 2 != 0:
			return
			
		channel_layer = get_channel_layer()
		try:
			serialized_data = GameStateSerializer(self.to_dict()).data
			# Reduce logging verbosity - only log occasionally
			if self.frame_count % 300 == 0:	# Log every 10 seconds at 30fps
				logger.debug(f"Sending game state for game {self.game_id} (frame {self.frame_count})")
			
			await channel_layer.group_send(
				f'game_{self.game_id}',
				{
					'type': 'game_state',
					'game_state': serialized_data
				}
			)
		except Exception as e:
			logger.error(f"Error sending game state for game {self.game_id}: {e}")
			print(f"Error sending game state: {e}") #TODO logg

	def reset_ball(self, angle):
		self.ball_pos = [0, 0]
		self.angle = angle
		self.ball_speed = 90 / 150
		self.wall_hit_pos = 0
		
		# Also reset physics engine state
		if hasattr(self.physics, 'engine'):
			self.physics.engine.reset_ball(angle)


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
		if player == self.player_1.user_id:
			self.player_1_move = -1	# Set movement state, not direct position
		elif player == self.player_2.user_id:
			self.player_2_move = -1

	def down(self, player):
		if player == self.player_1.user_id:
			self.player_1_move = 1	# Set movement state, not direct position
		elif player == self.player_2.user_id:
			self.player_2_move = 1

	def stop(self, player):
		if player == self.player_1.user_id:
			self.player_1_move = 0
		elif player == self.player_2.user_id:
			self.player_2_move = 0

	def to_dict(self):
		# ✅ PERFORMANCE: Only send essential game state data to reduce payload size
		return {
			'player_1_score': self.player_1_score,
			'player_2_score': self.player_2_score,
			'player_1_pos': self.to_percent(self.player_1_pos),
			'player_2_pos': self.to_percent(self.player_2_pos),
			'ball_pos': self.ball_pos,
			'ball_speed': self.ball_speed,
			'angle': self.angle,
			# Send ring dimensions only occasionally (they don't change during game)
			'ring_length': self.ring_length if self.frame_count % 30 == 0 else None,
			'ring_height': self.ring_height if self.frame_count % 30 == 0 else None,
		}

	
	def to_percent(self, player_pos):
		"""Convert player position to percentage (0 = top, 100 = bottom)"""
		normalized_pos = player_pos[1] + (self.ring_height / 2)	# Shift from [-h/2, h/2] to [0, h]
		percentage = (normalized_pos / self.ring_height) * 100	 # Convert to percentage
		
		# Clamp percentage to valid range to prevent out-of-bounds values
		percentage = max(0.0, min(100.0, percentage))
		
		# Debug logging
		logger.debug(f"Game {self.game_id}: pos_y={player_pos[1]}, ring_height={self.ring_height}, normalized={normalized_pos}, percentage={percentage}")
		
		return [player_pos[0], percentage]	# Return [x, percentage]

	def quit_game(self, player_id=None):
		"""Handle game quit - can be called statically or as instance method"""
		print(f"Game {getattr(self, 'game_id', 'unknown')} quit by player {player_id}")
		if hasattr(self, 'running'):
			self.running = False
		#TODO: implement forfeit logic - set quitting player score to 0 and opponent to 5



@receiver(post_save, sender=Game)
def start_game(sender, instance, created, **kwargs):
	from .notification import SendNotificationSync, ImmediateNotification
	from .serializer import PlayerSerializer
	logger = logging.getLogger(__name__)

	if created:
		# Check if both players are set
		if not instance.player_1 or not instance.player_2:
			logger.warning(f'🎮 Game {instance.id} created but missing players: player_1={instance.player_1}, player_2={instance.player_2}')
			return

		if getattr(instance.tournament_id, 'id', None) is not None:
			logger.debug(f'🔄Game {instance.id} created with tournament_id: {instance.tournament_id.id}')
			return

		logger.info(f'🎮 Creating new game {instance.id} between player {instance.player_1.user_id} and player {instance.player_2.user_id}')

		# Prepare notification data
		notification_data = {
			'type': 'game_created',
			'game_id': instance.id,
			'player_1': PlayerSerializer(instance.player_1).data,
			'player_2': PlayerSerializer(instance.player_2).data,
			'tournament_id': getattr(instance.tournament_id, 'id', None) if instance.tournament_id else None
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
			logger.error(f'❌ Failed to send game notification to player 1 (ID: {instance.player_1.user_id if instance.player_1 else "None"}): {str(e)}')
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
			logger.error(f'❌ Failed to send game notification to player 2 (ID: {instance.player_2.user_id if instance.player_2 else "None"}): {str(e)}')
			print(f"❌ Error sending notification to player 2: {str(e)}")

		logger.info(f'✅ Game {instance.id} created successfully')

	else:
		logger.debug(f'🔄 Game {instance.id} updated (not created)')


@receiver(post_save, sender=Tournament)
def create_tournament(sender, instance, created, **kwargs):
	from .notification import SendNotificationSync, ImmediateNotification
	logger = logging.getLogger(__name__)

	if created:
		logger.info(f'🏆 Creating new tournament {instance.id}')

		# Prepare notification data
		notification_data = {
			'type': 'tournament_created',
			'tournament_id': instance.id,
			'name': instance.name,
			'max_players': instance.max_partecipants,
			'creator_id': instance.creator.user_id,
			'begin_date': instance.begin_date.isoformat() if instance.begin_date else None,
		}

		# Send notification to creator
		try:
			notification = ImmediateNotification(
				Sender='Pong',
				message=notification_data,
				user_id=instance.creator.user_id
			)
			SendNotificationSync(notification)
			logger.info(f'✅ Tournament notification sent to creator (ID: {instance.creator.user_id}) for tournament {instance.id}')
		except Exception as e:
			logger.error(f'❌ Failed to send tournament notification to creator (ID: {instance.creator.user_id}): {str(e)}')
			print(f"❌ Error sending notification to creator: {str(e)}")

		logger.info(f'✅ Tournament {instance.id} created successfully')
	else:
		logger.debug(f'🔄 Tournament {instance.id} updated (not created)')

@receiver(post_delete, sender=Tournament)
def delete_tournament(sender, instance, **kwargs):
	from .notification import SendNotificationSync, ImmediateNotification
	logger = logging.getLogger(__name__)

	logger.info(f'🏆 Deleting tournament {instance.id}')

	# Prepare notification data
	notification_data = {
		'type': 'tournament_deleted',
		'tournament_id': instance.id,
	}

	# Send notification to creator
	try:
		notification = ImmediateNotification(
			Sender='Pong',
			message=notification_data,
			user_id=instance.creator.user_id
		)
		SendNotificationSync(notification)
		logger.info(f'✅ Tournament deletion notification sent to creator (ID: {instance.creator.user_id}) for tournament {instance.id}')
	except Exception as e:
		logger.error(f'❌ Failed to send tournament deletion notification to creator (ID: {instance.creator.user_id}): {str(e)}')
		print(f"❌ Error sending notification to creator: {str(e)}")

	logger.info(f'✅ Tournament {instance.id} deleted successfully')
