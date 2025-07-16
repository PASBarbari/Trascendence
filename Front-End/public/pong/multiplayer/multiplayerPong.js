import { state } from "../locale/state.js";
import * as SETUP from "../locale/setup.js";
import * as GAME from "../locale/gameLogic.js";
import * as SETTINGS from "../locale/settings.js";
import {
	createGame,
	sendPlayerReady,
	sendPlayerMovement,
} from "./serverSide.js";
import { getVariables } from "../../var.js";
import { showNotification } from "../pongContainer.js";

export function renderMultiplayerPong(
	opponentId,
	opponentName,
	existingRoomId = null
) {
	console.log(
		`🎮 Rendering multiplayer pong vs ${opponentName} (Room: ${existingRoomId})`
	);

	window.multiplayerGameInfo = {
		opponentId,
		opponentName,
		roomId: existingRoomId,
	};

	// Import locale pong CSS
	const link = document.createElement("link");
	link.rel = "stylesheet";
	link.href = "/pong/locale/pong.css";
	document.head.appendChild(link);

	// Load Bootstrap
	const bootstrapCSS = document.createElement("link");
	bootstrapCSS.rel = "stylesheet";
	bootstrapCSS.href =
		"https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css";
	document.head.appendChild(bootstrapCSS);

	const contentDiv = document.getElementById("content");
	contentDiv.innerHTML = `
        <div class="pong-app">
            <div class="gamecontainer position-relative">
                <div id="threejs-container" class="w-100 h-100"></div>
                
                <!-- Multiplayer UI Overlay -->
                <div class="position-absolute top-0 end-0 p-3 bg-dark bg-opacity-75 text-white rounded-bottom">
                    <div class="mb-2">
                        <i class="fas fa-wifi me-2"></i>
                        <span class="fw-bold">vs ${opponentName}</span>
                    </div>
                    <div id="connection-status" class="small">
                        <span class="badge bg-warning">Connecting...</span>
                    </div>
                </div>
                
                <!-- Ready Screen - Always show this, no overlay needed -->
                <div id="ready-screen" class="position-absolute top-50 start-50 translate-middle text-center p-4 bg-dark bg-opacity-75 rounded shadow" style="min-width: 400px; max-width: 500px;">
                    <div class="d-flex flex-column h-100">
                        <!-- Header -->
                        <div class="mb-4">
                            <h2 class="text-light mb-3">🎮 Multiplayer Pong</h2>
                            <h5 class="text-light">🥊 You vs ${opponentName}</h5>
                        </div>
                        
                        <!-- Player Status Section -->
                        <div class="mb-4">
                            <div class="row g-3">
                                <div class="col-12">
                                    <div id="player-ready-status" class="d-flex justify-content-between align-items-center p-2 bg-dark bg-opacity-50 rounded">
                                        <span class="text-success">
                                            <i class="fas fa-user me-2"></i>You:
                                        </span>
                                        <span class="badge bg-warning">Not Ready</span>
                                    </div>
                                </div>
                                <div class="col-12">
                                    <div id="opponent-ready-status" class="d-flex justify-content-between align-items-center p-2 bg-dark bg-opacity-50 rounded">
                                        <span class="text-primary">
                                            <i class="fas fa-user-friends me-2"></i>${opponentName}:
                                        </span>
                                        <span class="badge bg-warning">Not Ready</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Action Buttons -->
                        <div class="mb-4">
                            <div class="d-grid gap-2">
                                <button id="ready-button" class="btn btn-success btn-lg">
                                    <i class="fas fa-check-circle me-2"></i>Ready to Play
                                </button>
                                <button id="leave-game-btn" class="btn btn-outline-danger">
                                    <i class="fas fa-sign-out-alt me-2"></i>Leave Game
                                </button>
                            </div>
                        </div>
                        
                        <!-- Controls Info -->
                        <div class="mt-auto">
                            <div class="text-light small">
                                <p class="mb-1 fw-bold">🎮 Controls:</p>
                                <div class="d-flex justify-content-center gap-3">
                                    <span><kbd class="bg-secondary text-white px-2 py-1 rounded">W</kbd> Move Up</span>
                                    <span><kbd class="bg-secondary text-white px-2 py-1 rounded">S</kbd> Move Down</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- In-game controls info -->
                <div id="controls-info" class="position-absolute bottom-0 start-0 p-3 bg-dark bg-opacity-75 text-white rounded-top" style="display: none;">
                    <div class="small">
                        <div><strong>W</strong> - Move Up</div>
                        <div><strong>S</strong> - Move Down</div>
                        <div><strong>ESC</strong> - Pause</div>
                    </div>
                </div>
            </div>
        </div>
    `;

	// Initialize game after DOM is ready
	setTimeout(() => {
		initializeMultiplayerGame(opponentId, opponentName, existingRoomId);
	}, 100);
}

