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
    // BOTH Master and Slave should receive and apply ball state for perfect sync
    if (!state.isMultiplayer) {
        return; // Only multiplayer games should receive ball state updates
    }

    const { position, velocity, timestamp } = message;

    // Initialize message counter and rendering throttle
    if (!state.ballMessageStats) {
        state.ballMessageStats = {
            received: 0,
            applied: 0,
            lastRenderTime: 0
        };
    }
    state.ballMessageStats.received++;

    // Always store the latest ball state
    state.latestBallState = {
        position: position,
        velocity: velocity,
        timestamp: timestamp
    };

    // Apply rendering throttle: max 60 FPS
    const now = Date.now();
    const renderInterval = 1000 / 60; // 60 FPS = 16.67ms

    if (now - state.ballMessageStats.lastRenderTime < renderInterval) {
        // Don't render yet, but message is stored for next render cycle
        return;
    }

    state.ballMessageStats.lastRenderTime = now;

    if (!state.ball || !state.ball.mesh) {
        console.warn("⚠️ Ball not available to update state");
        return;
    }

    state.ballMessageStats.applied++;

    // Apply the latest ball state (BOTH Master and Slave use WebSocket data for perfect sync)
    const latestState = state.latestBallState;
    state.ball.mesh.position.set(...latestState.position);
    if (state.ball.velocity) {
        state.ball.velocity.set(...latestState.velocity);
    }

    // Log occasionally for both clients
    if (state.ballMessageStats.received % 120 === 0) {
        console.log(`🏀 [${state.isMaster ? 'MASTER' : 'SLAVE'}] Ball rendered from WebSocket: pos(${latestState.position[0].toFixed(2)}, ${latestState.position[1].toFixed(2)}) | Stats: ${state.ballMessageStats.applied}/${state.ballMessageStats.received}`);
    }
}

