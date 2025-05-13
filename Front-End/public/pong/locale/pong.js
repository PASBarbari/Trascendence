import * as THREE from "three";
import { FontLoader } from "three/addons/loaders/FontLoader.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import { Group, remove } from "three/addons/libs/tween.module.js";
import { state } from "./state.js";
import * as IA from "./ai.js";
import * as UTILS from "./utils.js";
import * as SETUP from "./setup.js";
import * as SETTINGS from "./settings.js";
import * as GAME from "./gameLogic.js";
import Stats from "three/addons/libs/stats.module.js";

export function renderPong() {
	//add bootstrap css
	const bootstrapCSS = document.createElement("link");
	bootstrapCSS.rel = "stylesheet";
	bootstrapCSS.href =
		"https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css";
	document.head.appendChild(bootstrapCSS);

	//add bootstrap js
	const bootstrapJS = document.createElement("script");
	bootstrapJS.src =
		"https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/js/bootstrap.bundle.min.js";
	document.head.appendChild(bootstrapJS);

	const link = document.createElement("link");
	link.rel = "stylesheet";
	link.href = "/public/pong/locale/pong.css";
	document.head.appendChild(link);

	// Inside renderPong function

	const contentDiv = document.getElementById("content");
	contentDiv.innerHTML = `
	<div class="pong-app">
		<div class="gamecontainer position-relative">
			<div id="threejs-container" class="w-100 h-100"></div>
			
			<!-- Main Menu -->
			<div id="menu" class="position-absolute top-50 start-50 translate-middle text-center p-4 bg-dark bg-opacity-75 rounded shadow">
			<h1 class="text-light mb-4">PONG</h1>
			<div class="d-grid gap-3">
				<button id="newGameButton" class="btn btn-primary btn-lg">New Game</button>
				<button id="settingsButton" class="btn btn-secondary btn-lg">Settings</button>
				<button id="exitButton" class="btn btn-danger btn-lg">Exit</button>
			</div>
			</div>
			
			<!-- Player Selection Menu -->
			<div id="nbrOfPlayerMenu" class="position-absolute top-50 start-50 translate-middle text-center p-4 bg-dark bg-opacity-75 rounded shadow" style="display: none;">
			<h2 class="text-light mb-4">Select Players</h2>
			<div class="d-grid gap-3">
				<button id="onePlayerButton" class="btn btn-success btn-lg">1 Player</button>
				<button id="twoPlayerButton" class="btn btn-info btn-lg">2 Players</button>
				<button id="backButton" class="btn btn-secondary btn-lg">Back</button>
			</div>
			</div>
			
			<!-- Game Mode Menu -->
			<div id="modeMenu" class="position-absolute top-50 start-50 translate-middle text-center p-4 bg-dark bg-opacity-75 rounded shadow" style="display: none;">
			<h2 class="text-light mb-4">Select Mode</h2>
			<div class="d-grid gap-3">
				<button id="classicModeButton" class="btn btn-primary btn-lg">Classic</button>
				<button id="crazyModeButton" class="btn btn-warning btn-lg">Crazy</button>
				<button id="backFromModeButton" class="btn btn-secondary btn-lg">Back</button>
			</div>
			</div>
			
			<!-- Settings Menu -->
			<div id="settingsMenu" class="position-absolute top-50 start-50 translate-middle p-4 bg-dark bg-opacity-75 rounded shadow" style="display: none; max-width: 400px;">
			<h2 class="text-light mb-4 text-center">Settings</h2>
			<div class="mb-3">
				<label for="player1Color" class="form-label text-light">Player 1 Color:</label>
				<div class="d-flex gap-2">
				<input type="color" class="form-control form-control-color" id="player1Color" value="#4deeea" title="Choose player 1 color">
				<input type="color" class="form-control form-control-color" id="player1Emissive" value="#4deeea" title="Choose player 1 glow">
				</div>
			</div>
			
			<div class="mb-3">
				<label for="player2Color" class="form-label text-light">Player 2 Color:</label>
				<div class="d-flex gap-2">
				<input type="color" class="form-control form-control-color" id="player2Color" value="#ffe700" title="Choose player 2 color">
				<input type="color" class="form-control form-control-color" id="player2Emissive" value="#ffe700" title="Choose player 2 glow">
				</div>
			</div>
			
			<div class="mb-3">
				<label for="ballColor" class="form-label text-light">Ball Color:</label>
				<div class="d-flex gap-2">
				<input type="color" class="form-control form-control-color" id="ballColor" value="#0bff01" title="Choose ball color">
				<input type="color" class="form-control form-control-color" id="ballEmissive" value="#00ff00" title="Choose ball glow">
				</div>
			</div>
			
			<div class="mb-3">
				<label for="ringColor" class="form-label text-light">Ring Color:</label>
				<div class="d-flex gap-2">
				<input type="color" class="form-control form-control-color" id="ringColor" value="#ff0000" title="Choose ring color">
				<input type="color" class="form-control form-control-color" id="ringEmissive" value="#0000ff" title="Choose ring glow">
				</div>
			</div>
			
			<div class="form-check mb-4">
				<input class="form-check-input" type="checkbox" id="showStats">
				<label class="form-check-label text-light" for="showStats">Show Stats</label>
			</div>
			
			<div class="d-flex gap-2 justify-content-center">
				<button id="saveSettingsButton" class="btn btn-success">Save</button>
				<button id="resetSettingsButton" class="btn btn-warning">Reset</button>
				<button id="backFromSettingsButton" class="btn btn-secondary">Back</button>
			</div>
			</div>
			
			<!-- Pause Menu -->
			<div id="pauseMenu" class="position-absolute top-50 start-50 translate-middle text-center p-4 bg-dark bg-opacity-75 rounded shadow" style="display: none;">
			<h2 class="text-light mb-4">Game Paused</h2>
			<div class="d-grid gap-3">
				<button id="resumeButton" class="btn btn-success btn-lg">Resume Game</button>
				<button id="exitButtonPause" class="btn btn-danger btn-lg">Exit Game</button>
			</div>
			</div>
			
			<img id="gameOverImage" src="public/gungeon.png" alt="Game Over" class="position-absolute top-50 start-50 translate-middle" style="display: none;">
</div>
	</div>
	`;

	// Your existing event listeners remain the same

	document
		.getElementById("newGameButton")
		.addEventListener("click", SETTINGS.shownbrOfPlayerMenu);
	document
		.getElementById("settingsButton")
		.addEventListener("click", SETTINGS.showSettingsMenu);
	document
		.getElementById("exitButton")
		.addEventListener("click", SETTINGS.exitGame);
	document
		.getElementById("onePlayerButton")
		.addEventListener("click", SETTINGS.startOnePlayerGame);
	document
		.getElementById("twoPlayerButton")
		.addEventListener("click", SETTINGS.startTwoPlayerGame);
	document
		.getElementById("backButton")
		.addEventListener("click", SETTINGS.showMainMenu);

	document
		.getElementById("classicModeButton")
		.addEventListener("click", SETTINGS.startClassicmode);

	document
		.getElementById("crazyModeButton")
		.addEventListener("click", SETTINGS.startCrazymode);

	document
		.getElementById("backFromModeButton")
		.addEventListener("click", SETTINGS.shownbrOfPlayerMenu);

	document
		.getElementById("saveSettingsButton")
		.addEventListener("click", SETTINGS.saveSettings);
	document
		.getElementById("resetSettingsButton")
		.addEventListener("click", SETTINGS.resetSettings);
	document
		.getElementById("backFromSettingsButton")
		.addEventListener("click", SETTINGS.showMainMenu);
	document
		.getElementById("resumeButton")
		.addEventListener("click", SETTINGS.resumeGame);
	document
		.getElementById("exitButtonPause")
		.addEventListener("click", SETTINGS.exitGame);
	document
		.getElementById("player1Color")
		.addEventListener("input", (event) => {
			state.mat.p1.color.set(event.target.value);
		});

	document
		.getElementById("player1Emissive")
		.addEventListener("input", (event) => {
			state.mat.p1.emissive.set(event.target.value);
		});

	document
		.getElementById("player2Color")
		.addEventListener("input", (event) => {
			state.mat.p2.color.set(event.target.value);
		});

	document
		.getElementById("player2Emissive")
		.addEventListener("input", (event) => {
			state.mat.p2.emissive.set(event.target.value);
		});

	document.getElementById("ballColor").addEventListener("input", (event) => {
		state.mat.ball.color.set(event.target.value);
	});

	document
		.getElementById("ballEmissive")
		.addEventListener("input", (event) => {
			state.mat.ball.emissive.set(event.target.value);
		});

	document.getElementById("ringColor").addEventListener("input", (event) => {
		state.mat.ring.color.set(event.target.value);
	});

	document
		.getElementById("ringEmissive")
		.addEventListener("input", (event) => {
			state.mat.ring.emissive.set(event.target.value);
		});

	document.getElementById("showStats").addEventListener("change", (event) => {
		UTILS.toggleStats(event.target.checked);
	});

	document.getElementById("menu").style.display = "block";

	setTimeout(() => {
		SETUP.setupGame();
		GAME.animate();
	}, 0);

	// Inizializza il renderer di Three.js
	// if (!state.renderer) {
	// 	state.renderer = new THREE.WebGLRenderer({ antialias: true });
	// 	state.renderer.setSize(window.innerWidth, window.innerHeight);
	// }

	// // Inizializza la scena e la camera
	// if (!state.scene) {
	// 	state.scene = new THREE.Scene();
	// }

	// if (!state.camera) {
	// 	state.camera = new THREE.PerspectiveCamera(
	// 		75,
	// 		window.innerWidth / window.innerHeight,
	// 		0.1,
	// 		1000
	// 	);
	// 	state.camera.position.z = 5;
	// }

	// // Aggiungi il canvas di Three.js al DOM
	// const threejsContainer = document.getElementById("threejs-container");
	// if (threejsContainer && state.renderer.domElement) {
	// 	threejsContainer.appendChild(state.renderer.domElement);
	// } else {
	// 	console.error(
	// 		"threejsContainer o state.renderer.domElement non trovato"
	// 	);
	// }
}

