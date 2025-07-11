import * as THREE from "three";
import { state } from "./state.js";
import { updateScore } from "./src/Score.js";

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
	showGameOverMenu,
	resetGame,
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

function startOnePlayerGame() {
	document.getElementById("nbrOfPlayerMenu").style.display = "none";
	state.IAisActive = true;
	state.isStarted = true;
	state.isPaused = false;
}

function startTwoPlayerGame() {
	document.getElementById("nbrOfPlayerMenu").style.display = "none";
	state.IAisActive = false;
	state.isStarted = true;
	state.isPaused = false;
}

function resumeGame() {
	hidePauseMenu();
	state.isPaused = false;
	// GAME.animate();
}

export function cleanupPong() {
	resetPongMenuState();

	// 1. Dispose all meshes in the game group
	if (state.game) {
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

	// Remove ResizeObserver
	if (state.resizeObserver) {
		state.resizeObserver.disconnect();
		state.resizeObserver = null;
	}

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

function showGameOverMenu(winner) {
	// Hide other menus with null checks
	const menu = document.getElementById("menu");
	const pauseMenu = document.getElementById("pauseMenu");
	const settingsMenu = document.getElementById("settingsMenu");
	const nbrOfPlayerMenu = document.getElementById("nbrOfPlayerMenu");

	if (menu) menu.style.display = "none";
	if (pauseMenu) pauseMenu.style.display = "none";
	if (settingsMenu) settingsMenu.style.display = "none";
	if (nbrOfPlayerMenu) nbrOfPlayerMenu.style.display = "none";

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

	// Reset game state
	resetGame();

	// Navigate to home instead of showing main menu
	window.navigateTo('#home');
}

function restartGame() {
	// If we're a guest in WebRTC mode, request rematch from host
	if (state.isMultiplayer && state.isWebRTC && state.webrtcConnection && !state.isHost) {
		state.webrtcConnection.sendGameEvent('rematch_request', {
			timestamp: Date.now()
		});
		console.log('🔄 Rematch request sent to host');
		return;
	}

	// If we're host or single player, restart locally
	resetGame();
	state.isStarted = true;
	state.isPaused = false;

	// Send rematch signal to guest if in WebRTC multiplayer mode
	if (state.isMultiplayer && state.isWebRTC && state.webrtcConnection && state.isHost) {
		state.webrtcConnection.sendGameEvent('rematch', {
			p1_score: state.p1_score,
			p2_score: state.p2_score,
			timestamp: Date.now()
		});
		console.log('🔄 Rematch signal sent to guest');
	}
}
