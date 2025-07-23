# praticamente quando un modello viene creato ricveve il segnale e fa quello che gli chiedi
import math
import random
from venv import logger
from django.shortcuts import render, get_object_or_404
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import *
import logging
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import time, asyncio
from .serializer import *
from .physics_integration import create_physics_manager

logger = logging.getLogger('pong_app')

# ✅ CRITICAL: Reduce tick rate to prevent lag and channel overflow
tick_rate = 30  # Reduced from 60 to 30 FPS for better performance
websocket_update_rate = 20  # Send WebSocket updates at 20 FPS (every 3rd frame)

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
		self.ring_height = 90  # Critical: Initialize to prevent division by zero
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
		engine_type = "modern"  # Using modern physics engine!
		self.physics = create_physics_manager(
			engine_type=engine_type,
			ring_length=self.ring_length,
			ring_height=self.ring_height,
			ring_thickness=self.ring_thickness
		)
		logger.info(f"Game {self.game_id} initialized with {engine_type} physics engine")

	async def start(self):
		self.running = True
		tick_interval = 1 / tick_rate

		if random.choice([True, False]):
			self.angle = random.uniform(70, -70)
		else:
			self.angle = random.uniform(110, 250)

		logger.info(f"Game {self.game_id} starting with angle: {self.angle}")
		# Wait a bit longer for game_init, but don't wait forever
		await asyncio.sleep(1.5)  # Wait max 1.5 seconds for initialization
		
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
			if frame_count % (tick_rate * 10) == 0:  # Every 10 seconds
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
			from asgiref.sync import sync_to_async
			await sync_to_async(Game.objects.filter(id=self.game_id).update)(
				player_1_score=self.player_1_score,
				player_2_score=self.player_2_score
			)
			logger.info(f"Game {self.game_id} saved to database with scores P1:{self.player_1_score} P2:{self.player_2_score}")
			
			# Get the updated game object to access properties
			game = await sync_to_async(Game.objects.get)(id=self.game_id)
			winner_id = await sync_to_async(lambda: game.winner_id)()
			loser_id = await sync_to_async(lambda: game.loser_id)()
			
		except Exception as e:
			logger.error(f"Error saving game {self.game_id} to database: {str(e)}")
			# Fallback: calculate winner manually if DB access fails
			if self.player_1_score > self.player_2_score:
				winner_id = self.player_1.user_id
				loser_id = self.player_2.user_id
			else:
				winner_id = self.player_2.user_id
				loser_id = self.player_1.user_id
		
		# If this is a tournament game, register the result
		if self.tournament_id and winner_id and loser_id:
			try:
				from .consumers import active_tournaments
				if self.tournament_id in active_tournaments:
					tournament = active_tournaments[self.tournament_id]
					result = tournament.register_game_result(winner_id, loser_id)
					logger.info(f"Tournament game result registered: {result}")
					
					# Notify tournament about game completion
					channel_layer = get_channel_layer()
					await channel_layer.group_send(
						f'tournament_{self.tournament_id}',
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
					logger.warning(f"Tournament {self.tournament_id} not found in active tournaments")
			except Exception as e:
				logger.error(f"Error registering tournament result: {str(e)}")
		
		# Send game over message to players
		try:
			channel_layer = get_channel_layer()
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
		else:  # modern
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
		if self.frame_count % 300 == 0:  # Every 10 seconds
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
			if self.frame_count % 300 == 0:  # Log every 10 seconds at 30fps
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
			self.player_1_move = -1  # Set movement state, not direct position
		elif player == self.player_2.user_id:
			self.player_2_move = -1

	def down(self, player):
		if player == self.player_1.user_id:
			self.player_1_move = 1  # Set movement state, not direct position
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
		normalized_pos = player_pos[1] + (self.ring_height / 2)  # Shift from [-h/2, h/2] to [0, h]
		percentage = (normalized_pos / self.ring_height) * 100   # Convert to percentage
		
		# Clamp percentage to valid range to prevent out-of-bounds values
		percentage = max(0.0, min(100.0, percentage))
		
		# Debug logging
		logger.debug(f"Game {self.game_id}: pos_y={player_pos[1]}, ring_height={self.ring_height}, normalized={normalized_pos}, percentage={percentage}")
		
		return [player_pos[0], percentage]  # Return [x, percentage]

	def quit_game(self, player_id=None):
		"""Handle game quit - can be called statically or as instance method"""
		print(f"Game {getattr(self, 'game_id', 'unknown')} quit by player {player_id}")
		if hasattr(self, 'running'):
			self.running = False
		#TODO: implement forfeit logic - set quitting player score to 0 and opponent to 5
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
		self.nbr_player = 1
		self.players = []
		self.next_round = []
		self.players.append(kwargs['player_id'])
		self.creator = kwargs['player_id']
		self.creator_id = kwargs['player_id']  # Add creator_id property for easier access
		self.current_round = 0
		self.round_timer_task = None
		self.round_results = {}
		self.is_round_active = False

	def add_player(self, player):
		# Handle both dict and object formats for compatibility
		if isinstance(player, dict):
			user_id = player['user_id']
		else:
			user_id = player.user_id
			
		p = get_object_or_404(UserProfile, user_id=user_id)
		if user_id in self.players:
			return 'Player already in the tournament'
		if self.nbr_player >= self.max_p:
			return 'Tournament is full'
		self.nbr_player += 1
		self.players.append(user_id)
		return 'Player added to the tournament'

	def start(self):
		if self.nbr_player < 3:
			return {
				"type": "error",
				'error':'Not enough players'
			}
		
		# Shuffle players for random brackets
		shuffled_players = self.players.copy()
		random.shuffle(shuffled_players)
		self.players = shuffled_players
		
		self.max_p = len(self.players)
		next_2pow = int(math.pow(2, math.ceil(math.log2(self.nbr_player))))
		nbr_bye = next_2pow - self.nbr_player
		self.partecipants = self.players.copy()
		self.partecipants.extend([0] * nbr_bye)
		self.half = len(self.partecipants) // 2
		first = self.partecipants[:self.half]
		last = self.partecipants[self.half:]
		self.next_round = []
		
		# Create initial games for first round
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
			winner_id = kwargs.get('winner')
			if winner_id not in self.partecipants:
				return 'Player not in the tournament'
			
			# Register the game result
			result = self.register_game_result(winner_id, kwargs.get('loser', 'unknown'))
			
			# Check if all games in current round are complete
			expected_games = len([p for p in self.partecipants if p != 0]) // 2
			completed_games = len(self.round_results)
			
			if completed_games >= expected_games:
				# All games complete, round can end
				return 'Round completed - ready to end'
			else:
				return result
				
		except Exception as e:
			return f'Error registering game: {e}'


	def save_tournament(self):
		t = get_object_or_404(Tournament, id=self.id)
		t.winner = self.winner
		t.save()

	def create_game(self, player_1, player_2):
		channel_layer = get_channel_layer()
		async_to_sync(channel_layer.group_send)(
			f'tournament_{self.id}',
			{
				'type': 'create_game',
				'player_1': player_1,
				'player_2': player_2,
				'tournament_id': self.id
			}
		)

	async def start_round(self):
		"""Start a new tournament round with 5-minute timer"""
		if self.is_round_active:
			return {
				'type': 'error',
				'error': 'A round is already active'
			}
		
		self.current_round += 1
		self.is_round_active = True
		self.round_results = {}
		
		logger = logging.getLogger(__name__)
		logger.info(f"Starting round {self.current_round} for tournament {self.id}")
		
		# Cancel any existing timer
		if self.round_timer_task:
			self.round_timer_task.cancel()
		
		# Start 5-minute timer
		self.round_timer_task = asyncio.create_task(self._round_timer())
		
		# Notify all players that round has started
		channel_layer = get_channel_layer()
		await channel_layer.group_send(
			f'tournament_{self.id}',
			{
				'type': 'tournament_start_round',
				'message': f'Round {self.current_round} has started!',
				'round_data': {
					'round_number': self.current_round,
					'duration_minutes': 5,
					'partecipants': len(self.partecipants) if hasattr(self, 'partecipants') else len(self.players)
				},
				'games': self._get_current_games(),
				'creator': self.creator_id
			}
		)
		
		return {
			'type': 'success',
			'success': f'Round {self.current_round} started'
		}

	async def _round_timer(self):
		"""5-minute timer for tournament rounds"""
		try:
			await asyncio.sleep(300)  # 5 minutes = 300 seconds
			await self.end_round_automatically()
		except asyncio.CancelledError:
			logger = logging.getLogger(__name__)
			logger.info(f"Round timer cancelled for tournament {self.id}")

	async def end_round_automatically(self):
		"""Automatically end round when timer expires"""
		logger = logging.getLogger(__name__)
		logger.info(f"Round {self.current_round} time expired for tournament {self.id}")
		
		# Process any incomplete games (could set default winners or forfeit)
		await self.end_round(auto_ended=True)

	async def end_round(self, auto_ended=False):
		"""End the current round and prepare next round"""
		if not self.is_round_active:
			return {
				'type': 'error',
				'error': 'No active round to end'
			}
		
		self.is_round_active = False
		
		# Cancel timer if manually ended
		if self.round_timer_task and not auto_ended:
			self.round_timer_task.cancel()
		
		logger = logging.getLogger(__name__)
		logger.info(f"Ending round {self.current_round} for tournament {self.id}")
		
		# Process round results and create new brackets
		bracket_result = self._process_round_results()
		
		channel_layer = get_channel_layer()
		
		if bracket_result.get('tournament_ended', False):
			# Tournament is complete
			await channel_layer.group_send(
				f'tournament_{self.id}',
				{
					'type': 'tournament_end_round',
					'message': f'Tournament {self.name} has ended!',
					'results': {
						'round_number': self.current_round,
						'winner': bracket_result.get('winner'),
						'tournament_completed': True
					},
					'next_round_info': None,
					'creator': self.creator_id
				}
			)
			
			return {
				'type': 'success',
				'success': 'Tournament completed',
				'winner': bracket_result.get('winner')
			}
		else:
			# Prepare next round
			await channel_layer.group_send(
				f'tournament_{self.id}',
				{
					'type': 'tournament_end_round',
					'message': f'Round {self.current_round} completed!',
					'results': {
						'round_number': self.current_round,
						'advancing_players': self.next_round,
						'eliminated_players': bracket_result.get('eliminated', [])
					},
					'next_round_info': {
						'round_number': self.current_round + 1,
						'partecipants': len(self.next_round),
						'status': 'waiting_for_ready'
					},
					'creator': self.creator_id
				}
			)
			
			# Ask everyone to get ready for next round
			await channel_layer.group_send(
				f'tournament_{self.id}',
				{
					'type': 'tournament_get_ready',
					'message': 'Get ready for the next round!',
					'round_info': {
						'next_round': self.current_round + 1,
						'partecipants': len(self.next_round),
						'brackets': self._get_next_round_brackets()
					},
					'sender': 'system'
				}
			)
			
			return {
				'type': 'success', 
				'success': f'Round {self.current_round} completed, ready for round {self.current_round + 1}'
			}

	def _process_round_results(self):
		"""Process current round results and create new brackets"""
		# Move current next_round to partecipants for next round
		if hasattr(self, 'partecipants'):
			eliminated = [p for p in self.partecipants if p not in self.next_round and p != 0]
			self.partecipants = self.next_round.copy()
		else:
			eliminated = []
			self.partecipants = self.next_round.copy()
		
		self.next_round = []
		
		# Check if tournament is complete
		if len(self.partecipants) == 1:
			winner = self.partecipants[0]
			self.winner = winner
			self.save_tournament()
			return {
				'tournament_ended': True,
				'winner': winner,
				'eliminated': eliminated
			}
		
		# Prepare brackets for next round
		self.half = len(self.partecipants) // 2
		return {
			'tournament_ended': False,
			'eliminated': eliminated
		}

	def _get_current_games(self):
		"""Get list of current round games"""
		if not hasattr(self, 'partecipants'):
			return []
		
		games = []
		half = len(self.partecipants) // 2
		first_half = self.partecipants[:half]
		second_half = self.partecipants[half:]
		
		for i, (p1, p2) in enumerate(zip(first_half, second_half)):
			if p1 != 0 and p2 != 0:
				games.append({
					'game_number': i + 1,
					'player_1': p1,
					'player_2': p2,
					'status': 'active'
				})
			elif p1 != 0:
				games.append({
					'game_number': i + 1,
					'player_1': p1,
					'player_2': 'bye',
					'status': 'bye'
				})
			elif p2 != 0:
				games.append({
					'game_number': i + 1,
					'player_1': 'bye',
					'player_2': p2,
					'status': 'bye'
				})
		
		return games

	def _get_next_round_brackets(self):
		"""Get brackets for the next round"""
		if len(self.next_round) <= 1:
			return []
		
		# Pair up players for next round
		brackets = []
		half = len(self.next_round) // 2
		first_half = self.next_round[:half]
		second_half = self.next_round[half:]
		
		for i, (p1, p2) in enumerate(zip(first_half, second_half)):
			brackets.append({
				'match_number': i + 1,
				'player_1': p1,
				'player_2': p2
			})
		
		return brackets

	def register_game_result(self, winner_id, loser_id):
		"""Register the result of a game in the current round"""
		if not self.is_round_active:
			return 'No active round'
		
		# Add winner to next round if not already there
		if winner_id not in self.next_round:
			self.next_round.append(winner_id)
		
		# Store result
		self.round_results[f"{winner_id}_vs_{loser_id}"] = {
			'winner': winner_id,
			'loser': loser_id,
			'timestamp': time.time()
		}
		
		logger = logging.getLogger(__name__)
		logger.info(f"Game result registered: {winner_id} beat {loser_id} in tournament {self.id}")
		
		return 'Game result registered successfully'

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

		logger.info(f'🏆 Tournament {instance.id} has these players {list(instance.player.all().values_list("user_id", flat=True))}')
		# Send notifications to all participants (using the correct relationship)
		for player in instance.player.all():
			if player.user_id == instance.creator.user_id:
				continue

			# Send notification to player
			try:
				notification = ImmediateNotification(
					Sender='Pong',
					message=notification_data,
					user_id=player.user_id
				)
				SendNotificationSync(notification)
				logger.info(f'✅ Tournament notification sent to player (ID: {player.user_id}) for tournament {instance.id}')
			except Exception as e:
				logger.error(f'❌ Failed to send tournament notification to player (ID: {player.user_id}): {str(e)}')
				print(f"❌ Error sending notification to player {player.user_id}: {str(e)}")
		logger.info(f'✅ Tournament {instance.id} created successfully')
	else:
		logger.debug(f'🔄 Tournament {instance.id} updated (not created)')