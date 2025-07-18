import * as THREE from "three";
import { state } from "./state.js";
// import { createScore, updateScore } from "./utils.js";
import Stats from "three/addons/libs/stats.module.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import Ball from "./src/Ball.js";
import Player from "./src/Player.js";
import { setupRing } from "./src/Ring.js";
import { createScore, updateScore } from "./src/Score.js";
import { initLights } from "./src/Light.js";
import { game_over } from "./utils.js";

//Scene setup

export function setupGame() {
	state.scene = new THREE.Scene();
	state.scene.background = new THREE.Color(0x222233);

	state.camera = new THREE.PerspectiveCamera(
		75,
		window.innerWidth / window.innerHeight,
		0.1,
		1000
	);
	state.camera.position.set(state.cam.x, state.cam.y, state.cam.z);

	// Clear existing players
	state.players.forEach((player) => {
		if (player && player.mesh) {
			state.scene.remove(player.mesh);
		}
	});
	state.players = [];

	// Create renderer
	state.renderer = new THREE.WebGLRenderer({
		antialias: window.devicePixelRatio < 2,
		logarithmicDepthBuffer: true,
		powerPreference: "high-performance",
		//quality: "high",
		failIfMajorPerformanceCaveat: false,
	});

	// Get the container
	const container = document.getElementById("threejs-container");
	if (container) {
		// Use container dimensions
		const rect = container.getBoundingClientRect();
		const width = rect.width;
		const height = rect.height;

		// Set renderer size based on container
		state.renderer.setSize(width, height);

		// Update camera aspect ratio
		state.camera.aspect = width / height;
		state.camera.updateProjectionMatrix();

		// Attach renderer to container, not body
		container.appendChild(state.renderer.domElement);
	} else {
		console.error("Three.js container not found");
		// Only as fallback
		state.renderer.setSize(window.innerWidth, window.innerHeight);
	}

	state.controls = new OrbitControls(state.camera, state.renderer.domElement);

	// state.stats = new Stats();
	// document.body.appendChild(state.stats.dom);

	setupRing();

	new Player(new THREE.Vector3(-((state.ring.length * 2) / 5), 0, 0), 0);

	new Player(new THREE.Vector3((state.ring.length * 2) / 5, 0, 0), 1);
	// //Ball setup

	console.log("Ball radius:", state.ball_radius);

	new Ball(state.scene, state.ball_radius, state.boundaries, [
		state.players[0],
		state.players[1],
	]);

	// Score

	createScore();

	if (state.isMultiplayer) {
		// For multiplayer, prevent local game state changes
		state.ball.addEventListener("score", (event) => {
			console.log("Score event in multiplayer mode:", event);
			if (event.message === "p1") {
				state.p1_score++;
			} else if (event.message === "p2") {
				state.p2_score++;
			}
			updateScore(event.message);
			// Don't call game_over() or change game state
		});
	} else {
		// Original single-player scoring logic
		state.ball.addEventListener("score", (event) => {
			console.log("Score event:", event);
			if (event.message === "p1") {
				state.p1_score++;
			} else if (event.message === "p2") {
				state.p2_score++;
			}
			updateScore(event.message);
			if (
				state.p1_score >= state.maxScore ||
				state.p2_score >= state.maxScore
			) {
				state.isStarted = false;
				state.isPaused = true;
				if (!state.isMultiplayer)
					game_over();
			}
		});
	}

	// //Game setup

	state.game.rotateOnAxis(new THREE.Vector3(1, 0, 0), Math.PI / 3);
	state.scene.add(state.game);

	//Movement setup

	state.P1cursor = new THREE.Vector2();
	state.P2cursor = new THREE.Vector2();

	initLights();

	state.renderer.shadowMap.enabled = true;
	state.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

	state.renderer.render(state.scene, state.camera);

	console.log("Game setup complete");
	console.log("Scene contains:", state.scene.children.length, "objects");
	console.log("Camera position:", state.camera.position);
}
