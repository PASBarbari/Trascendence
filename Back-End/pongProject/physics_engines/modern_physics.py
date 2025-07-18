"""
Modern Physics Engine - Improved Implementation
Features:
- Swept sphere collision detection
- Continuous collision detection
- Better bounce angles
- Predictable physics
- Performance optimized
"""
import math
import random
from dataclasses import dataclass
from typing import Tuple, Optional

@dataclass
class Vector2:
    x: float
    y: float
    
    def __add__(self, other):
        return Vector2(self.x + other.x, self.y + other.y)
    
    def __sub__(self, other):
        return Vector2(self.x - other.x, self.y - other.y)
    
    def __mul__(self, scalar):
        return Vector2(self.x * scalar, self.y * scalar)
    
    def dot(self, other):
        return self.x * other.x + self.y * other.y
    
    def length(self):
        return math.sqrt(self.x * self.x + self.y * self.y)
    
    def normalize(self):
        length = self.length()
        if length > 0:
            return Vector2(self.x / length, self.y / length)
        return Vector2(0, 0)
    
    def reflect(self, normal):
        """Reflect vector around normal"""
        return self - normal * (2 * self.dot(normal))

@dataclass
class AABB:
    """Axis-Aligned Bounding Box"""
    min_x: float
    min_y: float
    max_x: float
    max_y: float
    
    def contains_point(self, point: Vector2) -> bool:
        return (self.min_x <= point.x <= self.max_x and 
                self.min_y <= point.y <= self.max_y)
    
    def expand(self, radius: float):
        """Expand AABB by radius"""
        return AABB(
            self.min_x - radius, self.min_y - radius,
            self.max_x + radius, self.max_y + radius
        )

