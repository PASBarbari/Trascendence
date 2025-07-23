/**
 * Complete Frontend Integration Strategy for Real-Time Online Status
 * 
 * This demonstrates the BEST PRACTICE approach:
 * 1. ✅ WebSocket push notifications for real-time updates
 * 2. ✅ Initial API call to get current status
 * 3. ✅ Efficient caching and UI updates
 * 4. ❌ NO polling every 5 seconds (inefficient)
 */

class RealTimeStatusManager {
    constructor() {
        this.notificationWS = null;
        this.onlineStatusManager = null;
        this.pageLoadTime = Date.now();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
    }

    /**
     * Initialize the complete real-time status system
     */
    async init() {
        // 1. Initialize online status manager
        this.onlineStatusManager = window.onlineStatusManager;
        
        // 2. Connect to notification WebSocket
        await this.connectWebSocket();
        
        // 3. Load initial friends status
        await this.loadInitialFriendsStatus();
        
        // 4. Setup page visibility handling
        this.setupVisibilityHandling();
        
        // 5. Setup connection monitoring
        this.setupConnectionMonitoring();
    }

    /**
     * Connect to notification WebSocket
     */
    async connectWebSocket() {
        try {
            const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${wsProtocol}//${window.location.host}/ws/notifications/`;
            
            this.notificationWS = new WebSocket(wsUrl);
            
            this.notificationWS.onopen = () => {
                console.log('✅ Real-time status connection established');
                this.reconnectAttempts = 0;
                this.onlineStatusManager.init(this);
            };

            this.notificationWS.onmessage = (event) => {
                const data = JSON.parse(event.data);
                this.handleMessage(data);
            };

            this.notificationWS.onclose = () => {
                console.log('❌ Real-time status connection lost');
                this.handleDisconnection();
            };

            this.notificationWS.onerror = (error) => {
                console.error('WebSocket error:', error);
            };

        } catch (error) {
            console.error('Failed to connect WebSocket:', error);
            this.scheduleReconnect();
        }
    }

    /**
     * Handle WebSocket messages
     */
    handleMessage(data) {
        // Delegate to online status manager
        this.onlineStatusManager.handleOnlineStatusMessage(data);
        
        // Handle other notification types
        switch(data.type) {
            case 'friend_request':
            case 'friend_request_accepted':
            case 'game_invitation':
                this.showNotification(data);
                break;
                
            case 'queued_notifications':
                this.handleQueuedNotifications(data.notifications);
                break;
        }
    }

    /**
     * Load initial friends status on page load
     */
    async loadInitialFriendsStatus() {
        try {
            console.log('📡 Loading initial friends status...');
            const friendsData = await this.onlineStatusManager.fetchFriendsOnlineStatus();
            
            if (friendsData) {
                console.log(`✅ Loaded status for ${friendsData.total_friends} friends, ${friendsData.online_friends} online`);
            }
        } catch (error) {
            console.error('Failed to load initial friends status:', error);
        }
    }

