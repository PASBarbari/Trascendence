# Physics Engine for Pong Game

This directory contains different physics engine implementations that can be tested and compared.

## Engines Available:

1. **legacy_physics.py** - Current simple implementation
2. **modern_physics.py** - Improved collision detection and physics
3. **benchmark_physics.py** - Performance testing utilities

## How to Test:

Run the benchmark script to compare performance:
```bash
python benchmark_physics.py
```

## Features Comparison:

| Feature | Legacy | Modern |
|---------|--------|---------|
| Collision Detection | Basic AABB | Swept Sphere |
| Performance | Medium | High |
| Accuracy | Good | Excellent |
| Predictability | Fair | Excellent |
