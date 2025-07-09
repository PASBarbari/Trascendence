import * as THREE from "three";
import { state } from "../locale/state.js";
import { updateScore } from "../locale/src/Score.js";
import * as SETTINGS from "./multiSettings.js";
import * as SERVER from "./serverSide.js";
import { getVariables } from "../../var.js";

const clock = new THREE.Clock();
let animationId = null;

// ✅ GESTIONE INPUT PER MOVIMENTO
let currentMovement = null;

// ✅ GESTIONE CONFIGURAZIONE DEL GIOCO
let gameConfig = null;

/**
 * Aggiorna la configurazione del gioco ricevuta dal backend
 * @param {Object} config - La nuova configurazione
 */
export function updateGameConfiguration(config) {
    console.log("Updating game configuration:", config);
    gameConfig = config;

    // Update gameConfig module if available
    if (window.gameConfigModule) {
        window.gameConfigModule.updateGameConfig(config);
    }

    // Update state with new configuration
    updateStateWithConfig(config);
}

/**
 * Aggiorna lo state con la nuova configurazione
 * @param {Object} config - La configurazione del gioco
 */
function updateStateWithConfig(config) {
    if (!config) return;

    console.log("🔄 Updating game state with responsive config:", config);

    // Update state properties with backend configuration
    state.ring = {
        ...state.ring,
        length: config.ring_length,
        height: config.ring_height,
        width: config.ring_width,
        thickness: config.ring_thickness
    };

    state.paddle = {
        ...state.paddle,
        width: config.player_width,
        height: config.player_length,
        speed: config.player_speed
    };

    state.ball_radius = config.ball_radius;
    state.ball_speed = config.ball_speed;

    // Update boundaries based on calculated values
    state.boundaries = {
        top: config.boundary_top,
        bottom: config.boundary_bottom,
        left: config.boundary_left,
        right: config.boundary_right
    };

    console.log("✅ Game state updated with responsive configuration:", {
        ring: state.ring,
        paddle: state.paddle,
        ball_radius: state.ball_radius,
        ball_speed: state.ball_speed,
        boundaries: state.boundaries
    });
}

export function initializeMultiplayerLoop() {
    console.log("Initializing multiplayer game loop...");

    console.log("🔍 Game state when initializing loop:", {
        isStarted: state.isStarted,
        isPaused: state.isPaused,
        players: state.players?.length,
        ball: state.ball ? "exists" : "null"
    });

    // Check player info for debugging
    const { userUsername, multiplayer_player1, multiplayer_player2 } = getVariables();
    console.log("🔍 Player info:", {
        userUsername,
        multiplayer_player1,
        multiplayer_player2,
        isPlayer1: userUsername === multiplayer_player1
    });

    if (animationId) {
        cancelAnimationFrame(animationId);
        console.log("✅ Previous animation frame cancelled");
    }

    // ✅ SETUP INPUT HANDLERS
    setupInputHandlers();

    clock.start();
    gameLoop();
    console.log("✅ Game loop started");
}

function setupInputHandlers() {
    console.log("🎮 Setting up input handlers...");

    // Remove existing listeners
    document.removeEventListener("keydown", multiplayerKeyDownHandler);
    document.removeEventListener("keyup", multiplayerKeyUpHandler);
    console.log("✅ Removed existing event listeners");

    // Add new listeners
    document.addEventListener("keydown", multiplayerKeyDownHandler);
    document.addEventListener("keyup", multiplayerKeyUpHandler);
    console.log("✅ Added new event listeners");

    // Store handlers globally for cleanup
    window.multiplayerKeyDownHandler = multiplayerKeyDownHandler;
    window.multiplayerKeyUpHandler = multiplayerKeyUpHandler;

    console.log("✅ Input handlers setup complete");
    console.log("🎮 Controls: Player 1 (W/S), Player 2 (Arrow Up/Down)");
}

function multiplayerKeyDownHandler(event) {
    console.log(`🔍 Key pressed: ${event.key} (code: ${event.code})`);

    if (!state.isStarted || state.isPaused) {
        console.log("❌ Game not started or paused, ignoring key press");
        return;
    }

    const { userUsername, multiplayer_player1, multiplayer_player2 } = getVariables();
    const isPlayer1 = userUsername === multiplayer_player1;

    console.log(`🎮 Player info: isPlayer1=${isPlayer1}, username=${userUsername}, p1=${multiplayer_player1}, p2=${multiplayer_player2}`);

    let movement = null;

    if (isPlayer1) {
        // Player 1 controls: W/S
        if (event.key.toLowerCase() === 'w') {
            movement = 'up';
            console.log("⬆️ Player 1 pressed W (UP)");
        } else if (event.key.toLowerCase() === 's') {
            movement = 'down';
            console.log("⬇️ Player 1 pressed S (DOWN)");
        } else {
            console.log(`🔍 Player 1 pressed irrelevant key: ${event.key}`);
        }
    } else {
        // Player 2 controls: Arrow keys
        if (event.key === 'ArrowUp') {
            movement = 'up';
            console.log("⬆️ Player 2 pressed Arrow UP");
        } else if (event.key === 'ArrowDown') {
            movement = 'down';
            console.log("⬇️ Player 2 pressed Arrow DOWN");
        } else {
            console.log(`🔍 Player 2 pressed irrelevant key: ${event.key}`);
        }
    }

    // ✅ INVIA MOVIMENTO AL SERVER SOLO SE È DIVERSO DA QUELLO ATTUALE
    if (movement && movement !== currentMovement) {
        console.log(`📤 Sending movement: ${movement} (previous: ${currentMovement})`);
        currentMovement = movement;
        SERVER.sendMovement(movement);
        console.log(`✅ Movement sent successfully: ${movement}`);
    } else if (movement === currentMovement) {
        console.log(`🔄 Movement ${movement} already active, not sending duplicate`);
    } else {
        console.log("❌ No valid movement detected");
    }
}

