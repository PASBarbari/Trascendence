"""
Physics Engine Benchmark Tool
Compare performance and accuracy of different physics        # Set identical initial states for fair comparison
        legacy.ball_pos = [10, 5]
        legacy.angle = 45
        legacy.ball_speed = 2.0
        
        modern.ball_pos.x = 10
        modern.ball_pos.y = 5
        modern.angle = 45  # Add missing angle
        modern.ball_speed = 2.0  # Add missing ball_speed
        modern.ball_velocity.x = 2.0 * 0.707  # cos(45°)
        modern.ball_velocity.y = 2.0 * 0.707  # sin(45°)"""
import time
import statistics
from typing import List, Dict
import sys
import os

# Add parent directory to path to import engines
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from physics_engines.legacy_physics import LegacyPhysicsEngine
from physics_engines.modern_physics import ModernPhysicsEngine

class PhysicsBenchmark:
    def __init__(self):
        self.results = {}
    
    def benchmark_engine(self, engine_class, engine_name: str, iterations: int = 1000):
        """Benchmark a physics engine"""
        print(f"\n🔬 Benchmarking {engine_name}...")
        
        engine = engine_class()
        times = []
        collision_counts = []
        
        # Warm up
        for _ in range(100):
            engine.physics_step()
        
        # Actual benchmark
        start_total = time.perf_counter()
        
        for i in range(iterations):
            start = time.perf_counter()
            result = engine.physics_step()
            end = time.perf_counter()
            
            times.append((end - start) * 1000)  # Convert to milliseconds
            
            # Track collision checks if available
            if hasattr(engine, 'collision_checks'):
                collision_counts.append(engine.collision_checks)
            
            # Reset on score to continue testing
            if result:
                engine.reset_ball()
        
        end_total = time.perf_counter()
        total_time = (end_total - start_total) * 1000
        
        # Calculate statistics
        avg_time = statistics.mean(times)
        min_time = min(times)
        max_time = max(times)
        median_time = statistics.median(times)
        std_dev = statistics.stdev(times) if len(times) > 1 else 0
        
        avg_collisions = statistics.mean(collision_counts) if collision_counts else 0
        
        self.results[engine_name] = {
            'total_time_ms': total_time,
            'avg_time_ms': avg_time,
            'min_time_ms': min_time,
            'max_time_ms': max_time,
            'median_time_ms': median_time,
            'std_dev_ms': std_dev,
            'fps_theoretical': 1000 / avg_time if avg_time > 0 else float('inf'),
            'avg_collision_checks': avg_collisions,
            'iterations': iterations
        }
        
        print(f"✅ {engine_name} completed:")
        print(f"   📊 Average: {avg_time:.4f}ms per step")
        print(f"   ⚡ Theoretical FPS: {1000/avg_time:.1f}" if avg_time > 0 else "   ⚡ Theoretical FPS: ∞")
        print(f"   🎯 Collision checks: {avg_collisions:.1f} per step" if avg_collisions > 0 else "   🎯 Collision checks: N/A")
        print(f"   📈 Std Dev: {std_dev:.4f}ms")
    
    def accuracy_test(self, iterations: int = 100):
        """Test accuracy by comparing deterministic scenarios"""
        print(f"\n🎯 Accuracy Test ({iterations} iterations)...")
        
        legacy = LegacyPhysicsEngine()
        modern = ModernPhysicsEngine()
        
        # Set identical initial conditions
        legacy.ball_pos = [10, 5]
        legacy.angle = 45
        legacy.ball_speed = 2.0
        
        modern.ball_pos.x = 10
        modern.ball_pos.y = 5
        modern.ball_velocity.x = 2.0 * 0.707  # cos(45°)
        modern.ball_velocity.y = 2.0 * 0.707  # sin(45°)
        
        legacy_positions = []
        modern_positions = []
        
        for i in range(iterations):
            # Store positions
            legacy_positions.append((legacy.ball_pos[0], legacy.ball_pos[1]))
            modern_positions.append((modern.ball_pos.x, modern.ball_pos.y))
            
            # Step physics
            legacy_result = legacy.physics_step()
            modern_result = modern.physics_step()
            
            # Reset if scored
            if legacy_result:
                legacy.reset_ball(45)
            if modern_result:
                modern.reset_ball(45)
        
        # Calculate position differences
        differences = []
        for i, (legacy_pos, modern_pos) in enumerate(zip(legacy_positions, modern_positions)):
            diff = ((legacy_pos[0] - modern_pos[0])**2 + (legacy_pos[1] - modern_pos[1])**2)**0.5
            differences.append(diff)
        
        avg_diff = statistics.mean(differences)
        max_diff = max(differences)
        
        print(f"📐 Average position difference: {avg_diff:.4f} units")
        print(f"📏 Maximum position difference: {max_diff:.4f} units")
        
        return avg_diff, max_diff
    
    def print_comparison(self):
        """Print detailed comparison of results"""
        if len(self.results) < 2:
            print("❌ Need at least 2 engines to compare")
            return
        
        print(f"\n📋 Detailed Comparison:")
        print("=" * 80)
        
        # Find best and worst performers
        engines = list(self.results.keys())
        best_avg = min(self.results.values(), key=lambda x: x['avg_time_ms'])
        worst_avg = max(self.results.values(), key=lambda x: x['avg_time_ms'])
        
        for name, stats in self.results.items():
            print(f"\n🔧 {name}:")
            print(f"   ⏱️  Avg Time: {stats['avg_time_ms']:.4f}ms")
            print(f"   🏃 FPS: {stats['fps_theoretical']:.1f}")
            print(f"   🔍 Collision Checks: {stats['avg_collision_checks']:.1f}")
            print(f"   📊 Stability (StdDev): {stats['std_dev_ms']:.4f}ms")
            
            # Performance vs best
            if stats == best_avg:
                print(f"   🏆 FASTEST ENGINE")
            else:
                speedup = stats['avg_time_ms'] / best_avg['avg_time_ms']
                print(f"   📉 {speedup:.2f}x slower than fastest")
        
        print(f"\n🎖️  Winner: {[name for name, stats in self.results.items() if stats == best_avg][0]}")
        
        # Performance summary
        legacy_fps = self.results.get('Legacy', {}).get('fps_theoretical', 0)
        modern_fps = self.results.get('Modern', {}).get('fps_theoretical', 0)
        
        if legacy_fps > 0 and modern_fps > 0:
            improvement = ((modern_fps - legacy_fps) / legacy_fps) * 100
            print(f"🚀 Performance improvement: {improvement:+.1f}%")

