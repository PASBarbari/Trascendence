"""
Legacy Physics Engine - Current Implementation
This is the current physics engine extracted for comparison.
"""
import math
import random

class LegacyPhysicsEngine:
    def __init__(self, ring_length=160, ring_height=90, ring_thickness=3):
        self.ring_length = ring_length
        self.ring_height = ring_height
        self.ring_thickness = ring_thickness
        
        # Game state
        self.ball_pos = [0, 0]
        self.ball_radius = 2.5
        self.ball_speed = 1.0
        self.angle = 0
        self.wall_hit_pos = 0
        
        # Player state
        self.player_1_pos = [-60, 0]
        self.player_2_pos = [60, 0]
        self.p_length = 20
        self.p_width = 2
        self.p_speed = 1.0
        
    def p1_is_hit(self):
        """Check if ball hits player 1 paddle"""
        return (
            self.ball_pos[0] - self.ball_radius - self.ball_speed <= self.player_1_pos[0] + self.p_width / 2 and
            self.ball_pos[0] - self.ball_speed > self.player_1_pos[0] - self.p_width / 2 and
            self.ball_pos[1] - self.ball_radius <= self.player_1_pos[1] + self.p_length / 2 and
            self.ball_pos[1] + self.ball_radius >= self.player_1_pos[1] - self.p_length / 2
        )
    
    def p2_is_hit(self):
        """Check if ball hits player 2 paddle"""
        return (
            self.ball_pos[0] + self.ball_radius + self.ball_speed >= self.player_2_pos[0] - self.p_width / 2 and
            self.ball_pos[0] + self.ball_speed < self.player_2_pos[0] + self.p_width / 2 and
            self.ball_pos[1] - self.ball_radius <= self.player_2_pos[1] + self.p_length / 2 and
            self.ball_pos[1] + self.ball_radius >= self.player_2_pos[1] - self.p_length / 2
        )
    
    def physics_step(self, ball_acc=0.1):
        """Execute one physics step - legacy implementation"""
        # Move ball
        self.ball_pos[0] += self.ball_speed * math.cos(math.radians(self.angle))
        self.ball_pos[1] += self.ball_speed * -math.sin(math.radians(self.angle))
        
        # Paddle collisions
        if self.ball_pos[0] < 0 and self.p1_is_hit():
            hit_pos = self.ball_pos[1] - self.player_1_pos[1]
            self.wall_hit_pos = 0
            if self.p_length > 0:
                self.angle = hit_pos / self.p_length * -90
            else:
                self.angle = -45
            if self.ball_speed < 5 * self.p_length:
                self.ball_speed += ball_acc
                
        elif self.ball_pos[0] > 0 and self.p2_is_hit():
            hit_pos = self.ball_pos[1] - self.player_2_pos[1]
            self.wall_hit_pos = 0
            if self.p_length > 0:
                self.angle = 180 + hit_pos / self.p_length * 90
            else:
                self.angle = 135
            if self.ball_speed < 5 * self.p_length:
                self.ball_speed += ball_acc
        
        # Wall collisions
        elif ((self.wall_hit_pos <= 0 and 
               self.ball_pos[1] + self.ball_radius + self.ring_thickness + self.ball_speed >= self.ring_height / 2) or 
              (self.wall_hit_pos >= 0 and 
               self.ball_pos[1] - self.ball_radius - self.ring_thickness - self.ball_speed <= -self.ring_height / 2)):
            self.wall_hit_pos = self.ball_pos[1]
            self.angle = -self.angle
        
        # Check scoring
        return self.check_score()
    
    def check_score(self):
        """Check if ball scored"""
        if self.ball_pos[0] - self.ball_radius <= -self.ring_length / 2:
            return "player_2_scores"
        elif self.ball_pos[0] + self.ball_radius >= self.ring_length / 2 + self.ring_thickness:
            return "player_1_scores"
        return None
    
    def reset_ball(self, angle=None):
        """Reset ball to center"""
        self.ball_pos = [0, 0]
        self.angle = angle if angle is not None else random.uniform(45, 135)
        self.ball_speed = 90 / 150
        self.wall_hit_pos = 0
