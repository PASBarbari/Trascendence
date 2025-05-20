import * as THREE from "three";
import { state } from "./state.js";
// import { createScore, updateScore } from "./utils.js";
import Stats from "three/addons/libs/stats.module.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import { FontLoader } from "three/addons/loaders/FontLoader.js";
import Ball from "./src/Ball.js";
import Player from "./src/Player.js";

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
	state.renderer = new THREE.WebGLRenderer({
		antialias: false,
		powerPreference: "high-performance",
		//quality: "high",
		failIfMajorPerformanceCaveat: false,
	});

	// state.renderer.getContext().canvas.addEventListener('webglcontextlost', function(event) {
	// 	console.log('WebGL context lost:', event);
	// 	event.preventDefault();
	// });

	// state.renderer.getContext().canvas.addEventListener('webglcontextrestored', function(event) {
	// 	console.log('WebGL context restored');
	// });

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

	state.boundaries = new THREE.Vector2(
		state.ring.length / 2,
		state.ring.height / 2
	);
	const planeGeometry = new THREE.PlaneGeometry(
		state.boundaries.x * 2,
		state.boundaries.y * 2,
		state.boundaries.x / 2,
		state.boundaries.y / 2
	);
	planeGeometry.rotateX(-Math.PI / 2);
	const planeMaterial = new THREE.MeshNormalMaterial({
		wireframe: true,
	});
	const plane = new THREE.Mesh(planeGeometry, planeMaterial);
	state.game.add(plane);

	//Ring setup

	state.r_bottom = new THREE.Mesh(
		new THREE.BoxGeometry(
			state.ring.length + state.ring.thickness * 2,
			state.ring.thickness,
			state.ring.depth
		),
		state.mat.ring
	);
	state.r_top = new THREE.Mesh(
		new THREE.BoxGeometry(
			state.ring.length + state.ring.thickness * 2,
			state.ring.thickness,
			state.ring.depth
		),
		state.mat.ring
	);
	state.r_left = new THREE.Mesh(
		new THREE.BoxGeometry(
			state.ring.thickness,
			state.ring.height,
			state.ring.depth
		),
		state.mat.ring
	);
	state.r_right = new THREE.Mesh(
		new THREE.BoxGeometry(
			state.ring.thickness,
			state.ring.height,
			state.ring.depth
		),
		state.mat.ring
	);

	state.r_bottom.position.set(
		0,
		-((state.ring.height + state.ring.thickness) / 2),
		0
	);
	state.r_top.position.set(
		0,
		(state.ring.height + state.ring.thickness) / 2,
		0
	);
	state.r_left.position.set(
		-((state.ring.length + state.ring.thickness) / 2),
		0,
		0
	);
	state.r_right.position.set(
		(state.ring.length + state.ring.thickness) / 2,
		0,
		0
	);
	state.ring3D = new THREE.Group();
	state.ring3D.add(
		state.r_bottom,
		state.r_top,
		state.r_left,
		state.r_right
		// state.ground
	);

	state.ring3D.rotateX(-Math.PI / 2);
	state.game.add(state.ring3D);
	// //Players setup

	new Player(
		state.scene,
		new THREE.Vector3(-((state.ring.length * 2) / 5), 0, 0)
	);

	new Player(
		state.scene,
		new THREE.Vector3((state.ring.length * 2) / 5, 0, 0)
	);
	// //Ball setup

	new Ball(state.scene, state.ball_radius, state.boundaries, [
		state.players[0],
		state.players[1],
	]);

	state.ball.addEventListener("score", (event) => {
		console.log("Score event:", event);
		if (event.message === "p1") {
			state.p1_score++;
		} else if (event.message === "p2") {
			state.p2_score++;
		}
		updateScore(event.message);

		console.log("Player 1 score:", state.p1_score);
		console.log("Player 2 score:", state.p2_score);
	});
	// //Light setup

	// let dirLight = new THREE.DirectionalLight(0xffffff, 10);
	// dirLight.position.set(0, 0, 400);
	// dirLight.target = state.ball;
	// state.scene.add(dirLight);

	//orbit controls setup
	state.controls = new OrbitControls(state.camera, state.renderer.domElement);

	// //texture setup

	// state.scene.background = 0xffffff;
	// state.renderer.render(state.scene, state.camera);

	// //Game setup
	state.game.rotateOnAxis(new THREE.Vector3(1, 0, 0), Math.PI / 3);
	state.scene.add(state.game);
	// createScore();

	const fontLoader = new FontLoader();
	const fontUrl =
		"https://threejs.org/examples/fonts/helvetiker_regular.typeface.json";
	fontLoader.load(fontUrl, function (font) {
		const textGeometry = new TextGeometry("0", {
			font: font,
			size: 20,
			depth: 0.5,
			curveSegments: 12,
			bevelEnabled: false,
			bevelThickness: 0.1,
			bevelSize: 0.1,
			bevelOffset: 0,
			bevelSegments: 5,
		});
		textGeometry.center();

		state.scoreMesh.p1 = new THREE.Mesh(
			textGeometry,
			new THREE.MeshNormalMaterial()
		);
		state.scoreMesh.p2 = new THREE.Mesh(
			textGeometry,
			new THREE.MeshNormalMaterial()
		);
		state.scoreMesh.p1.position.x = -state.boundaries.x * 0.8;
		state.scoreMesh.p2.position.x = state.boundaries.x * 0.8;
		state.scoreMesh.p1.position.z = -state.boundaries.y * 2;
		state.scoreMesh.p2.position.z = -state.boundaries.y * 2;
		state.scoreMesh.p1.rotateX(-Math.PI / 2);
		state.scoreMesh.p2.rotateX(-Math.PI / 2);
		state.game.add(state.scoreMesh.p1, state.scoreMesh.p2);
	});

	//Movement setup

	state.P1cursor = new THREE.Vector2();
	state.P2cursor = new THREE.Vector2();

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

function updateScore(player) {
	const scoreValue = player === "p1" ? state.p1_score : state.p2_score;
	const scoreMesh = player === "p1" ? state.scoreMesh.p1 : state.scoreMesh.p2;

	// Don't proceed if the score mesh isn't created yet
	if (!scoreMesh) {
		console.warn("Score mesh not initialized yet");
		return;
	}

	const fontLoader = new FontLoader();
	const fontUrl =
		"https://threejs.org/examples/fonts/helvetiker_regular.typeface.json";

	fontLoader.load(fontUrl, function (font) {
		// Create new text geometry with current score
		const textGeometry = new TextGeometry(scoreValue.toString(), {
			font: font,
			size: 20,
			depth: 0.5,
			curveSegments: 12,
			bevelEnabled: false,
			bevelThickness: 0.1,
			bevelSize: 0.1,
			bevelOffset: 0,
			bevelSegments: 5,
		});

		textGeometry.center();

		// Store the original position and rotation
		const originalPosition = scoreMesh.position.clone();
		const originalRotation = scoreMesh.rotation.clone();

		// Remove old geometry and replace with new one
		scoreMesh.geometry.dispose();
		scoreMesh.geometry = textGeometry;

		// Restore original position and rotation
		scoreMesh.position.copy(originalPosition);
		scoreMesh.rotation.copy(originalRotation);
	});
}
