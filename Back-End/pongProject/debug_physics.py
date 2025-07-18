#!/usr/bin/env python3
"""
Debug Physics Comparison - Find where engines diverge
"""
import math
from physics_engines.legacy_physics import LegacyPhysicsEngine
from physics_engines.modern_physics import ModernPhysicsEngine

def debug_physics_step():
    """Compare engines step by step"""
    
    # Initialize both engines with same state
    legacy = LegacyPhysicsEngine()
    modern = ModernPhysicsEngine()
    
    # Set identical initial states - position near paddle for collision
    legacy.ball_pos = [-58.0, 5.0]  # Near left paddle
    legacy.angle = 180  # Moving left towards paddle
    legacy.ball_speed = 2.0
    legacy.wall_hit_pos = 0
    
    modern.ball_pos.x = -58.0
    modern.ball_pos.y = 5.0
    modern.angle = 180
    modern.ball_speed = 2.0
    modern.wall_hit_pos = 0
    
    print("🔍 Initial State (near paddle collision):")
    print(f"Legacy: pos=({legacy.ball_pos[0]:.3f}, {legacy.ball_pos[1]:.3f}), angle={legacy.angle}, speed={legacy.ball_speed}")
    print(f"Modern: pos=({modern.ball_pos.x:.3f}, {modern.ball_pos.y:.3f}), angle={modern.angle}, speed={modern.ball_speed}")
    
    # Run 10 steps and compare
    for step in range(10):
        print(f"\n📊 Step {step + 1}:")
        
        # Store positions before step
        legacy_before = [legacy.ball_pos[0], legacy.ball_pos[1]]
        modern_before = [modern.ball_pos.x, modern.ball_pos.y]
        
        # Execute physics step
        legacy_result = legacy.physics_step()
        modern_result = modern.physics_step()
        
        # Show results
        print(f"  Legacy: {legacy_before} -> ({legacy.ball_pos[0]:.3f}, {legacy.ball_pos[1]:.3f})")
        print(f"  Modern: {modern_before} -> ({modern.ball_pos.x:.3f}, {modern.ball_pos.y:.3f})")
        
        # Calculate difference
        diff_x = abs(legacy.ball_pos[0] - modern.ball_pos.x)
        diff_y = abs(legacy.ball_pos[1] - modern.ball_pos.y)
        diff_total = math.sqrt(diff_x*diff_x + diff_y*diff_y)
        
        print(f"  Diff: ({diff_x:.6f}, {diff_y:.6f}) = {diff_total:.6f} units")
        print(f"  Legacy angle: {legacy.angle:.3f}, Modern angle: {modern.angle:.3f}")
        print(f"  Legacy result: {legacy_result}, Modern result: {modern_result}")
        
        if diff_total > 0.001:  # If significant difference
            print(f"  ⚠️  DIVERGENCE DETECTED!")
            # Continue to see what happens next
        
        if legacy_result or modern_result:
            print(f"  🎯 SCORING EVENT!")
            break

if __name__ == "__main__":
    debug_physics_step()
