# Redis-Backed Tournament Manager

This document explains the Redis-backed tournament management system that enables multi-process tournament handling while maintaining the same external API.

## Overview

The original tournament manager stored all tournament state in memory, which caused issues in multi-process environments:
- State was lost when processes restarted
- Multiple processes couldn't share tournament state  
- Race conditions occurred during tournament modifications

The Redis-backed implementation solves these issues by storing all tournament state in Redis while maintaining the exact same external API.

## Architecture

### Components

1. **RedisTournamentManager** (`redis_tournament_manager.py`)
   - Low-level Redis operations
   - Distributed locking
   - Data serialization/deserialization
   - Connection management

2. **RedisBackedTournamentManager** (`redis_backed_tournament_manager.py`)
   - High-level tournament management
   - Maintains original API compatibility
   - Async task management
   - Tournament lifecycle management

3. **Tournament Manager Import** (`tournament_manager.py`)
   - Automatic fallback system
   - Uses Redis implementation by default
   - Falls back to in-memory if Redis unavailable

### Redis Data Structure

The system uses several Redis data structures to store tournament state with automatic expiration:

```
# Tournament basic data (2 hours TTL)
tournament:{tournament_id} -> Hash with tournament metadata

# Active tournaments set (persistent)
active_tournaments -> Set of active tournament IDs

# Tournament-specific collections with TTL
tournament:{tournament_id}:active_games -> Hash of game_id -> game_info (6 minutes TTL)
tournament:{tournament_id}:next_round -> List of advancing player IDs (30 minutes TTL)
tournament:{tournament_id}:brackets -> Hash of round_num -> player_list (2 hours TTL)

# Distributed locks (30 seconds TTL)
tournament_lock:{tournament_id} -> String lock with expiration
```

### TTL (Time To Live) Configuration

The system automatically expires Redis keys to prevent memory leaks:

- **Active Games**: 6 minutes (configurable via `ACTIVE_GAMES_TTL`)
- **Tournament Data**: 2 hours (configurable via `TOURNAMENT_TTL`) 
- **Round Data**: 30 minutes (configurable via `ROUND_DATA_TTL`)
- **Bracket Data**: 2 hours (configurable via `BRACKET_TTL`)
- **Locks**: 30 seconds (configurable via `LOCK_TIMEOUT`)

## Usage

### Basic Usage (Same as Original)

```python
from .tournament_manager import tournament_manager

# Create tournament
tournament = await tournament_manager.create_tournament(
    tournament_id=1,
    name="My Tournament", 
    max_players=8,
    creator_id=123
)

# Add players
result = await tournament.add_player({'user_id': 456})

# Start tournament
result = await tournament.start()

# Register game results
result = await tournament.register_game_result(game_id, winner_id, loser_id)
```

### Configuration

The system uses Redis configuration from Django settings:

```python
# settings.py
REDIS_HOST = os.getenv('REDIS_HOST', 'localhost')
REDIS_PORT = os.getenv('REDIS_PORT', '6379')  
REDIS_CACHE_DB = os.getenv('REDIS_CACHE_DB', '1')

CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': f'redis://{REDIS_HOST}:{REDIS_PORT}/{REDIS_CACHE_DB}',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'KEY_PREFIX': 'pong:',
        }
    }
}
```

## Key Features

### Multi-Process Support
- All tournament state stored in Redis
- Distributed locking prevents race conditions
- Multiple processes can manage tournaments simultaneously

### API Compatibility  
- Maintains exact same external API as original
- Async/await pattern for all operations
- Same method signatures and return values

### Automatic Fallback
- Uses Redis implementation by default
- Falls back to in-memory implementation if Redis unavailable
- Graceful degradation

### Distributed Locking
- Tournament operations are atomic
- Prevents concurrent modifications
- Configurable lock timeouts

### Data Persistence
- Tournament state survives process restarts
- Automatic cleanup of completed tournaments
- **Automatic expiration of game data after 6 minutes**
- **TTL-based memory management for all Redis keys**
- Integration with Django models

