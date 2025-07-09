"""
Responsive game configuration that adjusts to window size
"""
import math

def calculate_responsive_config(window_width=1920, window_height=1080):
    """
    Calculate game configuration based on window dimensions
    Default to 1920x1080 if not provided
    """
    # Base the game size on the smaller dimension for consistency
    base_size = min(window_width, window_height)

    # Scale factor based on base size (normalized to 1080p)
    scale_factor = base_size / 1080

    # Ring dimensions (responsive to window size)
    ring_length = window_width * 0.7  # 70% of window width
    ring_height = window_height * 0.6  # 60% of window height
    ring_width = base_size * 0.01  # 1% of base size
    ring_thickness = base_size * 0.005  # 0.5% of base size

    # Player dimensions (proportional to ring)
    player_length = ring_height * 0.15  # 15% of ring height
    player_height = ring_thickness * 0.8  # 80% of ring thickness
    player_width = ring_thickness * 0.8  # 80% of ring thickness
    player_speed = ring_length * 0.01  # 1% of ring length per frame

    # Ball properties (proportional to ring)
    ball_radius = ring_length * 0.01  # 1% of ring length
    ball_speed = ring_length * 0.008  # 0.8% of ring length per frame

    # Game settings
    game_fps = 60
    game_tick_rate = 1/60

    # Player positions (relative to ring center)
    player_1_start_x = -ring_length * 0.4  # 40% from center (left)
    player_2_start_x = ring_length * 0.4   # 40% from center (right)
    player_start_y = 0

    # Ball start position
    ball_start_x = 0
    ball_start_y = 0

    # Game boundaries (playable area)
    boundary_top = ring_height * 0.45  # 45% of ring height
    boundary_bottom = -ring_height * 0.45  # -45% of ring height
    boundary_left = -ring_length * 0.45  # -45% of ring length
    boundary_right = ring_length * 0.45  # 45% of ring length

    return {
        'window_width': window_width,
        'window_height': window_height,
        'scale_factor': scale_factor,
        'ring_length': ring_length,
        'ring_height': ring_height,
        'ring_width': ring_width,
        'ring_thickness': ring_thickness,
        'player_length': player_length,
        'player_height': player_height,
        'player_width': player_width,
        'player_speed': player_speed,
        'ball_radius': ball_radius,
        'ball_speed': ball_speed,
        'game_fps': game_fps,
        'player_1_start_x': player_1_start_x,
        'player_2_start_x': player_2_start_x,
        'player_start_y': player_start_y,
        'ball_start_x': ball_start_x,
        'ball_start_y': ball_start_y,
        'boundary_top': boundary_top,
        'boundary_bottom': boundary_bottom,
        'boundary_left': boundary_left,
        'boundary_right': boundary_right,
    }

# Default configuration for fallback
DEFAULT_GAME_CONFIG = calculate_responsive_config()