    /**
     * Handle page visibility changes (user switches tabs)
     */
    setupVisibilityHandling() {
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                // Page became visible - refresh friends status
                setTimeout(() => {
                    this.refreshFriendsStatus();
                }, 1000);
            }
        });
    }

    /**
     * Refresh friends status when needed
     */
    async refreshFriendsStatus() {
        const timeSinceLoad = Date.now() - this.pageLoadTime;
        
        // Only refresh if page has been loaded for more than 30 seconds
        if (timeSinceLoad > 30000) {
            console.log('🔄 Refreshing friends status after tab switch...');
            await this.loadInitialFriendsStatus();
        }
    }

    /**
     * Monitor connection health
     */
    setupConnectionMonitoring() {
        setInterval(() => {
            if (this.notificationWS && this.notificationWS.readyState === WebSocket.OPEN) {
                // Connection is healthy
                const lastHeartbeat = this.onlineStatusManager.lastHeartbeat;
                if (Date.now() - lastHeartbeat > 120000) { // 2 minutes without heartbeat
                    console.warn('⚠️ No heartbeat for 2 minutes, reconnecting...');
                    this.reconnect();
                }
            } else {
                // Connection is broken
                this.handleDisconnection();
            }
        }, 60000); // Check every minute
    }

    /**
     * Handle WebSocket disconnection
     */
    handleDisconnection() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect();
        } else {
            console.error('❌ Max reconnection attempts reached');
            this.showConnectionError();
        }
    }

    /**
     * Schedule reconnection attempt
     */
    scheduleReconnect() {
        this.reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000); // Exponential backoff, max 30s
        
        console.log(`🔄 Reconnecting in ${delay/1000}s (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        
        setTimeout(() => {
            this.connectWebSocket();
        }, delay);
    }

    /**
     * Force reconnection
     */
    reconnect() {
        if (this.notificationWS) {
            this.notificationWS.close();
        }
        this.connectWebSocket();
    }

    /**
     * Show connection error to user
     */
    showConnectionError() {
        const errorDiv = document.createElement('div');
        errorDiv.id = 'connection-error';
        errorDiv.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; right: 0; background: #ef4444; color: white; padding: 10px; text-align: center; z-index: 10001;">
                ⚠️ Connection lost. Some features may not work properly.
                <button onclick="window.realTimeStatusManager.reconnect()" style="margin-left: 10px; background: white; color: #ef4444; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">
                    Retry
                </button>
            </div>
        `;
        document.body.appendChild(errorDiv);
    }

    /**
     * Send heartbeat
     */
    sendHeartbeat() {
        if (this.notificationWS && this.notificationWS.readyState === WebSocket.OPEN) {
            this.notificationWS.send(JSON.stringify({type: 'heartbeat'}));
        }
    }

    /**
     * Handle queued notifications
     */
    handleQueuedNotifications(notifications) {
        notifications.forEach(notification => {
            this.showNotification(notification);
        });
    }

    /**
     * Show notification to user
     */
    showNotification(notification) {
        // Implement your notification display logic
        console.log('📬 New notification:', notification);
    }
}

/**
 * Usage Strategy Examples
 */

// ✅ BEST PRACTICE: Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    window.realTimeStatusManager = new RealTimeStatusManager();
    await window.realTimeStatusManager.init();
});

// ✅ BEST PRACTICE: Use for friend list
class OptimizedFriendList {
    constructor() {
        this.friends = [];
    }

    async init() {
        await this.loadFriends();
        // No need for manual status polling - WebSocket handles it!
        this.setupRealTimeUpdates();
    }

    async loadFriends() {
        // Load friends from API (includes current online status)
        const response = await fetch('/api/friends/?status=accepted');
        this.friends = await response.json();
        this.renderFriends();
    }

    setupRealTimeUpdates() {
        // Subscribe to real-time updates
        this.friends.forEach(friendship => {
            const friendId = this.getFriendId(friendship);
            
            window.onlineStatusManager.onStatusChange(friendId, (userId, isOnline) => {
                this.updateFriendUI(userId, isOnline);
                console.log(`👤 ${userId} is now ${isOnline ? 'online' : 'offline'}`);
            });
        });
    }

    updateFriendUI(userId, isOnline) {
        const friendElement = document.querySelector(`[data-user-id="${userId}"]`);
        if (friendElement) {
            const statusElement = friendElement.querySelector('.online-status');
            statusElement.className = `online-status ${isOnline ? 'online' : 'offline'}`;
            statusElement.textContent = isOnline ? '🟢' : '⚫';
        }
    }
}

// ❌ BAD PRACTICE: Don't do this!
/*
setInterval(async () => {
    // This creates unnecessary load on your servers
    const response = await fetch('/api/friends/online-status/');
    // Update UI...
}, 5000); // Every 5 seconds = 720 requests per hour per user!
*/

// ✅ INSTEAD: Use the real-time system above which only makes requests when:
//    1. Page loads initially
//    2. User switches back to tab after being away
//    3. Connection is lost and needs refresh