### TTL Management
- Active games expire after 6 minutes to prevent stale data
- Tournament data persists for 2 hours after completion
- Round data expires after 30 minutes
- Automatic TTL extension for long-running tournaments
- Cleanup of expired keys prevents memory leaks

## Testing

Run the test suite to verify functionality:

```bash
# Run all tournament manager tests
python manage.py test pong_app.test_redis_tournament_manager

# Run specific test
python manage.py test pong_app.test_redis_tournament_manager.RedisTournamentManagerTest.test_async_tournament_creation
```

### Test Coverage

The test suite covers:
- Redis connection and basic operations
- Tournament creation and retrieval
- Player management 
- Tournament start and initialization
- Round progression and management
- Game result registration
- Integration with Django models
- Error handling and edge cases

## Monitoring and Debugging

### Redis Keys

You can inspect Redis state using redis-cli:

```bash
# List all tournament keys
redis-cli --scan --pattern "tournament:*"

# Get tournament data
redis-cli hgetall tournament:123

# Check active tournaments
redis-cli smembers active_tournaments

# View active games (may be expired)
redis-cli hgetall tournament:123:active_games

# Check TTL on keys
redis-cli ttl tournament:123:active_games
redis-cli ttl tournament:123

# Monitor expiring keys
redis-cli --scan --pattern "tournament:*" | xargs -I {} redis-cli ttl {}
```

### Logging

The system provides detailed logging:

```python
import logging
logger = logging.getLogger('pong_app')

# Logs tournament operations, errors, and state changes
# Check Django logs for tournament activity
```

## Performance Considerations

### Caching
- Tournament data is cached locally for short periods
- Reduces Redis queries for frequently accessed data
- Cache invalidation on updates

### Lock Timeouts
- Default lock timeout: 30 seconds
- Operation timeout: 10 seconds  
- Configurable in RedisTournamentManager

### Connection Pooling
- Redis connections are pooled automatically
- Connection timeout: 5 seconds
- Automatic reconnection on failure

## Migration from In-Memory

If you have existing tournaments in the in-memory system:

1. **Gradual Migration**: The system automatically falls back to in-memory for existing tournaments
2. **Data Export**: Use Django management commands to export tournament data
3. **Redis Import**: Import tournament data into Redis format
4. **Verification**: Run tests to ensure data integrity

## Troubleshooting

### Common Issues

1. **Redis Connection Failed**
   ```
   Check REDIS_HOST, REDIS_PORT, REDIS_CACHE_DB settings
   Verify Redis server is running
   Check network connectivity
   ```

2. **Lock Timeout Errors**
   ```  
   Increase LOCK_TIMEOUT in RedisTournamentManager
   Check for deadlocks in tournament operations
   Monitor Redis performance
   ```

3. **Tournament Not Found**
   ```
   Verify tournament exists in Redis
   Check active_tournaments set
   Ensure proper tournament ID format
   ```

4. **Data Inconsistency**
   ```
   Check Redis key expiration and TTL values
   Verify lock acquisition/release
   Monitor concurrent access patterns
   Check for expired active games causing round issues
   ```

5. **Games Disappearing/Expiring**
   ```
   Check TTL values: redis-cli ttl tournament:123:active_games
   Extend TTL if needed for long tournaments
   Monitor game duration vs 6-minute limit
   Check logs for TTL extension events
   ```

### Debug Mode

Enable debug logging for detailed information:

```python
# settings.py
LOGGING = {
    'loggers': {
        'pong_app': {
            'level': 'DEBUG',
        }
    }
}
```

## Future Enhancements

Potential improvements:
- Redis Cluster support for high availability
- Tournament state snapshots for recovery
- Metrics and monitoring integration
- WebSocket integration for real-time updates
- Tournament replay and history features
- **Configurable TTL values per tournament type**
- **Redis key cleanup monitoring and alerts**
- **Automatic game timeout handling with player notifications**
