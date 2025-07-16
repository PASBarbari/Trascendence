import { state } from "../locale/state.js";
import { getVariables } from "../../var.js";
import { renderPong } from "../locale/pong.js";
import * as GAME from "../locale/gameLogic.js";
import * as SETUP from "../locale/setup.js";
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

function hideAllMenusAndStartGame() {
	console.log("🎯 Hiding all menus and starting multiplayer game...");

	// Start the game using local game logic
	state.isStarted = true;
	state.isPaused = false;
	state.IAisActive = false; // Disable AI for multiplayer

	// ✅ CRITICAL: Hide ready screen - this was missing proper implementation
	const readyScreen = document.getElementById("ready-screen");
	if (readyScreen) {
		readyScreen.style.display = "none";
		console.log("✅ Ready screen hidden");
	} else {
		console.warn("⚠️ Ready screen element not found!");
	}

	// Hide any local pong menus that might interfere
	const menusToHide = [
		"menu", // Main pong menu
		"nbrOfPlayerMenu", // Player selection menu
		"settingsMenu", // Settings menu
		"pauseMenu", // Pause menu
		"gameOverMenu", // Game over menu
		"readyMenu", // WebRTC ready menu
	];

	menusToHide.forEach((menuId) => {
		const menu = document.getElementById(menuId);
		if (menu) {
			menu.style.display = "none";
			console.log(`✅ ${menuId} hidden`);
		}
	});

	// ✅ CRITICAL: Hide connection status overlay completely
	const connectionOverlay = document.querySelector(
		".position-absolute.top-0.end-0"
	);
	if (connectionOverlay) {
		connectionOverlay.style.display = "none";
		console.log("✅ Connection status overlay hidden");
	} else {
		console.warn("⚠️ Connection overlay not found!");
	}

	// Show in-game controls info
	const controlsInfo = document.getElementById("controls-info");
	if (controlsInfo) {
		controlsInfo.style.display = "block";
		console.log("✅ Controls info shown");
	}

	// ✅ CRITICAL: Make sure the game canvas is visible and on top
	const gameContainer = document.querySelector(".gamecontainer");
	const threejsContainer = document.getElementById("threejs-container");

	if (gameContainer) {
		gameContainer.style.position = "relative";
		gameContainer.style.width = "100%";
		gameContainer.style.height = "100vh";
		gameContainer.style.background = "#000";
		console.log("✅ Game container styled");
	}

	if (threejsContainer) {
		threejsContainer.style.position = "absolute";
		threejsContainer.style.top = "0";
		threejsContainer.style.left = "0";
		threejsContainer.style.width = "100%";
		threejsContainer.style.height = "100%";
		threejsContainer.style.zIndex = "1";
		console.log("✅ Three.js container styled");
	}

	// Start game animation if not already running
	if (!state.animationFrameId) {
		console.log("🎬 Starting game animation...");
		GAME.animate();
	}

	console.log("🎮 Game started successfully! All menus hidden.");
}

