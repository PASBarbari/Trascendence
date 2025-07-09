import * as THREE from "three";
import { state } from "../locale/state.js";
import * as SETUP from "./multiSetup.js";
import * as SETTINGS from "./multiSettings.js";
import * as GAME from "./multiGameLogic.js";
import * as SERVER from "./serverSide.js";
import { getVariables } from "../../var.js";

export function renderServerPong() {
    console.log("Rendering Server Pong...");

    // Add CSS
    const bootstrapCSS = document.createElement("link");
    bootstrapCSS.rel = "stylesheet";
    bootstrapCSS.href = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css";
    document.head.appendChild(bootstrapCSS);

    const bootstrapJS = document.createElement("script");
    bootstrapJS.src = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/js/bootstrap.bundle.min.js";
    document.head.appendChild(bootstrapJS);

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/pong/locale/pong.css";
    document.head.appendChild(link);

    // Check if we have multiplayer data
    const { multiplayer_username, multiplayer_id } = getVariables();
    if (!multiplayer_username || !multiplayer_id) {
        console.log("No multiplayer data found, redirecting to home");
        window.navigateTo("#home");
        return;
    }

    const contentDiv = document.getElementById("content");
    contentDiv.innerHTML = `
    <div class="pong-app">
        <div class="gamecontainer position-relative">
            <div id="threejs-container" class="w-100 h-100"></div>

            <!-- Waiting Room -->
            <div id="waitingRoom" class="position-absolute top-50 start-50 translate-middle text-center p-4 bg-dark bg-opacity-75 rounded shadow">
                <h1 class="text-light mb-4">MULTIPLAYER PONG</h1>
                <div class="mb-4">
                    <div class="spinner-border text-primary mb-3" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="text-light">Waiting for opponent...</p>
                    <p class="text-light" id="roomInfo">Room: ${state.room_id || 'Connecting...'}</p>
                </div>
                <button id="readyButton" class="btn btn-success btn-lg me-2" disabled>
                    <i class="fas fa-check me-2"></i>Ready
                </button>
                <button id="exitWaitingButton" class="btn btn-danger btn-lg">
                    <i class="fas fa-times me-2"></i>Exit
                </button>
            </div>

            <!-- Game UI -->
            <div id="gameUI" class="position-absolute top-0 start-0 w-100 h-100" style="display: none;">
                <!-- Player Info -->
                <div class="position-absolute top-0 start-0 p-3">
                    <div class="bg-dark bg-opacity-75 rounded p-2">
                        <small class="text-light">Player 1</small>
                        <div class="text-light fw-bold" id="player1Name">Player 1</div>
                    </div>
                </div>

                <div class="position-absolute top-0 end-0 p-3">
                    <div class="bg-dark bg-opacity-75 rounded p-2">
                        <small class="text-light">Player 2</small>
                        <div class="text-light fw-bold" id="player2Name">Player 2</div>
                    </div>
                </div>

                <!-- Game Controls -->
                <div class="position-absolute bottom-0 start-50 translate-middle-x p-3">
                    <div class="bg-dark bg-opacity-75 rounded p-2 text-center">
                        <small class="text-light d-block">Controls: W/S or Arrow Keys</small>
                        <small class="text-light">ESC to pause</small>
                    </div>
                </div>
            </div>

            <!-- Pause Menu -->
            <div id="pauseMenu" class="position-absolute top-50 start-50 translate-middle text-center p-4 bg-dark bg-opacity-75 rounded shadow" style="display: none;">
                <h2 class="text-light mb-4">Game Paused</h2>
                <div class="d-grid gap-3">
                    <button id="resumeButton" class="btn btn-success btn-lg">Resume Game</button>
                    <button id="exitGameButton" class="btn btn-danger btn-lg">Exit Game</button>
                </div>
            </div>

            <!-- Game Over Menu -->
            <div id="gameOverMenu" class="position-absolute top-50 start-50 translate-middle text-center p-4 bg-dark bg-opacity-75 rounded shadow" style="display: none;">
                <h2 class="text-light mb-3">Game Over</h2>
                <h3 id="winnerAnnouncement" class="text-warning mb-4">Player 1 Wins!</h3>
                <div class="d-grid gap-3">
                    <button id="playAgainButton" class="btn btn-success btn-lg">Play Again</button>
                    <button id="exitToHomeButton" class="btn btn-primary btn-lg">Back to Home</button>
                </div>
            </div>
        </div>
    </div>
    `;

    // Add event listeners
    setupEventListeners();

		    setTimeout(async () => {
        const { multiplayer_invited, room_id, multiplayer_player1, multiplayer_player2 } = getVariables();

        if (multiplayer_invited && room_id) {
            // ✅ PLAYER B: È stato invitato, connetti al gioco esistente
            console.log("🎮 User was invited to game, auto-connecting to room:", room_id);

            try {
                const { joinGameAsInvited } = await import("./serverSide.js");
                await joinGameAsInvited();
                console.log("✅ Successfully joined game as invited player");
            } catch (error) {
                console.error("❌ Failed to join game as invited player:", error);
            }

        } else if (room_id && multiplayer_player1 && multiplayer_player2) {
            // ✅ PLAYER A: Ha creato il gioco, WebSocket dovrebbe essere già connesso
            console.log("🎮 Game creator, WebSocket should already be connected");
            console.log("Players:", multiplayer_player1, "vs", multiplayer_player2);

        } else {
            // ❌ Nessun dato multiplayer, redirect a home
            console.log("❌ No multiplayer data found, redirecting to home");
            window.navigateTo("#home");
            return;
        }

    // Initialize the multiplayer game
    setTimeout(() => {
        SETUP.setupMultiplayerGame();
        GAME.initializeMultiplayerLoop();
    }, 100);
    }, 0); // <-- Close the outer setTimeout
}

