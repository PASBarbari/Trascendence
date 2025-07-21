import * as THREE from "three";
import { state } from "../locale/state.js";
import { getVariables } from "../../var.js";
import { renderPong } from "../locale/pong.js";
import * as GAME from "../locale/gameLogic.js";
import * as SETUP from "../locale/setup.js";
import * as UTILS from "../locale/utils.js";
import { getCookie } from "../../cookie.js";
import { showNotification } from "../pongContainer.js";

let socket;

// Throttling to prevent too frequent updates
let lastGameStateUpdate = 0;
const GAME_STATE_THROTTLE = 20; // Minimum 50ms between game state updates (20fps max)

function sendPlayerMovement(playerId, direction) {
	if (!socket || socket.readyState !== WebSocket.OPEN) {
		console.error("WebSocket not connected!");
		throw new Error("WebSocket not connected");
	}

	const movementMessage = {
		type: direction,
	};

	socket.send(JSON.stringify(movementMessage));
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
			console.error("Game creation failed:", errorData);
			throw new Error(`HTTP ${response.status}: ${JSON.stringify(errorData)}`);
		}

		const data = await response.json();

		// Extract room_id and initialize WebSocket
		const room_id = data.room_id || data.id;
		if (room_id) {
			initializeWebSocket(room_id, player_1, player_2);
		} else {
			throw new Error("No room_id received from server");
		}

		return data;
	} catch (error) {
		console.error("Error creating game:", error);
		throw error;
	}
}

function hideAllMenusAndStartGame() {
	// Start the game using local game logic
	state.isStarted = true;
	state.isPaused = false;
	state.IAisActive = false; // Disable AI for multiplayer

	// Hide ready screen
	const readyScreen = document.getElementById("ready-screen");
	if (readyScreen) {
		readyScreen.style.display = "none";
	}

	// Hide any local pong menus that might interfere
	const menusToHide = [
		"menu",
		"nbrOfPlayerMenu",
		"settingsMenu",
		"pauseMenu",
		"gameOverMenu",
		"readyMenu",
	];

	menusToHide.forEach((menuId) => {
		const menu = document.getElementById(menuId);
		if (menu) {
			menu.style.display = "none";
		}
	});

	// Hide connection status overlay
	const connectionOverlay = document.querySelector(
		".position-absolute.top-0.end-0"
	);
	if (connectionOverlay) {
		connectionOverlay.style.display = "none";
	}

	// Show in-game controls info
	const controlsInfo = document.getElementById("controls-info");
	if (controlsInfo) {
		controlsInfo.style.display = "block";
	}

	// Make sure the game canvas is visible and on top
	const gameContainer = document.querySelector(".gamecontainer");
	const threejsContainer = document.getElementById("threejs-container");

	if (gameContainer) {
		gameContainer.style.position = "relative";
		gameContainer.style.width = "100%";
		gameContainer.style.height = "100vh";
		gameContainer.style.background = "#000";
	}

	if (threejsContainer) {
		threejsContainer.style.position = "absolute";
		threejsContainer.style.top = "0";
		threejsContainer.style.left = "0";
		threejsContainer.style.width = "100%";
		threejsContainer.style.height = "100%";
		threejsContainer.style.zIndex = "1";
	}

	// Start game animation if not already running
	if (!state.animationFrameId) {
		GAME.animate();
	}

	// Show mobile controls if on mobile device
	if (window.initializeMobileControls) {
		window.initializeMobileControls();
		if (window.showMobileControls) {
			window.showMobileControls();
		}
	}
}

