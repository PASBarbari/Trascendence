import * as THREE from "three";
import { state } from "./state.js";
import { updateScore } from "./src/Score.js";
import { initializeAI, cleanupAI } from "./ai.js";

export {
	showMainMenu,
	shownbrOfPlayerMenu,
	showSettingsMenu,
	showPauseMenu,
	hidePauseMenu,
	showAIDifficultyMenu,
	startOnePlayerGame,
	startTwoPlayerGame,
	resumeGame,
	exitGame,
	saveSettings,
	resetSettings,
	showGameOverMenu,
	restartGame,
	restartMenu,
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
	document.getElementById("ballColor").value = "#8c5fb3";
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

function showAIDifficultyMenu() {
	document.getElementById("nbrOfPlayerMenu").style.display = "none";
	document.getElementById("aiDifficultyMenu").style.display = "block";
	document.getElementById("menu").style.display = "none";
	document.getElementById("settingsMenu").style.display = "none";
	document.getElementById("pauseMenu").style.display = "none";
}

function startOnePlayerGame(difficulty = "medium") {
	console.log(`🎮 Starting single player game with ${difficulty} AI`);

	// Hide all menus
	document.getElementById("nbrOfPlayerMenu").style.display = "none";
	// document.getElementById("aiDifficultyMenu").style.display = "none";
	document.getElementById("menu").style.display = "none";

	// Initialize AI with selected difficulty
	initializeAI(difficulty);

	if (typeof window.initializeMobileControls === 'function') {
		window.initializeMobileControls();
	}

	state.IAisActive = true;
	state.isStarted = true;
	state.isPaused = false;
}

function startTwoPlayerGame() {
	document.getElementById("nbrOfPlayerMenu").style.display = "none";
	state.IAisActive = false;
	state.isStarted = true;
	state.isPaused = false;
	
	// Initialize mobile controls if on touch device
	if (typeof window.initializeMobileControls === 'function') {
		window.initializeMobileControls();
	}
}

function resumeGame() {
	hidePauseMenu();
	state.isPaused = false;
	// GAME.animate();
}

export function cleanupPong() {
	console.log("Starting complete cleanup...");

	// Remove mobile controls first
	if (typeof window.removeMobileControls === 'function') {
		window.removeMobileControls();
	}

	resetPongMenuState();
	cleanupAI();

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
	
	if (window.pongKeydownHandler) {
		document.removeEventListener("keydown", window.pongKeydownHandler);
		window.pongKeydownHandler = null;
	}
	if (window.pongKeyupHandler) {
		document.removeEventListener("keyup", window.pongKeyupHandler);
		window.pongKeyupHandler = null;
	}

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

	// Hide mobile controls
	if (typeof window.hideMobileControls === 'function') {
		window.hideMobileControls();
	}

	cleanupPong();

	// Uncomment this to navigate to home
	window.navigateTo("#home");

	// Or use this to show main menu
	// showMainMenu();
}

function showGameOverMenu(winner) {
	// Hide other menus
	if (!state.IsMultiplayer){
	document.getElementById("menu").style.display = "none";
	document.getElementById("pauseMenu").style.display = "none";
	document.getElementById("settingsMenu").style.display = "none";
	document.getElementById("nbrOfPlayerMenu").style.display = "none";
	}

	// Update winner text
	document.getElementById(
		"winnerAnnouncement"
	).textContent = `${winner} Wins!`;

	// Show game over menu
	document.getElementById("gameOverMenu").style.display = "block";
}

// Add this function to restart the game with current settings
function resetGame() {
	// Hide game over menu
	document.getElementById("gameOverMenu").style.display = "none";

	// Reset scores and positions but keep other settings
	state.p1_score = 0;
	state.p2_score = 0;

	updateScore("p1");
	updateScore("p2");

	if (state.players[0] && state.players[0].mesh) {
		state.players[0].mesh.position.set(
			-((state.ring.length * 2) / 5),
			0,
			0
		);
	}

	if (state.players[1] && state.players[1].mesh) {
		state.players[1].mesh.position.set((state.ring.length * 2) / 5, 0, 0);
	}

	if (state.ball && state.ball.mesh) {
		state.ball.mesh.position.set(0, 0, 0);
		state.ball.resetSpeed();
	}

	// Start the game with current settings
}

function resetPongMenuState() {
    // Reset solo le variabili di stato, non il DOM
    state.p1_score = 0;
    state.p2_score = 0;
    state.isStarted = false;
    state.isPaused = true;
    state.IAisActive = false;
    
    // DOM reset solo se siamo sicuri che esista
    if (document.getElementById("menu")) {
        showMainMenu();
    }
}

function restartMenu() {
	// Hide game over menu
	document.getElementById("gameOverMenu").style.display = "none";
	// Show main menu
	showMainMenu();
	resetGame();
}

function restartGame() {
	resetGame();
	state.isStarted = true;
	state.isPaused = false;
}
