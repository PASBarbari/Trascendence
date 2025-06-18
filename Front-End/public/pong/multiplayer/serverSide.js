// Fix the import paths - they should point to the locale folder
import { state } from "../locale/state.js";
import { getVariables } from "../../var.js";
import { renderPong } from "../locale/pong.js";
import * as GAME from "../locale/gameLogic.js";
import * as UTILS from "../locale/utils.js";
import { getCookie } from "../../cookie.js";

let socket;

// Your working createGame function implementation
async function createGame(player_1, player_2) {
	const { token, url_api } = getVariables();

	try {
		const response = await fetch(`${url_api}/pong/pong/game`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-CSRFToken": getCookie("csrftoken"),
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ player_1, player_2 }),
		});
		if (response.ok) {
			const data = await response.json();
			console.log("Game created:", data);
			const room_id = data.id;
			initializeWebSocket(room_id, player_1, player_2);
		} else {
			const errorData = await response.json();
			console.error("Errore in createGame:", errorData);
		}
	} catch (error) {
		console.error("Errore nella richiesta in createGame:", error);
	}
}

// Enhanced initializeWebSocket based on your working version
function initializeWebSocket(room_id, player1, player2) {
	const { token, wss_api } = getVariables();
	console.log("wss_api value:", wss_api);

	// Use the working WebSocket URL format
	const wsUrl = `wss://trascendence.42firenze.it/api/pong/ws/pong/${room_id}/?token=${token}`;
	console.log("Connecting to WebSocket:", wsUrl);

	socket = new WebSocket(wsUrl);

	socket.onopen = function () {
		console.log("✅ WebSocket connection is active");

		// Set player IDs in state
		state.p1_id = player1;
		state.p2_id = player2;

		// Just log that we're connected, don't send player_joined
		console.log("🎮 Connected to game room:", room_id);

		// Render the game
		renderPong();
	};

	socket.onmessage = function (event) {
		const message = JSON.parse(event.data);
		console.log("📨 WebSocket message received:", message);

		if (message.type === "game_state") {
			updateGameState(message.game_state);
		} else if (message.type === "welcome") {
			console.log("🎉 Welcome message:", message.message);
		} else if (message.ready) {
			console.log("🎮 Game ready");
			// GAME.start(message);
		} else {
			console.log("🔍 Unknown message type:", message.type);
		}
	};

	socket.onerror = function (error) {
		console.error("❌ WebSocket error:", error);
		console.error("WebSocket URL was:", wsUrl);
	};

	socket.onclose = function (event) {
		console.log("🔌 WebSocket connection closed");
		console.log("  - Code:", event.code);
		console.log("  - Reason:", event.reason);
		console.log("  - Token:", token ? "Present" : "Missing");
	};
}

// Enhanced updateGameState function
function updateGameState(game_state) {
	// Check if game objects exist before updating
	if (state.p1 && state.p2 && state.ball) {
		// Update players
		state.p1.position.set(
			game_state.player_1_pos[0],
			game_state.player_1_pos[1]
		);
		state.p2.position.set(
			game_state.player_2_pos[0],
			game_state.player_2_pos[1]
		);

		// Update ball
		state.ball.position.set(game_state.ball_pos[0], game_state.ball_pos[1]);

		// Update scores
		if (
			game_state.player_1_score !== state.p1_score ||
			game_state.player_2_score !== state.p2_score
		) {
			UTILS.updateScore();
		}
		state.p1_score = game_state.player_1_score;
		state.p2_score = game_state.player_2_score;
		GAME.serverAnimate();
	} else {
		console.warn("⚠️ Game objects not initialized yet");
	}
}

// Add a simple test function for direct WebSocket testing
function testWebSocketConnection(room_id = null) {
	console.log("🧪 Testing WebSocket connection...");

	if (!room_id) {
		// Create a game first, then test WebSocket
		const { userId } = getVariables();
		createGame(parseInt(userId), parseInt(userId));
	} else {
		// Test with provided room ID
		const { userId } = getVariables();
		initializeWebSocket(room_id, parseInt(userId), parseInt(userId));
	}
}

// Enhanced key event handlers with safety checks
document.addEventListener("keydown", function (event) {
	if (!socket || socket.readyState !== WebSocket.OPEN) {
		console.warn("⚠️ WebSocket not connected, ignoring key press");
		return;
	}

	if (event.key.toLowerCase() == "w" && !state.keys.w) {
		socket.send(
			JSON.stringify({
				type: "up",
				player: state.p1_id,
			})
		);
		state.keys.w = true;
	}
	if (event.key.toLowerCase() == "s" && !state.keys.s) {
		socket.send(
			JSON.stringify({
				type: "down",
				player: state.p1_id,
			})
		);
		state.keys.s = true;
	}
	if (event.key == "ArrowUp" && !state.keys.ArrowUp) {
		socket.send(
			JSON.stringify({
				type: "up",
				player: state.p2_id,
			})
		);
		state.keys.ArrowUp = true;
	}
	if (event.key == "ArrowDown" && !state.keys.ArrowDown) {
		socket.send(
			JSON.stringify({
				type: "down",
				player: state.p2_id,
			})
		);
		state.keys.ArrowDown = true;
	}
});

document.addEventListener("keyup", function (event) {
	if (!socket || socket.readyState !== WebSocket.OPEN) {
		return;
	}

	if (event.key.toLowerCase() == "w") {
		state.keys.w = false;
		if (!state.keys.s) {
			socket.send(
				JSON.stringify({
					type: "stop",
					player: state.p1_id,
				})
			);
		}
	}
	if (event.key.toLowerCase() == "s") {
		state.keys.s = false;
		if (!state.keys.w) {
			socket.send(
				JSON.stringify({
					type: "stop",
					player: state.p1_id,
				})
			);
		}
	}
	if (event.key == "ArrowUp") {
		state.keys.ArrowUp = false;
		if (!state.keys.ArrowDown) {
			socket.send(
				JSON.stringify({
					type: "stop",
					player: state.p2_id,
				})
			);
		}
	}
	if (event.key == "ArrowDown") {
		state.keys.ArrowDown = false;
		if (!state.keys.ArrowUp) {
			socket.send(
				JSON.stringify({
					type: "stop",
					player: state.p2_id,
				})
			);
		}
	}
});

// Export functions including the new test function
export {
	createGame,
	initializeWebSocket,
	updateGameState,
	testWebSocketConnection,
	socket,
};
