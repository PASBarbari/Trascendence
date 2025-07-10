// Fix the import paths - they should point to the locale folder
import { state } from "../locale/state.js";
import { getVariables } from "../../var.js";
import { renderPong } from "../locale/pong.js";
import * as GAME from "../locale/gameLogic.js";
import * as UTILS from "../locale/utils.js";
import { getCookie } from "../../cookie.js";
import * as THREE from "three";

let socket;

// Utility functions for multiplayer
function updateLocalGameState(gameState) {
	if (!state.isMultiplayer) return;

	// Update player positions
	if (state.players[0] && gameState.player_1_pos) {
		state.players[0].mesh.position.set(...gameState.player_1_pos);
	}
	if (state.players[1] && gameState.player_2_pos) {
		state.players[1].mesh.position.set(...gameState.player_2_pos);
	}

	// Update ball position with interpolation
	if (state.ball && gameState.ball_pos) {
		state.ball.mesh.position.set(...gameState.ball_pos);
		if (gameState.ball_velocity) {
			state.ball.velocity.set(...gameState.ball_velocity);
		}
	}

	// Update score
	state.p1_score = gameState.p1_score || 0;
	state.p2_score = gameState.p2_score || 0;

	// Update timestamp for interpolation
	state.lastSyncTime = Date.now();
}

function handlePlayerReady(message) {
	console.log("🎮 Player ready:", message);
	// Handle player ready state

	// Force start the game after both players are ready (backup mechanism)
	setTimeout(() => {
		if (!state.isStarted && state.isMultiplayer && state.socket && state.socket.readyState === WebSocket.OPEN) {
			console.log("🎯 Force starting multiplayer game (backup)");
			startMultiplayerGame({ message: "Force start" });
		}
	}, 2000);
}

function handleBallState(message) {
	if (!state.isMultiplayer || state.isMaster) {
		return; // Only slaves should receive ball state updates
	}

	const { position, velocity, timestamp } = message;
	const currentTime = Date.now();
	const messageAge = currentTime - timestamp;

	// Discard messages older than 200ms to prevent lag accumulation
	const maxMessageAge = 200;
	if (messageAge > maxMessageAge) {
		console.log(`⏱️ Discarding old ball state message (age: ${messageAge}ms)`);
		return;
	}

	// Discard messages that are older than the last processed message
	if (state.lastBallStateTimestamp && timestamp <= state.lastBallStateTimestamp) {
		console.log(`⏱️ Discarding out-of-order ball state message (${timestamp} <= ${state.lastBallStateTimestamp})`);
		return;
	}

	// Update the last processed timestamp
	state.lastBallStateTimestamp = timestamp;

	if (!state.ball || !state.ball.mesh) {
		console.warn("⚠️ Ball not available to update state");
		return;
	}

	// For very recent messages (< 50ms), apply immediately
	if (messageAge < 50) {
		state.ball.mesh.position.set(...position);
		if (state.ball.velocity) {
			state.ball.velocity.set(...velocity);
		}
		console.log(`🏀 Applied immediate ball state: pos(${position[0].toFixed(2)}, ${position[1].toFixed(2)}, ${position[2].toFixed(2)}) age:${messageAge}ms`);
	} else {
		// For older messages, use interpolation for smoother movement
		const currentPos = state.ball.mesh.position;
		const targetPos = new THREE.Vector3(...position);

		// Interpolate based on message age (smoother for older messages)
		const interpolationFactor = Math.max(0.1, Math.min(1.0, 0.8 - (messageAge / 200)));

		currentPos.lerp(targetPos, interpolationFactor);

		if (state.ball.velocity) {
			state.ball.velocity.set(...velocity);
		}

		console.log(`🏀 Interpolated ball state: age:${messageAge}ms, factor:${interpolationFactor.toFixed(2)}`);
	}
}

function handleScoreUpdate(message) {
	if (!state.isMultiplayer || state.isMaster) {
		return; // Only slaves should receive score updates
	}

	const { p1_score, p2_score, timestamp } = message;

	// Update local scores
	state.p1_score = p1_score;
	state.p2_score = p2_score;

	// Update score display
	import("../locale/src/Score.js").then(({ updateScore }) => {
		updateScore("p1");
		updateScore("p2");
	}).catch((error) => {
		console.warn("⚠️ Could not update score display:", error);
	});

	console.log(`📊 Score updated: P1=${p1_score}, P2=${p2_score}`);

	// Check for game over
	if (p1_score >= state.maxScore || p2_score >= state.maxScore) {
		console.log("🏁 Game over received from master");
		state.isStarted = false;
		state.isPaused = true;

		// Import and call game_over function
		import("../locale/utils.js").then(({ game_over }) => {
			game_over();
		}).catch((error) => {
			console.warn("⚠️ Could not trigger game over:", error);
		});
	}
}

