import * as THREE from "three";
import { state } from "./state.js";
import * as SETTINGS from "./settings.js";

export function game_over() {
	state.isStarted = false;
	state.isPaused = true;

	const winner = state.p1_score >= state.maxScore ? "Player 1" : "Player 2";

	// Show game over menu
	SETTINGS.showGameOverMenu(winner);

	// Send game over signal to guest if in WebRTC multiplayer mode
	if (state.isMultiplayer && state.isWebRTC && state.webrtcConnection && state.isHost) {
		state.webrtcConnection.sendGameEvent('game_over', {
			winner: winner,
			p1_score: state.p1_score,
			p2_score: state.p2_score,
			timestamp: Date.now()
		});
		console.log('🏁 Game over signal sent to guest:', winner);
	}
}
