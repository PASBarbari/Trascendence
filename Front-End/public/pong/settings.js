import * as THREE from "three";
import { state } from "./state.js";
import { createScore } from "./utils.js";
import Stats from "three/addons/libs/stats.module.js";
import * as UTILS from "./utils.js";
import * as GAME from "./gameLogic.js";
import { socket } from "./serverSide.js"; // Import the socket

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
	const player1Emissive = document.getElementById("player1Emissive").value;
	const player2Color = document.getElementById("player2Color").value;
	const player2Emissive = document.getElementById("player2Emissive").value;
	const ballColor = document.getElementById("ballColor").value;
	const ballEmissive = document.getElementById("ballEmissive").value;
	const ringColor = document.getElementById("ringColor").value;
	const ringEmissive = document.getElementById("ringEmissive").value;

	state.mat.p1.color.set(player1Color);
	state.mat.p1.emissive.set(player1Emissive);
	state.mat.p2.color.set(player2Color);
	state.mat.p2.emissive.set(player2Emissive);
	state.mat.ball.color.set(ballColor);
	state.mat.ball.emissive.set(ballEmissive);
	state.mat.ring.color.set(ringColor);
	state.mat.ring.emissive.set(ringEmissive);

	showMainMenu();
}

function resetSettings() {
	document.getElementById("player1Color").value = "#4deeea";
	document.getElementById("player1Emissive").value = "#4deeea";
	document.getElementById("player2Color").value = "#ffe700";
	document.getElementById("player2Emissive").value = "#ffe700";
	document.getElementById("ballColor").value = "#0bff01";
	document.getElementById("ballEmissive").value = "#0bff01";
	document.getElementById("ringColor").value = "#ff0000";
	document.getElementById("ringEmissive").value = "#0000ff";

	state.mat.p1.color.set("#4deeea");
	state.mat.p1.emissive.set("#4deeea");
	state.mat.p2.color.set("#ffe700");
	state.mat.p2.emissive.set("#ffe700");
	state.mat.ball.color.set("#0bff01");
	state.mat.ball.emissive.set("#0bff01");
	state.mat.ring.color.set("#ff0000");
	state.mat.ring.emissive.set("#0000ff");
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
	UTILS.restart_game();
	state.isStarted = true;
	state.isPaused = false;
	state.spawnPowerUpFlag = true;
	// Send a message to the backend indicating that both players are ready
	if (socket && socket.readyState === WebSocket.OPEN) {
		console.log("Sending player_ready message to the server");
		socket.send(
			JSON.stringify({
				type: "player_ready",
				player: 0,
			})
		);
		socket.send(
			JSON.stringify({
				type: "player_ready",
				player: 1,
			})
		);
		socket.send(
			JSON.stringify({
				type: "game_init",
				ring_length: state.ring.length,
				ring_height: state.ring.height,
				ring_width: state.ring.width,
				ring_thickness: state.ring.thickness,
				p_length: state.player.length,
				p_width: state.player.width,
				p_height: state.player.height,
				ball_radius: state.ball_radius,
				player_1_pos: [state.p1.position.x, state.p1.position.y],
				player_2_pos: [state.p2.position.x, state.p2.position.y],
				p_speed: state.player.speed,
				ball_speed: state.ball_speed,
			})
		);
	} else {
		console.error("Socket is not open. Cannot send player_ready message.");
	}
}

function startClassicmode() {
	document.getElementById("modeMenu").style.display = "none";
	UTILS.restart_game();
	state.isStarted = true;
	state.isPaused = false;
	state.spawnPowerUpFlag = false;
	// Send a message to the backend indicating that both players are ready
	if (socket && socket.readyState === WebSocket.OPEN) {
		console.log("Sending player_ready message to the server");
		socket.send(
			JSON.stringify({
				type: "player_ready",
				player: 0,
			})
		);
		socket.send(
			JSON.stringify({
				type: "player_ready",
				player: 1,
			})
		);
		socket.send(
			JSON.stringify({
				type: "game_init",
				ring_length: state.ring.length,
				ring_height: state.ring.height,
				ring_width: state.ring.width,
				ring_thickness: state.ring.thickness,
				p_length: state.player.length,
				p_width: state.player.width,
				p_height: state.player.height,
				ball_radius: state.ball_radius,
				ball_speed: state.ball_speed,
				player_1_pos: [state.p1.position.x, state.p1.position.y],
				player_2_pos: [state.p2.position.x, state.p2.position.y],
			})
		);
	} else {
		console.error("Socket is not open. Cannot send player_ready message.");
	}
}

function resumeGame() {
	hidePauseMenu();
	state.isPaused = false;
	GAME.serverAnimate();
}

function exitGame() {
	state.isStarted = false;
	state.isPaused = true;
	state.IAisActive = false;
	showMainMenu();
	UTILS.restart_game();
}