async function initializeMultiplayerGame(
	opponentId,
	opponentName,
	existingRoomId = null
) {
	try {
		console.log(
			`🔧 Initializing multiplayer game vs ${opponentName} (ID: ${opponentId}, Room: ${existingRoomId})`
		);

		// Setup the game scene (same as local pong)
		SETUP.setupGame();

		// Set multiplayer specific state
		state.isMultiplayer = true;
		state.isStarted = false;
		state.isPaused = true;
		state.IAisActive = false; // Disable AI for multiplayer

		// ✅ IMPORTANT: Disable local ball physics for multiplayer
		if (state.ball) {
			state.ball.disableLocalPhysics = true;
			console.log("🚫 Local ball physics disabled for multiplayer");
		}

		// Update connection status
		updateConnectionStatus("connecting", "Connecting to server...");

		if (existingRoomId) {
			// Join existing game room (from URL parameters)
			console.log(`🔗 Joining existing game room: ${existingRoomId}`);
			const { initializeWebSocket } = await import("./serverSide.js");
			initializeWebSocket(existingRoomId, opponentId, opponentName);
		} else {
			// Create new game session (fallback)
			const { userId } = getVariables();
			console.log(
				`🎯 Creating new game: Player ${userId} vs Player ${opponentId}`
			);
			await createGame(parseInt(userId), parseInt(opponentId));
		}

		// Setup event listeners
		setupMultiplayerEventListeners();

		// Start game animation (paused until both players ready)
		GAME.animate();

		console.log("✅ Multiplayer game initialized successfully");
	} catch (error) {
		console.error("❌ Failed to initialize multiplayer game:", error);
		updateConnectionStatus("error", "Connection failed");
		showGameError(
			"Failed to connect to multiplayer game. Please try again."
		);
	}
}

function sendGameInitialization() {
	console.log("🎮 Sending game initialization data...");

	try {
		const { sendGameInit } = import("./serverSide.js");

		// Send current game dimensions to backend
		const gameConfig = {
			ring_length: state.ring.length || 160,
			ring_height: state.ring.height || 90,
			ring_width: state.ring.width || 200,
			ring_thickness: state.ring.thickness || 3,
			p_length: state.p.height || 15,
			p_width: state.p.width || 2,
			p_height: state.p.depth || 2,
			ball_radius: state.ball_radius || 2.5,
			player_1_pos: [-60, 0], // Left paddle position
			player_2_pos: [60, 0], // Right paddle position
			ball_speed: state.ball_speed || 1,
			p_speed: state.player_speed || 2, // ✅ Increase from 0.1 to 2
		};

		console.log("🎮 Game config being sent:", gameConfig);
		sendGameInit(gameConfig);
	} catch (error) {
		console.error("❌ Failed to send game initialization:", error);
	}
}

// Update the hideAllMenusAndStartGame function to send init data
function hideAllMenusAndStartGame() {
	console.log("🎯 Hiding all menus and starting multiplayer game...");

	// Start the game using local game logic
	state.isStarted = true;
	state.isPaused = false;
	state.IAisActive = false; // Disable AI for multiplayer

	console.log("✅ Game state set:", {
		isStarted: state.isStarted,
		isPaused: state.isPaused,
		isMultiplayer: state.isMultiplayer,
	});

	// Hide ready screen
	const readyScreen = document.getElementById("ready-screen");
	if (readyScreen) {
		readyScreen.style.display = "none";
		console.log("✅ Ready screen hidden");
	} else {
		console.warn("⚠️ Ready screen element not found!");
	}

	// Hide connection status overlay
	const connectionOverlay = document.querySelector(
		".position-absolute.top-0.end-0"
	);
	if (connectionOverlay) {
		connectionOverlay.style.display = "none";
		console.log("✅ Connection status overlay hidden");
	}

	// Show in-game controls info
	const controlsInfo = document.getElementById("controls-info");
	if (controlsInfo) {
		controlsInfo.style.display = "block";
		console.log("✅ Controls info shown");
	}

	// ✅ CRITICAL: Send game initialization to backend
	setTimeout(() => {
		sendGameInitialization();
	}, 500);

	// Start game animation if not already running
	if (!state.animationFrameId) {
		console.log("🎬 Starting game animation...");
		GAME.animate();
	}

	console.log("🎮 Game started successfully! All menus hidden.");
}

