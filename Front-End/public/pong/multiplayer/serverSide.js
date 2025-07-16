// Fix the import paths - they should point to the locale folder
import { state } from "../locale/state.js";
import { getVariables } from "../../var.js";
import { renderPong } from "../locale/pong.js";
import * as GAME from "../locale/gameLogic.js";
import * as UTILS from "../locale/utils.js";
import { getCookie } from "../../cookie.js";
import { showNotification } from "../pongContainer.js";

let socket;

async function createGame(player_1, player_2) {
	const { url_api, token } = getVariables();

	if (!url_api || !token) {
		throw new Error("Missing API URL or authentication token");
	}

	// Ensure player IDs are sent as integers, not arrays
	const gameData = {
		player_1: parseInt(player_1),
		player_2: parseInt(player_2),
	};

	console.log("🎮 Creating game with data:", gameData);

	try {
		const response = await fetch(`${url_api}/pong/game`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify(gameData),
		});

		if (!response.ok) {
			const errorData = await response.json();
			console.error("❌ Game creation failed:", errorData);
			throw new Error(
				`HTTP ${response.status}: ${JSON.stringify(errorData)}`
			);
		}

		const data = await response.json();
		console.log("✅ Game created successfully:", data);

		// Extract room_id and initialize WebSocket
		const room_id = data.room_id || data.id;
		if (room_id) {
			initializeWebSocket(room_id, player_1, player_2);
		} else {
			throw new Error("No room_id received from server");
		}

		return data;
	} catch (error) {
		console.error("❌ Error creating game:", error);
		throw error;
	}
}