def main():
    print("🎮 Pong Physics Engine Benchmark")
    print("=" * 50)
    
    benchmark = PhysicsBenchmark()
    
    # Benchmark both engines
    benchmark.benchmark_engine(LegacyPhysicsEngine, "Legacy", 2000)
    benchmark.benchmark_engine(ModernPhysicsEngine, "Modern", 2000)
    
    # Accuracy test
    benchmark.accuracy_test(500)
    
    # Print comparison
    benchmark.print_comparison()
    
    print(f"\n💡 Recommendations:")
    
    if 'Modern' in benchmark.results and 'Legacy' in benchmark.results:
        modern_stats = benchmark.results['Modern']
        legacy_stats = benchmark.results['Legacy']
        
        if modern_stats['avg_time_ms'] < legacy_stats['avg_time_ms']:
            improvement = ((legacy_stats['avg_time_ms'] - modern_stats['avg_time_ms']) / legacy_stats['avg_time_ms']) * 100
            print(f"✅ Use Modern Physics Engine ({improvement:.1f}% faster)")
        else:
            print(f"⚠️  Legacy engine is still faster, investigate Modern engine")
    
    print(f"\n🎯 For your multiplayer game:")
    print(f"   - Target: 30 FPS backend = 33.33ms budget per frame")
    print(f"   - Modern engine theoretical max: {benchmark.results.get('Modern', {}).get('fps_theoretical', 0):.0f} FPS")
    print(f"   - Legacy engine theoretical max: {benchmark.results.get('Legacy', {}).get('fps_theoretical', 0):.0f} FPS")

if __name__ == "__main__":
    main()
