# Tournament System - Asyncio Task Architecture

## Overview

The tournament system has been restructured to use asyncio tasks for automatic round progression, providing a more robust and scalable architecture.

## Key Features

### 🔄 Auto-Start Rounds
- Rounds start automatically after tournament initialization
- No creator approval needed between rounds
- Seamless progression from bracket creation to completion

### ⏱️ Round Timeouts
- 5-minute timeout per round (configurable)
- Automatic resolution of unfinished games
- Connection-based advancement for timeout scenarios

### 📊 Brackets on Request
- Tournament brackets available via `get_brackets` WebSocket command
- Clean data structure for frontend integration
- Real-time updates without forced pushes

### 🏗️ Asyncio Task Management
- Each tournament runs in its own asyncio task
- Proper task lifecycle management (creation/cancellation)
- Thread-safe tournament state management

## Architecture Components

### TournamentManager
- **Location**: `tournament_manager.py`
- **Purpose**: Global manager for all tournament tasks
- **Key Methods**:
  - `create_tournament()` - Creates tournament and starts management task
  - `get_tournament()` - Retrieves active tournament
  - `remove_tournament()` - Cleans up tournament and cancels task

### TournamentState
- **Location**: `tournament_manager.py`
- **Purpose**: Individual tournament state and logic
- **Key Features**:
  - Asyncio-compatible methods
  - Auto-round progression
  - Timeout handling
  - Game creation and result processing

### Consumer Integration
- **Location**: `consumers.py`
- **Changes**: Updated to use `tournament_manager` instead of `active_tournaments`
- **New Messages**:
  - Tournament completion notifications
  - Auto-round progression updates

## WebSocket Commands

### Existing Commands
- `join` - Join tournament (enhanced with database sync)
- `start_tournament` - Initialize brackets (auto-starts rounds)
- `get_brackets` - Retrieve tournament structure

### Legacy Commands (Auto-Handled)
- `start_round` - Now returns info message (auto-started)
- `end_round` - Now returns info message (auto-ended)

### New Event Types
- `tournament_complete` - Fired when tournament finishes
- `tournament_initialized` - Enhanced with auto-round info

## Database Integration

### Tournament Status Updates
- Automatic status updates (`pending` → `active` → `completed`)
- Winner assignment on completion
- Participant count synchronization

### Game Creation
- Automatic game creation for each round
- Proper tournament association
- Database sync with in-memory state

## Configuration

### Timeouts
```python
round_timeout = 300  # 5 minutes per round
```

### Connection Checks
- Simplified implementation (returns `True` for now)
- Ready for WebSocket connection tracking enhancement

## Usage Flow

1. **Tournament Creation**: Creator initializes tournament via WebSocket
2. **Player Joining**: Players join and are synced to database
3. **Bracket Initialization**: Creator calls `start_tournament`
4. **Auto-Round Management**: 
   - Rounds start automatically
   - Games created and tracked
   - Results processed as games complete
   - Timeouts handled gracefully
5. **Tournament Completion**: Winner declared and saved to database

## Benefits

### For Players
- Smoother tournament experience
- No waiting for manual round starts
- Automatic progression

### For Developers
- Clean asyncio architecture
- Better error handling
- Easier testing and debugging
- Scalable design

### For Frontend
- Clean bracket data structure
- Real-time notifications
- On-demand bracket updates

## Migration Notes

- Old `TournamentState` in `signals.py` is deprecated
- Consumers no longer use `active_tournaments` global
- Signal handlers updated to use `tournament_manager`
- All tournament logic centralized in `tournament_manager.py`

## Future Enhancements

- Enhanced connection tracking for timeout resolution
- Configurable timeout values per tournament
- Tournament spectator mode
- Advanced bracket visualization data
- Tournament analytics and statistics
