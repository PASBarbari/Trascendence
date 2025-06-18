# 🛡️ User Blocking System Documentation

## Overview

This comprehensive user blocking system prevents blocked users from interacting with each other in the chat application. The system includes both backend security measures and frontend user experience enhancements.

## Architecture

### Backend Components

1. **Models** (`/Back-End/chat/my_chat/models.py`)
   - `UserProfile.blockedUsers`: Many-to-many relationship for blocked users
   - Non-symmetrical blocking (User A blocking User B doesn't automatically block User A from User B)

2. **API Views** (`/Back-End/chat/my_chat/views.py`)
   - `GetChatMessage`: Filters messages from blocked users
   - `CreateChat`: Prevents adding blocked users to new chats (bidirectional)
   - `GetChats`: Filters out chats containing only blocked users
   - `AddUsersToChat`: Validates against blocked users when adding to existing chats
   - `BlockUser`: Manages blocking/unblocking operations

3. **WebSocket Consumer** (`/Back-End/chat/my_chat/consumers.py`)
   - `ChatConsumer.is_user_blocked()`: Checks if sender is blocked
   - `ChatConsumer.chat_message()`: Filters real-time messages from blocked users

### Frontend Components

1. **Blocking Module** (`/Front-End/public/chat/blockUser.js`)
   - Core blocking functionality
   - Blocked users modal management
   - API integration for block/unblock operations

2. **Chat Integration** (`/Front-End/public/chat/ExpandableSidebar.js`)
   - Message filtering for blocked users
   - WebSocket message handling with blocking checks
   - Blocked users caching

3. **UI Components**
   - Block/unblock buttons in friend lists
   - "Manage Blocked Users" modal
   - Integration with notification system and pong friend lists

## Features

### ✅ Implemented Features

#### Backend Security
- **Bidirectional Blocking Validation**: Prevents adding users who have blocked each other
- **Message Filtering**: Excludes messages from blocked users in API responses
- **Real-time Message Blocking**: WebSocket consumer filters messages from blocked users
- **Chat Creation Protection**: Filters blocked users from new chat creation
- **Chat Membership Filtering**: Hides chats containing only blocked users

#### Frontend User Experience
- **Block/Unblock UI**: Easy-to-use buttons in friend interfaces
- **Blocked Users Management**: Modal for viewing and managing blocked users
- **Real-time Updates**: Immediate UI updates when blocking/unblocking users
- **Message Filtering**: Client-side filtering of messages from blocked users
- **Interaction Prevention**: Blocks game invitations and chat access for blocked users

#### API Endpoints
- `POST /chat/chat/block_user/{user_id}/` - Block a user
- `DELETE /chat/chat/block_user/{user_id}/` - Unblock a user
- `GET /chat/chat/block_user/` - Get list of blocked users

## Implementation Details

### Backend Filtering Logic

```python
# In CreateChat.perform_create()
def perform_create(self, serializer):
    creator = self.request.user
    user_ids = self.request.data.get('users', [])
    
    # Filter out users that creator has blocked
    creator_profile = UserProfile.objects.get(user_id=creator.user_id)
    blocked_user_ids = list(creator_profile.blockedUsers.values_list('user_id', flat=True))
    filtered_user_ids = [uid for uid in user_ids if uid not in blocked_user_ids]
    
    # Filter out users who have blocked the creator (bidirectional)
    users_to_add = UserProfile.objects.filter(user_id__in=filtered_user_ids)
    final_user_ids = []
    
    for user_to_add in users_to_add:
        if not user_to_add.blockedUsers.filter(user_id=creator.user_id).exists():
            final_user_ids.append(user_to_add.user_id)
    
    # Update serializer with filtered users
    serializer.validated_data['users'] = final_user_ids
    return serializer.save()
```

### WebSocket Message Filtering

```python
# In ChatConsumer.chat_message()
async def chat_message(self, event):
    is_blocked = await self.is_user_blocked(event['sender'])
    
    if is_blocked:
        logger.info(f"Message from {event['sender']} blocked by user {self.scope['user']}")
        return  # Don't send message if user is blocked
    
    await self.send(text_data=json.dumps({
        'message': event['message'],
        'room_id': event['room_id'],
        'sender': event['sender'],
        'timestamp': event['timestamp']
    }))
```

### Frontend Message Filtering

```javascript
// In ExpandableSidebar.js WebSocket message handler
socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    // Check if sender is blocked
    if (isUserBlocked(data.sender)) {
        console.log(`Message from blocked user ${data.sender} filtered out`);
        return; // Don't display message
    }
    
    // Process and display message
    const chatBubble = renderChatBubble({
        sender: data.sender,
        message: data.message,
        // ... other properties
    });
    chatContent.appendChild(chatBubble);
};
```

## Database Schema

```sql
-- UserProfile blocked users relationship
CREATE TABLE my_chat_userprofile_blockedUsers (
    id SERIAL PRIMARY KEY,
    from_userprofile_id INTEGER REFERENCES my_chat_userprofile(user_id),
    to_userprofile_id INTEGER REFERENCES my_chat_userprofile(user_id),
    UNIQUE(from_userprofile_id, to_userprofile_id)
);
```

## Security Considerations

### ✅ Protection Measures
1. **JWT Authentication**: All blocking endpoints require valid authentication
2. **Permission Checks**: Users can only manage their own blocked users list
3. **Input Validation**: User IDs are validated before processing
4. **SQL Injection Prevention**: Using Django ORM parameterized queries
5. **Race Condition Protection**: Atomic database operations

### ✅ Privacy Features
1. **Silent Blocking**: Blocked users aren't notified they've been blocked
2. **Invisible Messages**: Messages from blocked users simply don't appear
3. **Chat Filtering**: Users don't see chats with only blocked participants

## Testing

### Backend Tests (`test_blocking_system.py`)
- Block/unblock functionality
- Bidirectional blocking validation
- Chat creation with blocked users
- Message filtering
- API endpoint responses

### Frontend Tests (`test_blocking_ui.html`)
- UI responsiveness
- Block/unblock button functionality
- Modal management
- Real-time updates
- Interaction prevention

## Usage Examples

### Blocking a User
```javascript
// Frontend
await blockUser(userId, username);

// Backend API
POST /chat/chat/block_user/123/
Authorization: Bearer <jwt_token>
```

### Creating a Chat (with automatic filtering)
```javascript
// Users 1, 2, 3 requested, but user 2 is blocked
const response = await fetch('/chat/chat/chat_rooms/create/', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer <token>' },
    body: JSON.stringify({
        room_name: 'Test Chat',
        users: [1, 2, 3] // User 2 will be automatically filtered out
    })
});
// Result: Chat created with only users 1 and 3
```

### Managing Blocked Users
```javascript
// Show blocked users modal
showBlockedUsersModal();

// Get blocked users list
const blockedUsers = await getBlockedUsersList();
```

## File Structure

```
/Back-End/chat/my_chat/
├── models.py                 # UserProfile.blockedUsers relationship
├── views.py                  # API endpoints with blocking logic
├── consumers.py              # WebSocket consumer with message filtering
└── serializers.py           # Blocked users serialization

/Front-End/public/
├── chat/
│   ├── blockUser.js         # Core blocking functionality
│   ├── ExpandableSidebar.js # Chat integration with blocking
│   └── chat.css             # Styling for block buttons
├── notification/
│   └── notification.js      # Friend list integration
└── pong/
    ├── pongContainer.js     # Pong friend list integration
    ├── friendlist.html      # Updated friend list template
    └── friendlist.css       # Block button styling
```

## Performance Optimizations

1. **Caching**: Blocked users list cached in frontend
2. **Efficient Queries**: Single database queries for blocked user checks
3. **Lazy Loading**: Blocked users loaded only when needed
4. **Minimal DOM Updates**: Efficient UI updates for blocking changes

## Error Handling

### Backend Errors
- Invalid user IDs return 404 with descriptive messages
- Authentication failures return 401
- Server errors return 500 with logged details

### Frontend Errors
- Network failures show user-friendly error messages
- Invalid operations are prevented with UI validation
- Graceful degradation when APIs are unavailable

## Logging

Comprehensive logging for debugging and monitoring:
- User blocking/unblocking actions
- Filtered messages and chat creations
- Error conditions and edge cases
- Performance metrics for blocking operations

## Future Enhancements

### Potential Improvements
1. **Temporary Blocks**: Time-limited blocking with auto-expiry
2. **Block Reasons**: Optional reasons for blocking users
3. **Admin Override**: Admin ability to manage blocks
4. **Block Statistics**: Analytics on blocking patterns
5. **Bulk Operations**: Block multiple users at once
6. **Import/Export**: Block list backup and restore

## Maintenance

### Regular Tasks
1. **Log Review**: Monitor blocking-related logs for issues
2. **Performance Monitoring**: Track blocking operation performance
3. **Database Cleanup**: Remove orphaned blocking relationships
4. **Security Audits**: Review blocking system for vulnerabilities

### Troubleshooting

Common issues and solutions:
1. **Messages Still Visible**: Check WebSocket consumer implementation
2. **Blocked Users in Chats**: Verify API view filtering logic
3. **UI Not Updating**: Check blocked users cache refresh
4. **Performance Issues**: Review database query optimization

## Conclusion

This blocking system provides comprehensive protection against unwanted interactions while maintaining a smooth user experience. The bidirectional filtering ensures that blocked relationships are respected in all chat interactions, both in real-time messaging and historical data access.

The system is designed to be secure, performant, and user-friendly, with extensive testing coverage to ensure reliability in production environments.
