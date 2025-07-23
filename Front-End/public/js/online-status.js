/**
 * OnlineStatusManager - Handles real-time online status for users
 * Integrates with NotificationWebSocket for heartbeat and status updates
 */
class OnlineStatusManager {
    constructor() {
        this.onlineUsers = new Map(); // user_id -> boolean
        this.statusCallbacks = new Map(); // user_id -> [callback functions]
        this.notificationWS = null;
        this.heartbeatInterval = null;
        this.lastHeartbeat = Date.now();
    }

    /**
     * Initialize with notification WebSocket
     */
    init(notificationWebSocket) {
        this.notificationWS = notificationWebSocket;
        this.setupMessageHandlers();
        this.startHeartbeat();
    }

    /**
     * Setup message handlers for WebSocket
     */
    setupMessageHandlers() {
        if (!this.notificationWS) return;

        // Add our message handler to the notification WebSocket
        const originalHandleMessage = this.notificationWS.handleMessage.bind(this.notificationWS);
        this.notificationWS.handleMessage = (data) => {
            // Handle online status messages
            this.handleOnlineStatusMessage(data);
            // Call original handler for other messages
            originalHandleMessage(data);
        };
    }

    /**
     * Handle online status related WebSocket messages
     */
    handleOnlineStatusMessage(data) {
        switch(data.type) {
            case 'heartbeat_request':
                this.sendHeartbeat();
                break;
                
            case 'heartbeat_ack':
                this.lastHeartbeat = Date.now();
                break;
                
            case 'friend_status_update':
                // Real-time friend status change
                this.updateUserStatus(data.user_id, data.is_online);
                this.showStatusChangeNotification(data.user_id, data.is_online);
                break;
                
            case 'friends_online_status':
                // Batch update of friends' status
                this.updateMultipleUserStatus(data.friends);
                break;
        }
    }

    /**
     * Start heartbeat mechanism
     */
    startHeartbeat() {
        // Send heartbeat every 25 seconds
        this.heartbeatInterval = setInterval(() => {
            this.sendHeartbeat();
        }, 25000);
    }

    /**
     * Send heartbeat to server
     */
    sendHeartbeat() {
        if (this.notificationWS && this.notificationWS.ws && 
            this.notificationWS.ws.readyState === WebSocket.OPEN) {
            this.notificationWS.ws.send(JSON.stringify({type: 'heartbeat'}));
        }
    }

    /**
     * Update single user online status
     */
    updateUserStatus(userId, isOnline) {
        const userIdStr = userId.toString();
        const wasOnline = this.onlineUsers.get(userIdStr);
        
        if (wasOnline !== isOnline) {
            this.onlineUsers.set(userIdStr, isOnline);
            this.notifyStatusChange(userIdStr, isOnline);
            this.updateUIForUser(userIdStr, isOnline);
        }
    }

    /**
     * Update multiple users' online status
     */
    updateMultipleUserStatus(statusMap) {
        for (const [userId, isOnline] of Object.entries(statusMap)) {
            this.updateUserStatus(userId, isOnline);
        }
    }

    /**
     * Get user's online status
     */
    isUserOnline(userId) {
        return this.onlineUsers.get(userId.toString()) || false;
    }

    /**
     * Subscribe to status changes for a user
     */
    onStatusChange(userId, callback) {
        const userIdStr = userId.toString();
        if (!this.statusCallbacks.has(userIdStr)) {
            this.statusCallbacks.set(userIdStr, []);
        }
        this.statusCallbacks.get(userIdStr).push(callback);

        // Return unsubscribe function
        return () => {
            const callbacks = this.statusCallbacks.get(userIdStr);
            if (callbacks) {
                const index = callbacks.indexOf(callback);
                if (index > -1) callbacks.splice(index, 1);
            }
        };
    }

    /**
     * Notify all callbacks about status change
     */
    notifyStatusChange(userId, isOnline) {
        const callbacks = this.statusCallbacks.get(userId);
        if (callbacks) {
            callbacks.forEach(callback => {
                try {
                    callback(userId, isOnline);
                } catch (error) {
                    console.error('Error in status change callback:', error);
                }
            });
        }
    }