function startMultiplayerGame(message) {
	console.log("🚀 Starting multiplayer game:", message);

	// Update role assignment based on server information
	if (message.player_1_id && message.player_2_id && message.your_player_id) {
		const yourPlayerId = parseInt(message.your_player_id);
		const player1Id = parseInt(message.player_1_id);
		const player2Id = parseInt(message.player_2_id);

		// Player 1 (game creator/inviter) is the MASTER
		// Player 2 (game invitee) is the SLAVE
		state.isMaster = (yourPlayerId === player1Id);
		state.localPlayerId = yourPlayerId;
		state.remotePlayerId = (yourPlayerId === player1Id) ? player2Id : player1Id;

		console.log(`🎮 Role assignment from server: You (${yourPlayerId}) = ${state.isMaster ? 'MASTER' : 'SLAVE'}`);
		console.log(`🔍 Debug: player1=${player1Id}, player2=${player2Id}, you=${yourPlayerId}`);

		// Update role indicator
		import("../locale/pong.js").then(({ updateRoleIndicator }) => {
			updateRoleIndicator(state.isMaster);
		}).catch(() => {
			console.log("🔧 Role indicator not available during initial setup");
		});
	}

	// Setup the game if not already done
	if (!state.scene || !state.renderer) {
		console.log("🔧 Setting up game for multiplayer...");
		import("../locale/setup.js").then(({ setupGame }) => {
			setupGame();
			startGameAfterSetup();
		}).catch(error => {
			console.error("❌ Failed to setup game:", error);
		});
	} else {
		startGameAfterSetup();
	}
}

function startGameAfterSetup() {
	// Hide main menu
	const menu = document.getElementById("menu");
	if (menu) {
		menu.style.display = "none";
	}

	state.isStarted = true;
	state.isPaused = false;

	// Disable AI in multiplayer
	state.IAisActive = false;

	console.log("✅ Multiplayer game started!");
	console.log("📊 Game state:", {
		isStarted: state.isStarted,
		isPaused: state.isPaused,
		isMultiplayer: state.isMultiplayer,
		localPlayerId: state.localPlayerId,
		isMaster: state.isMaster
	});

	// Start the game loop if not already started
	if (!state.animationFrameId) {
		import("../locale/gameLogic.js").then(({ animate }) => {
			animate();
			console.log("🎮 Animation loop started");
		}).catch(error => {
			console.error("❌ Failed to start animation:", error);
		});
	}
}

function handleRemotePaddleMovement(message) {
	if (!state.isMultiplayer || !state.players) return;

	const { input, player, timestamp } = message;
	const remotePlayerId = parseInt(player);

	console.log(`🏓 Remote paddle movement: Player ${remotePlayerId} ${input}`);

	// Determine which paddle to move based on player ID
	let paddleIndex = -1;
	if (remotePlayerId === 1 && state.localPlayerId !== 1) {
		paddleIndex = 0; // Player 1 paddle
	} else if (remotePlayerId === 2 && state.localPlayerId !== 2) {
		paddleIndex = 1; // Player 2 paddle
	}

	if (paddleIndex === -1 || !state.players[paddleIndex]) {
		console.log(`❌ Invalid paddle index ${paddleIndex} for remote player ${remotePlayerId}`);
		return;
	}

	// Apply the movement to the remote paddle
	const paddle = state.players[paddleIndex];

	if (input === "up") {
		state[`p${remotePlayerId}_move_y`] = -state.player_speed;
	} else if (input === "down") {
		state[`p${remotePlayerId}_move_y`] = state.player_speed;
	} else if (input === "stop") {
		state[`p${remotePlayerId}_move_y`] = 0;
	}

	console.log(`🏓 Applied remote movement: Player ${remotePlayerId} ${input}, move_y = ${state[`p${remotePlayerId}_move_y`]}`);
}

function sendPlayerInput(inputType, player) {
	if (!socket || socket.readyState !== WebSocket.OPEN) {
		console.warn("⚠️ Cannot send input: WebSocket not connected");
		return;
	}

	const now = Date.now();
	if (now - state.lastInputSent < state.inputThrottle) {
		return; // Throttle input to avoid spam
	}

	const inputMessage = {
		type: "player_input",
		input: inputType,
		player: player,
		timestamp: now
	};

	socket.send(JSON.stringify(inputMessage));
	state.lastInputSent = now;

	console.log(`📨 Sent player input: ${inputType} for player ${player}`);
}