function handleScoreUpdate(message) {
	if (!state.isMultiplayer) {
		return; // Only multiplayer games should receive score updates
	}

	// Both master and slave can receive score updates for better sync

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

        // Store player IDs for position mapping
        state.player1Id = player1Id;
        state.player2Id = player2Id;

        // SIMPLE AND CLEAR MAPPING:
        // Master = always controls left paddle (P1)
        // Slave = always controls right paddle (P2)
        // Player 1 (player_1_id) is always the Master
        // Player 2 (player_2_id) is always the Slave
        state.isMaster = (yourPlayerId === player1Id);
        state.localPlayerId = yourPlayerId;
        state.remotePlayerId = (yourPlayerId === player1Id) ? player2Id : player1Id;

        console.log(`🎮 Role assignment from server: You (${yourPlayerId}) = ${state.isMaster ? 'MASTER (LEFT PADDLE)' : 'SLAVE (RIGHT PADDLE)'}`);
        console.log(`🏓 Paddle control: Master always controls P1 (left), Slave always controls P2 (right)`);
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

	// Master synchronizes field dimensions with all clients
	if (state.isMaster) {
		setTimeout(() => {
			syncFieldDimensions();
		}, 500); // Small delay to ensure all clients are ready
	}

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

function ensurePlayerSpeedIsValid() {
	// Ensure player_speed has a valid value, minimum 1.5
	if (!state.player_speed || state.player_speed <= 0) {
		state.player_speed = Math.max(1.5, state.ring.length / 80);
		console.log(`🔧 ServerSide - Fixed player_speed: ${state.player_speed} (ring.length: ${state.ring.length})`);
	}
}

function handleRemotePaddleMovement(message) {
	if (!state.isMultiplayer || !state.players) return;

	const { input, player, timestamp } = message;
	const remotePlayerId = parseInt(player);

	// Ensure player speed is valid
	ensurePlayerSpeedIsValid();

	console.log(`🏓 Remote paddle movement: Player ${remotePlayerId} ${input} (Local: ${state.localPlayerId}), Speed: ${state.player_speed}`);

	// Determine which paddle to move based on the player ID and their role
	// We need to determine if the remotePlayerId is the master or slave
	// If this is our own movement echoed back, apply it for consistency
	// If this is the other player's movement, apply it to their paddle

	let paddleNumber;
	let isOwnMovement = (remotePlayerId === state.localPlayerId);

	if (isOwnMovement) {
		// This is our own movement echoed back from server - apply for consistency
		paddleNumber = state.isMaster ? 1 : 2;
		console.log(`🏓 Own movement echo: ${state.isMaster ? 'MASTER' : 'SLAVE'} controls P${paddleNumber}`);
	} else {
		// This is the remote player's movement
		// If we are master, remote is slave (P2). If we are slave, remote is master (P1)
		paddleNumber = state.isMaster ? 2 : 1;
		console.log(`🏓 Remote player movement: ${state.isMaster ? 'SLAVE' : 'MASTER'} controls P${paddleNumber}`);
	}

	// Apply the movement to the correct paddle
	if (input === "up") {
		state[`p${paddleNumber}_move_y`] = -state.player_speed;
	} else if (input === "down") {
		state[`p${paddleNumber}_move_y`] = state.player_speed;
	} else if (input === "stop") {
		state[`p${paddleNumber}_move_y`] = 0;
	}

	console.log(`🏓 Applied movement: P${paddleNumber} ${input}, move_y = ${state[`p${paddleNumber}_move_y`]}`);
}

function sendPlayerInput(inputType, player) {
	// LEGACY FUNCTION - DEPRECATED
	// This function is no longer used. All paddle movement is now handled via position sync system.
	console.warn("⚠️ DEPRECATED: sendPlayerInput called but this function is no longer used. Use position sync instead.");
	return;

	// LEGACY CODE - DEPRECATED - These lines should never execute
	const inputMessage = {
		type: "player_input",
		input: inputType,
		player: player,
		timestamp: Date.now()
	};

	// socket.send(JSON.stringify(inputMessage));  // DISABLED
	console.warn("⚠️ DEPRECATED: Would have sent legacy paddle_movement message, but this is now disabled.");
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

	// SIMPLE AND CLEAR MAPPING:
	// Master = always controls left paddle (P1)
	// Slave = always controls right paddle (P2)
	// Game creator is always Master (P1, left paddle)
	console.log(`🎮 Role assignment: Player ${player_1} (you) = MASTER (LEFT PADDLE), Player ${player_2} = SLAVE (RIGHT PADDLE)`);

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

		// Reduce log verbosity - only log non-ball-state messages
		if (message.type !== "ball_state") {
			console.log(`📨 WebSocket message received [${state.isMaster ? 'MASTER' : 'SLAVE'}]:`, message.type, message);
		}

		if (message.type === "game_state") {
			updateLocalGameState(message.game_state);
		} else if (message.type === "player_position") {
			handlePlayerPosition(message);
		} else if (message.type === "ball_state") {
			// Don't log every ball state message to reduce console spam
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
		} else if (message.type === "field_dimensions") {
			handleFieldDimensions(message);
		} else if (message.type === "paddle_movement") {
			// Legacy paddle movement messages - ignore in new system
			console.log("🔧 Ignoring legacy paddle_movement message:", message.input);
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

function syncFieldDimensions() {
	if (!state.isMaster || !state.socket || state.socket.readyState !== WebSocket.OPEN) {
		return;
	}

	// Master sends field dimensions to all clients
	const dimensionsMessage = {
		type: "field_dimensions",
		dimensions: {
			ring_length: state.ring.length,
			ring_height: state.ring.height,
			ring_depth: state.ring.depth,
			ring_thickness: state.ring.thickness,
			p_height: state.p.height,
			p_width: state.p.width,
			p_depth: state.p.depth,
			player_speed: state.player_speed,
			ball_radius: state.ball_radius,
			ball_speed: state.ball_speed
		},
		timestamp: Date.now()
	};

	state.socket.send(JSON.stringify(dimensionsMessage));
	console.log("📏 Master sent field dimensions:", dimensionsMessage.dimensions);
}

function handleFieldDimensions(message) {
	if (state.isMaster) {
		return; // Master doesn't need to receive dimensions
	}

	const { dimensions } = message;
	console.log("📏 Slave receiving field dimensions:", dimensions);

	// Update all dimensions to match master
	state.ring.length = dimensions.ring_length;
	state.ring.height = dimensions.ring_height;
	state.ring.depth = dimensions.ring_depth;
	state.ring.thickness = dimensions.ring_thickness;
	state.p.height = dimensions.p_height;
	state.p.width = dimensions.p_width;
	state.p.depth = dimensions.p_depth;
	state.player_speed = dimensions.player_speed;
	state.ball_radius = dimensions.ball_radius;
	state.ball_speed = dimensions.ball_speed;

	console.log("📏 Slave updated field dimensions to match master");

	// Update boundaries to match new ring dimensions
	import("../locale/setup.js").then(({ updatePlayerBoundaries, updateGameGeometries }) => {
		if (updatePlayerBoundaries) {
			updatePlayerBoundaries();
			console.log("📏 Updated player boundaries with new dimensions");
		}

		if (updateGameGeometries) {
			updateGameGeometries();
			console.log("📏 Updated all game geometries with new dimensions");
		}
	}).catch(() => {
		console.log("⚠️ Update functions not available");
	});
}

function sendPlayerPosition(player) {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
        return;
    }

    // Higher frequency sending (60 FPS) for better precision
    const now = Date.now();
    if (state.lastPositionSent && (now - state.lastPositionSent) < 16.67) { // ~60 FPS
        return;
    }
    state.lastPositionSent = now;

    // Determine which paddle this player controls and the correct player number
    let paddleIndex, playerNumber;

    if (state.isMaster) {
        paddleIndex = 0; // Master controls P1 (left paddle)
        playerNumber = 1; // Always send as player 1
    } else {
        paddleIndex = 1; // Slave controls P2 (right paddle)
        playerNumber = 2; // Always send as player 2
    }

    if (!state.players[paddleIndex] || !state.players[paddleIndex].mesh) {
        return;
    }

    const position = state.players[paddleIndex].mesh.position;

    const positionMessage = {
        type: "player_position",
        player: playerNumber, // Send role-based player number (1 or 2), not user ID
        position: [position.x, position.y, position.z],
        timestamp: now
    };

    socket.send(JSON.stringify(positionMessage));

    // Log less frequently to avoid spam
    if (!state.positionSendCount) state.positionSendCount = 0;
    state.positionSendCount++;
    if (state.positionSendCount % 60 === 0) { // Log every 60 sends
        console.log(`📨 Sent position: Player ${player} (${state.isMaster ? 'MASTER' : 'SLAVE'}) P${paddleIndex + 1} at y=${position.y.toFixed(2)} [Send #${state.positionSendCount}]`);
    }
}

function handlePlayerPosition(message) {
    const { player, position, timestamp } = message;
    const remotePlayerId = parseInt(player);

    // Initialize paddle rendering throttle
    if (!state.paddleRenderStats) {
        state.paddleRenderStats = {
            received: 0,
            applied: 0,
            lastRenderTime: 0
        };
    }
    state.paddleRenderStats.received++;

    // Determine which paddle to update based on the player number in the message
    let paddleIndex;
    let paddleRole;
    let isOwnPaddle = false;

    if (remotePlayerId === 1) {
        // Message is about P1 (left paddle)
        paddleIndex = 0;
        paddleRole = "P1";
        isOwnPaddle = state.isMaster; // Master controls P1
        console.log(`🏓 [${state.isMaster ? 'MASTER' : 'SLAVE'}] Received P1 position ${isOwnPaddle ? '(OWN)' : '(REMOTE)'}`);
    } else if (remotePlayerId === 2) {
        // Message is about P2 (right paddle)
        paddleIndex = 1;
        paddleRole = "P2";
        isOwnPaddle = !state.isMaster; // Slave controls P2
        console.log(`🏓 [${state.isMaster ? 'MASTER' : 'SLAVE'}] Received P2 position ${isOwnPaddle ? '(OWN)' : '(REMOTE)'}`);
    } else {
        console.warn(`⚠️ Unknown player number: ${remotePlayerId}`);
        return;
    }

    // Apply rendering throttle: max 60 FPS
    const now = Date.now();
    const renderInterval = 1000 / 60; // 60 FPS = 16.67ms

    if (now - state.paddleRenderStats.lastRenderTime < renderInterval) {
        // Store but don't render yet
        state.latestPaddlePosition = {
            player: remotePlayerId,
            position: position,
            timestamp: timestamp,
            paddleIndex: paddleIndex
        };
        return;
    }

    state.paddleRenderStats.lastRenderTime = now;

    // ALWAYS apply paddle positions (including our own for perfect sync)
    if (state.players[paddleIndex] && state.players[paddleIndex].mesh) {
        const paddle = state.players[paddleIndex].mesh;

        // Apply the received position (this ensures both clients see exactly the same state)
        paddle.position.set(position[0], position[1], position[2]);

        state.paddleRenderStats.applied++;

        // Log occasionally
        if (state.paddleRenderStats.received % 60 === 0) {
            console.log(`🏓 [${state.isMaster ? 'MASTER' : 'SLAVE'}] Updated ${isOwnPaddle ? 'OWN' : 'REMOTE'} ${paddleRole} to y=${position[1].toFixed(2)} | Stats: ${state.paddleRenderStats.applied}/${state.paddleRenderStats.received}`);
        }
    } else {
        console.warn(`⚠️ Cannot update P${paddleIndex + 1}: paddle not found`);
    }
}

export { createGame, initializeWebSocket, socket, sendPlayerInput, sendPlayerPosition, updateLocalGameState, handleRemotePaddleMovement, handlePlayerPosition, handleBallState, handleScoreUpdate, syncFieldDimensions };
