// Fix the import paths - they should point to the locale folder
import { state } from "../locale/state.js";
import { getVariables } from "../../var.js";
import { renderPong } from "../locale/pong.js";
import * as GAME from "../locale/gameLogic.js";
import * as UTILS from "../locale/utils.js";
import { getCookie } from "../../cookie.js";

let socket;

// Update game state from server
function updateGameState(gameState) {
	if (!gameState) {
		console.warn("❌ No game state received");
		return;
	}

	console.log("🔄 Updating game state:", gameState);

	// Update state object with server data
	if (state) {
		// Update player positions
		if (gameState.player_1_pos && state.players && state.players[0]) {
			state.players[0].mesh.position.x = gameState.player_1_pos[0];
			state.players[0].mesh.position.y = gameState.player_1_pos[1];
		}

		if (gameState.player_2_pos && state.players && state.players[1]) {
			state.players[1].mesh.position.x = gameState.player_2_pos[0];
			state.players[1].mesh.position.y = gameState.player_2_pos[1];
		}

		// Update ball position
		if (gameState.ball_pos && state.ball && state.ball.mesh) {
			state.ball.mesh.position.x = gameState.ball_pos[0];
			state.ball.mesh.position.y = gameState.ball_pos[1];
		}

		// Update scores
		if (gameState.player_1_score !== undefined) {
			state.p1_score = gameState.player_1_score;
			// Update score display if exists
			if (state.updateScoreDisplay) {
				state.updateScoreDisplay();
			}
		}

		if (gameState.player_2_score !== undefined) {
			state.p2_score = gameState.player_2_score;
		}

		// Update game parameters
		if (gameState.ball_speed !== undefined) {
			state.ball_speed = gameState.ball_speed;
		}

		if (gameState.angle !== undefined) {
			state.angle = gameState.angle;
		}
	}
}

// Send input to server
function sendPlayerInput(action, player_id) {
	if (!socket || socket.readyState !== WebSocket.OPEN) {
		console.warn("❌ WebSocket not connected, cannot send input");
		return;
	}

	// Determine player number (0 or 1) based on player ID
	let playerNumber = 0;
	if (state.player1Id && state.player2Id) {
		if (player_id == state.player2Id) {
			playerNumber = 1;
		} else {
			playerNumber = 0; // Default to player 1
		}
	}

	const inputData = {
		type: 'player_input',
		action: action, // 'up', 'down', 'stop'
		player_id: playerNumber // Use the player number (0 or 1) instead of user ID
	};

	console.log("🎮 Sending input:", inputData);
	socket.send(JSON.stringify(inputData));
}

// Handle game start
function handleGameStart(message) {
	console.log("🎮 Starting multiplayer game:", message);

	// Navigate to pong game view
	window.navigateTo("#pong");

	// Wait for the navigation to complete, then initialize the game
	setTimeout(async () => {
		try {
			// Import and call the pong rendering function
			const { renderPong } = await import("../locale/pong.js");
			const { initGame } = await import("../locale/setup.js");

			// Render the pong interface
			renderPong();

			// Wait a bit for DOM to be ready
			setTimeout(() => {
				// Initialize the 3D game
				initGame();

				// Set multiplayer mode
				if (state) {
					state.isMultiplayer = true;
					state.isStarted = true;
					state.isPaused = false;

					// Disable local AI for multiplayer
					state.IAisActive = false;
				}

				// Start the game loop if not already running
				if (!state.animationFrameId) {
					GAME.animate();
				}

				console.log("✅ Multiplayer game fully initialized");
			}, 100);

		} catch (error) {
			console.error("❌ Error initializing multiplayer game:", error);
		}
	}, 100);
}

