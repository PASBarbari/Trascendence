import { state } from "../locale/state.js";
import { getVariables } from "../../var.js";
import { getCookie } from "../../cookie.js";
import * as SETUP from "./multiSetup.js";
import * as SETTINGS from "./multiSettings.js";
import * as GAME from "./multiGameLogic.js";

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

    // ✅ CORREGGI IL PATH DELL'IMPORT
    const { setVariables } = await import("../../var.js"); // NON "/pong/var.js"
    setVariables({ room_id: data.id });

    state.room_id = data.id;

    // Initialize WebSocket connection usando i dati già impostati
    const { multiplayer_player1, multiplayer_player2 } = getVariables();
    await initializeWebSocket(state.room_id, multiplayer_player1, multiplayer_player2);
}

// Aggiungi funzione per unirsi come invitato
export async function joinGameAsInvited() {
    const { room_id, multiplayer_invited, multiplayer_player1, multiplayer_player2 } = getVariables();

    if (!multiplayer_invited || !room_id) {
        console.error("❌ Not invited to a game or missing room_id");
        return false;
    }

    console.log("🔗 Joining game as invited player:", {
        room_id: room_id,
        player1: multiplayer_player1,
        player2: multiplayer_player2
    });

    // ✅ USA I NOMI DEI GIOCATORI SE CI SONO
    return await initializeWebSocket(room_id, multiplayer_player1, multiplayer_player2);
}

function initializeWebSocket(room_id, player1, player2) {
    return new Promise((resolve, reject) => {
        const { token, wss_api } = getVariables();

        console.log("🔧 WebSocket Connection Debug:");
        console.log("  - wss_api value:", wss_api);
        console.log("  - room_id:", room_id);
        console.log("  - player1:", player1);
        console.log("  - player2:", player2);
        console.log("  - token present:", token ? "✅ Yes" : "❌ No");

        const wsUrl = `${wss_api}/pong/ws/pong/${room_id}/?token=${token}`;
        console.log("🔌 Connecting to WebSocket:", wsUrl);

        socket = new WebSocket(wsUrl);

        socket.onopen = function () {
            console.log("✅ WebSocket connection established successfully!");
            console.log("🎮 Connected to room:", room_id);
            console.log("👥 Players:", player1, "vs", player2);

            // Notify setup that connection is established
            SETUP.onConnectionEstablished();
            resolve();
        };

        socket.onmessage = function (event) {
            try {
                const message = JSON.parse(event.data);
                console.log("📨 WebSocket message received:", message);
                handleServerMessage(message);
            } catch (error) {
                console.error("Error parsing WebSocket message:", error);
            }
        };

        socket.onerror = function (error) {
            console.error("❌ WebSocket error occurred:", error);
            console.error("🔧 Debug Information:");
            console.error("  - WebSocket URL:", wsUrl);
            console.error("  - Room ID:", room_id);
            console.error("  - Players:", player1, "vs", player2);
            console.error("  - Token present:", token ? "Yes" : "No");
            reject(error);
        };

        socket.onclose = function (event) {
            console.log("🔌 WebSocket connection closed");
            console.log("  - Code:", event.code);
            console.log("  - Reason:", event.reason);
            console.log("  - Was Clean:", event.wasClean);

            // Handle disconnection
            if (event.code !== 1000) { // Not normal closure
                SETTINGS.onDisconnected(event.reason || "Connection lost");
            }
        };
    });
}

async function handleServerMessage(message) {
    console.log("📨 WebSocket message received:", message);
    console.log("📨 Message type:", message.type);

    switch (message.type) {
        case "connection_success":
            console.log("🎉 Connection successful:", message.message);
            break;

        case "game_config":
            console.log("⚙️ Game configuration received:", message.config);
            GAME.updateGameConfiguration(message.config);
            break;

        case "player_ready":
            console.log("✅ Player ready update:", message);
            GAME.onPlayerReady(message);
            break;

        case "both_players_ready":
        case "players_ready":
        case "game_ready":
        case "all_players_ready":
            console.log("🎮🎮🎮 BOTH PLAYERS READY! Starting game:", message);
            SETUP.onPlayersReady(message);
            break;

        case "game_start":
        case "start_game":
            console.log("🎮🎮🎮 GAME STARTING:", message);
            GAME.onGameStart(message);
            break;

        case "game_state":
            // ✅ AGGIORNA TUTTO IL GAME STATE
            GAME.updateGameState(message.game_state);
            break;

        case "player_movement":
            // ✅ GESTIONE MOVIMENTO ALTRI PLAYER
            console.log(`👥 Player ${message.player_id} moved: ${message.direction}`);
            break;

        case "waiting_for_players":
            console.log("⏳ Waiting for more players:", message);
            break;

        case "player_joined":
            console.log("👤 Player joined:", message);
            break;

        case "game_over":
            console.log("🏁 Game over:", message);
            GAME.onGameOver(message.winner);
            break;

        case "error":
            console.error("❌ Server error:", message.error);
            break;

        default:
            console.log("🔍❓ UNKNOWN MESSAGE TYPE:", message.type);
            console.log("🔍❓ Full unknown message:", JSON.stringify(message, null, 2));
            break;
    }
}

function handleRematchRequest(message) {
    const requester = message.requester?.username || "Opponent";
    const accept = confirm(`${requester} wants a rematch. Accept?`);

    if (accept) {
        sendRematchResponse(true);
    } else {
        sendRematchResponse(false);
    }
}

// Message sending functions
export function sendPlayerReady() {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: "player_ready"
        }));
        console.log("📤 Sent player ready signal");
    }
}

export function sendMovement(direction) {
    console.log(`📤 Attempting to send movement: ${direction}`);

    if (socket && socket.readyState === WebSocket.OPEN) {
        const message = {
            type: direction // "up", "down", "stop"
        };
        console.log(`📤 Sending WebSocket message:`, message);
        socket.send(JSON.stringify(message));
        console.log(`✅ Movement sent successfully: ${direction}`);
    } else {
        console.error(`❌ Cannot send movement: WebSocket not open`);
        console.error(`   Socket state: ${socket ? socket.readyState : 'null'}`);
        console.error(`   Expected state: ${WebSocket.OPEN}`);
    }
}

export function sendQuitGame() {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: "quit_game"
        }));
        console.log("📤 Sent quit game signal");
    }
}

export function sendRematchRequest() {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: "rematch_request"
        }));
        console.log("📤 Sent rematch request");
    }
}

export function sendRematchResponse(accept) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: "rematch_response",
            accept: accept
        }));
        console.log(`📤 Sent rematch response: ${accept}`);
    }
}

export function sendChatMessage(message) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: "chat_message",
            message: message
        }));
    }
}

export { createGame, initializeWebSocket, socket };