import * as THREE from "three";
import { state } from "../locale/state.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { setupRing } from "../locale/src/Ring.js";
import { createScore } from "../locale/src/Score.js";
import { initLights } from "../locale/src/Light.js";
import Ball from "../locale/src/Ball.js";
import Player from "../locale/src/Player.js";
import * as SERVER from "./serverSide.js";
import { getVariables } from "../../var.js";

export async function setupMultiplayerGame() {
    console.log("Setting up multiplayer game...");

    // Load game configuration from backend first
    try {
        if (window.gameConfigModule) {
            const config = await window.gameConfigModule.getGameConfig();
            console.log("Game configuration loaded:", config);

            // Update state with backend configuration
            updateStateWithConfig(config);
        } else {
            console.error("Game config module not available");
        }
    } catch (error) {
        console.error("Error loading game configuration:", error);
    }

    // Initialize WebSocket connection if not already connected
    // if (!SERVER.socket || SERVER.socket.readyState !== WebSocket.OPEN) {
    //     console.log("WebSocket not connected, attempting to connect...");
    //     // The WebSocket should already be initialized from the invitation
    //     return;
    // }

    // Set up Three.js scene
    setupThreeJSScene();

    // Set up game objects
    setupGameObjects();

    // Set up UI
    setupMultiplayerUI();

    console.log("Multiplayer game setup complete");

    // Add window resize handler for responsive behavior
    setupWindowResizeHandler();
}

function updateStateWithConfig(config) {
    if (!config) {
        console.warn("No config provided to updateStateWithConfig");
        return;
    }

    console.log("🔄 Updating state with responsive config:", config);

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

    console.log("✅ State updated with responsive configuration:", {
        ring: state.ring,
        paddle: state.paddle,
        ball_radius: state.ball_radius,
        ball_speed: state.ball_speed,
        boundaries: state.boundaries
    });
}

function setupThreeJSScene() {
    // Clear any existing scene
    if (state.scene) {
        while (state.scene.children.length > 0) {
            state.scene.remove(state.scene.children[0]);
        }
    }

    state.scene = new THREE.Scene();
    state.scene.background = new THREE.Color(0x222233);

    // Create camera with responsive aspect ratio
    const container = document.getElementById("threejs-container");
    let width = window.innerWidth;
    let height = window.innerHeight;

    if (container) {
        const rect = container.getBoundingClientRect();
        width = rect.width;
        height = rect.height;
    }

    state.camera = new THREE.PerspectiveCamera(
        75,
        width / height,
        0.1,
        1000
    );
    state.camera.position.set(state.cam.x, state.cam.y, state.cam.z);

    // Create renderer
    if (!state.renderer) {
        state.renderer = new THREE.WebGLRenderer({
            antialias: window.devicePixelRatio < 2,
            logarithmicDepthBuffer: true,
            powerPreference: "high-performance",
            failIfMajorPerformanceCaveat: false,
        });
    }

    if (container) {
        state.renderer.setSize(width, height);
        state.camera.aspect = width / height;
        state.camera.updateProjectionMatrix();

        if (!container.contains(state.renderer.domElement)) {
            container.appendChild(state.renderer.domElement);
        }
    } else {
        console.error("Three.js container not found");
        state.renderer.setSize(width, height);
    }

    state.controls = new OrbitControls(state.camera, state.renderer.domElement);

    // Enable shadows
    state.renderer.shadowMap.enabled = true;
    state.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    console.log("✅ Three.js scene setup complete with responsive dimensions:", `${width}x${height}`);
}

function setupGameObjects() {
    // Reset game state
    state.game = new THREE.Group();
    state.players = [];
    state.ball = null;
    state.p1_score = 0;
    state.p2_score = 0;
    state.isStarted = false;
    state.isPaused = true;

    // Set up ring
    setupRing();

    // Set up players with responsive positioning
    new Player(new THREE.Vector3(state.ring.length * -0.4, 0, 0), 0);
    new Player(new THREE.Vector3(state.ring.length * 0.4, 0, 0), 1);

    // Set up ball with responsive size
    console.log("🏐 Creating ball with radius:", state.ball_radius);
    new Ball(state.scene, state.ball_radius, state.boundaries, [
        state.players[0],
        state.players[1],
    ]);

    // Set up score display
    createScore();

    // Set up lighting
    initLights();

    // Add game group to scene
    state.game.rotateOnAxis(new THREE.Vector3(1, 0, 0), Math.PI / 3);
    state.scene.add(state.game);

    console.log("✅ Game objects setup complete with responsive dimensions");
    console.log("📏 Ring size:", state.ring.length, "x", state.ring.height);
    console.log("🏐 Ball radius:", state.ball_radius);
    console.log("🏓 Player positions:", state.ring.length * -0.4, "and", state.ring.length * 0.4);
}

