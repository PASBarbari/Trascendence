#!/usr/bin/env node

/**
 * DEMO: Enhanced WebSocket Message Handler System
 * This script demonstrates how easy it is to add new message types
 */

// Mock the required functions for demo
function showNotificationToast(message, type) {
    console.log(`🔔 ${type.toUpperCase()}: ${message}`);
}

function getFriends() { console.log("📱 Refreshing friends list..."); }
function updateChatList() { console.log("💬 Updating chat list..."); }
function renderFriendRequest() { console.log("👥 Rendering friend requests..."); }

let messageHistory = [];

// Import the message handler registry (simplified for demo)
const MESSAGE_HANDLERS = {
    'friend_request': (msg) => console.log("👤 Friend request handler"),
    'friend_accepted': (msg) => console.log("✅ Friend accepted handler"),
    'chat_message': (msg) => console.log("💬 Chat message handler"),
    'game_invitation': (msg) => console.log("🎮 Game invitation handler"),
    'default': (msg) => console.log("❓ Default handler")
};

// Enhanced getMessageType function
function getMessageType(message) {
    if (!message || typeof message !== "object") return "default";
    
    if (message.message && typeof message.message === "object") {
        return message.message.type || "default";
    }
    
    if (message.type) return message.type;
    
    if (typeof message.message === "string") {
        const stringMessage = message.message.toLowerCase();
        const stringTypeMapping = {
            'accepted your friend request': 'friend_accepted',
            'game invitation': 'game_invitation',
            'chat room': 'chat_room_created'
        };
        
        for (const [pattern, type] of Object.entries(stringTypeMapping)) {
            if (stringMessage.includes(pattern)) return type;
        }
        return "string_message";
    }
    
    return "default";
}

// Dynamic handler registration
function registerMessageHandler(messageType, handlerFunction) {
    MESSAGE_HANDLERS[messageType] = handlerFunction;
    console.log(`✅ Registered new handler: ${messageType}`);
}

// Message processor
function processMessage(message) {
    const messageType = getMessageType(message);
    const handler = MESSAGE_HANDLERS[messageType] || MESSAGE_HANDLERS['default'];
    
    console.log(`🔄 Processing message type: ${messageType}`);
    handler(message);
}

// DEMO STARTS HERE
console.log("🚀 DEMO: Enhanced WebSocket Message Handler System\n");

console.log("📋 Current registered handlers:");
console.log(Object.keys(MESSAGE_HANDLERS).join(", "));
console.log("");

// Demo 1: Add a custom payment handler
console.log("💰 Demo 1: Adding custom payment handler");
registerMessageHandler('payment_notification', function(message) {
    const amount = message.data?.amount || 'unknown';
    const currency = message.data?.currency || 'USD';
    showNotificationToast(`Payment received: ${amount} ${currency}`, 'success');
});

// Demo 2: Add a custom weather handler  
console.log("🌤️  Demo 2: Adding custom weather handler");
registerMessageHandler('weather_alert', function(message) {
    const condition = message.data?.condition || 'unknown';
    const location = message.data?.location || 'your area';
    showNotificationToast(`Weather alert: ${condition} in ${location}`, 'warning');
});

console.log("\n📨 Testing various message types:\n");

// Test different message formats
const testMessages = [
    {
        name: "Structured friend request",
        message: {
            message: { type: 'friend_request', data: { user_id: 123, username: 'alice' } }
        }
    },
    {
        name: "Direct type game invitation", 
        message: {
            type: 'game_invitation',
            data: { game_type: 'pong', inviter: 'bob' }
        }
    },
    {
        name: "Custom payment notification",
        message: {
            type: 'payment_notification',
            data: { amount: 100, currency: 'EUR' }
        }
    },
    {
        name: "Custom weather alert",
        message: {
            type: 'weather_alert', 
            data: { condition: 'Storm warning', location: 'Milan' }
        }
    },
    {
        name: "Legacy string message",
        message: { message: "accepted your friend request" }
    },
    {
        name: "Unknown message type",
        message: { type: 'unknown_type', data: { test: 'data' } }
    }
];

testMessages.forEach((test, index) => {
    console.log(`${index + 1}. ${test.name}:`);
    processMessage(test.message);
    console.log("");
});

console.log("📊 Final registered handlers:");
console.log(Object.keys(MESSAGE_HANDLERS).join(", "));

console.log("\n🎉 Demo completed! The system successfully:");
console.log("   ✅ Processed multiple message formats");  
console.log("   ✅ Routed messages to correct handlers");
console.log("   ✅ Added custom handlers dynamically");
console.log("   ✅ Handled unknown message types gracefully");

console.log("\n💡 To add a new handler in your code:");
console.log("   registerMessageHandler('your_type', yourHandlerFunction);");
