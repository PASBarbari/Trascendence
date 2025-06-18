import { state } from "./state.js";
import { getVariables } from "../../var.js";
import { renderPong } from "./pong.js";
import * as GAME from "./gameLogic.js";
import * as UTILS from "./utils.js";
import { getCookie } from "../../cookie.js";

let socket;

//TODO aggiungere la lunghezza del player alle variabili e altre cose che vengono in mente
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

function initializeWebSocket(room_id, player1, player2) {
	const { token, wss_api } = getVariables();
	console.log("wss_api value:", wss_api);
	const wsUrl = `wss://trascendence.42firenze.it/api/pong/ws/pong/${room_id}/?token=${token}`;
	socket = new WebSocket(wsUrl);
	socket.onmessage = function (event) {
		const message = JSON.parse(event.data);
		if (message.type === "game_state") {
			updateGameState(message.game_state);
		} else if (message.ready) {
			console.log("ready");
			// GAME.start(message);
		}
	};
	socket.onopen = function () {
		console.log("WebSocket connection is active");
		state.p1_id = player1;
		state.p2_id = player2;
		renderPong();
	};
	socket.onerror = function (error) {
		console.error("WebSocket error:", error);
		console.error("WebSocket URL was:", wsUrl);
	};
	socket.onclose = function () {
		console.log("token:", token);
		console.log("WebSocket connection is not active");
	};
}

function updateGameState(game_state) {
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
	)
		UTILS.updateScore();
	state.p1_score = game_state.player_1_score;
	state.p2_score = game_state.player_2_score;
	GAME.serverAnimate();
	// Update other game state properties if needed
}

document.addEventListener("keydown", function (event) {
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

// function getVariables() {
// 	// Example implementation to retrieve the token from local storage or environment variables
// 	const token = localStorage.getItem("token") || process.env.TOKEN;
// 	return { token };
// }

export { createGame, initializeWebSocket, updateGameState, socket };
