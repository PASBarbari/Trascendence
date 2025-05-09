import * as THREE from "three";
import { state } from "./state.js";
import { createScore } from "./utils.js";
import Stats from "three/addons/libs/stats.module.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

//Scene setup

export function setupGame() {
	state.scene = new THREE.Scene();
	state.camera = new THREE.PerspectiveCamera(
		75,
		window.innerWidth / window.innerHeight,
		0.1,
		1000
	);
	state.camera.position.set(state.cam.x, state.cam.y, state.cam.z);
	state.camera.lookAt(state.look.x, state.look.y, state.look.z);

	// Create renderer but don't attach yet
	state.renderer = new THREE.WebGLRenderer({ antialias: true });

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

	//Ring setup

	state.r_bottom = new THREE.Mesh(
		new THREE.BoxGeometry(state.ring.y, state.ring.h, state.ring.z),
		state.mat.ring
	);
	state.r_top = new THREE.Mesh(
		new THREE.BoxGeometry(state.ring.y, state.ring.h, state.ring.z),
		state.mat.ring
	);
	state.r_left = new THREE.Mesh(
		new THREE.BoxGeometry(state.ring.h, state.ring.x, state.ring.z),
		state.mat.ring
	);
	state.r_right = new THREE.Mesh(
		new THREE.BoxGeometry(state.ring.h, state.ring.x, state.ring.z),
		state.mat.ring
	);

	state.ground = new THREE.Mesh(
		new THREE.BoxGeometry(state.ring.y - state.ring.h * 2, state.ring.x, 0),
		state.mat.ground
	);

	state.r_bottom.position.set(0, -((state.ring.x + state.ring.h) / 2), 0);
	state.r_top.position.set(0, (state.ring.x + state.ring.h) / 2, 0);
	state.r_left.position.set(-((state.ring.y - state.ring.h) / 2), 0, 0);
	state.r_right.position.set((state.ring.y - state.ring.h) / 2, 0, 0);
	state.ground.position.set(0, 0, -state.ring.z / 4);
	state.ring3D = new THREE.Group();
	state.ring3D.add(
		state.r_bottom,
		state.r_top,
		state.r_left,
		state.r_right,
		state.ground
	);

	//Players setup

	state.p1 = new THREE.Mesh(
		new THREE.BoxGeometry(state.player.h, state.player.y, state.player.z),
		state.mat.p1
	);
	state.p2 = new THREE.Mesh(
		new THREE.BoxGeometry(state.player.h, state.player.y, state.player.z),
		state.mat.p2
	);
	state.p1.position.set(-((state.ring.y * 2) / 5), 0, 0);
	state.p2.position.set((state.ring.y * 2) / 5, 0, 0);

	//Ball setup

	state.ball = new THREE.Mesh(
		new THREE.SphereGeometry(state.ball_radius),
		state.mat.ball
	);
	state.ball.position.set(0, 0, 0);

	//Light setup

	let dirLight = new THREE.DirectionalLight(0xffffff, 10);
	dirLight.position.set(0, 0, 400);
	dirLight.target = state.ball;
	state.scene.add(dirLight);

	//orbit controls setup
	state.controls = new OrbitControls(state.camera, state.renderer.domElement);

	//texture setup

	state.scene.background = 0xffffff;
	state.renderer.render(state.scene, state.camera);

	//Game setup

	const game = new THREE.Group();
	game.add(state.ring3D, state.p1, state.p2, state.ball);
	state.scene.add(game);
	// createScore();
	state.renderer.render(state.scene, state.camera);
	console.log("Game setup complete");
	console.log("Scene contains:", state.scene.children.length, "objects");
	console.log("Camera position:", state.camera.position);
}

export function initGame() {
	state.game.ballColor = state.mat.ball.color.getHex();
	state.game.player1Color = state.mat.p1.color.getHex();
	state.game.player1Emissive = state.mat.p1.emissive.getHex();
	state.game.player2Color = state.mat.p2.color.getHex();
	state.game.player2Emissive = state.mat.p2.emissive.getHex();
	state.game.ringColor = state.mat.ring.color.getHex();
	state.game.ringEmissive = state.mat.ring.emissive.getHex();
	state.game.ballSpeed = state.ball_speed;
	state.game.playerSpeed = state.player_speed;
	state.game.ballRadius = state.ball_radius;
}
