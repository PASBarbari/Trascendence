/**
 * Example integration for Friend List page
 */
class FriendListManager {
    constructor() {
        this.friends = [];
        this.container = null;
    }

    async init(containerId) {
        this.container = document.getElementById(containerId);
        await this.loadFriends();
        this.setupRealTimeUpdates();
    }

    async loadFriends() {
        try {
            const response = await fetch('/api/friends/?status=accepted', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                }
            });

            if (response.ok) {
                this.friends = await response.json();
                this.renderFriends();
                
                // Initialize online status for all friends
                const friendIds = this.getFriendIds();
                await window.onlineStatusManager.initializeUsersStatus(friendIds);
            }
        } catch (error) {
            console.error('Error loading friends:', error);
        }
    }

    getFriendIds() {
        return this.friends.map(friendship => {
            // Determine which user is the friend
            const currentUserId = getCurrentUserId(); // Implement this function
            return friendship.user_1.user_id === currentUserId 
                ? friendship.user_2.user_id 
                : friendship.user_1.user_id;
        });
    }

    renderFriends() {
        if (!this.container) return;

        this.container.innerHTML = '';

        this.friends.forEach(friendship => {
            const currentUserId = getCurrentUserId();
            const friend = friendship.user_1.user_id === currentUserId 
                ? friendship.user_2 
                : friendship.user_1;

            const friendElement = this.createFriendElement(friend);
            this.container.appendChild(friendElement);
        });
    }

    createFriendElement(friend) {
        const div = document.createElement('div');
        div.className = 'friend-item';
        div.setAttribute('data-user-id', friend.user_id);

        const isOnline = window.onlineStatusManager.isUserOnline(friend.user_id);
        const statusIndicator = createOnlineStatusIndicator(friend.user_id, isOnline);

        div.innerHTML = `
            <div class="friend-info">
                <img src="${friend.avatar || '/default-avatar.png'}" 
                     alt="${friend.username}" class="friend-avatar">
                <div class="friend-details">
                    <h4>${friend.username}</h4>
                    <span class="status-text ${isOnline ? 'online' : 'offline'}">
                        ${isOnline ? 'Online' : 'Offline'}
                    </span>
                </div>
            </div>
            <div class="friend-actions">
                <button onclick="startChat(${friend.user_id})">Chat</button>
                <button onclick="inviteToGame(${friend.user_id})">Invite to Game</button>
            </div>
        `;

        // Add status indicator
        div.querySelector('.friend-details').appendChild(statusIndicator);

        return div;
    }

    setupRealTimeUpdates() {
        // Subscribe to status changes for all friends
        this.getFriendIds().forEach(friendId => {
            window.onlineStatusManager.onStatusChange(friendId, (userId, isOnline) => {
                this.updateFriendStatus(userId, isOnline);
            });
        });
    }

    updateFriendStatus(userId, isOnline) {
        const friendElement = this.container.querySelector(`[data-user-id="${userId}"]`);
        if (friendElement) {
            const statusText = friendElement.querySelector('.status-text');
            if (statusText) {
                statusText.textContent = isOnline ? 'Online' : 'Offline';
                statusText.className = `status-text ${isOnline ? 'online' : 'offline'}`;
            }
        }
    }
}

/**
 * Example integration for User Search
 */
class UserSearchManager {
    constructor() {
        this.searchResults = [];
        this.container = null;
        this.searchInput = null;
    }

    init(searchInputId, resultsContainerId) {
        this.searchInput = document.getElementById(searchInputId);
        this.container = document.getElementById(resultsContainerId);
        
        this.setupSearchHandler();
    }

    setupSearchHandler() {
        let searchTimeout;
        
        this.searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.performSearch(e.target.value);
            }, 500); // Debounce search
        });
    }

    async performSearch(query) {
        if (query.length < 2) {
            this.container.innerHTML = '';
            return;
        }

        try {
            const response = await fetch(`/api/users/search/?search=${encodeURIComponent(query)}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.searchResults = data.results || [];
                this.renderSearchResults();
                
                // Initialize online status for search results
                const userIds = this.searchResults.map(user => user.user_id);
                if (userIds.length > 0) {
                    await window.onlineStatusManager.initializeUsersStatus(userIds);
                }
            }
        } catch (error) {
            console.error('Error searching users:', error);
        }
    }

    renderSearchResults() {
        if (!this.container) return;

        this.container.innerHTML = '';

        if (this.searchResults.length === 0) {
            this.container.innerHTML = '<p>No users found</p>';
            return;
        }

        this.searchResults.forEach(user => {
            const userElement = this.createUserElement(user);
            this.container.appendChild(userElement);
        });
    }

    createUserElement(user) {
        const div = document.createElement('div');
        div.className = 'user-search-item';
        div.setAttribute('data-user-id', user.user_id);

        const isOnline = user.is_online || window.onlineStatusManager.isUserOnline(user.user_id);
        const statusIndicator = createOnlineStatusIndicator(user.user_id, isOnline);

        div.innerHTML = `
            <div class="user-info">
                <img src="${user.avatar || '/default-avatar.png'}" 
                     alt="${user.username}" class="user-avatar">
                <div class="user-details">
                    <h4>${user.username}</h4>
                    <span class="user-email">${user.email}</span>
                    <span class="status-text ${isOnline ? 'online' : 'offline'}">
                        ${isOnline ? 'Online' : 'Offline'}
                    </span>
                </div>
            </div>
            <div class="user-actions">
                <button onclick="sendFriendRequest(${user.user_id})">Add Friend</button>
                <button onclick="viewProfile(${user.user_id})">View Profile</button>
            </div>
        `;

        // Add status indicator
        div.querySelector('.user-details').appendChild(statusIndicator);

        // Subscribe to real-time status updates
        window.onlineStatusManager.onStatusChange(user.user_id, (userId, isOnline) => {
            const statusText = div.querySelector('.status-text');
            if (statusText) {
                statusText.textContent = isOnline ? 'Online' : 'Offline';
                statusText.className = `status-text ${isOnline ? 'online' : 'offline'}`;
            }
        });

        return div;
    }
}

// Global functions for easy access
function getCurrentUserId() {
    // Implement based on your authentication system
    const token = localStorage.getItem('access_token');
    if (token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.user_id;
        } catch (e) {
            return null;
        }
    }
    return null;
}

function startChat(userId) {
    // Implement chat functionality
    window.location.href = `/chat/?user=${userId}`;
}

function inviteToGame(userId) {
    // Implement game invitation
    console.log('Inviting user to game:', userId);
}

function sendFriendRequest(userId) {
    // Implement friend request
    console.log('Sending friend request to:', userId);
}

function viewProfile(userId) {
    // Implement profile view
    window.location.href = `/profile/${userId}`;
}
