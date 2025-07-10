import * as THREE from "three";
import { FontLoader } from "three/addons/loaders/FontLoader.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import { Group, remove } from "three/addons/libs/tween.module.js";
import { state } from "./state.js";
import * as UTILS from "./utils.js";
import * as SETUP from "./setup.js";
import * as SETTINGS from "./settings.js";
import * as GAME from "./gameLogic.js";
import Stats from "three/addons/libs/stats.module.js";
import { getVariables } from "../../var.js";
// Legacy sendPlayerInput removed - now using position sync system

export function renderPong() {
	//add bootstrap css
	const bootstrapCSS = document.createElement("link");
	bootstrapCSS.rel = "stylesheet";
	bootstrapCSS.href =
		"https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css";
	document.head.appendChild(bootstrapCSS);

	//add bootstrap js
	const bootstrapJS = document.createElement("script");
	bootstrapJS.src =
		"https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/js/bootstrap.bundle.min.js";
	document.head.appendChild(bootstrapJS);

	const link = document.createElement("link");
	link.rel = "stylesheet";
	link.href = "/pong/locale/pong.css";
	document.head.appendChild(link);

	// Inside renderPong function

	const contentDiv = document.getElementById("content");
	contentDiv.innerHTML = `
	<div class="pong-app">
		<div class="gamecontainer position-relative">
			<div id="threejs-container" class="w-100 h-100"></div>

			<!-- Multiplayer Status Indicator -->
			<div id="multiplayer-status" class="position-absolute top-0 start-0 p-2 bg-dark bg-opacity-75 rounded-end text-light" style="display: none;">
				<i class="fas fa-wifi me-2"></i>
				<span id="connection-status">Connecting...</span>
			</div>

			<!-- Master/Slave Role Indicator -->
			<div id="role-indicator" class="position-absolute top-0 end-0 p-2 bg-primary bg-opacity-75 rounded-start text-light" style="display: none;">
				<i class="fas fa-crown me-2"></i>
				<span id="role-status">Master</span>
			</div>

			<!-- Main Menu -->
			<div id="menu" class="position-absolute top-50 start-50 translate-middle text-center p-4 bg-dark bg-opacity-75 rounded shadow">
			<h1 class="text-light mb-4">PONG</h1>
			<div class="d-grid gap-3">
				<button id="newGameButton" class="btn btn-primary btn-lg">New Game</button>
				<button id="settingsButton" class="btn btn-secondary btn-lg">Settings</button>
				<button id="exitButton" class="btn btn-danger btn-lg">Exit</button>
			</div>
			</div>

			<!-- Player Selection Menu -->
			<div id="nbrOfPlayerMenu" class="position-absolute top-50 start-50 translate-middle text-center p-4 bg-dark bg-opacity-75 rounded shadow" style="display: none;">
			<h2 class="text-light mb-4">Select Players</h2>
			<div class="d-grid gap-3">
				<button id="onePlayerButton" class="btn btn-success btn-lg">1 Player</button>
				<button id="twoPlayerButton" class="btn btn-info btn-lg">2 Players</button>
				<button id="backButton" class="btn btn-secondary btn-lg">Back</button>
			</div>
			</div>

			<!-- Settings Menu -->
			<div id="settingsMenu" class="position-absolute top-50 start-50 translate-middle p-4 bg-dark bg-opacity-75 rounded shadow" style="display: none; max-width: 400px;">
			<h2 class="text-light mb-4 text-center">Settings</h2>
			<div class="mb-3">
				<label for="player1Color" class="form-label text-light">Player 1 Color:</label>
				<div class="d-flex gap-2">
				<input type="color" class="form-control form-control-color" id="player1Color" value="#4deeea" title="Choose player 1 color">
				</div>
			</div>

			<div class="mb-3">
				<label for="player2Color" class="form-label text-light">Player 2 Color:</label>
				<div class="d-flex gap-2">
				<input type="color" class="form-control form-control-color" id="player2Color" value="#4deeea" title="Choose player 2 color">
				</div>
			</div>

			<div class="mb-3">
				<label for="ballColor" class="form-label text-light">Ball Color:</label>
				<div class="d-flex gap-2">
				<input type="color" class="form-control form-control-color" id="ballColor" value="#8c5fb3" title="Choose ball color">
				</div>
			</div>

			<div class="mb-3">
				<label for="ringColor" class="form-label text-light">Ring Color:</label>
				<div class="d-flex gap-2">
				<input type="color" class="form-control form-control-color" id="ringColor" value="#ffe700" title="Choose ring color">
				</div>
			</div>

			<div class="mb-3">
				<label for="planeColor" class="form-label text-light">Plane Color:</label>
				<div class="d-flex gap-2">
				<input type="color" class="form-control form-control-color" id="planeColor" value="#089c00" title="Choose plane color">
				</div>
			</div>

			<div class="form-check mb-4">
				<input class="form-check-input" type="checkbox" id="showStats">
				<label class="form-check-label text-light" for="showStats">Show Stats</label>
			</div>

			<div class="d-flex gap-2 justify-content-center">
				<button id="saveSettingsButton" class="btn btn-success">Save</button>
				<button id="resetSettingsButton" class="btn btn-warning">Reset</button>
				<button id="backFromSettingsButton" class="btn btn-secondary">Back</button>
			</div>
			</div>

			<div id="pauseMenu" class="position-absolute top-50 start-50 translate-middle text-center p-4 bg-dark bg-opacity-75 rounded shadow" style="display: none;">
			<h2 class="text-light mb-4">Game Paused</h2>
			<div class="d-grid gap-3">
				<button id="resumeButton" class="btn btn-success btn-lg">Resume Game</button>
				<button id="exitButtonPause" class="btn btn-danger btn-lg">Exit Game</button>
			</div>
			</div>

			<div id="gameOverMenu" class="position-absolute top-50 start-50 translate-middle text-center p-4 bg-dark bg-opacity-75 rounded shadow" style="display: none;">
  			<h2 class="text-light mb-3">Game Over</h2>
  			<h3 id="winnerAnnouncement" class="text-warning mb-4">Player 1 Wins!</h3>
 			<div class="d-grid gap-3">
				<button id="restartGameButton" class="btn btn-success btn-lg">Rematch</button>
				<button id="mainMenuButton" class="btn btn-primary btn-lg">Back to Main Menu</button>
			</div>
			</div>
		</div>
	</div>
	`;

	// Key handlers for player movement
	function ensurePlayerSpeedIsValid() {
		// Ensure player_speed has a valid value, minimum 1.0
		if (!state.player_speed || state.player_speed <= 0) {
			state.player_speed = Math.max(1.5, state.ring.length / 80);
			console.log(`🔧 Fixed player_speed: ${state.player_speed} (ring.length: ${state.ring.length})`);
		}
	}

	function pongKeyDownHandler(event) {
		if (state.isPaused || !state.isStarted) {
			console.log(`🎮 Key ignored (game not started/paused): ${event.key}`);
			return;
		}

		ensurePlayerSpeedIsValid();
		console.log(`🎮 Key down: ${event.key} [${state.isMultiplayer ? (state.isMaster ? 'MASTER' : 'SLAVE') : 'LOCAL'}] Player: ${state.localPlayerId || 'N/A'} Speed: ${state.player_speed}`);

		switch (event.key) {
			case 'w':
			case 'W':
				if (state.isMultiplayer) {
					// In multiplayer: only set move_y for input calculation, DON'T apply position locally
					// Position sync will be handled by WebSocket messages only
					if (state.isMaster) {
						state.p1_move_y = -state.player_speed;
						console.log(`🏓 MASTER Set P1 input move_y: ${state.p1_move_y} (for position calc only)`);
					} else {
						state.p2_move_y = -state.player_speed;
						console.log(`🏓 SLAVE Set P2 input move_y: ${state.p2_move_y} (for position calc only)`);
					}
				} else {
					// In single player, W/S controls Player 1
					state.p1_move_y = -state.player_speed;
					console.log(`🏓 Set P1 move_y: ${state.p1_move_y}`);
				}
				break;
			case 's':
			case 'S':
				if (state.isMultiplayer) {
					// In multiplayer: only set move_y for input calculation, DON'T apply position locally
					// Position sync will be handled by WebSocket messages only
					if (state.isMaster) {
						state.p1_move_y = state.player_speed;
						console.log(`🏓 MASTER Set P1 input move_y: ${state.p1_move_y} (for position calc only)`);
					} else {
						state.p2_move_y = state.player_speed;
						console.log(`🏓 SLAVE Set P2 input move_y: ${state.p2_move_y} (for position calc only)`);
					}
				} else {
					// In single player, W/S controls Player 1
					state.p1_move_y = state.player_speed;
					console.log(`🏓 Set P1 move_y: ${state.p1_move_y}`);
				}
				break;
			case 'ArrowUp':
				if (state.isMultiplayer) {
					// In multiplayer: only slave (player 2) uses arrow keys
					if (!state.isMaster) {
						state.p2_move_y = -state.player_speed;
						console.log(`🏓 SLAVE Set P2 input move_y: ${state.p2_move_y} (for position calc only)`);
					}
				} else {
					// Arrow keys control Player 2 in local mode only
					state.p2_move_y = -state.player_speed;
					console.log(`🏓 Set P2 move_y: ${state.p2_move_y}`);
				}
				break;
			case 'ArrowDown':
				if (state.isMultiplayer) {
					// In multiplayer: only slave (player 2) uses arrow keys
					if (!state.isMaster) {
						state.p2_move_y = state.player_speed;
						console.log(`🏓 SLAVE Set P2 input move_y: ${state.p2_move_y} (for position calc only)`);
					}
				} else {
					// Arrow keys control Player 2 in local mode only
					state.p2_move_y = state.player_speed;
					console.log(`🏓 Set P2 move_y: ${state.p2_move_y}`);
				}
				break;
		}
	}

	function pongKeyUpHandler(event) {
		if (state.isPaused || !state.isStarted) return;

		console.log(`🎮 Key up: ${event.key} [${state.isMultiplayer ? (state.isMaster ? 'MASTER' : 'SLAVE') : 'LOCAL'}] Player: ${state.localPlayerId || 'N/A'}`);

		switch (event.key) {
			case 'w':
			case 'W':
			case 's':
			case 'S':
				if (state.isMultiplayer) {
					// In multiplayer: stop input calculation, positions will be synced via WebSocket
					if (state.isMaster) {
						state.p1_move_y = 0;
						console.log(`🏓 MASTER Stop P1 input move_y: ${state.p1_move_y} (for position calc only)`);
					} else {
						state.p2_move_y = 0;
						console.log(`🏓 SLAVE Stop P2 input move_y: ${state.p2_move_y} (for position calc only)`);
					}
				} else {
					// In single player, W/S controls Player 1
					state.p1_move_y = 0;
					console.log(`🏓 Stop P1 move_y: ${state.p1_move_y}`);
				}
				break;
			case 'ArrowUp':
			case 'ArrowDown':
				if (state.isMultiplayer) {
					// In multiplayer: only slave (player 2) uses arrow keys
					if (!state.isMaster) {
						state.p2_move_y = 0;
						console.log(`🏓 SLAVE Stop P2 input move_y: ${state.p2_move_y} (for position calc only)`);
					}
				} else {
					// Arrow keys control Player 2 in local mode only
					state.p2_move_y = 0;
					console.log(`🏓 Stop P2 move_y: ${state.p2_move_y}`);
				}
				break;
		}
	}

	document.addEventListener("keydown", pongKeyDownHandler);
    document.addEventListener("keyup", pongKeyUpHandler);

    window.pongKeyDownHandler = pongKeyDownHandler;
    window.pongKeyUpHandler = pongKeyUpHandler;

	// Check if there's a multiplayer game waiting
	checkForMultiplayerGame();

	// Add timeout setup for testing (only if no multiplayer game is found)
	setTimeout(() => {
		if (!state.isMultiplayer) {
			console.log("🔧 No multiplayer game found, setting up local game for testing...");
			SETUP.setupGame();
		}
	}, 1000);

	document
		.getElementById("newGameButton")
		.addEventListener("click", SETTINGS.shownbrOfPlayerMenu);
	document
		.getElementById("settingsButton")
		.addEventListener("click", SETTINGS.showSettingsMenu);
	document
		.getElementById("exitButton")
		.addEventListener("click", SETTINGS.exitGame);
	document
		.getElementById("onePlayerButton")
		.addEventListener("click", SETTINGS.startOnePlayerGame);
	document
		.getElementById("twoPlayerButton")
		.addEventListener("click", SETTINGS.startTwoPlayerGame);
	document
		.getElementById("backButton")
		.addEventListener("click", SETTINGS.showMainMenu);

	document
		.getElementById("saveSettingsButton")
		.addEventListener("click", SETTINGS.saveSettings);
	document
		.getElementById("resetSettingsButton")
		.addEventListener("click", SETTINGS.resetSettings);
	document
		.getElementById("backFromSettingsButton")
		.addEventListener("click", SETTINGS.showMainMenu);
	document
		.getElementById("resumeButton")
		.addEventListener("click", SETTINGS.resumeGame);
	document
		.getElementById("exitButtonPause")
		.addEventListener("click", SETTINGS.exitGame);
	document
		.getElementById("player1Color")
		.addEventListener("input", (event) => {
			state.mat.p1.color.set(event.target.value);
		});
	document
		.getElementById("player2Color")
		.addEventListener("input", (event) => {
			state.mat.p2.color.set(event.target.value);
		});
	document.getElementById("ballColor").addEventListener("input", (event) => {
		state.mat.ball.color.set(event.target.value);
	});

	document.getElementById("ringColor").addEventListener("input", (event) => {
		state.mat.ring.color.set(event.target.value);
	});

	document.getElementById("planeColor").addEventListener("input", (event) => {
		state.mat.plane.color.set(event.target.value);
	});

	document.getElementById("showStats").addEventListener("change", (event) => {
		UTILS.toggleStats(event.target.checked);
	});

	document
		.getElementById("restartGameButton")
		.addEventListener("click", SETTINGS.restartGame);

	document
		.getElementById("mainMenuButton")
		.addEventListener("click", SETTINGS.restartMenu);

	document.getElementById("menu").style.display = "block";

	setTimeout(() => {
		SETUP.setupGame();
		GAME.animate();
	}, 100);

	//Resize handler
	state.onWindowResize = () => {
		const container = document.getElementById("threejs-container");
		if (container && state.camera && state.renderer) {
			const rect = container.getBoundingClientRect();
			const width = rect.width;
			const height = rect.height;

			// Ensure minimum size
			if (width > 0 && height > 0) {
				state.camera.aspect = width / height;
				state.camera.updateProjectionMatrix();
				state.renderer.setSize(width, height);

				console.log(`🔧 Pong resized: ${width}x${height}`);
			}
		}
	};

	// Remove any existing resize listeners to avoid duplicates
	if (window.pongResizeHandler) {
		window.removeEventListener("resize", window.pongResizeHandler);
	}

	window.addEventListener("resize", state.onWindowResize);
	window.pongResizeHandler = state.onWindowResize;

	// Add ResizeObserver for better container monitoring
	if (window.ResizeObserver) {
		const container = document.getElementById("threejs-container");
		if (container && !state.resizeObserver) {
			state.resizeObserver = new ResizeObserver((entries) => {
				for (let entry of entries) {
					const { width, height } = entry.contentRect;
					if (width > 0 && height > 0 && state.camera && state.renderer) {
						state.camera.aspect = width / height;
						state.camera.updateProjectionMatrix();
						state.renderer.setSize(width, height);
						console.log(`🔧 Pong container resized: ${width}x${height}`);
					}
				}
			});
			state.resizeObserver.observe(container);
		}
	}

	// Function to update multiplayer connection status
	function updateMultiplayerStatus(status, message) {
		const statusIndicator = document.getElementById('multiplayer-status');
		const statusText = document.getElementById('connection-status');

		if (!statusIndicator || !statusText) return;

		statusIndicator.style.display = status === 'disconnected' ? 'none' : 'block';
		statusText.textContent = message || status;

		// Update icon based on status
		const icon = statusIndicator.querySelector('i');
		if (icon) {
			icon.className = 'fas me-2 ' + (
				status === 'connected' ? 'fa-wifi text-success' :
				status === 'connecting' ? 'fa-spinner fa-spin text-warning' :
				'fa-wifi-slash text-danger'
			);
		}
	}

	// Function to update role indicator (Master/Slave)
	function updateRoleIndicator(isMaster) {
		const roleIndicator = document.getElementById('role-indicator');
		const roleText = document.getElementById('role-status');
		const roleIcon = roleIndicator?.querySelector('i');

		if (!roleIndicator || !roleText) return;

		if (state.isMultiplayer) {
			roleIndicator.style.display = 'block';
			roleText.textContent = isMaster ? 'Master' : 'Slave';

			if (roleIcon) {
				roleIcon.className = isMaster ? 'fas fa-crown me-2 text-warning' : 'fas fa-user me-2 text-info';
			}

			// Update background color
			roleIndicator.className = isMaster
				? 'position-absolute top-0 end-0 p-2 bg-warning bg-opacity-75 rounded-start text-dark'
				: 'position-absolute top-0 end-0 p-2 bg-info bg-opacity-75 rounded-start text-light';

			console.log(`🎭 Role indicator updated: ${isMaster ? 'MASTER' : 'SLAVE'}`);
		} else {
			roleIndicator.style.display = 'none';
		}
	}

	// Check if there's a multiplayer game waiting
	async function checkForMultiplayerGame() {
		try {
			const { userId, token, url_api } = getVariables();

			// Check if user has pending game invitations or active games
			const response = await fetch(`${url_api}/pong/games/pending/${userId}/`, {
				headers: {
					"Authorization": `Bearer ${token}`,
					"Content-Type": "application/json"
				}
			});

			if (response.ok) {
				const data = await response.json();
				console.log("🎮 Checking for pending games:", data);

				if (data.active_game) {
					console.log("🎯 Found active game, connecting...");

					// Set up multiplayer state
					state.isMultiplayer = true;
					state.room_id = data.active_game.id;
					state.localPlayerId = parseInt(userId);
					state.remotePlayerId = data.active_game.opponent_id;

					// Determine master/slave roles based on who is player_1 (creator) vs player_2 (invitee)
					// player_1 (game creator/inviter) = MASTER
					// player_2 (game invitee) = SLAVE
					const isPlayer1 = parseInt(userId) === data.active_game.player_1_id;
					state.isMaster = isPlayer1;

					console.log(`🎮 Role assignment: Player ${userId} (you) = ${state.isMaster ? 'MASTER' : 'SLAVE'}, Player ${data.active_game.opponent_id} = ${state.isMaster ? 'SLAVE' : 'MASTER'}`);
					console.log(`🔍 Debug: userId=${userId}, player_1_id=${data.active_game.player_1_id}, isPlayer1=${isPlayer1}`);
					console.log(`🔍 Additional Debug: game data=`, data.active_game);

					// Update role indicator
					updateRoleIndicator(state.isMaster);

					// Import and initialize WebSocket
					const { initializeWebSocket } = await import("../multiplayer/serverSide.js");
					initializeWebSocket(data.active_game.id, userId, data.active_game.opponent_id);

					// Show multiplayer status
					updateMultiplayerStatus("connecting", "Connecting to multiplayer game...");

					// Don't auto-start the game, just prepare the multiplayer state
					// The game will start when both players are ready
					console.log("✅ Multiplayer game state prepared, waiting for players to be ready...");
				}
			}
		} catch (error) {
			console.error("❌ Error checking for multiplayer games:", error);
		}
	}

	// Export functions to make them available outside
	window.updateMultiplayerStatus = updateMultiplayerStatus;
	window.updateRoleIndicator = updateRoleIndicator;
}

// Export for external usage
export function updateMultiplayerStatus(status, message) {
	if (window.updateMultiplayerStatus) {
		window.updateMultiplayerStatus(status, message);
	}
}

export function updateRoleIndicator(isMaster) {
	if (window.updateRoleIndicator) {
		window.updateRoleIndicator(isMaster);
	}
}