function setupEventListeners() {
    // Ready button
    document.getElementById("readyButton").addEventListener("click", () => {
        SETTINGS.setPlayerReady();
    });

    // Exit waiting room
    document.getElementById("exitWaitingButton").addEventListener("click", () => {
        SETTINGS.exitWaitingRoom();
    });

    // Pause menu
    document.getElementById("resumeButton").addEventListener("click", () => {
        SETTINGS.resumeGame();
    });

    document.getElementById("exitGameButton").addEventListener("click", () => {
        SETTINGS.exitGame();
    });

    // Game over menu
    document.getElementById("playAgainButton").addEventListener("click", () => {
        SETTINGS.requestRematch();
    });

    document.getElementById("exitToHomeButton").addEventListener("click", () => {
        SETTINGS.exitToHome();
    });

    // Keyboard handlers
    document.addEventListener("keydown", multiplayerKeyDownHandler);
    document.addEventListener("keyup", multiplayerKeyUpHandler);

    window.multiplayerKeyDownHandler = multiplayerKeyDownHandler;
    window.multiplayerKeyUpHandler = multiplayerKeyUpHandler;
}

function multiplayerKeyDownHandler(event) {
    if (!event || !event.key) return;

    // Only handle input if game is started and not paused
    if (!state.isStarted || state.isPaused) {
        if (event.key === "Escape") {
            if (state.isPaused) {
                SETTINGS.resumeGame();
            } else if (state.isStarted) {
                SETTINGS.pauseGame();
            }
        }
        return;
    }

    // Send movement commands to server
    if (event.key.toLowerCase() === "w" || event.key === "ArrowUp") {
        SERVER.sendMovement("up");
    }
    if (event.key.toLowerCase() === "s" || event.key === "ArrowDown") {
        SERVER.sendMovement("down");
    }

    if (event.key === "Escape") {
        SETTINGS.pauseGame();
    }
}

function multiplayerKeyUpHandler(event) {
    if (!event || !event.key) return;

    // Only handle input if game is started and not paused
    if (!state.isStarted || state.isPaused) return;

    // Send stop movement commands to server
    if (event.key.toLowerCase() === "w" || event.key === "ArrowUp" ||
        event.key.toLowerCase() === "s" || event.key === "ArrowDown") {
        SERVER.sendMovement("stop");
    }
}

// Resize handler
window.addEventListener("resize", () => {
    const container = document.getElementById("threejs-container");
    if (container && state.camera && state.renderer) {
        const rect = container.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;

        state.camera.aspect = width / height;
        state.camera.updateProjectionMatrix();
        state.renderer.setSize(width, height);
    }
});