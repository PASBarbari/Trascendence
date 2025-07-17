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
			console.table(
				"player pos:",
				state.players.map((player) => player.mesh.position)
			);
			// Initialize the game scene
			syncMultiplayerWithLocalGame();
		} else if (
			message.type === "all_players_ready" ||
			message.message === "All players are ready!"
		) {
			// Add game-active class to body
			document.body.classList.add("game-active");

			// Send game initialization to backend
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
					player_1_pos: [-75, 0], // Left side
					player_2_pos: [75, 0], // Right side
					ball_pos: [0, 0],
					ball_speed: 1.2,
					p_speed: 1.5,
				};

				sendGameInit(gameConfig);

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
});

function updateGameState(gameStateData) {
	if (!gameStateData) {
		return;
	}

	// PLAYER 1 POSITION UPDATE
	if (gameStateData.player_1_pos && state.players && state.players[0]?.mesh) {
		const percentY = gameStateData.player_1_pos;

		// Convert percentage (0-100) to actual position in the ring
		// 0% = top of ring (-ring_height/2), 100% = bottom of ring (ring_height/2)
		const actualY =
			(percentY / 100) * gameStateData.ring_height -
			gameStateData.ring_height / 2;

		// Update position (Z in ThreeJS is Y in backend)
		state.players[0].mesh.position.z = actualY;
	}

	// PLAYER 2 POSITION UPDATE
	if (gameStateData.player_2_pos && state.players && state.players[1]?.mesh) {
		const percentY = gameStateData.player_2_pos;

		// Convert percentage (0-100) to actual position in the ring
		// 0% = top of ring (-ring_height/2), 100% = bottom of ring (ring_height/2)
		const actualY =
			(percentY / 100) * gameStateData.ring_height -
			gameStateData.ring_height / 2;

		// Update position (Z in ThreeJS is Y in backend)
		state.players[1].mesh.position.z = actualY;
	}

	// BALL POSITION UPDATE (working)
	if (gameStateData.ball_pos && state.ball?.mesh) {
		const [ballX, ballY] = gameStateData.ball_pos;
		state.ball.mesh.position.set(ballX, 0, ballY);
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

	// Determine winner
	const winner = state.p1_score >= state.maxScore ? "Player 1" : "Player 2";

	// Show game over with multiplayer context
	showNotification(`Game Over! ${winner} wins!`, "info");

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