function initializeWebSocket(room_id, player1, player2) {
	const { token, wss_api } = getVariables();

	console.log("🔧 WebSocket Connection Debug:");
	console.log("  - wss_api value:", wss_api);
	console.log("  - room_id:", room_id);
	console.log("  - player1:", player1);
	console.log("  - player2:", player2);
	console.log("  - token present:", token ? "✅ Yes" : "❌ No");
	console.log("  - token length:", token ? token.length : 0);

	const wsUrl = `${wss_api}/pong/ws/pong/${room_id}/?token=${token}`;
	console.log("🔌 Connecting to WebSocket:", wsUrl);

	socket = new WebSocket(wsUrl);

	socket.onopen = function () {
		console.log("✅ WebSocket connection established successfully!");
		console.log("🎮 Connected to room:", room_id);
		console.log("👥 Players:", player1, "vs", player2);
	};

	socket.onmessage = function (event) {
		const message = JSON.parse(event.data);
		console.log("📨 WebSocket message received:", message);

		if (message.type === "game_state") {
			console.log("🎯 Game state update:", message.game_state);
			// updateGameState(message.game_state);
		} else if (message.type === "connection_success") {
			console.log("🎉 Connection successful:", message.message);
			console.log("👤 Player ID:", message.player_id);
		} else if (message.type === "error") {
			console.error("❌ Server error:", message.error);
		} else if (message.message === "All players are ready!") {
			console.log("🎮 All players ready! Starting game...");
			// Both players are ready
			setTimeout(() => {
				// Hide ready screen and start the game
				const readyScreen = document.getElementById("ready-screen");
				if (readyScreen) {
					readyScreen.style.display = "none";
				}
				// Initialize game (call your existing game initialization)
				showNotification(
					"Both players are ready! Starting game...",
					"success"
				);
			}, 1000);
		} else if (message.message === "Waiting for players to be ready...") {
			console.log("⏳ Waiting for other player to be ready");
			// Update UI to show waiting status
			const opponentReadyStatus = document.getElementById(
				"opponent-ready-status"
			);
			if (opponentReadyStatus) {
				opponentReadyStatus.innerHTML = `
                <span class="text-primary"><i class="fas fa-user-friends me-2"></i>Opponent: </span>
                <span class="badge bg-warning">Waiting...</span>
            `;
			}
		} else if (message.type === "quit_game") {
			console.log("🚪 Player quit:", message.message);
			showNotification(message.message, "warning");
			if (message.game_over) {
				// Handle game over due to player quit
				const readyScreen = document.getElementById("ready-screen");
				if (readyScreen) {
					readyScreen.style.display = "block";
				}
			}
		} else if (message.message === "Game Over!") {
			console.log("🏁 Game Over!");
			showNotification("Game Over!", "info");
			// Handle game over
			const readyScreen = document.getElementById("ready-screen");
			if (readyScreen) {
				readyScreen.style.display = "block";
			}
		} else if (message.type === "test_message") {
			console.log("📝 Test message received:", message.message);
		} else if (message.message && typeof message.message === "string") {
			// Handle plain chat messages (like your test message)
			console.log("💬 Chat message received:", message.message);
		} else {
			console.log("🔍 Unknown message:", message);
		}
	};

	socket.onerror = function (error) {
		console.error("❌ WebSocket error occurred:", error);
		console.error("🔧 Debug Information:");
		console.error("  - WebSocket URL:", wsUrl);
		console.error("  - Room ID:", room_id);
		console.error("  - Players:", player1, "vs", player2);
		console.error("  - Token present:", token ? "Yes" : "No");

		if (token) {
			try {
				const payload = JSON.parse(atob(token.split(".")[1]));
				console.error(
					"  - Token expires:",
					new Date(payload.exp * 1000)
				);
				console.error("  - Token user ID:", payload.user_id);
			} catch (e) {
				console.error("  - Token parse error:", e);
			}
		}
	};

	socket.onclose = function (event) {
		console.log("🔌 WebSocket connection closed");
		console.log("  - Code:", event.code);
		console.log("  - Reason:", event.reason);
		console.log("  - Was Clean:", event.wasClean);
		console.log("  - Token:", token ? "Present" : "Missing");

		// Detailed close code explanations
		const closeCodeMeanings = {
			1000: "Normal Closure - Connection closed normally",
			1001: "Going Away - Server going down or browser navigating away",
			1002: "Protocol Error - Protocol error occurred",
			1003: "Unsupported Data - Unsupported data type received",
			1006: "Abnormal Closure - Connection lost (no close frame)",
			1007: "Invalid frame payload data - Invalid UTF-8 in text frame",
			1008: "Policy Violation - Message violates policy",
			1009: "Message Too Big - Message too large to process",
			1010: "Mandatory Extension - Required extension not negotiated",
			1011: "Internal Server Error - Server encountered unexpected condition",
			4000: "Custom - Authentication failed",
			4001: "Custom - Invalid or expired token",
		};

		console.log(
			"  - Meaning:",
			closeCodeMeanings[event.code] || "Unknown close code"
		);

		if (event.code === 1006) {
			console.error("💡 Possible causes for 1006:");
			console.error("  - Authentication failed (invalid/expired token)");
			console.error("  - Network connectivity issues");
			console.error("  - Server not responding");
			console.error("  - CORS or security policy blocking connection");
		}
	};
}

function sendPlayerReady(playerId) {
	if (!socket || socket.readyState !== WebSocket.OPEN) {
		throw new Error("WebSocket not connected");
	}

	const readyMessage = {
		type: "player_ready",
		player: playerId,
	};

	socket.send(JSON.stringify(readyMessage));
	console.log("✅ Player ready message sent:", readyMessage);
	return true;
}

function sendGameInit(gameConfig) {
	if (!socket || socket.readyState !== WebSocket.OPEN) {
		throw new Error("WebSocket not connected");
	}

	const initMessage = {
		type: "game_init",
		...gameConfig,
	};

	socket.send(JSON.stringify(initMessage));
	console.log("✅ Game init message sent:", initMessage);
	return true;
}

function sendPlayerMovement(playerId, direction) {
	if (!socket || socket.readyState !== WebSocket.OPEN) {
		throw new Error("WebSocket not connected");
	}

	const movementMessage = {
		type: direction, // "up", "down", or "stop"
		player: playerId,
	};

	socket.send(JSON.stringify(movementMessage));
	console.log("✅ Movement message sent:", movementMessage);
	return true;
}