// Inizializza il gioco

//Resize handler
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

//Keyboard setup
// document.addEventListener("keydown", function (event) {
// 	if (event.key.toLowerCase() == "w") {
// 		state.p1_move_y = state.player_speed;
// 		state.keys.w = true;
// 	}
// 	if (event.key.toLowerCase() == "s") {
// 		state.p1_move_y = -state.player_speed;
// 		state.keys.s = true;
// 	}
// 	if (event.key == "ArrowUp" && !state.IAisActive) {
// 		state.p2_move_y = state.player_speed;
// 		state.keys.ArrowUp = true;
// 	}
// 	if (event.key == "ArrowDown" && !state.IAisActive) {
// 		state.p2_move_y = -state.player_speed;
// 		state.keys.ArrowDown = true;
// 	}
// 	if (event.key == "Escape" && state.isStarted) {
// 		if (state.isPaused) {
// 			SETTINGS.resumeGame();
// 		} else {
// 			state.isPaused = true;
// 			SETTINGS.showPauseMenu();
// 		}
// 	}
// });

// document.addEventListener("keyup", function (event) {
// 	if (event.key.toLowerCase() == "w") {
// 		state.keys.w = false;
// 		if (state.keys.s) {
// 			state.p1_move_y = -state.player_speed;
// 		} else {
// 			state.p1_move_y = 0;
// 		}
// 	}
// 	if (event.key.toLowerCase() == "s") {
// 		state.keys.s = false;
// 		if (state.keys.w) {
// 			state.p1_move_y = state.player_speed;
// 		} else {
// 			state.p1_move_y = 0;
// 		}
// 	}
// 	if (event.key == "ArrowUp" && !state.IAisActive) {
// 		state.keys.ArrowUp = false;
// 		if (state.keys.ArrowDown) {
// 			state.p2_move_y = -state.player_speed;
// 		} else {
// 			state.p2_move_y = 0;
// 		}
// 	}
// 	if (event.key == "ArrowDown" && !state.IAisActive) {
// 		state.keys.ArrowDown = false;
// 		if (state.keys.ArrowUp) {
// 			state.p2_move_y = state.player_speed;
// 		} else {
// 			state.p2_move_y = 0;
// 		}
// 	}
// });

// document.addEventListener("wheel", function (event) {
// 	state.cam.z += event.deltaY / 10;
// 	state.camera.position.set(state.cam.x, state.cam.y, state.cam.z);
// });

// document.addEventListener("mousemove", function (event) {
// 	if (state.renderer && state.renderer.domElement) {
// 		const rect = state.renderer.domElement.getBoundingClientRect();
// 		const mouse = {
// 			x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
// 			y: -((event.clientY - rect.top) / rect.height) * 2 + 1,
// 		};
// 		// console.log(mouse);
// 	}
// });