    /**
     * Update UI elements for user status
     */
    updateUIForUser(userId, isOnline) {
        // Update all elements with data-user-id attribute
        const elements = document.querySelectorAll(`[data-user-id="${userId}"]`);
        elements.forEach(element => {
            const statusIndicator = element.querySelector('.online-status, .status-indicator');
            if (statusIndicator) {
                statusIndicator.className = `online-status ${isOnline ? 'online' : 'offline'}`;
                statusIndicator.textContent = isOnline ? '●' : '○';
                statusIndicator.title = isOnline ? 'Online' : 'Offline';
            }

            // Update text elements
            const statusText = element.querySelector('.status-text');
            if (statusText) {
                statusText.textContent = isOnline ? 'Online' : 'Offline';
                statusText.className = `status-text ${isOnline ? 'online' : 'offline'}`;
            }
        });
    }

    /**
     * Fetch online status for multiple users from API
     */
    async fetchOnlineStatus(userIds) {
        if (!userIds || userIds.length === 0) return {};

        try {
            const response = await fetch('/api/notifications/online-status/', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                    'Content-Type': 'application/json'
                },
                // Use query parameters for GET request
                url: `/api/notifications/online-status/?user_ids=${userIds.join(',')}`
            });

            if (response.ok) {
                const data = await response.json();
                this.updateMultipleUserStatus(data.online_statuses);
                return data.online_statuses;
            }
        } catch (error) {
            console.error('Error fetching online status:', error);
        }
        return {};
    }

    /**
     * Fetch friends' online status
     */
    async fetchFriendsOnlineStatus() {
        try {
            const response = await fetch('/api/notifications/online-status/?friends=true', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                const statusMap = {};
                data.friends.forEach(friend => {
                    statusMap[friend.user_id] = friend.is_online;
                });
                this.updateMultipleUserStatus(statusMap);
                return data;
            }
        } catch (error) {
            console.error('Error fetching friends online status:', error);
        }
        return null;
    }

    /**
     * Show notification when friend comes online/offline
     */
    showStatusChangeNotification(userId, isOnline) {
        // Get username from cache or element
        const userElement = document.querySelector(`[data-user-id="${userId}"]`);
        const username = userElement?.querySelector('.username, .friend-name, h4')?.textContent || `User ${userId}`;
        
        // Show subtle notification
        if (this.shouldShowStatusNotifications()) {
            const message = `${username} is now ${isOnline ? 'online' : 'offline'}`;
            this.showToast(message, isOnline ? 'success' : 'info');
        }
    }

    /**
     * Check if status notifications should be shown
     */
    shouldShowStatusNotifications() {
        return localStorage.getItem('show_status_notifications') !== 'false';
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        // Simple toast implementation
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        // Style the toast
        Object.assign(toast.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '12px 20px',
            borderRadius: '6px',
            color: 'white',
            fontSize: '14px',
            zIndex: '10000',
            transition: 'all 0.3s ease',
            backgroundColor: type === 'success' ? '#10b981' : '#3b82f6'
        });
        
        document.body.appendChild(toast);
        
        // Remove after 3 seconds
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    }

    /**
     * Initialize online status for a list of users
     */
    async initializeUsersStatus(userIds) {
        return await this.fetchOnlineStatus(userIds);
    }

    /**
     * Clean up resources
     */
    destroy() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
        this.onlineUsers.clear();
        this.statusCallbacks.clear();
    }
}

// Create global instance
window.onlineStatusManager = new OnlineStatusManager();

/**
 * Utility function to create online status indicator
 */
function createOnlineStatusIndicator(userId, isOnline = false) {
    const indicator = document.createElement('span');
    indicator.className = `online-status ${isOnline ? 'online' : 'offline'}`;
    indicator.textContent = isOnline ? '●' : '○';
    indicator.title = isOnline ? 'Online' : 'Offline';
    
    // Subscribe to status changes
    window.onlineStatusManager.onStatusChange(userId, (id, online) => {
        indicator.className = `online-status ${online ? 'online' : 'offline'}`;
        indicator.textContent = online ? '●' : '○';
        indicator.title = online ? 'Online' : 'Offline';
    });
    
    return indicator;
}

/**
 * CSS for online status indicators
 */
const statusCSS = `
    .online-status {
        display: inline-block;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        font-size: 12px;
        line-height: 1;
        margin-left: 5px;
    }
    
    .online-status.online {
        color: #10b981;
        background: #10b981;
    }
    
    .online-status.offline {
        color: #6b7280;
        background: #6b7280;
    }
    
    .status-text.online {
        color: #10b981;
        font-weight: 500;
    }
    
    .status-text.offline {
        color: #6b7280;
    }
`;

// Inject CSS
const style = document.createElement('style');
style.textContent = statusCSS;
document.head.appendChild(style);