function sendChatMessage(message) {
	if (!socket || socket.readyState !== WebSocket.OPEN) {
		throw new Error("WebSocket not connected");
	}

	const chatMessage = {
		type: "chat_message",
		message: message,
	};

	socket.send(JSON.stringify(chatMessage));
	console.log("✅ Chat message sent:", chatMessage);
	return true;
}

function testWebSocketConnection() {
	if (!socket) {
		console.error("❌ No socket initialized. Call createGame() first.");
		return false;
	}

	console.log("🔍 WebSocket Connection Status:");
	console.log("  - Ready State:", socket.readyState);
	console.log("  - States: CONNECTING=0, OPEN=1, CLOSING=2, CLOSED=3");
	console.log(
		"  - Is Connected:",
		socket.readyState === WebSocket.OPEN ? "✅ Yes" : "❌ No"
	);

	return socket.readyState === WebSocket.OPEN;
}

function testPlayerReady(playerId = 0) {
	console.log("🧪 Testing Player Ready Message...");
	try {
		const result = sendPlayerReady(playerId);
		console.log("✅ Player ready test successful");
		return result;
	} catch (error) {
		console.error("❌ Player ready test failed:", error.message);
		return false;
	}
}

function testChatMessage(message = "Hello from console test!") {
	console.log("🧪 Testing Chat Message...");
	try {
		const result = sendChatMessage(message);
		console.log("✅ Chat message test successful");
		return result;
	} catch (error) {
		console.error("❌ Chat message test failed:", error.message);
		return false;
	}
}

function testPlayerMovement(playerId = 0, direction = "up") {
	console.log(`🧪 Testing Player Movement: ${direction}...`);
	try {
		const result = sendPlayerMovement(playerId, direction);
		console.log("✅ Player movement test successful");
		return result;
	} catch (error) {
		console.error("❌ Player movement test failed:", error.message);
		return false;
	}
}

function testGameInit() {
	console.log("🧪 Testing Game Initialization...");
	const testConfig = {
		ring_length: 100,
		ring_height: 50,
		ring_width: 200,
		ring_thickness: 5,
		p_length: 20,
		p_width: 5,
		p_height: 2,
		ball_radius: 2,
		player_1_pos: [10, 25],
		player_2_pos: [190, 25],
		ball_speed: 1,
		p_speed: 1,
	};

	try {
		const result = sendGameInit(testConfig);
		console.log("✅ Game init test successful");
		return result;
	} catch (error) {
		console.error("❌ Game init test failed:", error.message);
		return false;
	}
}

function runAllTests() {
	console.log("🧪 Running All WebSocket Tests...");
	console.log("=" * 50);

	if (!testWebSocketConnection()) {
		console.error("❌ WebSocket not connected. Cannot run tests.");
		return;
	}

	// Test all message types
	testChatMessage();
	setTimeout(() => testPlayerReady(0), 500);
	setTimeout(() => testPlayerMovement(0, "up"), 1000);
	setTimeout(() => testPlayerMovement(0, "down"), 1500);
	setTimeout(() => testPlayerMovement(0, "stop"), 2000);
	setTimeout(() => testGameInit(), 2500);

	console.log("🧪 All tests queued. Check messages above for results.");
}

// Make test functions available globally for console access
window.wsTests = {
	testConnection: testWebSocketConnection,
	testPlayerReady,
	testChatMessage,
	testPlayerMovement,
	testGameInit,
	runAll: runAllTests,
	socket: () => socket,
	// Add the main functions too
	createGame,
	initializeWebSocket,
	sendPlayerReady,
	sendGameInit,
	sendPlayerMovement,
	sendChatMessage,
};

export {
	createGame,
	initializeWebSocket,
	socket,
	sendPlayerReady,
	sendGameInit,
	sendPlayerMovement,
	sendChatMessage,
	// Export test functions
	testWebSocketConnection,
	testPlayerReady,
	testChatMessage,
	testPlayerMovement,
	testGameInit,
	runAllTests,
};
