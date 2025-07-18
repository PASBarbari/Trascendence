"""
Physics Engine Integration for GameState
Allows switching between different physics engines
"""
import os
import sys

# Add physics engines to path
current_dir = os.path.dirname(os.path.abspath(__file__))
physics_dir = os.path.join(current_dir, 'physics_engines')
sys.path.append(physics_dir)

from physics_engines.legacy_physics import LegacyPhysicsEngine
from physics_engines.modern_physics import ModernPhysicsEngine

class PhysicsManager:
    """Manages physics engine switching and integration"""
    
    def __init__(self, engine_type="modern", **kwargs):
        self.engine_type = engine_type
        self.engine = self._create_engine(engine_type, **kwargs)
        
    def _create_engine(self, engine_type, **kwargs):
        """Create physics engine instance"""
        if engine_type == "legacy":
            return LegacyPhysicsEngine(**kwargs)
        elif engine_type == "modern":
            return ModernPhysicsEngine(**kwargs)
        else:
            raise ValueError(f"Unknown engine type: {engine_type}")
    
    def switch_engine(self, new_type, preserve_state=True):
        """Switch to different physics engine"""
        if preserve_state and hasattr(self.engine, 'ball_pos'):
            # Save current state
            if self.engine_type == "legacy":
                ball_x, ball_y = self.engine.ball_pos
                ball_speed = self.engine.ball_speed
                angle = self.engine.angle
            else:  # modern
                ball_x, ball_y = self.engine.ball_pos.x, self.engine.ball_pos.y
                ball_speed = self.engine.ball_velocity.length()
                angle = 0  # Calculate from velocity
            
            # Create new engine
            old_engine = self.engine
            self.engine = self._create_engine(new_type,
                ring_length=old_engine.ring_length,
                ring_height=old_engine.ring_height,
                ring_thickness=old_engine.ring_thickness
            )
            
            # Restore state
            if new_type == "legacy":
                self.engine.ball_pos = [ball_x, ball_y]
                self.engine.ball_speed = ball_speed
                self.engine.angle = angle
            else:  # modern
                self.engine.ball_pos.x = ball_x
                self.engine.ball_pos.y = ball_y
                # Convert angle back to velocity
                import math
                self.engine.ball_velocity.x = ball_speed * math.cos(math.radians(angle))
                self.engine.ball_velocity.y = ball_speed * math.sin(math.radians(angle))
        else:
            self.engine = self._create_engine(new_type)
        
        self.engine_type = new_type
        print(f"🔄 Switched to {new_type} physics engine")
    
    def physics_step(self, *args, **kwargs):
        """Execute physics step with current engine"""
        return self.engine.physics_step(*args, **kwargs)
    
    def get_ball_position(self):
        """Get ball position (unified interface)"""
        if self.engine_type == "legacy":
            return self.engine.ball_pos
        else:
            return [self.engine.ball_pos.x, self.engine.ball_pos.y]
    
    def get_engine_stats(self):
        """Get engine-specific statistics"""
        stats = {
            "engine_type": self.engine_type,
            "ball_position": self.get_ball_position()
        }
        
        if hasattr(self.engine, 'get_stats'):
            stats.update(self.engine.get_stats())
            
        return stats

# Convenience function for GameState integration
def create_physics_manager(engine_type="legacy", ring_length=160, ring_height=90, ring_thickness=3):
    """Create physics manager with game parameters"""
    return PhysicsManager(
        engine_type=engine_type,
        ring_length=ring_length,
        ring_height=ring_height,
        ring_thickness=ring_thickness
    )
