import * as THREE from "three";
import { FontLoader } from "three/addons/loaders/FontLoader.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import { Group, remove } from "three/addons/libs/tween.module.js";
import { state } from "./state.js";
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
	link.href = "/pong/locale/pong.css";
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

			<!-- AI Difficulty Selection Menu >
        <div id="aiDifficultyMenu" class="position-absolute top-50 start-50 translate-middle text-center p-4 bg-dark bg-opacity-75 rounded shadow" style="display: none;">
          <h2 class="text-light mb-4">Select AI Difficulty</h2>
          <div class="d-grid gap-3">
              <button id="easyButton" class="btn btn-success btn-lg">
                  <strong>Easy</strong><br>
                  <small>Learning to Play</small>
              </button>
              <button id="mediumButton" class="btn btn-warning btn-lg">
                  <strong>Medium</strong><br>
                  <small>Casual Player</small>
              </button>
              <button id="hardButton" class="btn btn-danger btn-lg">
                  <strong>Hard</strong><br>
                  <small>Experienced Player</small>
              </button>
              <button id="expertButton" class="btn btn-dark btn-lg">
                  <strong>Expert</strong><br>
                  <small>Tournament Level</small>
              </button>
              <button id="backFromAIButton" class="btn btn-secondary btn-lg">Back</button>
        </div>
      </div-->

			<!-- Settings Menu -->
			<div id="settingsMenu" class="position-absolute top-50 start-50 translate-middle p-4 bg-dark bg-opacity-75 rounded shadow" style="display: none; max-width: 400px;">
			<h2 class="text-light mb-4 text-center">Settings</h2>
			<div class="mb-3">
				<label for="player1Color" class="form-label text-light">Player 1 Color:</label>
				<div class="d-flex gap-2">
				<input type="color" class="form-control form-control-color" id="player1Color" value="#4deeea" title="Choose player 1 color">
				</div>
			</div>
			
			<div class="mb-3">
				<label for="player2Color" class="form-label text-light">Player 2 Color:</label>
				<div class="d-flex gap-2">
				<input type="color" class="form-control form-control-color" id="player2Color" value="#4deeea" title="Choose player 2 color">
				</div>
			</div>
			
			<div class="mb-3">
				<label for="ballColor" class="form-label text-light">Ball Color:</label>
				<div class="d-flex gap-2">
				<input type="color" class="form-control form-control-color" id="ballColor" value="#8c5fb3" title="Choose ball color">
				</div>
			</div>
			
			<div class="mb-3">
				<label for="ringColor" class="form-label text-light">Ring Color:</label>
				<div class="d-flex gap-2">
				<input type="color" class="form-control form-control-color" id="ringColor" value="#ffe700" title="Choose ring color">
				</div>
			</div>

			<div class="mb-3">
				<label for="planeColor" class="form-label text-light">Plane Color:</label>
				<div class="d-flex gap-2">
				<input type="color" class="form-control form-control-color" id="planeColor" value="#089c00" title="Choose plane color">
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
			
			<div id="pauseMenu" class="position-absolute top-50 start-50 translate-middle text-center p-4 bg-dark bg-opacity-75 rounded shadow" style="display: none;">
			<h2 class="text-light mb-4">Game Paused</h2>
			<div class="d-grid gap-3">
				<button id="resumeButton" class="btn btn-success btn-lg">Resume Game</button>
				<button id="exitButtonPause" class="btn btn-danger btn-lg">Exit Game</button>
			</div>
			</div>

			<div id="gameOverMenu" class="position-absolute top-50 start-50 translate-middle text-center p-4 bg-dark bg-opacity-75 rounded shadow" style="display: none;">
  			<h2 class="text-light mb-3">Game Over</h2>
  			<h3 id="winnerAnnouncement" class="text-warning mb-4">Player 1 Wins!</h3>
 			<div class="d-grid gap-3">
				<button id="restartGameButton" class="btn btn-success btn-lg">Rematch</button>
				<button id="mainMenuButton" class="btn btn-primary btn-lg">Back to Main Menu</button>
			</div>
			</div>
		</div>
	</div>
	`;

	document.addEventListener("keydown", pongKeyDownHandler);
    document.addEventListener("keyup", pongKeyUpHandler);
    
    window.pongKeyDownHandler = pongKeyDownHandler;
    window.pongKeyUpHandler = pongKeyUpHandler;

	document
		.getElementById("newGameButton")
		.addEventListener("click", SETTINGS.shownbrOfPlayerMenu);
	document
		.getElementById("settingsButton")
		.addEventListener("click", SETTINGS.showSettingsMenu);
	document
		.getElementById("exitButton")
		.addEventListener("click", SETTINGS.exitGame);
	// document
	// 	.getElementById("onePlayerButton")
	// 	.addEventListener("click", SETTINGS.startOnePlayerGame);
	// Updated one player button to show difficulty menu

	// document.getElementById("onePlayerButton").addEventListener("click", () => {
	// 	SETTINGS.showAIDifficultyMenu();
	// });
	document.getElementById("onePlayerButton").addEventListener("click", () => {
			SETTINGS.startOnePlayerGame("medium");
	});
		// AI Difficulty selection buttons
		// document.getElementById("easyButton").addEventListener("click", () => {
		// 	SETTINGS.startOnePlayerGame("easy");
		// });
		// document.getElementById("mediumButton").addEventListener("click", () => {
		// 	SETTINGS.startOnePlayerGame("medium");
		// });
		// document.getElementById("hardButton").addEventListener("click", () => {
		// 	SETTINGS.startOnePlayerGame("hard");
		// });
		// document.getElementById("expertButton").addEventListener("click", () => {
		// 	SETTINGS.startOnePlayerGame("expert");
		// });
		// document
		// 	.getElementById("backFromAIButton")
		// 	.addEventListener("click", () => {
		// 		SETTINGS.shownbrOfPlayerMenu();
		// 	});

	document
		.getElementById("twoPlayerButton")
		.addEventListener("click", SETTINGS.startTwoPlayerGame);
	document
		.getElementById("backButton")
		.addEventListener("click", SETTINGS.showMainMenu);

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
		.getElementById("player2Color")
		.addEventListener("input", (event) => {
			state.mat.p2.color.set(event.target.value);
		});
	document.getElementById("ballColor").addEventListener("input", (event) => {
		state.mat.ball.color.set(event.target.value);
	});

	document.getElementById("ringColor").addEventListener("input", (event) => {
		state.mat.ring.color.set(event.target.value);
	});

	document.getElementById("planeColor").addEventListener("input", (event) => {
		state.mat.plane.color.set(event.target.value);
	});

	document.getElementById("showStats").addEventListener("change", (event) => {
		UTILS.toggleStats(event.target.checked);
	});

	document
		.getElementById("restartGameButton")
		.addEventListener("click", SETTINGS.restartGame);

	document
		.getElementById("mainMenuButton")
		.addEventListener("click", SETTINGS.restartMenu);

	document.getElementById("menu").style.display = "block";

	setTimeout(() => {
		SETUP.setupGame();
		GAME.animate();
	}, 100);
}

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


function pongKeyDownHandler(event) {
	if (!event || !event.key) return;
	if (event.key.toLowerCase() == "s") {
		state.p1_move_y = state.player_speed;
		state.keys.s = true;
	}
	if (event.key.toLowerCase() == "w") {
		state.p1_move_y = -state.player_speed;
		state.keys.w = true;
	}
	if (event.key == "ArrowDown" && !state.IAisActive) {
		state.p2_move_y = state.player_speed;
		state.keys.ArrowDown = true;
	}
	if (event.key == "ArrowUp" && !state.IAisActive) {
		state.p2_move_y = -state.player_speed;
		state.keys.ArrowUp = true;
	}
	if (event.key == "Escape" && state.isStarted) {
		if (state.isPaused) {
			SETTINGS.resumeGame();
		} else {
			state.isPaused = true;
			SETTINGS.showPauseMenu();
		}
	}
}

function pongKeyUpHandler(event) {
	if (!event || !event.key) return;
	if (event.key.toLowerCase() == "s") {
		state.keys.s = false;
		if (state.keys.w) {
			state.p1_move_y = -state.player_speed;
		} else {
			state.p1_move_y = 0;
		}
	}
	if (event.key.toLowerCase() == "w") {
		state.keys.w = false;
		if (state.keys.s) {
			state.p1_move_y = state.player_speed;
		} else {
			state.p1_move_y = 0;
		}
	}
	if (event.key == "ArrowDown" && !state.IAisActive) {
		state.keys.ArrowDown = false;
		if (state.keys.ArrowUp) {
			state.p2_move_y = -state.player_speed;
		} else {
			state.p2_move_y = 0;
		}
	}
	if (event.key == "ArrowUp" && !state.IAisActive) {
		state.keys.ArrowUp = false;
		if (state.keys.ArrowDown) {
			state.p2_move_y = state.player_speed;
		} else {
			state.p2_move_y = 0;
		}
	}
}

// Keyboard setup
// document.addEventListener("keydown", function (event) {
// 	if (event.key.toLowerCase() == "s") {
// 		state.p1_move_y = state.player_speed;
// 		state.keys.s = true;
// 	}
// 	if (event.key.toLowerCase() == "w") {
// 		state.p1_move_y = -state.player_speed;
// 		state.keys.w = true;
// 	}
	// if (event.key == "ArrowDown" && !state.IAisActive) {
	// 	state.p2_move_y = state.player_speed;
	// 	state.keys.ArrowDown = true;
	// }
	// if (event.key == "ArrowUp" && !state.IAisActive) {
	// 	state.p2_move_y = -state.player_speed;
	// 	state.keys.ArrowUp = true;
	// }
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
// 	if (event.key.toLowerCase() == "s") {
// 		state.keys.s = false;
// 		if (state.keys.w) {
// 			state.p1_move_y = -state.player_speed;
// 		} else {
// 			state.p1_move_y = 0;
// 		}
// 	}
// 	if (event.key.toLowerCase() == "w") {
// 		state.keys.w = false;
// 		if (state.keys.s) {
// 			state.p1_move_y = state.player_speed;
// 		} else {
// 			state.p1_move_y = 0;
// 		}
// 	}
// 	if (event.key == "ArrowDown" && !state.IAisActive) {
// 		state.keys.ArrowDown = false;
// 		if (state.keys.ArrowUp) {
// 			state.p2_move_y = -state.player_speed;
// 		} else {
// 			state.p2_move_y = 0;
// 		}
// 	}
// 	if (event.key == "ArrowUp" && !state.IAisActive) {
// 		state.keys.ArrowUp = false;
// 		if (state.keys.ArrowDown) {
// 			state.p2_move_y = state.player_speed;
// 		} else {
// 			state.p2_move_y = 0;
// 		}
// 	}
// });