function setupMultiplayerUI() {
    // Show waiting room initially
    document.getElementById("waitingRoom").style.display = "block";
    document.getElementById("gameUI").style.display = "none";

    // Update room info if available
    if (state.room_id) {
        document.getElementById("roomInfo").textContent = `Room: ${state.room_id}`;
    }

    console.log("Multiplayer UI setup complete");
}

export function onPlayersReady(gameData) {
    console.log("🚀 onPlayersReady called with:", gameData);
    console.log("Both players ready, starting game...", gameData);

    // Hide waiting room, show game UI
    const waitingRoom = document.getElementById("waitingRoom");
    const gameUI = document.getElementById("gameUI");

    if (waitingRoom) {
        waitingRoom.style.display = "none";
        console.log("✅ Waiting room hidden");
    } else {
        console.error("❌ Waiting room element not found");
    }

    if (gameUI) {
        gameUI.style.display = "block";
        console.log("✅ Game UI shown");
    } else {
        console.error("❌ Game UI element not found");
    }

    // ✅ AGGIORNA I NOMI DEI GIOCATORI CON I DATI DALLE VARIABILI
    const { multiplayer_player1, multiplayer_player2, userUsername } = getVariables();

    // Determina quale player sei tu
    const isPlayer1 = userUsername === multiplayer_player1;

    const player1NameElement = document.getElementById("player1Name");
    const player2NameElement = document.getElementById("player2Name");

    if (player1NameElement && multiplayer_player1) {
        player1NameElement.textContent = isPlayer1 ? `${multiplayer_player1} (You)` : multiplayer_player1;
        console.log("✅ Player 1 name set:", multiplayer_player1);
    }

    if (player2NameElement && multiplayer_player2) {
        player2NameElement.textContent = !isPlayer1 ? `${multiplayer_player2} (You)` : multiplayer_player2;
        console.log("✅ Player 2 name set:", multiplayer_player2);
    }

    // Start the game
    state.isStarted = true;
    state.isPaused = false;

    console.log("✅ Game state updated:", {
        isStarted: state.isStarted,
        isPaused: state.isPaused
    });

    console.log("🎮 Game started successfully!");
}

export function onConnectionEstablished() {
    console.log("WebSocket connection established");

    const { multiplayer_invited, multiplayer_player1, multiplayer_player2, room_id } = getVariables();

    // Enable ready button
    const readyButton = document.getElementById("readyButton");
    if (readyButton) {
        readyButton.disabled = false;
        readyButton.innerHTML = '<i class="fas fa-check me-2"></i>Ready';
    }

    // ✅ AGGIORNA INFO ROOM PER ENTRAMBI I PLAYER
    const roomInfo = document.getElementById("roomInfo");
    if (roomInfo) {
        if (multiplayer_invited) {
            // Player B (invitato)
            roomInfo.innerHTML = `
                <div class="text-center">
                    <h5>🎮 Room ${room_id}</h5>
                    <p>Invited by: <strong>${multiplayer_player1}</strong></p>
                    <small class="text-muted">Players: ${multiplayer_player1} vs ${multiplayer_player2}</small>
                </div>
            `;
        } else {
            // Player A (creatore)
            roomInfo.innerHTML = `
                <div class="text-center">
                    <h5>🎮 Room ${room_id}</h5>
                    <p>You created this game</p>
                    <small class="text-muted">Players: ${multiplayer_player1} vs ${multiplayer_player2}</small>
                </div>
            `;
        }
    }

    // ✅ AGGIORNA ANCHE I NOMI NEI PLACEHOLDER
    const player1NameElement = document.getElementById("player1Name");
    const player2NameElement = document.getElementById("player2Name");

    if (player1NameElement && multiplayer_player1) {
        player1NameElement.textContent = multiplayer_player1;
    }

    if (player2NameElement && multiplayer_player2) {
        player2NameElement.textContent = multiplayer_player2;
    }
}

export function onPlayerJoined(playerData) {
    console.log("Player joined:", playerData);

    // Update waiting room info
    const roomInfo = document.getElementById("roomInfo");
    if (roomInfo && state.room_id) {
        roomInfo.innerHTML = `
            Room: ${state.room_id}<br>
            <small>Player joined: ${playerData.username || 'Unknown'}</small>
        `;
    }
}

function setupWindowResizeHandler() {
    window.addEventListener("resize", async () => {
        const container = document.getElementById("threejs-container");
        if (container && state.camera && state.renderer) {
            console.log("🔄 Window resized, updating dimensions...");

            // Update renderer size
            const rect = container.getBoundingClientRect();
            const width = rect.width;
            const height = rect.height;

            state.camera.aspect = width / height;
            state.camera.updateProjectionMatrix();
            state.renderer.setSize(width, height);

            // Optionally reload configuration for new dimensions
            if (window.gameConfigModule) {
                try {
                    const newConfig = await window.gameConfigModule.reloadConfigOnResize();
                    console.log("📏 Window resized, new config loaded:", newConfig);
                } catch (error) {
                    console.error("Error reloading config on resize:", error);
                }
            }
        }
    });

    console.log("✅ Window resize handler setup complete");
}