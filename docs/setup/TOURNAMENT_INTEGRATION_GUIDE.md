# Tournament System Integration Guide

## Table of Contents
1. [Overview](#overview)
2. [Tournament Creation](#tournament-creation)
3. [Tournament Management](#tournament-management)
4. [WebSocket Integration](#websocket-integration)
5. [API Endpoints](#api-endpoints)
6. [Tournament States & Flow](#tournament-states--flow)
7. [Message Types](#message-types)
8. [Error Handling](#error-handling)
9. [Examples](#examples)

## Overview

The tournament system supports **power-of-2 bracket tournaments** (4, 8, 16, 32, 64 players) with real-time WebSocket communication and RESTful API management.

### Key Features
- ✅ **Automatic Power-of-2 Adjustment**: Requested participant count is rounded to nearest power of 2
- ✅ **Creator Auto-Enrollment**: Tournament creator is automatically added as first participant
- ✅ **Real-time Updates**: WebSocket notifications for all tournament events
- ✅ **Round Management**: Timed rounds with automatic progression
- ✅ **Bracket Generation**: Dynamic bracket creation and visualization
- ✅ **Leave Before Start**: Participants can leave before tournament begins (except creator)

---

## Tournament Creation

### 1. API Creation (Recommended)
**Endpoint**: `POST /api/tournament`

```json
{
  "name": "Summer Championship",
  "max_partecipants": 12,  // Will be adjusted to 16
  "participants": [101, 102, 103]  // Optional initial participants
}
```

**Response**:
```json
{
  "id": 123,
  "name": "Summer Championship",
  "max_partecipants": 16,  // Adjusted to nearest power of 2
  "partecipants": 4,       // Creator + 3 initial participants
  "creator": {
    "user_id": 100,
    "username": "TournamentHost"
  },
  "begin_date": "2025-07-23T10:30:00Z",
  "winner": null
}
```

### 2. Key Creation Logic
- **Power-of-2 Adjustment**: 12 → 16, 6 → 8, 20 → 32, etc.
- **Creator Auto-Join**: Creator is automatically enrolled as first participant
- **Initial Participants**: Optional array of user IDs to add immediately
- **Notifications**: Automatic notifications sent to creator and all participants

---

## Tournament Management

### Participant Management

#### Join Tournament
```http
POST /api/tournament/join
Content-Type: application/json

{
  "tournament_id": 123,
  "user_id": 104
}
```

#### Leave Tournament (Before Start Only)
```http
POST /api/tournament/leave
Content-Type: application/json

{
  "tournament_id": 123,
  "user_id": 104
}
```

**Restrictions**:
- ❌ Cannot leave after tournament has started (games exist)
- ❌ Creator cannot leave the tournament
- ❌ Cannot leave after tournament is finished

#### Get Tournament Brackets
```http
GET /api/tournament/123/brackets/
```

---

## WebSocket Integration

### Connection
Connect to tournament WebSocket for real-time updates:
```javascript
const tournamentSocket = new WebSocket(`ws://localhost:8004/ws/tournament/${tournamentId}/`);
```

### Authentication
- WebSocket connections require authenticated users
- Unauthenticated connections are automatically closed with code `4001`
- User info is extracted from JWT token in the connection

### Essential Message Flow

#### 1. Join Tournament
```javascript
// Send join message
tournamentSocket.send(JSON.stringify({
  type: 'join',
  name: 'Summer Championship',  // Only needed if creating new
  max_p: 16                     // Only needed if creating new
}));

// Receive confirmation
{
  "type": "success",
  "success": "Connected to tournament Summer Championship",
  "tournament_data": {
    "name": "Summer Championship",
    "current_players": 4,
    "max_players": 16,
    "creator_id": 100
  }
}
```

#### 2. Get Tournament Brackets
```javascript
// Request current brackets
tournamentSocket.send(JSON.stringify({
  type: 'get_brackets'
}));

// Receive brackets data
{
  "type": "brackets",
  "brackets": {
    "tournament_id": 123,
    "name": "Summer Championship",
    "max_partecipants": 16,
    "current_partecipants": 8,
    "creator_id": 100,
    "players": [100, 101, 102, 103, 104, 105, 106, 107],
    "current_round": 1,
    "is_round_active": true,
    "partecipants": [100, 101, 102, 103],  // Current round participants
    "next_round": [100, 102],              // Winners advancing
    "rounds_completed": 0
  },
  "message": "Tournament brackets retrieved successfully"
}
```

#### 3. Round Management (Creator Only)

**Start Round**:
```javascript
tournamentSocket.send(JSON.stringify({
  type: 'start_round'
}));
```

**End Round**:
```javascript
tournamentSocket.send(JSON.stringify({
  type: 'end_round'
}));
```

---

## Tournament States & Flow

### State Diagram
```
┌─────────────┐    Join Players    ┌─────────────┐    Start Round    ┌─────────────┐
│   CREATED   │ ───────────────→   │   FILLING   │ ─────────────→   │   ACTIVE    │
└─────────────┘                   └─────────────┘                   └─────────────┘
                                                                            │
                                                                    Complete Round
                                                                            │
                                                                            ▼
┌─────────────┐    Final Round    ┌─────────────┐   Next Round     ┌─────────────┐
│  FINISHED   │ ◄─────────────── │  ROUND_END  │ ◄───────────────  │ INTER_ROUND │
└─────────────┘                   └─────────────┘                   └─────────────┘
```

### Tournament Lifecycle

1. **CREATED**: Tournament exists, creator enrolled, waiting for participants
2. **FILLING**: Participants joining, can still leave
3. **ACTIVE**: Round in progress, 5-minute timer active
4. **INTER_ROUND**: Round completed, preparing next round
5. **ROUND_END**: Final round completed
6. **FINISHED**: Tournament complete, winner declared

---

## Message Types

### Incoming Messages (From Frontend)

| Message Type | Purpose | Sender Restriction |
|--------------|---------|-------------------|
| `join` | Join/create tournament | Any authenticated user |
| `get_brackets` | Get current brackets | Any participant |
| `get_ready` | Signal ready for next round | Any participant |
| `start_round` | Start tournament round | Creator only |
| `end_round` | End current round | Creator only |

### Outgoing Messages (To Frontend)

#### Tournament Events
```javascript
// Tournament auto-start (when full)
{
  "type": "tournament_auto_start",
  "message": "Tournament is full and starting automatically!",
  "tournament_data": {
    "players": [100, 101, 102, 103],
    "max_players": 4
  }
}

// Round started
{
  "type": "start_round",
  "message": "Round 1 has started!",
  "round_data": {
    "round_number": 1,
    "duration_minutes": 5,
    "partecipants": 8
  },
  "games": [
    {
      "game_number": 1,
      "player_1": 100,
      "player_2": 101,
      "status": "active"
    }
  ],
  "creator": 100
}

// Round completed
{
  "type": "end_round",
  "message": "Round 1 completed!",
  "results": {
    "round_number": 1,
    "advancing_players": [100, 102, 104, 106],
    "eliminated_players": [101, 103, 105, 107]
  },
  "next_round_info": {
    "round_number": 2,
    "partecipants": 4,
    "status": "waiting_for_ready"
  },
  "creator": 100
}

// Game completed notification
{
  "type": "game_completed",
  "game_id": 456,
  "winner": 100,
  "loser": 101,
  "scores": {
    "player_1_score": 5,
    "player_2_score": 3
  },
  "message": "Game 456 completed!"
}

// Tournament finished
{
  "type": "end_round",
  "message": "Tournament Summer Championship has ended!",
  "results": {
    "round_number": 4,
    "winner": 100,
    "tournament_completed": true
  },
  "next_round_info": null,
  "creator": 100
}
```

#### Status Updates
```javascript
// Connection success
{
  "type": "tournament_connection_success",
  "message": "Welcome to tournament 123!",
  "player_id": 104
}

// Error messages
{
  "type": "error",
  "error": "Tournament is full"
}

// Success confirmations
{
  "type": "success",
  "success": "Player added to the tournament"
}
```

---

## API Endpoints Reference

### Tournament Management
| Method | Endpoint | Purpose | Auth Required |
|--------|----------|---------|---------------|
| GET | `/api/tournament` | List tournaments | ✅ |
| POST | `/api/tournament` | Create tournament | ✅ |
| GET | `/api/tournament/{id}/` | Get tournament details | ✅ |
| PUT | `/api/tournament/{id}/` | Update tournament | ✅ |
| DELETE | `/api/tournament/{id}/` | Delete tournament | ✅ |

### Participant Management
| Method | Endpoint | Purpose | Auth Required |
|--------|----------|---------|---------------|
| POST | `/api/tournament/join` | Join tournament | ❌ |
| POST | `/api/tournament/leave` | Leave tournament | ❌ |
| POST | `/api/tournament/end` | End tournament | ❌ |

### Information
| Method | Endpoint | Purpose | Auth Required |
|--------|----------|---------|---------------|
| GET | `/api/tournament/{id}/brackets/` | Get tournament brackets | ❌ |
| GET | `/api/tournament/match-history` | Get tournament games | ✅ |

---

## Error Handling

### Common Error Scenarios

#### Tournament Full
```json
{
  "type": "error",
  "error": "Tournament is full"
}
```

#### Already Joined
```json
{
  "type": "error", 
  "error": "User is already in this tournament"
}
```

#### Tournament Started
```json
{
  "type": "error",
  "error": "Tournament has already started, cannot leave"
}
```

#### Permission Denied
```json
{
  "type": "error",
  "error": "Only tournament creator can start rounds"
}
```

#### Tournament Not Found
```json
{
  "type": "error",
  "error": "Tournament not found in active tournaments"
}
```

### Frontend Error Handling Strategy
```javascript
tournamentSocket.onmessage = function(event) {
  const data = JSON.parse(event.data);
  
  if (data.type === 'error') {
    // Show user-friendly error message
    showErrorNotification(data.error);
    return;
  }
  
  // Handle successful messages
  handleTournamentMessage(data);
};
```

---

## Examples

### Complete Tournament Flow Example

```javascript
class TournamentManager {
  constructor(tournamentId) {
    this.tournamentId = tournamentId;
    this.socket = new WebSocket(`ws://localhost:8004/ws/tournament/${tournamentId}/`);
    this.setupEventHandlers();
  }
  
  setupEventHandlers() {
    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleMessage(data);
    };
  }
  
  handleMessage(data) {
    switch(data.type) {
      case 'tournament_connection_success':
        this.onConnected(data);
        break;
      case 'brackets':
        this.updateBrackets(data.brackets);
        break;
      case 'start_round':
        this.onRoundStarted(data);
        break;
      case 'end_round':
        this.onRoundEnded(data);
        break;
      case 'game_completed':
        this.onGameCompleted(data);
        break;
      case 'tournament_auto_start':
        this.onTournamentAutoStart(data);
        break;
      case 'error':
        this.onError(data.error);
        break;
      case 'success':
        this.onSuccess(data.success);
        break;
    }
  }
  
  // Join tournament
  joinTournament() {
    this.socket.send(JSON.stringify({
      type: 'join'
    }));
  }
  
  // Get current brackets
  getBrackets() {
    this.socket.send(JSON.stringify({
      type: 'get_brackets'
    }));
  }
  
  // Start round (creator only)
  startRound() {
    this.socket.send(JSON.stringify({
      type: 'start_round'
    }));
  }
  
  // End round (creator only)
  endRound() {
    this.socket.send(JSON.stringify({
      type: 'end_round'
    }));
  }
  
  // Event handlers
  onConnected(data) {
    console.log('Connected to tournament:', data.player_id);
    this.getBrackets(); // Load initial brackets
  }
  
  updateBrackets(brackets) {
    // Update UI with current tournament state
    this.renderBrackets(brackets);
    this.updatePlayerList(brackets.players);
    this.updateRoundInfo(brackets.current_round, brackets.is_round_active);
  }
  
  onRoundStarted(data) {
    // Show round started notification
    // Update timer (5 minutes)
    // Display active games
    this.startRoundTimer(data.round_data.duration_minutes);
    this.displayActiveGames(data.games);
  }
  
  onRoundEnded(data) {
    // Show round results
    // Display advancing/eliminated players
    if (data.results.tournament_completed) {
      this.onTournamentFinished(data.results.winner);
    } else {
      this.showRoundResults(data.results);
    }
  }
  
  onGameCompleted(data) {
    // Update brackets with game result
    // Show game completion notification
    this.updateGameResult(data.game_id, data.winner, data.loser, data.scores);
  }
  
  onTournamentAutoStart(data) {
    // Show auto-start notification
    // Tournament is now active
    this.showNotification('Tournament started automatically!');
  }
  
  onError(error) {
    // Show error message to user
    this.showErrorMessage(error);
  }
  
  onSuccess(message) {
    // Show success message
    this.showSuccessMessage(message);
  }
}

// Usage
const tournament = new TournamentManager(123);
tournament.joinTournament();
```

### Create Tournament via API
```javascript
async function createTournament(name, maxParticipants, initialParticipants = []) {
  try {
    const response = await fetch('/api/tournament', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwt_token}`
      },
      body: JSON.stringify({
        name: name,
        max_partecipants: maxParticipants,
        participants: initialParticipants
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const tournament = await response.json();
    console.log('Tournament created:', tournament);
    
    // Connect to WebSocket for real-time updates
    const tournamentManager = new TournamentManager(tournament.id);
    
    return tournament;
  } catch (error) {
    console.error('Error creating tournament:', error);
    throw error;
  }
}

// Example usage
createTournament('Summer Championship', 12, [101, 102, 103])
  .then(tournament => {
    console.log(`Tournament ${tournament.id} created with ${tournament.partecipants} participants`);
  })
  .catch(error => {
    console.error('Failed to create tournament:', error);
  });
```

---

## Frontend Implementation Checklist

### Tournament Creation
- [ ] Tournament creation form with name and max participants
- [ ] Optional initial participants selection
- [ ] Handle power-of-2 adjustment in UI
- [ ] Show creator auto-enrollment

### Tournament Display
- [ ] Tournament list/grid view
- [ ] Tournament details modal/page
- [ ] Real-time participant count updates
- [ ] Join/Leave tournament buttons with state management

### Bracket Visualization
- [ ] Dynamic bracket tree rendering
- [ ] Round-by-round view
- [ ] Game status indicators (pending/active/completed)
- [ ] Player advancement visualization
- [ ] Eliminated players indication

### Real-time Updates
- [ ] WebSocket connection management
- [ ] Auto-reconnection on disconnect
- [ ] Message queue for offline messages
- [ ] Real-time bracket updates
- [ ] Live game completion notifications

### Round Management (Creator)
- [ ] Start round button (creator only)
- [ ] Round timer display (5 minutes)
- [ ] End round button (creator only)
- [ ] Round results display
- [ ] Tournament progression indicator

### Error & Status Handling
- [ ] User-friendly error messages
- [ ] Loading states for API calls
- [ ] Success/failure notifications
- [ ] Connection status indicator
- [ ] Retry mechanisms for failed operations

### Responsive Design
- [ ] Mobile-friendly tournament list
- [ ] Responsive bracket visualization
- [ ] Touch-friendly controls
- [ ] Optimal performance on all devices

---

## Technical Notes

### Database Relationships
- `Tournament.partecipants` = Integer count of participants
- `Tournament.player` = ManyToMany relationship to UserProfile
- `Tournament.creator` = ForeignKey to UserProfile
- `Tournament.winner` = ForeignKey to UserProfile (nullable)

### Performance Considerations
- WebSocket connections are lightweight but should be properly closed
- Bracket rendering can be intensive for large tournaments
- Real-time updates should be throttled to prevent UI flooding
- Consider pagination for tournament lists

### Security
- All API endpoints require proper authentication
- WebSocket connections validate user tokens
- Only tournament creators can manage rounds
- Participants can only leave before tournament starts

---

This documentation should provide your frontend team with everything needed to implement a smooth tournament experience. The system is designed to be real-time, user-friendly, and robust for competitive gaming scenarios.
