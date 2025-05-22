import * as THREE from "three";
import { state } from "./state.js";
import { createScore } from "./utils.js";
import Stats from "three/addons/libs/stats.module.js";
import * as UTILS from "./utils.js";
import * as GAME from "./gameLogic.js";

export {
	showMainMenu,
	shownbrOfPlayerMenu,
	showSettingsMenu,
	showPauseMenu,
	hidePauseMenu,
	startOnePlayerGame,
	startTwoPlayerGame,
	resumeGame,
	exitGame,
	saveSettings,
	resetSettings,
	startCrazymode,
	startClassicmode,
};

function saveSettings() {
	const player1Color = document.getElementById("player1Color").value;
	const player2Color = document.getElementById("player2Color").value;
	const ballColor = document.getElementById("ballColor").value;
	const ringColor = document.getElementById("ringColor").value;
	const planeColor = document.getElementById("planeColor").value;

	state.mat.p1.color.set(player1Color);
	state.mat.p2.color.set(player2Color);
	state.mat.ball.color.set(ballColor);
	state.mat.ring.color.set(ringColor);
	state.mat.plane.color.set(planeColor);

	showMainMenu();
}

function resetSettings() {
	document.getElementById("player1Color").value = "#4deeea";
	document.getElementById("player2Color").value = "#4deeea";
	document.getElementById("ballColor").value = "#ff2b2b";
	document.getElementById("ringColor").value = "#ffe700";
	document.getElementById("planeColor").value = "#089c00";

	state.mat.p1.color.set("#4deeea");
	state.mat.p2.color.set("#4deeea");
	state.mat.ball.color.set("#8c5fb3");
	state.mat.ring.color.set("#ffe700");
	state.mat.plane.color.set("#089c00");
}

function shownbrOfPlayerMenu() {
	document.getElementById("menu").style.display = "none";
	document.getElementById("modeMenu").style.display = "none";
	document.getElementById("nbrOfPlayerMenu").style.display = "block";
}

function showMainMenu() {
	document.getElementById("nbrOfPlayerMenu").style.display = "none";
	document.getElementById("settingsMenu").style.display = "none";
	document.getElementById("pauseMenu").style.display = "none";
	document.getElementById("menu").style.display = "block";
}

function showSettingsMenu() {
	document.getElementById("menu").style.display = "none";
	document.getElementById("settingsMenu").style.display = "block";
}

function showPauseMenu() {
	document.getElementById("pauseMenu").style.display = "block";
}

function hidePauseMenu() {
	document.getElementById("pauseMenu").style.display = "none";
}

function startOnePlayerGame() {
	document.getElementById("nbrOfPlayerMenu").style.display = "none";
	document.getElementById("modeMenu").style.display = "block";
	state.IAisActive = true;
}

function startTwoPlayerGame() {
	document.getElementById("nbrOfPlayerMenu").style.display = "none";
	document.getElementById("modeMenu").style.display = "block";
	state.IAisActive = false;
}

function startCrazymode() {
	document.getElementById("modeMenu").style.display = "none";
	// UTILS.restart_game();
	state.isStarted = true;
	state.isPaused = false;
	state.spawnPowerUpFlag = true;
	// GAME.animate();
}

function startClassicmode() {
	document.getElementById("modeMenu").style.display = "none";
	// UTILS.restart_game();
	state.isStarted = true;
	state.isPaused = false;
	state.spawnPowerUpFlag = true;
	// GAME.animate();
}

function resumeGame() {
	hidePauseMenu();
	state.isPaused = false;
	// GAME.animate();
}

export function cleanupPong() {
	console.log("Starting complete cleanup...");

	// 1. Dispose all meshes in the game group
	if (state.game) {
		console.log(
			`Cleaning game group with ${state.game.children.length} objects`
		);
		while (state.game.children.length > 0) {
			const obj = state.game.children[0];
			state.game.remove(obj);

			if (obj.geometry) obj.geometry.dispose();

			if (obj.material) {
				if (Array.isArray(obj.material)) {
					obj.material.forEach((mat) => mat.dispose());
				} else {
					obj.material.dispose();
				}
			}
		}
	}

	// 2. Dispose all scene objects
	if (state.scene) {
		console.log(
			`Cleaning scene with ${state.scene.children.length} objects`
		);
		while (state.scene.children.length > 0) {
			const obj = state.scene.children[0];
			state.scene.remove(obj);

			// Skip disposing game since we already handled it
			if (obj === state.game) continue;

			// Dispose if it's a mesh
			if (obj.isMesh) {
				if (obj.geometry) obj.geometry.dispose();

				if (obj.material) {
					if (Array.isArray(obj.material)) {
						obj.material.forEach((mat) => mat.dispose());
					} else {
						obj.material.dispose();
					}
				}
			}
		}
	}

	// 3. Remove renderer from DOM
	if (state.renderer) {
		const container = document.getElementById("threejs-container");
		if (
			container &&
			state.renderer.domElement &&
			container.contains(state.renderer.domElement)
		) {
			container.removeChild(state.renderer.domElement);
		}
		state.renderer.dispose();
		state.renderer = null;
	}

	// 4. Remove event listeners
	window.removeEventListener("resize", state.onWindowResize);

	// 5. Cancel animation frame if active
	if (state.animationFrameId) {
		cancelAnimationFrame(state.animationFrameId);
		state.animationFrameId = null;
	}

	// 6. Reset state variables
	state.ball = null;
	state.players = [];
	state.p1_score = 0;
	state.p2_score = 0;
	state.isStarted = false;
	state.game = new THREE.Group(); // Create fresh game group

	console.log("Cleanup complete");
}

function exitGame() {
	state.isStarted = false;
	state.isPaused = true;
	state.IAisActive = false;

	cleanupPong();

	// Uncomment this to navigate to home
	window.navigateTo("#home");

	// Or use this to show main menu
	// showMainMenu();
}
