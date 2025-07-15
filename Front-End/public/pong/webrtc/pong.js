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
	link.href = "/pong/webrtc/pong.css";
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

			<!-- Host/Guest Role Indicator -->
			<div id="role-indicator" class="position-absolute top-0 end-0 p-2 bg-primary bg-opacity-75 rounded-start text-light" style="display: none;">
				<i class="fas fa-crown me-2"></i>
				<span id="role-status">Host</span>
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
<button id="exitButtonPause" class="btn btn-primary btn-lg"><i class="fas fa-home me-2"></i>Exit</button>
			</div>
			</div>

			<div id="gameOverMenu" class="position-absolute top-50 start-50 translate-middle text-center p-4 bg-dark bg-opacity-75 rounded shadow" style="display: none;">
			<h2 class="text-light mb-3">Game Over</h2>
			<h3 id="winnerAnnouncement" class="text-warning mb-4">Player 1 Wins!</h3>
			<div class="d-grid gap-3">
				<button id="restartGameButton" class="btn btn-success btn-lg">Rematch</button>
			<button id="mainMenuButton" class="btn btn-primary btn-lg">
				<i class="fas fa-home me-2"></i>Exit
			</button>
			</div>
			</div>

			<!-- Ready Menu for WebRTC Multiplayer -->
			<div id="readyMenu" class="position-absolute top-50 start-50 translate-middle text-center p-4 bg-dark bg-opacity-75 rounded shadow" style="display: none;">
			<h2 class="text-light mb-3">Pong WebRTC</h2>
			<div class="d-grid gap-3">
				<button id="readyButton" class="btn btn-success btn-lg" disabled>
					<i class="fas fa-rocket me-2"></i>Ready
				</button>
				<button id="readyExitButton" class="btn btn-primary btn-lg">
					<i class="fas fa-home me-2"></i>Exit
				</button>
			</div>
			<div id="readyStatus" class="text-light mt-3">
				<small><i class="fas fa-spinner fa-spin me-2"></i>Connecting...</small>
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
		}
	}

	function pongKeyDownHandler(event) {
		// Handle ESC key for pause
		if (event.key === 'Escape') {
			handlePause();
			return;
		}

		if (state.isPaused || !state.isStarted) {
			return;
		}

		ensurePlayerSpeedIsValid();

		switch (event.key) {
			case 'w':
			case 'W':
				if (state.isMultiplayer) {
					// In multiplayer: only set move_y for input calculation, DON'T apply position locally
					// Position sync will be handled by WebSocket messages only
					if (state.isHost) {
						state.p1_move_y = -state.player_speed;
					} else {
						state.p2_move_y = -state.player_speed;
					}
				} else {
					// In single player, W/S controls Player 1
					state.p1_move_y = -state.player_speed;
				}
				break;
			case 's':
			case 'S':
				if (state.isMultiplayer) {
					// In multiplayer: only set move_y for input calculation, DON'T apply position locally
					// Position sync will be handled by WebSocket messages only
					if (state.isHost) {
						state.p1_move_y = state.player_speed;
					} else {
						state.p2_move_y = state.player_speed;
					}
				} else {
					// In single player, W/S controls Player 1
					state.p1_move_y = state.player_speed;
				}
				break;
			case 'ArrowUp':
				if (state.isMultiplayer) {
					// In multiplayer: only guest (player 2) uses arrow keys
					if (!state.isHost) {
						state.p2_move_y = -state.player_speed;
					}
				} else {
					// Arrow keys control Player 2 in local mode only
					state.p2_move_y = -state.player_speed;
				}
				break;
			case 'ArrowDown':
				if (state.isMultiplayer) {
					// In multiplayer: only guest (player 2) uses arrow keys
					if (!state.isHost) {
						state.p2_move_y = state.player_speed;
					}
				} else {
					// Arrow keys control Player 2 in local mode only
					state.p2_move_y = state.player_speed;
				}
				break;
		}
	}

	function pongKeyUpHandler(event) {
		if (state.isPaused || !state.isStarted) return;

		switch (event.key) {
			case 'w':
			case 'W':
			case 's':
			case 'S':
				if (state.isMultiplayer) {
					// In multiplayer: stop input calculation, positions will be synced via WebSocket
					if (state.isHost) {
						state.p1_move_y = 0;
					} else {
						state.p2_move_y = 0;
					}
				} else {
					// In single player, W/S controls Player 1
					state.p1_move_y = 0;
				}
				break;
			case 'ArrowUp':
			case 'ArrowDown':
				if (state.isMultiplayer) {
					// In multiplayer: only guest (player 2) uses arrow keys
					if (!state.isHost) {
						state.p2_move_y = 0;
					}
				} else {
					// Arrow keys control Player 2 in local mode only
					state.p2_move_y = 0;
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
		.addEventListener("click", handleResume);
	document
		.getElementById("exitButtonPause")
		.addEventListener("click", handlePauseExit);
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
		.addEventListener("click", SETTINGS.exitGame);

	// Ready menu listeners
	document
		.getElementById("readyButton")
		.addEventListener("click", handleReadyButtonClick);

	document
		.getElementById("readyExitButton")
		.addEventListener("click", SETTINGS.exitGame);

	// Only show main menu if not in WebRTC multiplayer mode
	if (!state.isWebRTC && !state.isMultiplayer) {
		document.getElementById("menu").style.display = "block";
	}

	setTimeout(() => {
		SETUP.setupGame();
		// Only start game animation if not in WebRTC mode (WebRTC will start it via Ready menu)
		if (!state.isWebRTC && !state.isMultiplayer) {
			GAME.animate();
		}
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

	// Function to update role indicator (Host/Guest)
	function updateRoleIndicator(isHost) {
		const roleIndicator = document.getElementById('role-indicator');
		const roleText = document.getElementById('role-status');
		const roleIcon = roleIndicator?.querySelector('i');

		if (!roleIndicator || !roleText) return;

		if (state.isMultiplayer) {
			roleIndicator.style.display = 'block';
			roleText.textContent = isHost ? 'Host' : 'Guest';

			if (roleIcon) {
				roleIcon.className = isHost ? 'fas fa-crown me-2 text-warning' : 'fas fa-user me-2 text-info';
			}

			// Update background color
			roleIndicator.className = isHost
				? 'position-absolute top-0 end-0 p-2 bg-warning bg-opacity-75 rounded-start text-dark'
				: 'position-absolute top-0 end-0 p-2 bg-info bg-opacity-75 rounded-start text-light';
		} else {
			roleIndicator.style.display = 'none';
		}
	}

	// Check if there's a multiplayer game waiting
	async function checkForMultiplayerGame() {
		console.log("🔍 Checking for multiplayer game...");

		// **NEW**: Check for global invitee state set by notification system
		console.log("🔍 Checking global invitee variables...");
		console.log("🔍 Global state:", {
			isInvitee: window.isInvitee,
			shouldJoinExistingGame: window.shouldJoinExistingGame,
			isWebRTCMode: window.isWebRTCMode,
			existingGameData: window.existingGameData
		});

		// If invitee state is set globally, transfer to local state
		if (window.isInvitee && window.shouldJoinExistingGame && window.existingGameData) {
			console.log("🎯 Found global invitee state! Transferring to local state...");

			// Transfer global state to local state
			state.shouldJoinExistingGame = true;
			state.existingGameData = window.existingGameData;
			state.isWebRTC = window.isWebRTCMode || true; // Force WebRTC mode

			// Clear global state to prevent re-processing
			window.isInvitee = false;
			window.shouldJoinExistingGame = false;
			window.isWebRTCMode = false;
			window.existingGameData = null;

			console.log("🔄 Global state transferred to local state:", {
				shouldJoinExistingGame: state.shouldJoinExistingGame,
				existingGameData: state.existingGameData,
				isWebRTC: state.isWebRTC
			});
		}

		console.log("🔍 Final state flags:", {
			shouldJoinExistingGame: state.shouldJoinExistingGame,
			existingGameData: state.existingGameData,
			isMultiplayer: state.isMultiplayer,
			isWebRTC: state.isWebRTC
		});

		try {
			const { userId, token, url_api } = getVariables();

			// Check if this is an invitee joining an existing game
			if (state.shouldJoinExistingGame && state.existingGameData) {
				console.log("🎯 Invitee joining existing game with pre-set data");
				console.log("🎯 Existing game data:", state.existingGameData);

				// Use the game data from the invitation
				const gameData = state.existingGameData;

				// Set up game state
				state.isMultiplayer = true;
				state.room_id = gameData.game_id || gameData.room_id || gameData.webrtc_room_id; // Try all possible fields
				state.localPlayerId = parseInt(userId); // Current user is the invitee
				state.remotePlayerId = parseInt(gameData.inviter_id); // Inviter is the remote player
				state.isHost = false; // Invitee is always guest

				// Clear the flags
				state.shouldJoinExistingGame = false;
				state.existingGameData = null;

				// Initialize WebRTC connection directly
				console.log("🚀 Invitee initializing WebRTC connection", {
					room_id: state.room_id,
					localPlayerId: state.localPlayerId,
					remotePlayerId: state.remotePlayerId,
					role: "guest"
				});

				state.isWebRTC = true;

				setTimeout(async () => {
					try {
						const { initializeWebRTCGame } = await import("../webrtc-implementation.js");
						const connection = await initializeWebRTCGame(state.room_id, false); // Invitee is not initiator
						state.webrtcConnection = connection;

						updateRoleIndicator(state.isHost);
						updateMultiplayerStatus("connecting", "🚀 Joining WebRTC game as invitee...");

						console.log("🎮 Invitee WebRTC connection initialized successfully");
					} catch (error) {
						console.error("❌ Invitee WebRTC initialization failed:", error);
						updateMultiplayerStatus("error", "❌ Failed to join WebRTC game");
					}
				}, 1000);

				return; // Skip the regular game check
			}

			// Check if user has pending game invitations or active games
			const response = await fetch(`${url_api}/pong/games/pending/${userId}/`, {
				headers: {
					"Authorization": `Bearer ${token}`,
					"Content-Type": "application/json"
				}
			});

			if (response.ok) {
				const data = await response.json();

				if (data.active_game) {

					// Set up multiplayer state
					state.isMultiplayer = true;
					state.room_id = data.active_game.id;
					state.localPlayerId = parseInt(userId);
					state.remotePlayerId = data.active_game.opponent_id;

					// Determine host/guest roles based on who is player_1 (creator) vs player_2 (invitee)
					// player_1 (game creator/inviter) = HOST
					// player_2 (game invitee) = GUEST
					const isPlayer1 = parseInt(userId) === data.active_game.player_1_id;
					state.isHost = isPlayer1;					// Check if invitee chose WebRTC OR if we have a pending WebRTC connection
					if ((state.inviteeWebRTCChoice && !isPlayer1) || state.pendingWebRTCConnection) {
						// WEBRTC MODE: Initialize WebRTC connection
						console.log("🚀 Initializing WebRTC connection");

						state.isWebRTC = true;
						state.webrtcConnection = null; // Will be set when connection is established

						// Wait for DOM to be ready before initializing WebRTC
						setTimeout(async () => {
							try {
								// Initialize WebRTC connection
								const { initializeWebRTCGame } = await import("../webrtc-implementation.js");
								const connection = await initializeWebRTCGame(state.room_id, state.pendingWebRTCConnection || isPlayer1);
								state.webrtcConnection = connection;

								// Update role indicator
								updateRoleIndicator(state.isHost);
								updateMultiplayerStatus("connecting", "🚀 Connecting via WebRTC...");

								console.log("🎮 WebRTC connection initialized successfully");
							} catch (error) {
								console.error("❌ WebRTC initialization failed:", error);
								// WEBSOCKET FALLBACK COMMENTATO - Solo WebRTC
								// state.isWebRTC = false;
								// state.webrtcConnection = null;
								// const { initializeWebSocket } = await import("../multiplayer/serverSide.js");
								// initializeWebSocket(data.active_game.id, userId, data.active_game.opponent_id);
								// updateMultiplayerStatus("connecting", "Connecting via WebSocket...");

								updateMultiplayerStatus("error", "❌ WebRTC connection failed");
							}
						}, 1000); // Wait 1 second for DOM to be ready					} else {
						// WEBSOCKET MODE COMMENTATO - Solo WebRTC ora
						console.log("🚀 Forcing WebRTC mode - WebSocket disabled");
						console.log("🔍 No active game found, checking invitee state...");
						console.log("🔍 Current state details:", {
							shouldJoinExistingGame: state.shouldJoinExistingGame,
							existingGameData: state.existingGameData,
							inviteeWebRTCChoice: state.inviteeWebRTCChoice,
							isMultiplayer: state.isMultiplayer,
							isWebRTC: state.isWebRTC,
							localPlayerId: state.localPlayerId,
							remotePlayerId: state.remotePlayerId
						});

						// Check if we have invitee state set
						if (state.shouldJoinExistingGame && state.existingGameData) {
							console.log("🎯 Found invitee state, initializing WebRTC as invitee...");

							// Use invitee game data
							const gameData = state.existingGameData;
							state.room_id = gameData.game_id || gameData.invitation_id;
							state.isHost = false;

							// Clear flags
							state.shouldJoinExistingGame = false;
							state.existingGameData = null;

							// Initialize WebRTC as invitee
							state.isWebRTC = true;

							setTimeout(async () => {
								try {
									const { initializeWebRTCGame } = await import("../webrtc-implementation.js");
									const connection = await initializeWebRTCGame(state.room_id, false);
									state.webrtcConnection = connection;

									updateRoleIndicator(state.isHost);
									updateMultiplayerStatus("connecting", "🚀 Joining WebRTC game...");

									console.log("🎮 Invitee WebRTC connection initialized successfully");
								} catch (error) {
									console.error("❌ Invitee WebRTC initialization failed:", error);
									updateMultiplayerStatus("error", "❌ Failed to join WebRTC game");
								}
							}, 1000);
						} else if (state.inviteeWebRTCChoice && state.isMultiplayer) {
							console.log("🎯 Detected invitee with WebRTC choice but no game data - attempting manual setup");
							console.log("🔍 Invitee state:", {
								localPlayerId: state.localPlayerId,
								remotePlayerId: state.remotePlayerId,
								room_id: state.room_id
							});

							// Fallback: try to initialize with available state
							if (state.localPlayerId && state.remotePlayerId) {
								state.isHost = false;
								state.isWebRTC = true;

								// Try to use localPlayerId and remotePlayerId to guess room_id
								if (!state.room_id) {
									// Create a room ID from player IDs as fallback
									state.room_id = Math.min(state.localPlayerId, state.remotePlayerId) * 1000 + Math.max(state.localPlayerId, state.remotePlayerId);
									console.log("🔧 Generated fallback room_id:", state.room_id);
								}

								setTimeout(async () => {
									try {
										const { initializeWebRTCGame } = await import("../webrtc-implementation.js");
										const connection = await initializeWebRTCGame(state.room_id, false);
										state.webrtcConnection = connection;

										updateRoleIndicator(state.isHost);
										updateMultiplayerStatus("connecting", "🚀 Joining WebRTC game (fallback)...");

										console.log("🎮 Invitee WebRTC connection initialized successfully (fallback)");
									} catch (error) {
										console.error("❌ Invitee WebRTC fallback initialization failed:", error);
										updateMultiplayerStatus("error", "❌ Failed to join WebRTC game");
									}
								}, 1000);
							} else {
								console.warn("⚠️ Invitee detected but missing player IDs");
								// Regular force WebRTC mode
								state.isWebRTC = true;
								state.pendingWebRTCConnection = true;
							}
						} else {
							console.log("🔍 No invitee state found, using regular WebRTC mode");
							// Regular force WebRTC mode
							state.isWebRTC = true;
							state.pendingWebRTCConnection = true;
						}
					}

					// Don't auto-start the game, just prepare the multiplayer state
					// The game will start when both players are ready
				}
			}
		} catch (error) {
			// Error checking for multiplayer games
		}
	}

	// Export functions to make them available outside
	window.updateMultiplayerStatus = updateMultiplayerStatus;
	window.updateRoleIndicator = function(isHost) {
		const roleIndicator = document.getElementById('role-indicator');
		const roleText = document.getElementById('role-status');
		const roleIcon = roleIndicator?.querySelector('i');

		if (!roleIndicator || !roleText) return;

		if (state.isMultiplayer) {
			roleIndicator.style.display = 'block';
			roleText.textContent = isHost ? 'Host' : 'Guest';

			if (roleIcon) {
				roleIcon.className = isHost ? 'fas fa-crown me-2 text-warning' : 'fas fa-user me-2 text-info';
			}

			// Update background color
			roleIndicator.className = isHost
				? 'position-absolute top-0 end-0 p-2 bg-warning bg-opacity-75 rounded-start text-dark'
				: 'position-absolute top-0 end-0 p-2 bg-info bg-opacity-75 rounded-start text-light';
		} else {
			roleIndicator.style.display = 'none';
		}
	};
}

// Ready menu handlers
function handleReadyButtonClick() {
	console.log('🚀 Ready button clicked');

	if (state.isWebRTC && state.webrtcConnection) {
		// Mark local player as ready
		state.webrtcConnection.localPlayerReady = true;

		// Send ready signal to other player
		state.webrtcConnection.sendGameEvent('ready', {
			playerId: state.localPlayerId,
			timestamp: Date.now()
		});

		// Disable button and show waiting message
		const readyButton = document.getElementById('readyButton');
		const readyStatus = document.getElementById('readyStatus');

		if (readyButton) {
			readyButton.disabled = true;
			readyButton.innerHTML = '<i class="fas fa-check me-2"></i>Ready!';
		}

		if (readyStatus) {
			// Check if other player is already ready
			if (state.webrtcConnection.otherPlayerReady) {
				readyStatus.innerHTML = '<small><i class="fas fa-rocket text-success me-2"></i>Both players ready! Starting game...</small>';
				// Start game if both are ready
				setTimeout(() => {
					state.webrtcConnection.startGameFromReady();
				}, 1000);
			} else {
				readyStatus.innerHTML = '<small><i class="fas fa-clock me-2"></i>Waiting for other player...</small>';
			}
		}
	}
}

function handleReadyExitButtonClick() {
	// Tutti i pulsanti di uscita ora usano la stessa logica robusta
	if (typeof SETTINGS.exitGame === 'function') {
		SETTINGS.exitGame();
	} else {
		window.navigateTo('#home');
	}
}

function showReadyMenu() {
	console.log('📋 Showing ready menu');

	// Hide all other menus
	const menu = document.getElementById('menu');
	const pauseMenu = document.getElementById('pauseMenu');
	const gameOverMenu = document.getElementById('gameOverMenu');

	if (menu) menu.style.display = 'none';
	if (pauseMenu) pauseMenu.style.display = 'none';
	if (gameOverMenu) gameOverMenu.style.display = 'none';

	// Show ready menu
	const readyMenu = document.getElementById('readyMenu');
	if (readyMenu) {
		readyMenu.style.display = 'block';

		// Keep button disabled and status as "Connecting..." initially
		const readyButton = document.getElementById('readyButton');
		const readyStatus = document.getElementById('readyStatus');

		if (readyButton) {
			readyButton.disabled = true;
			readyButton.innerHTML = '<i class="fas fa-rocket me-2"></i>Ready';
		}

		if (readyStatus) {
			readyStatus.innerHTML = '<small><i class="fas fa-spinner fa-spin me-2"></i>Connecting...</small>';
		}
	}
}

// Function to enable ready button when connection is established
function enableReadyButton() {
	console.log('🔗 Enabling ready button - connection established');

	const readyButton = document.getElementById('readyButton');
	const readyStatus = document.getElementById('readyStatus');

	if (readyButton) {
		readyButton.disabled = false;
		readyButton.innerHTML = '<i class="fas fa-rocket me-2"></i>Ready';
	}

	if (readyStatus) {
		const role = state.isHost ? 'Host' : 'Guest';
		readyStatus.innerHTML = `<small><i class="fas fa-check text-success me-2"></i>Connected! You are ${role}</small>`;
	}
}

function checkBothPlayersReady() {
	// This will be implemented when we receive ready signals from both players
	console.log('🔄 Checking if both players are ready...');
}

// Pause system functions
function handlePause() {
	console.log('⏸️ Game paused');

	// Only allow pause during active game
	if (!state.isStarted || state.isPaused) {
		return;
	}

	// Set game as paused
	state.isPaused = true;
	state.whoTriggeredPause = state.isMultiplayer ? (state.isHost ? 'player1' : 'player2') : 'player1';

	// Show pause menu
	showPauseMenu();

	// If multiplayer, send pause event to other player
	if (state.isMultiplayer && state.webrtcConnection) {
		if (typeof state.webrtcConnection.sendGameEvent === 'function') {
			state.webrtcConnection.sendGameEvent('pause', {
				playerId: state.localPlayerId,
				timestamp: Date.now()
			});
			console.log('📡 Pause event sent to other player');
		}
	}
}

function showPauseMenu() {
	console.log('📋 Showing pause menu');

	// Hide all other menus
	const menus = ['menu', 'settingsMenu', 'nbrOfPlayerMenu', 'gameOverMenu'];
	menus.forEach(menuId => {
		const menu = document.getElementById(menuId);
		if (menu) menu.style.display = 'none';
	});

	// Show pause menu
	const pauseMenu = document.getElementById('pauseMenu');
	if (pauseMenu) {
		pauseMenu.style.display = 'block';

		// Show/hide resume button based on who triggered pause
		const resumeButton = document.getElementById('resumeButton');
		if (resumeButton) {
			if (state.isMultiplayer) {
				// In multiplayer, only show resume button to who triggered pause
				const canResume = (state.whoTriggeredPause === 'player1' && state.isHost) ||
								 (state.whoTriggeredPause === 'player2' && !state.isHost);
				resumeButton.style.display = canResume ? 'block' : 'none';
			} else {
				// In single player, always show resume button
				resumeButton.style.display = 'block';
			}
		}
	}
}

function handleResume() {
	console.log('▶️ Game resumed');

	// Resume the game
	state.isPaused = false;
	state.whoTriggeredPause = null;

	// Hide pause menu
	const pauseMenu = document.getElementById('pauseMenu');
	if (pauseMenu) pauseMenu.style.display = 'none';

	// If multiplayer, send resume event to other player
	if (state.isMultiplayer && state.webrtcConnection) {
		if (typeof state.webrtcConnection.sendGameEvent === 'function') {
			state.webrtcConnection.sendGameEvent('resume', {
				playerId: state.localPlayerId,
				timestamp: Date.now()
			});
			console.log('📡 Resume event sent to other player');
		}
	}
}

function handlePauseExit() {
	console.log('🚪 Exiting from pause menu');

	// If multiplayer, notify other player before leaving
	if (state.isMultiplayer && state.webrtcConnection) {
		if (typeof state.webrtcConnection.sendGameEvent === 'function') {
			state.webrtcConnection.sendGameEvent('player_left', {
				playerId: state.localPlayerId,
				timestamp: Date.now(),
				reason: 'Player left during pause'
			});
			console.log('📡 Player left event sent');
		}

		// Clean up WebRTC connection
		console.log('🗑️ Cleaning up WebRTC connection');
		if (typeof state.webrtcConnection.destroy === 'function') {
			state.webrtcConnection.destroy();
		}
		state.webrtcConnection = null;
		state.isWebRTC = false;
	}

	// Reset state and go to home
	state.isStarted = false;
	state.isPaused = false;
	state.whoTriggeredPause = null;
	state.isMultiplayer = false;

	// Hide pause menu
	const pauseMenu = document.getElementById('pauseMenu');
	if (pauseMenu) pauseMenu.style.display = 'none';

	// Clean up and navigate to home
	import('./settings.js').then(({ cleanupPong }) => {
		cleanupPong();
		window.navigateTo('#home');
	}).catch(error => {
		console.error('Error during cleanup:', error);
		// Navigate anyway
		window.navigateTo('#home');
	});
}

// Make functions available globally
window.handlePause = handlePause;
window.handleResume = handleResume;
window.handlePauseExit = handlePauseExit;
window.showPauseMenu = showPauseMenu;

// Export ready menu functions
window.showReadyMenu = showReadyMenu;
window.enableReadyButton = enableReadyButton;
window.handleReadyButtonClick = handleReadyButtonClick;
window.handleReadyExitButtonClick = handleReadyExitButtonClick;

// Export for external usage
export function updateMultiplayerStatus(status, message) {
	if (window.updateMultiplayerStatus) {
		window.updateMultiplayerStatus(status, message);
	}
}

export function updateRoleIndicator(isHost) {
	if (window.updateRoleIndicator) {
		window.updateRoleIndicator(isHost);
	}
}