function setupMultiplayerEventListeners() {
	console.log("🔧 Setting up multiplayer event listeners...");

	// Ready button
	const readyBtn = document.getElementById("ready-button");
	if (readyBtn) {
		readyBtn.addEventListener("click", handlePlayerReady);
	}

	// Leave game button
	const leaveBtn = document.getElementById("leave-game-btn");
	if (leaveBtn) {
		leaveBtn.addEventListener("click", () => {
			if (confirm("Are you sure you want to leave the game?")) {
				exitMultiplayerGame();
			}
		});
	}

	// Keyboard controls (same as local pong but sends to server)
	document.addEventListener("keydown", handleMultiplayerKeyDown);
	document.addEventListener("keyup", handleMultiplayerKeyUp);

	// Store references for cleanup
	window.multiplayerKeyDown = handleMultiplayerKeyDown;
	window.multiplayerKeyUp = handleMultiplayerKeyUp;

	console.log("✅ Event listeners setup complete");
}

function handlePlayerReady() {
	console.log("🎯 Player ready button clicked");

	const readyBtn = document.getElementById("ready-button");
	const playerStatus = document.getElementById("player-ready-status");

	if (readyBtn && playerStatus) {
		// Update UI
		readyBtn.disabled = true;
		readyBtn.innerHTML =
			'<i class="fas fa-spinner fa-spin me-2"></i>Waiting for opponent...';

		// Update player status with proper structure
		playerStatus.innerHTML = `
            <span class="text-success">
                <i class="fas fa-user me-2"></i>You:
            </span>
            <span class="badge bg-success">Ready</span>
        `;

		// Send ready signal to server
		try {
			const playerId = window.multiplayerInfo?.playerId || 0;
			console.log(`📤 Sending ready signal for player ${playerId}`);
			sendPlayerReady(playerId);
			console.log("✅ Ready signal sent successfully");
			showNotification(
				"✅ You are ready! Waiting for opponent...",
				"info"
			);
		} catch (error) {
			console.error("❌ Failed to send ready signal:", error);
			showNotification(
				"❌ Failed to send ready signal. Try again.",
				"error"
			);

			// Revert UI
			readyBtn.disabled = false;
			readyBtn.innerHTML =
				'<i class="fas fa-check-circle me-2"></i>Ready to Play';
			playerStatus.innerHTML = `
                <span class="text-success">
                    <i class="fas fa-user me-2"></i>You:
                </span>
                <span class="badge bg-warning">Not Ready</span>
            `;
		}
	}
}

function handleMultiplayerKeyDown(event) {
	// ✅ Add comprehensive debug for key press events
	console.log("🎮 Key pressed:", event.key);
	console.log("🎮 Game state check:", {
		started: state.isStarted,
		paused: state.isPaused,
		multiplayerId: window.multiplayerInfo?.playerId,
		time: new Date().toLocaleTimeString(),
	});

	// ✅ CRITICAL: Early exit detection
	if (!state.isStarted || state.isPaused) {
		console.warn(
			"⚠️ Movement ignored! Game not active. Set state.isStarted=true and state.isPaused=false"
		);
		return;
	}

	const playerId = window.multiplayerInfo?.playerId || 0;

	try {
		if (event.key.toLowerCase() === "w") {
			console.log("⬆️ Sending UP movement for player", playerId);
			sendPlayerMovement(playerId, "up");

			// ✅ Monitor current positions after movement
			setTimeout(() => {
				if (
					state.players &&
					state.players[0] &&
					state.players[0].mesh
				) {
					console.log("🔍 PLAYER POSITION after UP:", {
						x: state.players[0].mesh.position.x.toFixed(2),
						z: state.players[0].mesh.position.z.toFixed(2),
					});
				}
			}, 100);
		} else if (event.key.toLowerCase() === "s") {
			console.log("⬇️ Sending DOWN movement for player", playerId);
			sendPlayerMovement(playerId, "down");

			// ✅ Monitor current positions after movement
			setTimeout(() => {
				if (
					state.players &&
					state.players[0] &&
					state.players[0].mesh
				) {
					console.log("🔍 PLAYER POSITION after DOWN:", {
						x: state.players[0].mesh.position.x.toFixed(2),
						z: state.players[0].mesh.position.z.toFixed(2),
					});
				}
			}, 100);
		} else if (event.key === "Escape") {
			togglePause();
		}
	} catch (error) {
		console.error("❌ Failed to send movement:", error);
	}
}
function handleMultiplayerKeyUp(event) {
	if (!state.isStarted || state.isPaused) return;

	const playerId = window.multiplayerInfo?.playerId || 0;

	try {
		if (
			event.key.toLowerCase() === "w" ||
			event.key.toLowerCase() === "s"
		) {
			sendPlayerMovement(playerId, "stop");
			console.log("⏹️ Sent STOP movement");
		}
	} catch (error) {
		console.error("❌ Failed to send movement:", error);
	}
}