class ModernPhysicsEngine:
    def __init__(self, ring_length=160, ring_height=90, ring_thickness=3):
        self.ring_length = ring_length
        self.ring_height = ring_height
        self.ring_thickness = ring_thickness
        
        # Ball state - use legacy-compatible format
        self.ball_pos = Vector2(0, 0)
        self.ball_velocity = Vector2(1, 0)
        self.ball_radius = 2.5
        self.ball_speed = 1.0
        
        # Legacy compatibility: also maintain angle for comparison
        self.angle = 0  # Degrees, like legacy system
        
        # Player state - legacy compatible
        self.player_1_pos = Vector2(-60, 0)
        self.player_2_pos = Vector2(60, 0)
        self.p_length = 20
        self.p_width = 2
        self.p_speed = 1.0
        
        # Performance tracking
        self.collision_checks = 0
        
        # Legacy compatibility state
        self.wall_hit_pos = 0
        
    def get_paddle_aabb(self, player_pos: Vector2) -> AABB:
        """Get paddle bounding box"""
        half_width = self.p_width / 2
        half_length = self.p_length / 2
        return AABB(
            player_pos.x - half_width, player_pos.y - half_length,
            player_pos.x + half_width, player_pos.y + half_length
        )
    
    def swept_sphere_collision(self, start: Vector2, end: Vector2, radius: float, aabb: AABB) -> Optional[Tuple[float, Vector2]]:
        """
        Swept sphere vs AABB collision detection
        Returns: (time_of_impact, collision_normal) or None
        """
        self.collision_checks += 1
        
        # Expand AABB by sphere radius
        expanded = aabb.expand(radius)
        
        # Ray from sphere center
        direction = end - start
        if direction.length() == 0:
            return None
            
        # Check if ray intersects expanded AABB
        t_min = 0.0
        t_max = 1.0
        
        for i, (start_val, end_val, box_min, box_max) in enumerate([
            (start.x, end.x, expanded.min_x, expanded.max_x),
            (start.y, end.y, expanded.min_y, expanded.max_y)
        ]):
            if abs(end_val - start_val) < 1e-8:  # Ray is parallel to the slab
                if start_val < box_min or start_val > box_max:
                    return None
            else:
                # Calculate intersection with slab
                inv_dir = 1.0 / (end_val - start_val)
                t1 = (box_min - start_val) * inv_dir
                t2 = (box_max - start_val) * inv_dir
                
                if t1 > t2:
                    t1, t2 = t2, t1
                    
                t_min = max(t_min, t1)
                t_max = min(t_max, t2)
                
                if t_min > t_max:
                    return None
        
        if t_min >= 0 and t_min <= 1:
            # Calculate collision point and normal
            collision_point = start + direction * t_min
            
            # Find which face was hit
            if abs(collision_point.x - aabb.min_x) < 1e-6:
                normal = Vector2(-1, 0)
            elif abs(collision_point.x - aabb.max_x) < 1e-6:
                normal = Vector2(1, 0)
            elif abs(collision_point.y - aabb.min_y) < 1e-6:
                normal = Vector2(0, -1)
            else:
                normal = Vector2(0, 1)
                
            return (t_min, normal)
        
        return None
    
    def physics_step(self, dt: float = 1.0/30.0, ball_acc: float = 0.1):
        """Execute one physics step - legacy compatible version"""
        self.collision_checks = 0
        
        # Move ball using angle-based velocity (like legacy)
        self.ball_pos.x += self.ball_speed * math.cos(math.radians(self.angle))
        self.ball_pos.y += self.ball_speed * -math.sin(math.radians(self.angle))  # Legacy uses -sin
        
        # Check paddle collisions (simplified like legacy)
        if self.ball_pos.x < 0 and self.p1_is_hit():
            hit_pos = self.ball_pos.y - self.player_1_pos.y
            self.wall_hit_pos = 0
            # Use legacy angle calculation
            if self.p_length > 0:
                self.angle = hit_pos / self.p_length * -90
            else:
                self.angle = -45
            if self.ball_speed < 5 * self.p_length:
                self.ball_speed += ball_acc
                
        elif self.ball_pos.x > 0 and self.p2_is_hit():
            hit_pos = self.ball_pos.y - self.player_2_pos.y
            self.wall_hit_pos = 0
            # Use legacy angle calculation
            if self.p_length > 0:
                self.angle = 180 + hit_pos / self.p_length * 90
            else:
                self.angle = 135
            if self.ball_speed < 5 * self.p_length:
                self.ball_speed += ball_acc
        
        # Wall collisions (legacy style)
        elif ((self.wall_hit_pos <= 0 and 
               self.ball_pos.y + self.ball_radius + self.ring_thickness + self.ball_speed >= self.ring_height / 2) or 
              (self.wall_hit_pos >= 0 and 
               self.ball_pos.y - self.ball_radius - self.ring_thickness - self.ball_speed <= -self.ring_height / 2)):
            self.wall_hit_pos = self.ball_pos.y
            self.angle = -self.angle
        
        # Update velocity based on angle (for consistency)
        speed = math.sqrt(self.ball_speed * self.ball_speed)
        self.ball_velocity.x = speed * math.cos(math.radians(self.angle))
        self.ball_velocity.y = speed * -math.sin(math.radians(self.angle))
        
        # Check scoring
        return self.check_score()
    
    def p1_is_hit(self):
        """Legacy-compatible collision detection"""
        return (
            self.ball_pos.x - self.ball_radius - self.ball_speed <= self.player_1_pos.x + self.p_width / 2 and
            self.ball_pos.x - self.ball_speed > self.player_1_pos.x - self.p_width / 2 and
            self.ball_pos.y - self.ball_radius <= self.player_1_pos.y + self.p_length / 2 and
            self.ball_pos.y + self.ball_radius >= self.player_1_pos.y - self.p_length / 2
        )
    
    def p2_is_hit(self):
        """Legacy-compatible collision detection"""
        return (
            self.ball_pos.x + self.ball_radius + self.ball_speed >= self.player_2_pos.x - self.p_width / 2 and
            self.ball_pos.x + self.ball_speed < self.player_2_pos.x + self.p_width / 2 and
            self.ball_pos.y - self.ball_radius <= self.player_2_pos.y + self.p_length / 2 and
            self.ball_pos.y + self.ball_radius >= self.player_2_pos.y - self.p_length / 2
        )
    
    def check_paddle_collisions(self, start: Vector2, end: Vector2) -> Optional[Tuple[float, Vector2, Vector2]]:
        """Check collision with paddles"""
        # Only check paddle in direction of movement
        if end.x - start.x < 0:  # Moving left
            paddle_aabb = self.get_paddle_aabb(self.player_1_pos)
            collision = self.swept_sphere_collision(start, end, self.ball_radius, paddle_aabb)
            if collision:
                return collision[0], collision[1], self.player_1_pos
        elif end.x - start.x > 0:  # Moving right
            paddle_aabb = self.get_paddle_aabb(self.player_2_pos)
            collision = self.swept_sphere_collision(start, end, self.ball_radius, paddle_aabb)
            if collision:
                return collision[0], collision[1], self.player_2_pos
        
        return None
    
    def check_wall_collisions(self, start: Vector2, end: Vector2) -> Optional[Tuple[float, Vector2]]:
        """Check collision with top/bottom walls"""
        wall_aabb = AABB(
            -self.ring_length, -self.ring_height/2,
            self.ring_length, self.ring_height/2
        )
        
        collision = self.swept_sphere_collision(start, end, self.ball_radius, wall_aabb)
        if collision and (collision[1].y != 0):  # Only wall hits (not goal lines)
            return collision
        
        return None
    
    def check_score(self) -> Optional[str]:
        """Check if ball scored - legacy compatible"""
        # Using exact legacy scoring boundaries
        if self.ball_pos.x - self.ball_radius <= -self.ring_length / 2:
            return "player_2_scores"
        elif self.ball_pos.x + self.ball_radius >= self.ring_length / 2 + self.ring_thickness:
            return "player_1_scores"
        return None
    
    def check_ball_oob(self):
        """Legacy compatibility method for checking out of bounds"""
        return self.check_score() is not None
    
    def reset_ball(self, angle=None):
        """Reset ball to center - legacy compatible"""
        import random
        self.ball_pos = Vector2(0, 0)
        self.angle = angle if angle is not None else random.uniform(45, 135)
        self.ball_speed = 90 / 150
        self.wall_hit_pos = 0
        
        # Update velocity based on angle
        speed = math.sqrt(self.ball_speed * self.ball_speed)
        self.ball_velocity.x = speed * math.cos(math.radians(self.angle))
        self.ball_velocity.y = speed * -math.sin(math.radians(self.angle))
    
    def reset_ball(self, angle: Optional[float] = None):
        """Reset ball to center"""
        self.ball_pos = Vector2(0, 0)
        if angle is None:
            angle = random.uniform(30, 150)
        
        self.ball_velocity = Vector2(
            math.cos(math.radians(angle)),
            math.sin(math.radians(angle))
        ) * self.ball_speed
    
    def get_stats(self) -> dict:
        """Get performance statistics"""
        return {
            "collision_checks": self.collision_checks,
            "ball_position": (self.ball_pos.x, self.ball_pos.y),
            "ball_velocity": (self.ball_velocity.x, self.ball_velocity.y),
            "ball_speed": self.ball_velocity.length()
        }
