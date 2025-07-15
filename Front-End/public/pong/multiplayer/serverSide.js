// Fix the import paths - they should point to the locale folder
import { state } from "../locale/state.js";
import { getVariables } from "../../var.js";
import { renderPong } from "../locale/pong.js";
import * as GAME from "../locale/gameLogic.js";
import * as UTILS from "../locale/utils.js";
import { getCookie } from "../../cookie.js";
import { showNotification } from "../pongContainer.js";

let socket;

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
		console.log("🎮 Connected to room:", room_id);
		console.log("👥 Players:", player1, "vs", player2);
	};

	socket.onmessage = function (event) {
		const message = JSON.parse(event.data);
		console.log("📨 WebSocket message received:", message);

		if (message.type === "game_state") {
			console.log("🎯 Game state update:", message.game_state);
			// updateGameState(message.game_state);
		} else if (message.type === "welcome") {
			console.log("🎉 Welcome message:", message.message);
		} else if (message.type === "error") {
			console.error("❌ Server error:", message.error);
		} else if (message.type === "ready") {
			console.log("🎮 Opponent is ready!");
			// Update opponent ready status in the UI
			const opponentReadyStatus = document.getElementById(
				"opponent-ready-status"
			);
			if (opponentReadyStatus) {
				opponentReadyStatus.innerHTML = `
                <span class="text-primary"><i class="fas fa-user-friends me-2"></i>Opponent: </span>
                <span class="badge bg-success">Ready</span>
            `;
			}

			// Check if both players are ready to start the game
			const playerReadyStatus = document.getElementById(
				"player-ready-status"
			);
			if (
				playerReadyStatus &&
				playerReadyStatus.querySelector(".badge.bg-success")
			) {
				// Both players are ready
				setTimeout(() => {
					// Hide ready screen and start the game
					const readyScreen = document.getElementById("ready-screen");
					if (readyScreen) {
						readyScreen.style.display = "none";
					}
					// Initialize game (call your existing game initialization)
					// You'd integrate with your existing game code here
					showNotification(
						"Both players are ready! Starting game...",
						"success"
					);
				}, 1000);
			}
		} else if (message.type === "test_message") {
			console.log("📝 Test message received:", message.message);
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
function sendTestMessage(message) {
	if (!socket || socket.readyState !== WebSocket.OPEN) {
		throw new Error("WebSocket not connected");
	}

	const testMessage = {
		type: "test_message",
		message: message,
		timestamp: new Date().toISOString(),
	};

	socket.send(JSON.stringify(testMessage));
	console.log("✅ Test message sent:", testMessage);
	return true;
}

export { createGame, initializeWebSocket, socket, sendTestMessage };