function togglePause() {
	state.isPaused = !state.isPaused;

	if (state.isPaused) {
		showNotification("⏸️ Game Paused", "info");
		// Show controls info when paused
		const controlsInfo = document.getElementById("controls-info");
		if (controlsInfo) {
			controlsInfo.style.display = "block";
		}
	} else {
		showNotification("▶️ Game Resumed", "info");
		// Hide controls info when resumed
		const controlsInfo = document.getElementById("controls-info");
		if (controlsInfo) {
			controlsInfo.style.display = "none";
		}
	}
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

function exitMultiplayerGame() {
	console.log("🚪 Exiting multiplayer game...");

	// Cleanup event listeners
	if (window.multiplayerKeyDown) {
		document.removeEventListener("keydown", window.multiplayerKeyDown);
		document.removeEventListener("keyup", window.multiplayerKeyUp);
		window.multiplayerKeyDown = null;
		window.multiplayerKeyUp = null;
	}

	// Stop game
	state.isStarted = false;
	state.isPaused = true;
	state.isMultiplayer = false;

	// Clean up game state
	SETTINGS.cleanupPong();

	// Navigate back to home
	window.navigateTo("#home");

	showNotification("👋 Left multiplayer game", "info");
}

function showGameError(message) {
	const readyScreen = document.getElementById("ready-screen");
	if (readyScreen) {
		readyScreen.innerHTML = `
            <div class="text-center p-4 bg-dark rounded shadow">
                <h3 class="text-danger mb-3">❌ Connection Error</h3>
                <p class="text-light mb-3">${message}</p>
                <div class="d-grid gap-2">
                    <button class="btn btn-primary" onclick="window.navigateTo('#home')">
                        🏠 Return to Home
                    </button>
                    <button class="btn btn-outline-secondary" onclick="window.location.reload()">
                        🔄 Retry
                    </button>
                </div>
            </div>
        `;
	}
}

window.debugPlayerPositions = function () {
	console.log("🔍 DEBUG: Current player positions:");
	if (state.players[0]?.mesh) {
		console.log(
			`Player 1: X=${state.players[0].mesh.position.x}, Y=${state.players[0].mesh.position.y}, Z=${state.players[0].mesh.position.z}`
		);
	}
	if (state.players[1]?.mesh) {
		console.log(
			`Player 2: X=${state.players[1].mesh.position.x}, Y=${state.players[1].mesh.position.y}, Z=${state.players[1].mesh.position.z}`
		);
	}
	console.log("Game state:", {
		isStarted: state.isStarted,
		isPaused: state.isPaused,
		isMultiplayer: state.isMultiplayer,
	});
};

window.debugGameState = function () {
	console.log("🎮 GAME STATE:", {
		isStarted: state.isStarted,
		isPaused: state.isPaused,
		isMultiplayer: state.isMultiplayer,
		players: state.players?.length || 0,
		p1_pos: state.players?.[0]?.mesh
			? `(${state.players[0].mesh.position.x.toFixed(
					2
			  )}, ${state.players[0].mesh.position.z.toFixed(2)})`
			: "N/A",
		p2_pos: state.players?.[1]?.mesh
			? `(${state.players[1].mesh.position.x.toFixed(
					2
			  )}, ${state.players[1].mesh.position.z.toFixed(2)})`
			: "N/A",
		ball_pos: state.ball?.mesh
			? `(${state.ball.mesh.position.x.toFixed(
					2
			  )}, ${state.ball.mesh.position.z.toFixed(2)})`
			: "N/A",
	});
};

window.fixGameState = function () {
	state.isStarted = true;
	state.isPaused = false;
	console.log("✅ Game state fixed: isStarted=true, isPaused=false");
	return "Game state fixed. Try moving now!";
};

window.testMovement = function () {
	console.log("🧪 Testing movement sequence...");
	const playerId = window.multiplayerInfo?.playerId || 0;

	console.log("Current state:", {
		isStarted: state.isStarted,
		isPaused: state.isPaused,
	});

	// Fix game state
	state.isStarted = true;
	state.isPaused = false;

	// Test sequence
	setTimeout(() => sendPlayerMovement(playerId, "up"), 500);
	setTimeout(() => sendPlayerMovement(playerId, "stop"), 1000);
	setTimeout(() => sendPlayerMovement(playerId, "down"), 1500);
	setTimeout(() => sendPlayerMovement(playerId, "stop"), 2000);

	return "Movement test sequence initiated";
};

// Make functions available globally
window.debugGameState = debugGameState;
window.fixGameState = fixGameState;
window.testMovement = testMovement;
// Export functions for global access
export {
	initializeMultiplayerGame,
	setupMultiplayerEventListeners,
	handlePlayerReady,
	exitMultiplayerGame,
	updateConnectionStatus,
	hideAllMenusAndStartGame,
};

// Make functions globally available for onclick handlers
window.handlePlayerReady = handlePlayerReady;
window.exitMultiplayerGame = exitMultiplayerGame;
window.hideAllMenusAndStartGame = hideAllMenusAndStartGame;

console.log("🎮 Multiplayer Pong module loaded successfully");
