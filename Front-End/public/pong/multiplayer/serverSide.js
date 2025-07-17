import { state } from "../locale/state.js";
import { getVariables } from "../../var.js";
import { renderPong } from "../locale/pong.js";
import * as GAME from "../locale/gameLogic.js";
import * as SETUP from "../locale/setup.js";
import * as UTILS from "../locale/utils.js";
import { getCookie } from "../../cookie.js";
import { showNotification } from "../pongContainer.js";

let socket;

const DEBUG = {
	movement: true, // Log movement messages
	gameState: false, // ✅ Reduce gameState debug logging to prevent console spam
	positions: false, // ✅ Reduce position logging to prevent spam
	websocket: true, // Log websocket activity
};

// ✅ CRITICAL: Add throttling to prevent too frequent updates
let lastGameStateUpdate = 0;
const GAME_STATE_THROTTLE = 50; // Minimum 50ms between game state updates (20fps max)

// Debug logger
function debugLog(category, ...args) {
	if (DEBUG[category]) {
		console.log(`🔍 [${category.toUpperCase()}]`, ...args);
	}
}

// 2. Update the sendPlayerMovement function with better debugging
function sendPlayerMovement(playerId, direction) {
	if (!socket || socket.readyState !== WebSocket.OPEN) {
		console.error("❌ WebSocket not connected!");
		throw new Error("WebSocket not connected");
	}

	debugLog(
		"movement",
		`Sending ${direction} command from player ${playerId}`
	);

	const movementMessage = {
		type: direction, // "up", "down", or "stop"
		player: playerId, // ✅ ADD THIS BACK - backend still needs it
	};

	socket.send(JSON.stringify(movementMessage));
	debugLog("movement", "✅ Movement message sent:", movementMessage);
	return true;
}

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
		
		// ✅ CRITICAL: Reduce logging verbosity for game_state messages
		if (message.type === "game_state") {
			debugLog("websocket", "📨 Game state message received");
		} else {
			debugLog("websocket", "📨 WebSocket message received:", {
				type: message.type,
				messageKeys: Object.keys(message),
				timestamp: new Date().toISOString()
			});
		}

		if (message.type === "game_state") {
			// ✅ CRITICAL: Process game state with throttling
			try {
				updateGameState(message.game_state);
			} catch (error) {
				console.error("❌ Error processing game state:", error);
				debugLog("gameState", "❌ Game state processing failed:", error.message);
			}
		} else if (message.type === "connection_success") {
			console.log("🎉 Connection successful:", message.message);
			console.log("👤 Player ID:", message.player_id);

			// ✅ CRITICAL: Store player info in window object
			window.multiplayerInfo = {
				playerId: message.player_id,
				roomId: room_id,
			};

			// Update connection status in UI
			updateConnectionStatus("connected", "Connected to game server");

			// Initialize the game scene
			syncMultiplayerWithLocalGame();

			console.log("✅ Both players connected, ready screen is visible");
		} else if (
			message.type === "all_players_ready" ||
			message.message === "All players are ready!"
		) {
			console.log("🎮 All players ready! Starting game...");

			// ✅ Add game-active class to body
			document.body.classList.add("game-active");

			// ✅ CRITICAL: Send game initialization to backend
			try {
				const gameConfig = {
					ring_length: 160,
					ring_height: 90,
					ring_width: 200,
					ring_thickness: 3,
					p_length: 20,
					p_width: 2.5,
					p_height: 2.5,
					ball_radius: 2.5,
					player_1_pos: [-75, 0],  // Left side
					player_2_pos: [75, 0],   // Right side
					ball_pos: [0, 0],
					ball_speed: 1.2,
					p_speed: 1.5,
				};
				
				console.log("🔧 Sending game initialization:", gameConfig);
				sendGameInit(gameConfig);
				
				// Wait a moment for initialization to process
				setTimeout(() => {
					hideAllMenusAndStartGame();
					showNotification("🚀 Game Started! Good luck!", "success");
				}, 200);
			} catch (error) {
				console.error("❌ Failed to initialize game:", error);
				// Still try to start the game
				hideAllMenusAndStartGame();
				showNotification("🚀 Game Started! Good luck!", "success");
			}
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
	if (!gameStateData) {
		debugLog("gameState", "❌ No game state data received");
		return;
	}

	// ✅ CRITICAL: Throttle game state updates to prevent lag
	const now = Date.now();
	if (now - lastGameStateUpdate < GAME_STATE_THROTTLE) {
		// Skip this update to prevent overwhelming the browser
		return;
	}
	lastGameStateUpdate = now;

	debugLog("gameState", "🎮 Game state update received and processed");

	// ✅ CRITICAL: Check if game objects exist - if not, try to initialize
	if (!state.scene || !state.players || !state.ball) {
		debugLog("gameState", "⚠️ Game objects not initialized, trying to setup...");
		try {
			// Try to setup the game if objects don't exist
			if (typeof SETUP !== 'undefined' && SETUP.setupGame) {
				SETUP.setupGame();
				debugLog("gameState", "✅ Game setup completed");
			} else {
				debugLog("gameState", "❌ SETUP.setupGame not available");
				return;
			}
		} catch (error) {
			debugLog("gameState", "❌ Failed to setup game:", error);
			return;
		}
	}

	// Debug the global state
	debugLog("gameState", "Current frontend state:", {
		isStarted: state.isStarted,
		isPaused: state.isPaused,
		isMultiplayer: state.isMultiplayer,
		hasPlayers: state.players?.length || 0,
		hasBall: !!state.ball,
		ballHasMesh: !!(state.ball?.mesh),
	});

	// ✅ CRITICAL: Update ball position and velocity with proper error handling
	if (gameStateData.ball_pos) {
		if (state.ball && state.ball.mesh) {
			const [ballX, ballZ] = gameStateData.ball_pos;
			const oldPos = { 
				x: state.ball.mesh.position.x, 
				z: state.ball.mesh.position.z 
			};
			
			// Apply scaling for coordinate system conversion
			const scaledX = (ballX || 0) * 1.0;  // Adjust scaling as needed
			const scaledZ = (ballZ || 0) * 1.0;  // Adjust scaling as needed
			
			state.ball.mesh.position.set(scaledX, 0, scaledZ);

			debugLog(
				"positions",
				`🔴 Ball moved: (${oldPos.x.toFixed(2)}, ${oldPos.z.toFixed(
					2
				)}) → (${scaledX.toFixed(2)}, ${scaledZ.toFixed(2)})`
			);

			// Also update ball velocity if available
			if (state.ball.velocity && gameStateData.ball_velocity) {
				const [velX, velZ] = gameStateData.ball_velocity;
				state.ball.velocity.set(velX || 0, 0, velZ || 0);
				debugLog(
					"positions",
					`🔴 Ball velocity: (${velX.toFixed(2)}, ${velZ.toFixed(2)})`
				);
			}
		} else {
			debugLog("positions", "❌ Ball object or mesh not found");
		}
	}

	// ✅ CRITICAL: Proper coordinate system conversion for players
	const POSITION_SCALE_X = 1.0;  // Horizontal position scale
	const POSITION_SCALE_Z = 1.0;  // Vertical movement scale

	// Update player 1 position with proper error handling
	if (gameStateData.player_1_pos) {
		if (state.players && state.players[0] && state.players[0].mesh) {
			const [backendX, backendY] = gameStateData.player_1_pos;
			const oldPos = {
				x: state.players[0].mesh.position.x,
				z: state.players[0].mesh.position.z,
			};

			// Apply coordinate system conversion
			const scaledX = (backendX || 0) * POSITION_SCALE_X;
			const scaledZ = (backendY || 0) * POSITION_SCALE_Z;
			
			state.players[0].mesh.position.x = scaledX;
			state.players[0].mesh.position.z = scaledZ;

			debugLog(
				"positions",
				`🔵 Player 1 moved: (${oldPos.x.toFixed(2)}, ${oldPos.z.toFixed(
					2
				)}) → (${scaledX.toFixed(2)}, ${scaledZ.toFixed(2)})`
			);
			debugLog(
				"positions",
				`🔵 Raw backend P1: (${backendX}, ${backendY}) → Frontend: (${scaledX}, ${scaledZ})`
			);
		} else {
			debugLog("positions", "❌ Player 1 object or mesh not found");
		}
	}

	// Update player 2 position with proper error handling
	if (gameStateData.player_2_pos) {
		if (state.players && state.players[1] && state.players[1].mesh) {
			const [backendX, backendY] = gameStateData.player_2_pos;
			const oldPos = {
				x: state.players[1].mesh.position.x,
				z: state.players[1].mesh.position.z,
			};

			// Apply coordinate system conversion
			const scaledX = (backendX || 0) * POSITION_SCALE_X;
			const scaledZ = (backendY || 0) * POSITION_SCALE_Z;
			
			state.players[1].mesh.position.x = scaledX;
			state.players[1].mesh.position.z = scaledZ;

			debugLog(
				"positions",
				`🟢 Player 2 moved: (${oldPos.x.toFixed(2)}, ${oldPos.z.toFixed(
					2
				)}) → (${scaledX.toFixed(2)}, ${scaledZ.toFixed(2)})`
			);
			debugLog(
				"positions",
				`🟢 Raw backend P2: (${backendX}, ${backendY}) → Frontend: (${scaledX}, ${scaledZ})`
			);
		} else {
			debugLog("positions", "❌ Player 2 object or mesh not found");
		}
	}

	// ✅ CRITICAL: Update scores with proper handling
	if (
		typeof gameStateData.player_1_score !== "undefined" &&
		typeof gameStateData.player_2_score !== "undefined"
	) {
		const oldScores = { p1: state.p1_score, p2: state.p2_score };
		state.p1_score = gameStateData.player_1_score || 0;
		state.p2_score = gameStateData.player_2_score || 0;

		debugLog(
			"gameState",
			`🏆 Scores updated: P1: ${oldScores.p1} → ${state.p1_score}, P2: ${oldScores.p2} → ${state.p2_score}`
		);

		// ✅ Update score display if elements exist
		const p1ScoreElement = document.getElementById("p1Score");
		const p2ScoreElement = document.getElementById("p2Score");
		
		if (p1ScoreElement) p1ScoreElement.textContent = state.p1_score;
		if (p2ScoreElement) p2ScoreElement.textContent = state.p2_score;
	}

	// ✅ CRITICAL: Force scene render if renderer exists
	if (state.renderer && state.scene && state.camera) {
		try {
			state.renderer.render(state.scene, state.camera);
			debugLog("gameState", "✅ Scene rendered successfully");
		} catch (error) {
			debugLog("gameState", "❌ Render error:", error);
		}
	} else {
		debugLog("gameState", "⚠️ Missing renderer, scene, or camera for rendering");
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

// Enhanced debugging functions for troubleshooting
function enableAllDebugging() {
	DEBUG.movement = true;
	DEBUG.gameState = true;
	DEBUG.positions = true;
	DEBUG.websocket = true;
	console.log("🔍 All debugging enabled!");
}

function disableAllDebugging() {
	DEBUG.movement = false;
	DEBUG.gameState = false;
	DEBUG.positions = false;
	DEBUG.websocket = false;
	console.log("🔇 All debugging disabled!");
}

function monitorGameState() {
	if (!socket || socket.readyState !== WebSocket.OPEN) {
		console.error("❌ WebSocket not connected for monitoring");
		return;
	}

	let messageCount = 0;
	let gameStateCount = 0;
	let droppedUpdates = 0;
	const startTime = Date.now();

	const originalOnMessage = socket.onmessage;
	const originalUpdateGameState = updateGameState;
	
	// Override updateGameState to count dropped updates
	updateGameState = function(gameStateData) {
		const now = Date.now();
		if (now - lastGameStateUpdate < GAME_STATE_THROTTLE) {
			droppedUpdates++;
			return;
		}
		return originalUpdateGameState(gameStateData);
	};

	socket.onmessage = function(event) {
		messageCount++;
		const message = JSON.parse(event.data);
		
		if (message.type === "game_state") {
			gameStateCount++;
		}

		// Call original handler
		if (originalOnMessage) {
			originalOnMessage(event);
		}
	};

	// Report statistics every 5 seconds
	const monitorInterval = setInterval(() => {
		const elapsed = (Date.now() - startTime) / 1000;
		console.log(`📊 Performance Monitor (${elapsed.toFixed(1)}s):`);
		console.log(`  - Total messages: ${messageCount}`);
		console.log(`  - Game state messages: ${gameStateCount}`);
		console.log(`  - Dropped updates (throttled): ${droppedUpdates}`);
		console.log(`  - Messages per second: ${(messageCount / elapsed).toFixed(1)}`);
		console.log(`  - Game state per second: ${(gameStateCount / elapsed).toFixed(1)}`);
		console.log(`  - Processed updates per second: ${((gameStateCount - droppedUpdates) / elapsed).toFixed(1)}`);
		console.log(`  - WebSocket state: ${socket.readyState === WebSocket.OPEN ? "OPEN" : "CLOSED"}`);
	}, 5000);

	// Stop monitoring after 60 seconds and restore original functions
	setTimeout(() => {
		clearInterval(monitorInterval);
		updateGameState = originalUpdateGameState;
		console.log("⏹️ WebSocket monitoring stopped");
	}, 60000);

	console.log("🔍 Starting performance monitoring for 60 seconds...");
}

function checkGameObjectsStatus() {
	console.log("🔍 Game Objects Status Check:");
	console.log("  - state object:", typeof state !== 'undefined' ? "✅ Available" : "❌ Missing");
	console.log("  - state.scene:", state?.scene ? "✅ Available" : "❌ Missing");
	console.log("  - state.camera:", state?.camera ? "✅ Available" : "❌ Missing");
	console.log("  - state.renderer:", state?.renderer ? "✅ Available" : "❌ Missing");
	console.log("  - state.players:", state?.players ? `✅ Available (${state.players.length})` : "❌ Missing");
	console.log("  - state.ball:", state?.ball ? "✅ Available" : "❌ Missing");
	console.log("  - state.ball.mesh:", state?.ball?.mesh ? "✅ Available" : "❌ Missing");
	
	if (state?.players) {
		state.players.forEach((player, index) => {
			console.log(`  - player[${index}].mesh:`, player?.mesh ? "✅ Available" : "❌ Missing");
		});
	}

	console.log("  - Game state flags:");
	console.log(`    - isStarted: ${state?.isStarted}`);
	console.log(`    - isPaused: ${state?.isPaused}`);
	console.log(`    - isMultiplayer: ${state?.isMultiplayer}`);
	console.log(`    - IAisActive: ${state?.IAisActive}`);
}

function forceGameStateUpdate() {
	console.log("🔄 Forcing manual game state update...");
	
	// Create test game state data to verify the update function works
	const testGameState = {
		player_1_pos: [10, 20],
		player_2_pos: [30, 40],
		ball_pos: [0, 0],
		player_1_score: 1,
		player_2_score: 2,
	};

	console.log("🧪 Testing with fake game state:", testGameState);
	updateGameState(testGameState);
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

// ✅ CRITICAL: Add console helper for easy debugging
console.log(`
🎮 MULTIPLAYER PONG DEBUG HELPERS LOADED (OPTIMIZED)
==================================================

🚀 PERFORMANCE OPTIMIZATIONS ACTIVE:
• Backend: 30fps physics, 20fps WebSocket updates
• Frontend: 20fps max update throttling
• Reduced debug logging to prevent console spam

Available in console:
• wsTests.enableDebug()     - Enable all debugging
• wsTests.disableDebug()    - Disable all debugging  
• wsTests.monitor()         - Monitor performance for 60s (includes throttling stats)
• wsTests.checkObjects()    - Check game object status
• wsTests.forceUpdate()     - Test updateGameState function
• wsTests.testConnection()  - Test WebSocket connection
• wsTests.runAll()          - Run all WebSocket tests

Example usage for lag debugging:
wsTests.enableDebug();
wsTests.monitor();  // Watch for dropped frames and throttling
wsTests.checkObjects();

🔧 If still lagging, check Redis capacity warnings in server logs
`);

// Make test functions available globally for console access
window.wsTests = {
	testConnection: testWebSocketConnection,
	testPlayerReady,
	testChatMessage,
	testPlayerMovement,
	testGameInit,
	runAll: runAllTests,
	socket: () => socket,
	// Enhanced debugging functions
	enableDebug: enableAllDebugging,
	disableDebug: disableAllDebugging,
	monitor: monitorGameState,
	checkObjects: checkGameObjectsStatus,
	forceUpdate: forceGameStateUpdate,
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
	enableAllDebugging,
	disableAllDebugging,
	monitorGameState,
	checkGameObjectsStatus,
	forceGameStateUpdate,
};