function multiplayerKeyUpHandler(event) {
    console.log(`🔍 Key released: ${event.key} (code: ${event.code})`);

    if (!state.isStarted || state.isPaused) {
        console.log("❌ Game not started or paused, ignoring key release");
        return;
    }

    const { userUsername, multiplayer_player1, multiplayer_player2 } = getVariables();
    const isPlayer1 = userUsername === multiplayer_player1;

    let shouldStop = false;

    if (isPlayer1) {
        if (event.key.toLowerCase() === 'w' || event.key.toLowerCase() === 's') {
            shouldStop = true;
            console.log(`🛑 Player 1 released movement key: ${event.key.toLowerCase()}`);
        }
    } else {
        if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            shouldStop = true;
            console.log(`🛑 Player 2 released movement key: ${event.key}`);
        }
    }

    // ✅ INVIA STOP AL SERVER
    if (shouldStop && currentMovement) {
        console.log(`📤 Sending STOP (was: ${currentMovement})`);
        currentMovement = null;
        SERVER.sendMovement('stop');
        console.log("✅ STOP sent successfully");
    } else if (shouldStop && !currentMovement) {
        console.log("� Key released but no current movement to stop");
    } else {
        console.log(`🔍 Key released but not a movement key: ${event.key}`);
    }
}

function gameLoop() {
    animationId = requestAnimationFrame(gameLoop);

    const deltaTime = clock.getDelta();

    // ✅ NON AGGIORNIAMO PIÙ LA LOGICA DI GIOCO QUI
    // Il server ci invierà game_state updates

    // Solo rendering
    if (state.renderer && state.scene && state.camera) {
        state.renderer.render(state.scene, state.camera);
    }
}

// ✅ GESTIONE AGGIORNAMENTI DAL SERVER
export function updateGameState(gameState) {
    if (!gameState) return;

    console.log("🎮 Updating game state:", gameState);

    // ✅ AGGIORNA POSIZIONI PLAYERS
    if (gameState.player_1_pos && state.players[0] && state.players[0].mesh) {
        state.players[0].mesh.position.x = gameState.player_1_pos[0];
        state.players[0].mesh.position.z = gameState.player_1_pos[1];
        console.log(`Player 1 pos: [${gameState.player_1_pos[0]}, ${gameState.player_1_pos[1]}]`);
    }

    if (gameState.player_2_pos && state.players[1] && state.players[1].mesh) {
        state.players[1].mesh.position.x = gameState.player_2_pos[0];
        state.players[1].mesh.position.z = gameState.player_2_pos[1];
        console.log(`Player 2 pos: [${gameState.player_2_pos[0]}, ${gameState.player_2_pos[1]}]`);
    }

    // ✅ AGGIORNA POSIZIONE BALL
    if (gameState.ball_pos && state.ball && state.ball.mesh) {
        state.ball.mesh.position.x = gameState.ball_pos[0];
        state.ball.mesh.position.z = gameState.ball_pos[1];
        console.log(`Ball pos: [${gameState.ball_pos[0]}, ${gameState.ball_pos[1]}]`);
    }

    // ✅ AGGIORNA SCORES
    if (gameState.player_1_score !== undefined && gameState.player_1_score !== state.p1_score) {
        state.p1_score = gameState.player_1_score;
        updateScore("p1");
        console.log("Updated Player 1 score:", state.p1_score);
    }

    if (gameState.player_2_score !== undefined && gameState.player_2_score !== state.p2_score) {
        state.p2_score = gameState.player_2_score;
        updateScore("p2");
        console.log("Updated Player 2 score:", state.p2_score);
    }

    // ✅ CHECK GAME OVER
    if (gameState.game_over) {
        onGameOver(gameState.winner);
    }
}

export function onPlayerReady(message) {
    console.log("Player ready received:", message);
    // Handle player ready state updates if needed
}

export function onGameStart(message) {
    console.log("Game starting:", message);
    state.isStarted = true;
    state.isPaused = false;

    // Hide waiting room, show game UI
    document.getElementById("waitingRoom").style.display = "none";
    document.getElementById("gameUI").style.display = "block";
}

export function onGameOver(winner) {
    console.log("Game over, winner:", winner);
    state.isStarted = false;
    state.isPaused = true;

    SETTINGS.showGameOverMenu(winner);
}

export function cleanup() {
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }

    // Remove event listeners
    document.removeEventListener("keydown", multiplayerKeyDownHandler);
    document.removeEventListener("keyup", multiplayerKeyUpHandler);

    currentMovement = null;
}