async function createGame(player_1, player_2) {
	const { token, url_api, userId } = getVariables();
	if (!token) {
		console.error("❌ No token found. Please log in first.");
		return;
	}

	// Store current player ID for input handling
	state.current_player_id = userId;

	const response = await fetch(`${url_api}/pong/game`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
			"X-CSRFToken": getCookie("csrftoken") || "",
		},
		body: JSON.stringify({
			player_1: player_1,
			player_2: player_2,
			tournament_id: null,
		}),
	});
	if (!response.ok) {
		const errorData = await response.json();
		console.error("❌ Error creating game:", errorData);
		return;
	}
	const data = await response.json();
	console.log("✅ Game created successfully:", data);
	if (!data.id) {
		console.error("❌ No room_id returned from server.");
		return;
	}
	state.room_id = data.id;
	initializeWebSocket(state.room_id, player_1, player_2);
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

	// Store player IDs in state for later use
	state.player1Id = player1;
	state.player2Id = player2;
	state.room_id = room_id;

	const wsUrl = `${wss_api}/pong/ws/pong/${room_id}/?token=${token}`;
	console.log("🔌 Connecting to WebSocket:", wsUrl);

	socket = new WebSocket(wsUrl);

	socket.onopen = function () {
		console.log("✅ WebSocket connection established successfully!");
		console.log("🎮 Connected to room:", room_id);
		console.log("👥 Players:", player1, "vs", player2);

		// Send game initialization data
		sendGameInit();

		// Mark player as ready
		sendPlayerReady();
	};

	socket.onmessage = function (event) {
		const message = JSON.parse(event.data);
		console.log("📨 WebSocket message received:", message);

		if (message.type === "game_state") {
			console.log("🎯 Game state update:", message.game_state);

			updateGameState(message.game_state);

		} else if (message.type === "welcome") {
			console.log("🎉 Welcome message:", message.message);
		} else if (message.type === "error") {
			console.error("❌ Server error:", message.error);
		} else if (message.ready) {
			console.log("🎮 Game ready signal received!");
			handleGameStart(message);
		} else if (message.type === "connection_success") {
			console.log("✅ Connection confirmed:", message.message);
			// Auto-start the game after successful connection
			handleGameStart(message);
		} else {
			console.log("🔍 Unknown message type:", message);
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

// Send game initialization data to server
function sendGameInit() {
	if (!socket || socket.readyState !== WebSocket.OPEN) {
		console.warn("❌ WebSocket not connected, cannot send game init");
		return;
	}

	// Get game configuration from state
	const gameConfig = {
		type: 'game_init',
		ring_length: state.ring_length || 32,
		ring_height: state.ring_height || 20,
		ring_width: state.ring_width || 0.5,
		ring_thickness: state.ring_thickness || 0.2,
		p_length: state.p_length || 8,
		p_width: state.p_width || 0.5,
		p_height: state.p_height || 1,
		ball_radius: state.ball_radius || 0.5,
		player_1_pos: state.player_1_pos || [14, 0],
		player_2_pos: state.player_2_pos || [-14, 0],
		ball_speed: state.ball_speed || 0.3,
		p_speed: state.player_speed || 0.5
	};

	console.log("🎮 Sending game initialization:", gameConfig);
	socket.send(JSON.stringify(gameConfig));
}

// Send player ready signal to server
function sendPlayerReady() {
	if (!socket || socket.readyState !== WebSocket.OPEN) {
		console.warn("❌ WebSocket not connected, cannot send player ready");
		return;
	}

	const { userId } = getVariables();

	// Determine player number (0 or 1) based on the game's player data
	let playerNumber = 0;

	// We need to check if the current user is player1 or player2
	// The game was created with specific player IDs, we need to match against them
	// This requires us to store the player data when the game starts

	// For now, let's use a simple approach - we'll improve this later
	// We can store the player mapping in state when we receive the notification
	if (state.player1Id && state.player2Id) {
		if (userId == state.player2Id) {
			playerNumber = 1;
		} else {
			playerNumber = 0; // Default to player 1
		}
	}

	const readyMessage = {
		type: 'player_ready',
		player: playerNumber
	};

	console.log("🎮 Sending player ready:", readyMessage);
	console.log("🔍 Player mapping - userId:", userId, "player1Id:", state.player1Id, "player2Id:", state.player2Id, "playerNumber:", playerNumber);
	socket.send(JSON.stringify(readyMessage));
}

export { createGame, initializeWebSocket, socket, updateGameState, sendPlayerInput, handleGameStart, sendGameInit, sendPlayerReady };
