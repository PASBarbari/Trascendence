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

export function setupGame() {
	console.log("🔧 Starting game setup...");

	state.scene = new THREE.Scene();
	state.scene.background = new THREE.Color(0x222233);

	state.camera = new THREE.PerspectiveCamera(
		75,
		window.innerWidth / window.innerHeight,
		0.1,
		1000
	);
	state.camera.position.set(state.cam.x, state.cam.y, state.cam.z);

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

		console.log(`🔧 Initial setup - Container dimensions: ${width}x${height}`);
		console.log(`🔧 Container found:`, container);

		// Set renderer size based on container
		state.renderer.setSize(width, height);

		// Update camera aspect ratio
		state.camera.aspect = width / height;
		state.camera.updateProjectionMatrix();

		// Attach renderer to container, not body
		container.appendChild(state.renderer.domElement);
		console.log(`✅ Renderer attached to container`);
	} else {
		console.error("❌ Three.js container not found");
		// Only as fallback
		state.renderer.setSize(window.innerWidth, window.innerHeight);
	}

	state.controls = new OrbitControls(state.camera, state.renderer.domElement);

	// state.stats = new Stats();
	// document.body.appendChild(state.stats.dom);

	console.log("🔧 Setting up ring...");
	setupRing();

	console.log("🔧 Creating players...");
	new Player(new THREE.Vector3(-((state.ring.length * 2) / 5), 0, 0), 0);

	new Player(new THREE.Vector3((state.ring.length * 2) / 5, 0, 0), 1);
	// //Ball setup

	console.log("🔧 Creating ball with radius:", state.ball_radius);
	new Ball(state.scene, state.ball_radius, state.boundaries, [
		state.players[0],
		state.players[1],
	]);

	// Score
	console.log("🔧 Creating score...");
	createScore();

	state.ball.addEventListener("score", (event) => {
		console.log("Score event:", event);

		// Only process score changes if we're not in multiplayer OR we're the master
		if (!state.isMultiplayer || state.isMaster) {
			if (event.message === "p1") {
				state.p1_score++;
			} else if (event.message === "p2") {
				state.p2_score++;
			}
			updateScore(event.message);

			// Send score update to slave if we're in multiplayer and master
			if (state.isMultiplayer && state.isMaster && state.socket && state.socket.readyState === WebSocket.OPEN) {
				const scoreMessage = {
					type: "score_update",
					p1_score: state.p1_score,
					p2_score: state.p2_score,
					timestamp: Date.now()
				};
				state.socket.send(JSON.stringify(scoreMessage));
				console.log("📊 Score update sent to slave:", scoreMessage);
			}

			if (state.p1_score >= state.maxScore) {
				state.isStarted = false;
				state.isPaused = true;
				game_over();
			}
			if (state.p2_score >= state.maxScore) {
				state.isStarted = false;
				state.isPaused = true;
				game_over();
			}
		}
		// If we're slave, ignore score events - they'll be updated via WebSocket
	});

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

	console.log("✅ Game setup complete");
	console.log("📊 Scene contains:", state.scene.children.length, "objects");
	console.log("📊 Camera position:", state.camera.position);
	console.log("📊 Game state:", {
		scene: !!state.scene,
		camera: !!state.camera,
		renderer: !!state.renderer,
		ball: !!state.ball,
		players: state.players ? state.players.length : 0
	});
}

export function updatePlayerBoundaries() {
	console.log("📏 Updating player boundaries...");

	// Recalculate boundaries based on updated ring dimensions
	if (state.boundaries) {
		state.boundaries.x = state.ring.length / 2;
		state.boundaries.y = state.ring.height / 2;
		console.log("📏 Updated boundaries:", state.boundaries);
	}

	// Update ball boundaries reference if ball exists
	if (state.ball && state.ball.boundaries) {
		state.ball.boundaries = state.boundaries;
		console.log("📏 Updated ball boundaries reference");
	}

	// Update score positions if they exist
	if (state.scoreMesh && state.scoreMesh.p1 && state.scoreMesh.p2) {
		state.scoreMesh.p1.position.x = -state.boundaries.x * 0.6;
		state.scoreMesh.p2.position.x = state.boundaries.x * 0.6;
		state.scoreMesh.p1.position.y = state.boundaries.y * 1.3;
		state.scoreMesh.p2.position.y = state.boundaries.y * 1.3;
		console.log("📏 Updated score positions");
	}
}

