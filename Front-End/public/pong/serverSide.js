import { state } from "./state.js";

export function initializeWebSocket() {
    const { token } = getVariables();
    const wsUrl = `ws://127.0.0.1:8003/ws/user_notifications/?token=${token}`;

    socket = new WebSocket(wsUrl);

    socket.onmessage = function (event) {
        const message = JSON.parse(event.data);

        console.log("/----websocket notification.js----\\");
        console.log("Nuovo messaggio:", message);

        if (message.type === "game_update") {
            updateGameState(message.data);
        }

        console.log("\\____websocket notification.js____/");
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

function getVariables() {
    // Example implementation to retrieve the token from local storage or environment variables
    const token = localStorage.getItem('token') || process.env.TOKEN;
    return { token };
}