function initializeWebSocket(room_id, player1, player2) {
	const { token, wss_api } = getVariables();

	const wsUrl = `${wss_api}/pong/ws/pong/${room_id}/?token=${token}`;

	socket = new WebSocket(wsUrl);

	socket.onopen = function () {
		updateConnectionStatus("connected", "Connected to game server");
	};

	socket.onmessage = function (event) {
		const message = JSON.parse(event.data);

		if (message.type === "game_state") {
			try {
				// console.table(message.game_state);
				updateGameState(message.game_state);
			} catch (error) {
				console.error("Error processing game state:", error);
			}
		} else if (message.type === "connection_success") {
			// Store player info in window object
			window.multiplayerInfo = {
				playerId: message.player_id,
				roomId: room_id,
			};

			// Update connection status in UI
			updateConnectionStatus("connected", "Connected to game server");

			// Initialize the game scene
			syncMultiplayerWithLocalGame();
		} else if (
			message.type === "all_players_ready" ||
			message.message === "All players are ready!"
		) {
			// Add game-active class to body
			document.body.classList.add("game-active");

			// let player_1_pos = [state.players[0].mesh.position.x, state.players[0].mesh.position.y, state.players[0].mesh.position.z];
			// let player_2_pos = [state.players[1].mesh.position.x, state.players[1].mesh.position.y, state.players[1].mesh.position.z];
			// // Send game initialization to backend
			try {
				// 	const gameConfig = {
				// 		ring_length: state.ring.length || 160,
				// 		ring_height: state.ring.height || 90,
				// 		ring_width: state.ring.depth || 10,
				// 		ring_thickness: state.ring.thickness || 3,
				// 		p_length: 20,
				// 		p_width: state.p.width || 2.5,
				// 		p_height: state.p.depth || 2.5,
				// 		ball_radius: state.ball.radius || 2.5,
				// 		player_1_pos: player_1_pos || [-75, 0], // Left side: [x, y, z] where y=0 is center
				// 		player_2_pos: player_2_pos || [75, 0], // Right side: [x, y, z] where y=0 is center
				// 		ball_pos: state.ball_pos || [0, 0, 0],
				// 		ball_speed: state.ball_speed || 1.2,
				// 		p_speed: state.p_speed || 1.5,
				// 	};
				// 	console.table(gameConfig);

				// 	sendGameInit(gameConfig);

				// Wait a moment for initialization to process
				setTimeout(() => {
					hideAllMenusAndStartGame();
					showNotification("Game Started! Good luck!", "success");
				}, 200);
			} catch (error) {
				console.error("Failed to initialize game:", error);
				// Still try to start the game
				hideAllMenusAndStartGame();
				showNotification("Game Started! Good luck!", "success");
			}
		} else if (message.message === "Waiting for players to be ready...") {
			updateOpponentStatus("waiting");
		} else if (message.type === "quit_game") {
			// Remove game-active class
			document.body.classList.remove("game-active");

			showNotification(message.message, "warning");

			// Stop the game and show ready screen
			state.isStarted = false;
			state.isPaused = true;
			showReadyScreen();
		} else if (message.message === "Game Over!") {
			// Remove game-active class
			document.body.classList.remove("game-active");

			handleGameOver();
		}
	};

	socket.onerror = function (error) {
		console.error("WebSocket error occurred:", error);
	};

	socket.onclose = function (event) {
		updateConnectionStatus("disconnected", "Connection closed");
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
	
	// Disable local physics calculations for better performance
	if (state.ball) {
		state.ball.disableLocalPhysics = true;
		state.ball.isMultiplayer = true;
	}
}

const gameStateChecker = setInterval(() => {
	if (state.isMultiplayer && (!state.isStarted || state.isPaused)) {
		state.isStarted = true;
		state.isPaused = false;
	}
}, 1000);

// Clean up on page navigation
window.addEventListener("hashchange", () => {
	clearInterval(gameStateChecker);
	
	// Remove mobile controls when navigating away from pong
	if (typeof window.removeMobileControls === 'function') {
		window.removeMobileControls();
	}
});

function updateGameState(gameStateData) {
	if (!gameStateData) {
		return;
	}

	// Update state with backend values for consistency
	if (gameStateData.player_1_score !== undefined)
		state.p1_score = gameStateData.player_1_score;
	if (gameStateData.player_2_score !== undefined)
		state.p2_score = gameStateData.player_2_score;
	
	// Update mobile score display
	// if (typeof window.updateMobileScore === 'function') {
	// 	window.updateMobileScore(state.p1_score, state.p2_score);
	// }

	// Update ring dimensions only when provided (they're sent less frequently now for performance)
	if (
		gameStateData.ring_length !== undefined &&
		gameStateData.ring_length !== null
	) {
		state.ring.length = gameStateData.ring_length;
	}
	if (
		gameStateData.ring_height !== undefined &&
		gameStateData.ring_height !== null
	) {
		state.ring.height = gameStateData.ring_height;
	}
	// if (gameStateData.ring_width !== undefined) state.ring.depth = gameStateData.ring_width;
	// if (gameStateData.ring_thickness !== undefined) state.ring.thickness = gameStateData.ring_thickness;
	// if (gameStateData.p_length !== undefined) state.p.depth = gameStateData.p_length;
	// if (gameStateData.p_height !== undefined) state.p.height = gameStateData.p_height;
	// if (gameStateData.p_width !== undefined) state.p.width = gameStateData.p_width;
	// if (gameStateData.ball_radius !== undefined) state.ball.radius = gameStateData.ball_radius;
	// if (gameStateData.p_speed !== undefined) state.p.speed = gameStateData.p_speed;

	// // Debug log the updated state values periodically
	// if (Math.random() < 0.01) { // Log ~1% of the time to avoid spam
	// 	console.log("🎮 Updated state from backend:", {
	// 		ring_length: state.ring.length,
	// 		ring_height: state.ring.height,
	// 		ring_width: state.ring.depth,
	// 		ring_thickness: state.ring.thickness,
	// 		p_length: state.p.depth,
	// 		p_height: state.p.height,
	// 		p_width: state.p.width,
	// 		ball_radius: state.ball.radius,
	// 		p_speed: state.p.speed
	// 	});
	// }

	// PLAYER 1 POSITION UPDATE
	if (gameStateData.player_1_pos && state.players && state.players[0]?.mesh) {
		// player_1_pos is [x, percentage] where percentage is 0-100
		const [posX, percentY] = gameStateData.player_1_pos;

		// Scale X position from backend to frontend dimensions
		if (
			typeof posX === "number" &&
			!isNaN(posX) &&
			gameStateData.ring_length > 0
		) {
			const scaledX = (posX / gameStateData.ring_length) * state.ring.length;
			state.players[0].mesh.position.x = scaledX;
		}

		// Validate that we have valid numbers to prevent NaN
		if (
			typeof percentY === "number" &&
			!isNaN(percentY) &&
			state.ring.height > 0
		) {
			// Convert percentage (0-100) to actual position relative to FRONTEND ring dimensions
			// 0% = top of ring (-state.ring.height/2), 100% = bottom of ring (state.ring.height/2)
			const actualY =
				(percentY / 100) * state.ring.height - state.ring.height / 2;

			// Update position (Z in ThreeJS is Y in backend)
			state.players[0].mesh.position.z = actualY;
		} else {
			console.warn(
				"Player 1 - Invalid percentY:",
				percentY,
				"or frontend ring_height:",
				state.ring.height
			);
		}
	}

	// PLAYER 2 POSITION UPDATE
	if (gameStateData.player_2_pos && state.players && state.players[1]?.mesh) {
		// player_2_pos is [x, percentage] where percentage is 0-100
		const [posX, percentY] = gameStateData.player_2_pos;

		// Scale X position from backend to frontend dimensions
		if (
			typeof posX === "number" &&
			!isNaN(posX) &&
			gameStateData.ring_length > 0
		) {
			const scaledX = (posX / gameStateData.ring_length) * state.ring.length;
			state.players[1].mesh.position.x = scaledX;
		}

		// Validate that we have valid numbers to prevent NaN
		if (
			typeof percentY === "number" &&
			!isNaN(percentY) &&
			state.ring.height > 0
		) {
			// Convert percentage (0-100) to actual position relative to FRONTEND ring dimensions
			// 0% = top of ring (-state.ring.height/2), 100% = bottom of ring (state.ring.height/2)
			const actualY =
				(percentY / 100) * state.ring.height - state.ring.height / 2;

			// Update position (Z in ThreeJS is Y in backend)
			state.players[1].mesh.position.z = actualY;
		} else {
			console.warn(
				"Player 2 - Invalid percentY:",
				percentY,
				"or frontend ring_height:",
				state.ring.height
			);
		}
	}

	// BALL POSITION AND PHYSICS UPDATE - Use server authority with client-side prediction
	if (gameStateData.ball_pos && state.ball?.mesh) {
		const [ballX, ballY] = gameStateData.ball_pos;
		
		// Update ball position directly from server (authoritative)
		state.ball.mesh.position.set(ballX, 0, ballY);
		
		// Update ball physics from server for client-side prediction
		if (gameStateData.ball_speed !== undefined) {
			state.ball_speed = gameStateData.ball_speed;
		}
		
		if (gameStateData.angle !== undefined) {
			state.angle = gameStateData.angle;
			
			// Update ball velocity based on server angle and speed for prediction
			if (state.ball_speed > 0) {
				const angleRad = (state.angle * Math.PI) / 180;
				state.ball_velocity = {
					x: state.ball_speed * Math.cos(angleRad),
					y: state.ball_speed * -Math.sin(angleRad) // Negative because backend uses -sin
				};
			}
		}
		
		// Enable client-side prediction flag
		state.ball.isMultiplayer = true;
	}

	// Force render scene
	if (state.renderer && state.scene && state.camera) {
		state.renderer.render(state.scene, state.camera);
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
		const opponentName = window.multiplayerGameInfo?.opponentName || "Opponent";

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

	// Remove mobile controls
	if (typeof window.removeMobileControls === 'function') {
		window.removeMobileControls();
	}

	// Determine winner
	const winner = state.p1_score >= state.maxScore ? "Player 1" : "Player 2";

	// Show game over with multiplayer context
	showNotification(`Game Over! ${winner} wins!`, "info");

	window.navigateTo("#home");
	// Show ready screen for potential rematch
	setTimeout(() => {
		showReadyScreen();
	}, 2000);
}

export {
	createGame,
	initializeWebSocket,
	socket,
	sendPlayerReady,
	sendGameInit,
	sendPlayerMovement,
	sendChatMessage,
	syncMultiplayerWithLocalGame,
	updateGameState,
	showReadyScreen,
	updateOpponentStatus,
	handleGameOver,
	hideAllMenusAndStartGame,
};
