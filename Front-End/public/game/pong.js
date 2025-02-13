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
  document.querySelector(".App").innerHTML = `
		<div class="gamecontainer">
		<div id="menu">
			<button id="newGameButton">New Game</button>
			<button id="settingsButton">Settings</button>
			<button id="exitButton">Exit</button>
		</div>
		<div id="gameModeMenu" style="display: none;">
			<button id="onePlayerButton">1 Player</button>
			<button id="twoPlayerButton">2 Player</button>
			<button id="backButton">Back</button>
		</div>
		<div id="settingsMenu" style="display: none;">
			<div class="color-setting">
				<label for="player1Color">Player 1 Color:</label>
				<div class="color-pickers">
					<input type="color" id="player1Color" name="player1Color" value="#4deeea">
					<input type="color" id="player1Emissive" name="player1Emissive" value="#4deeea">
				</div>
			</div>
			<div class="color-setting">
				<label for="player2Color">Player 2 Color:</label>
				<div class="color-pickers">
					<input type="color" id="player2Color" name="player2Color" value="#ffe700">
					<input type="color" id="player2Emissive" name="player2Emissive" value="#ffe700">
				</div>
			</div>
			<div class="color-setting">
				<label for="ballColor">Ball Color:</label>
				<div class="color-pickers">
					<input type="color" id="ballColor" name="ballColor" value="#0bff01">
					<input type="color" id="ballEmissive" name="ballEmissive" value="#00ff00">
				</div>
			</div>
			<div class="color-setting">
				<label for="ringColor">Ring Color:</label>
				<div class="color-pickers">
					<input type="color" id="ringColor" name="ringColor" value="#ff0000">
					<input type="color" id="ringEmissive" name="ringEmissive" value="#0000ff">
				</div>
			</div>
			<div class="color-setting">
				<label for="showStats">Show Stats:</label>
				<input type="checkbox" id="showStats" name="showStats">
			</div>
			<button id="saveSettingsButton">Save</button>
			<button id="resetSettingsButton">Reset</button>
			<button id="backFromSettingsButton">Back</button>
		</div>
		<div id="pauseMenu" style="display: none;">
			<button id="resumeButton">Resume Game</button>
			<button id="exitButtonPause">Exit</button>
		</div>
		<img id="gameOverImage" src="public/gungeon.png" alt="Game Over" style="display: none;">
		<script type="module" src="/main.js"></script>
	</div>
	`;

  document
    .getElementById("newGameButton")
    .addEventListener("click", SETTINGS.showGameModeMenu);
  document
    .getElementById("settingsButton")
    .addEventListener("click", SETTINGS.showSettingsMenu);
  document.getElementById("exitButton").addEventListener("click", SETTINGS.exitGame);
  document
    .getElementById("onePlayerButton")
    .addEventListener("click", SETTINGS.startOnePlayerGame);
  document
    .getElementById("twoPlayerButton")
    .addEventListener("click", SETTINGS.startTwoPlayerGame);
  document.getElementById("backButton").addEventListener("click", SETTINGS.showMainMenu);
  document
    .getElementById("saveSettingsButton")
    .addEventListener("click", SETTINGS.saveSettings);
  document
    .getElementById("resetSettingsButton")
    .addEventListener("click", SETTINGS.resetSettings);
  document
    .getElementById("backFromSettingsButton")
    .addEventListener("click", SETTINGS.showMainMenu);
  document.getElementById("resumeButton").addEventListener("click", SETTINGS.resumeGame);
  document
    .getElementById("exitButtonPause")
    .addEventListener("click", SETTINGS.exitGame);
  document.getElementById("player1Color").addEventListener("input", (event) => {
    state.mat.p1.color.set(event.target.value);
  });

  document
    .getElementById("player1Emissive")
    .addEventListener("input", (event) => {
      state.mat.p1.emissive.set(event.target.value);
    });

  document.getElementById("player2Color").addEventListener("input", (event) => {
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

  document.getElementById("ballEmissive").addEventListener("input", (event) => {
    state.mat.ball.emissive.set(event.target.value);
  });

  document.getElementById("ringColor").addEventListener("input", (event) => {
    state.mat.ring.color.set(event.target.value);
  });

  document.getElementById("ringEmissive").addEventListener("input", (event) => {
    state.mat.ring.emissive.set(event.target.value);
  });

  document.getElementById("showStats").addEventListener("change", (event) => {
    UTILS.toggleStats(event.target.checked);
  });

  document.getElementById("menu").style.display = "block";
}

SETUP.setupGame();
GAME.animate();
// requestAnimationFrame(GAME.animate);

//Resize handler

window.addEventListener("resize", () => {
  state.camera.aspect = window.innerWidth / window.innerHeight;
  state.camera.updateProjectionMatrix();
  state.renderer.setSize(window.innerWidth, window.innerHeight);
});

//Keyboard setup

document.addEventListener("keydown", function (event) {
	if (event.key.toLowerCase() == "w"){
		state.p1_move_y = state.player_speed
		state.keys.w = true;
	}
  	if (event.key.toLowerCase() == "s")
	{
		state.p1_move_y = -state.player_speed;
		state.keys.s = true;
	}
	if (event.key == "ArrowUp" && !state.IAisActive)
	{
    	state.p2_move_y = state.player_speed;
		state.keys.ArrowUp = true;
	}
	if (event.key == "ArrowDown" && !state.IAisActive)
	{
		state.p2_move_y = -state.player_speed;
		state.keys.ArrowDown = true;
	}
	if (event.key == "Escape" && state.isStarted) {
    	if (state.isPaused) {
    		SETTINGS.resumeGame();
    	} else {
    	state.isPaused = true;
    	SETTINGS.showPauseMenu();
    	}
  	}
});

document.addEventListener("keyup", function (event) {
if (event.key.toLowerCase() == "w") {
	state.keys.w = false;
	if (state.keys.s) {
		state.p1_move_y = -state.player_speed;
	} else {
		state.p1_move_y = 0;
	}
}
if (event.key.toLowerCase() == "s") {
	state.keys.s = false;
	if (state.keys.w) {
		state.p1_move_y = state.player_speed;
	} else {
		state.p1_move_y = 0;
	}
}
if (event.key == "ArrowUp" && !state.IAisActive) {
	state.keys.ArrowUp = false;
	if (state.keys.ArrowDown) {
		state.p2_move_y = -state.player_speed;
	} else {
		state.p2_move_y = 0;
	}
}
if (event.key == "ArrowDown" && !state.IAisActive) {
	state.keys.ArrowDown = false;
	if (state.keys.ArrowUp) {
		state.p2_move_y = state.player_speed;
	} else {
		state.p2_move_y = 0;
	}
}
});

document.addEventListener("wheel", function (event) {
  state.cam.z += event.deltaY / 10;
  state.camera.position.set(state.cam.x, state.cam.y, state.cam.z);
});

document.addEventListener("mousemove", function (event) {
  const rect = state.renderer.domElement.getBoundingClientRect();
  const mouse = {
    x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
    y: -((event.clientY - rect.top) / rect.height) * 2 + 1,
  };
  // console.log(mouse);
});