function attemptReconnection() {
	if (state.reconnectAttempts >= state.maxReconnectAttempts) {
		console.error("❌ Max reconnection attempts reached");
		return;
	}

	state.reconnectAttempts++;
	console.log(`🔄 Reconnection attempt ${state.reconnectAttempts}/${state.maxReconnectAttempts}`);

	setTimeout(() => {
		if (state.room_id) {
			initializeWebSocket(state.room_id, state.localPlayerId, state.remotePlayerId);
		}
	}, 2000 * state.reconnectAttempts); // Exponential backoff

	// Update UI if available
	import("../locale/pong.js").then(({ updateMultiplayerStatus }) => {
		updateMultiplayerStatus("connecting", "Reconnecting...");
	}).catch(() => {
		// Ignore if not available
	});
}

async function createGame(player_1, player_2) {
	const { token, url_api } = getVariables();
	if (!token) {
		console.error("❌ No token found. Please log in first.");
		return;
	}

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

	// Assign master/slave roles: player_1 (inviter) is master, player_2 (invitee) is slave
	state.localPlayerId = player_1; // This should be the current user's ID
	state.remotePlayerId = player_2;
	state.isMaster = true; // Player who creates the game (inviter) is the master

	console.log(`🎮 Role assignment: Player ${player_1} (you) = MASTER, Player ${player_2} = SLAVE`);

	// Update role indicator
	import("../locale/pong.js").then(({ updateRoleIndicator }) => {
		updateRoleIndicator(state.isMaster);
	}).catch(() => {
		// Ignore if not available
	});

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

	const wsUrl = `${wss_api}/pong/ws/pong/${room_id}/?token=${token}`;
	console.log("🔌 Connecting to WebSocket:", wsUrl);

	socket = new WebSocket(wsUrl);

	socket.onopen = function () {
		console.log("✅ WebSocket connection established successfully!");
		state.connectionState = "connected";
		state.reconnectAttempts = 0;
		state.socket = socket;

		// Update UI status
		import("../locale/pong.js").then(({ updateMultiplayerStatus }) => {
			updateMultiplayerStatus("connected", "Connected to game");
		}).catch(() => {
			// Ignore if not available
		});

		// Send player ready signal
		const readyMessage = {
			type: "player_ready",
			player: state.localPlayerId || player1,
			timestamp: Date.now()
		};

		socket.send(JSON.stringify(readyMessage));
		console.log("📨 Sent player ready signal:", readyMessage);
	};

	socket.onmessage = function (event) {
		const message = JSON.parse(event.data);
		console.log("📨 WebSocket message received:", message);

		if (message.type === "game_state") {
			updateLocalGameState(message.game_state);
		} else if (message.type === "paddle_movement") {
			console.log("🏓 Paddle movement received:", message);
			handleRemotePaddleMovement(message);
		} else if (message.type === "ball_state") {
			console.log("🏀 Ball state received:", message);
			handleBallState(message);
		} else if (message.type === "score_update") {
			console.log("📊 Score update received:", message);
			handleScoreUpdate(message);
		} else if (message.type === "welcome") {
			console.log("🎉 Welcome message:", message.message);
		} else if (message.type === "connection_success") {
			console.log("✅ Connection successful:", message.message);
			// Update UI status
			import("../locale/pong.js").then(({ updateMultiplayerStatus }) => {
				updateMultiplayerStatus("connected", "Connected to game");
			}).catch(() => {
				// Ignore if not available
			});
		} else if (message.type === "error") {
			console.error("❌ Server error:", message.error);
		} else if (message.type === "player_ready") {
			handlePlayerReady(message);
		} else if (message.type === "player_ready_confirmed") {
			console.log("✅ Player ready confirmed:", message);
			handlePlayerReady(message);
		} else if (message.type === "game_start") {
			startMultiplayerGame(message);
		} else if (message.ready) {
			console.log("🎮 Game ready signal received!");
			startMultiplayerGame(message);
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

		state.connectionState = "disconnected";
		state.socket = null;

		// Handle unexpected disconnections
		if (event.code === 1006 || event.code === 1011) {
			console.error("💡 Possible causes for 1006:");
			console.error("  - Authentication failed (invalid/expired token)");
			console.error("  - Network connectivity issues");
			console.error("  - Server not responding");
			console.error("  - CORS or security policy blocking connection");

			showGameDisconnectedMessage();
			if (state.isMultiplayer) {
				attemptReconnection();
			}
		} else if (event.code === 4000 || event.code === 4001) {
			console.error("❌ Authentication failed - redirecting to login");
			showGameEndedMessage("Authentication failed");
		}
	};
}

function showGameDisconnectedMessage() {
	console.log("🔌 Game disconnected - showing message to user");
	// Add UI notification here if needed
}

function showGameEndedMessage(reason) {
	console.log(`🎮 Game ended: ${reason}`);
	// Add UI notification here if needed
}

export { createGame, initializeWebSocket, socket, sendPlayerInput, updateLocalGameState, handleRemotePaddleMovement, handleBallState, handleScoreUpdate };
