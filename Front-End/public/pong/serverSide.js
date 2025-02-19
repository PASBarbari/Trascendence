import { state } from "./state.js";
import { getVariables } from "../var.js";

//TODO aggiungere la lunghezza del player alle variabili e altre cose che vengono in mente
export async function createGame(player1, player2) {
	const { token } = getVariables();
	
	try {
		const response = await fetch(`http://localhost:8004/pong/game?token=${token}`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				player1: player1,
				player2: player2,
			}),
	
		});
		if (response.ok) {	
			const data = await response.json();
			console.log("Game created:", data);
			room_id = data.room_id;
			initializeWebSocket(room_id);
		} else {
			const errorData = await response.json();
			console.error("Errore nella risposta del server:", errorData);
			//TODO Marco fai qualcosa per gestire l'errore
		}
	} catch (error) {
		console.error("Errore nella richiesta:", error);
		//TODO Marco fai qualcosa per gestire l'errore
	}
}

export function initializeWebSocket(room_id) {
    const { token } = getVariables();
    const wsUrl = `ws://127.0.0.1:8004/ws/pong/${room_id}/?token=${token}`;

    socket = new WebSocket(wsUrl);

    socket.onmessage = function (event) {
        const message = JSON.parse(event.data); 

        console.log("Nuovo messaggio:", message);

        if (message.type === "game_update") {
            updateGameState(message.data);
        }

    };

    socket.onopen = function () {
        console.log("WebSocket connection is active");
    };

    socket.onclose = function () {
        console.log("token:", token);
        console.log("WebSocket connection is not active");
    };
}

function updateGameState(data) {
    // Update players
    state.p1.position.set(data.p1.x, data.p1.y, data.p1.z);
    state.p2.position.set(data.p2.x, data.p2.y, data.p2.z);

    // Update ball
    state.ball.position.set(data.ball.x, data.ball.y, data.ball.z);

    // Update scores
    state.p1_score = data.p1_score;
    state.p2_score = data.p2_score;

    // Update other game state properties if needed
}

// function getVariables() {
//     // Example implementation to retrieve the token from local storage or environment variables
//     const token = localStorage.getItem('token') || process.env.TOKEN;
//     return { token };
// }