export function updateGameGeometries() {
	console.log("📏 Updating all game geometries with new dimensions...");

	// Update plane geometry
	if (state.plane && state.plane.geometry) {
		console.log("📏 Updating plane geometry...");
		state.plane.geometry.dispose();
		const newPlaneGeometry = new THREE.PlaneGeometry(
			state.ring.length,
			state.ring.height
		);
		newPlaneGeometry.rotateX(-Math.PI / 2);
		state.plane.geometry = newPlaneGeometry;
	}

	// Update ring geometries (walls)
	if (state.r_bottom && state.r_bottom.geometry) {
		console.log("📏 Updating bottom ring geometry...");
		state.r_bottom.geometry.dispose();
		const bottomGeometry = new THREE.BoxGeometry(
			state.ring.length + state.ring.thickness * 2,
			state.ring.thickness,
			state.ring.depth
		);
		state.r_bottom.geometry = bottomGeometry;
		state.r_bottom.position.set(
			0,
			-((state.ring.height + state.ring.thickness) / 2),
			0
		);
	}

	if (state.r_top && state.r_top.geometry) {
		console.log("📏 Updating top ring geometry...");
		state.r_top.geometry.dispose();
		const topGeometry = new THREE.BoxGeometry(
			state.ring.length + state.ring.thickness * 2,
			state.ring.thickness,
			state.ring.depth
		);
		state.r_top.geometry = topGeometry;
		state.r_top.position.set(
			0,
			(state.ring.height + state.ring.thickness) / 2,
			0
		);
	}

	if (state.r_left && state.r_left.geometry) {
		console.log("📏 Updating left ring geometry...");
		state.r_left.geometry.dispose();
		const leftGeometry = new THREE.BoxGeometry(
			state.ring.thickness,
			state.ring.height,
			state.ring.depth
		);
		state.r_left.geometry = leftGeometry;
		state.r_left.position.set(
			-((state.ring.length + state.ring.thickness) / 2),
			0,
			0
		);
	}

	if (state.r_right && state.r_right.geometry) {
		console.log("📏 Updating right ring geometry...");
		state.r_right.geometry.dispose();
		const rightGeometry = new THREE.BoxGeometry(
			state.ring.thickness,
			state.ring.height,
			state.ring.depth
		);
		state.r_right.geometry = rightGeometry;
		state.r_right.position.set(
			(state.ring.length + state.ring.thickness) / 2,
			0,
			0
		);
	}

	// Update player geometries
	if (state.players && state.players.length > 0) {
		console.log("📏 Updating player geometries...");
		for (let i = 0; i < state.players.length; i++) {
			const player = state.players[i];
			if (player && player.mesh && player.mesh.geometry) {
				player.mesh.geometry.dispose();
				const newPlayerGeometry = new THREE.BoxGeometry(
					state.p.width,
					state.p.height,
					state.p.depth
				);
				newPlayerGeometry.rotateX(Math.PI / 2);
				player.mesh.geometry = newPlayerGeometry;

				// Update helper mesh too if it exists
				if (player.helperMesh && player.helperMesh.geometry) {
					player.helperMesh.geometry.dispose();
					const newHelperGeometry = new THREE.BoxGeometry(
						state.p.width + state.ball_radius,
						state.p.height + state.ball_radius,
						state.p.depth + state.ball_radius
					);
					newHelperGeometry.rotateX(Math.PI / 2);
					player.helperMesh.geometry = newHelperGeometry;
				}
			}
		}

		// Update player positions based on new ring dimensions
		if (state.players[0] && state.players[0].mesh) {
			state.players[0].mesh.position.x = -((state.ring.length * 2) / 5);
		}
		if (state.players[1] && state.players[1].mesh) {
			state.players[1].mesh.position.x = (state.ring.length * 2) / 5;
		}
	}

	// Update ball geometry if it exists
	if (state.ball && state.ball.mesh && state.ball.mesh.geometry) {
		console.log("📏 Updating ball geometry...");
		state.ball.mesh.geometry.dispose();
		const newBallGeometry = new THREE.SphereGeometry(state.ball_radius, 32, 32);
		state.ball.mesh.geometry = newBallGeometry;
		state.ball.radius = state.ball_radius;
	}

	console.log("📏 All game geometries updated successfully");
}