function initializeWebSocket(room_id, player1, player2) {
	const { token, wss_api } = getVariables();

	console.log("🔧 WebSocket Connection Debug:");
	console.log("  - wss_api value:", wss_api);
	console.log("  - room_id:", room_id);
	console.log("  - player1:", player1);
	console.log("  - player2:", player2);
	console.log("  - token present:", token ? "✅ Yes" : "❌ No");

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
			updateGameState(message.game_state);
		} else if (message.type === "connection_success") {
			// ... existing code ...
		} else if (
			message.type === "all_players_ready" ||
			message.message === "All players are ready!"
		) {
			console.log("🎮 All players ready! Starting game...");

			// ✅ Add game-active class to body
			document.body.classList.add("game-active");

			// ✅ Use the local function
			hideAllMenusAndStartGame();

			showNotification("🚀 Game Started! Good luck!", "success");
		} else if (message.message === "Waiting for players to be ready...") {
			console.log("⏳ Waiting for other player to be ready");
			updateOpponentStatus("waiting");
		} else if (message.type === "quit_game") {
			console.log("🚪 Player quit:", message.message);

			// ✅ Remove game-active class
			document.body.classList.remove("game-active");

			showNotification(message.message, "warning");

			// Stop the game and show ready screen
			state.isStarted = false;
			state.isPaused = true;
			showReadyScreen();
		} else if (message.message === "Game Over!") {
			console.log("🏁 Game Over!");

			// ✅ Remove game-active class
			document.body.classList.remove("game-active");

			handleGameOver();
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

function updateConnectionStatus(status, message) {
	const connectionStatus = document.getElementById("connection-status");
	if (!connectionStatus) return;

	const statusBadges = {
		connecting: '<span class="badge bg-warning">Connecting...</span>',
		connected: '<span class="badge bg-success">Connected</span>',
		error: '<span class="badge bg-danger">Connection Error</span>',
		disconnected: '<span class="badge bg-secondary">Disconnected</span>',
	};

	connectionStatus.innerHTML =
		statusBadges[status] || statusBadges.disconnected;

	if (message) {
		connectionStatus.title = message;
	}
}

function syncMultiplayerWithLocalGame() {
	if (!state.scene || !state.camera || !state.renderer) {
		console.log("🎮 Initializing game scene for multiplayer...");
		SETUP.setupGame();
	}

	// Disable local controls since we're using WebSocket
	state.keys = {
		w: false,
		s: false,
		ArrowUp: false,
		ArrowDown: false,
	};

	// Set multiplayer mode
	state.isMultiplayer = true;
	state.isStarted = false;
	state.isPaused = true;
}

function updateGameState(gameStateData) {
	if (!gameStateData) return;

	console.log("🎯 Updating game state:", gameStateData);

	// Update ball position and velocity
	if (gameStateData.ball_pos && state.ball && state.ball.mesh) {
		const [ballX, ballZ] = gameStateData.ball_pos;
		state.ball.mesh.position.set(ballX || 0, 0, ballZ || 0);

		// Also update ball velocity if available
		if (state.ball.velocity && gameStateData.ball_velocity) {
			const [velX, velZ] = gameStateData.ball_velocity;
			state.ball.velocity.set(velX || 0, 0, velZ || 0);
		}

		console.log(`🏐 Ball updated: pos(${ballX}, ${ballZ})`);
	}

	// Update player 1 position
	if (
		gameStateData.player_1_pos &&
		state.players[0] &&
		state.players[0].mesh
	) {
		const [p1X, p1Z] = gameStateData.player_1_pos;
		state.players[0].mesh.position.x =
			p1X || state.players[0].mesh.position.x;
		state.players[0].mesh.position.z = p1Z || 0;
		console.log(`👤 Player 1 updated: pos(${p1X}, ${p1Z})`);
	}

	// Update player 2 position
	if (
		gameStateData.player_2_pos &&
		state.players[1] &&
		state.players[1].mesh
	) {
		const [p2X, p2Z] = gameStateData.player_2_pos;
		state.players[1].mesh.position.x =
			p2X || state.players[1].mesh.position.x;
		state.players[1].mesh.position.z = p2Z || 0;
		console.log(`👤 Player 2 updated: pos(${p2X}, ${p2Z})`);
	}

	// Update scores
	if (
		typeof gameStateData.player_1_score !== "undefined" &&
		typeof gameStateData.player_2_score !== "undefined"
	) {
		state.p1_score = gameStateData.player_1_score || 0;
		state.p2_score = gameStateData.player_2_score || 0;

		// Update score display
		import("../locale/src/Score.js")
			.then(({ updateScore }) => {
				updateScore("p1");
				updateScore("p2");
			})
			.catch(() => {
				console.warn("Could not update score display");
			});

		console.log(
			`🏆 Scores updated: P1=${state.p1_score}, P2=${state.p2_score}`
		);
	}
}

function showReadyScreen() {
	const readyScreen = document.getElementById("ready-screen");
	if (readyScreen) {
		readyScreen.style.display = "flex";
	}

	const controlsInfo = document.getElementById("controls-info");
	if (controlsInfo) {
		controlsInfo.style.display = "none";
	}
}

function updateOpponentStatus(status) {
	const opponentStatus = document.getElementById("opponent-ready-status");
	if (opponentStatus) {
		const statusBadge =
			status === "waiting"
				? '<span class="badge bg-warning">Not Ready</span>'
				: '<span class="badge bg-success">Ready</span>';

		// Get opponent name from the multiplayerGameInfo
		const opponentName =
			window.multiplayerGameInfo?.opponentName || "Opponent";

		opponentStatus.innerHTML = `
            <span class="text-primary">
                <i class="fas fa-user-friends me-2"></i>${opponentName}:
            </span>
            ${statusBadge}
        `;
	}
}

function handleGameOver() {
	state.isStarted = false;
	state.isPaused = true;

	// Determine winner
	const winner = state.p1_score >= state.maxScore ? "Player 1" : "Player 2";

	// Show game over with multiplayer context
	showNotification(`🏆 Game Over! ${winner} wins!`, "info");

	// Show ready screen for potential rematch
	setTimeout(() => {
		showReadyScreen();
	}, 2000);
}

// Test functions
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
	console.log("=".repeat(50));

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
	syncMultiplayerWithLocalGame,
	updateGameState,
	showReadyScreen,
	updateOpponentStatus,
	handleGameOver,
	hideAllMenusAndStartGame,
};
