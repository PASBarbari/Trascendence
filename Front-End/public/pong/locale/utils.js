import { state } from "./state.js";
import * as SETTINGS from "./settings.js";

export function game_over() {
	state.isStarted = false;
	state.isPaused = true;

	const winner = state.p1_score >= state.maxScore ? "Player 1" : "Player 2";

	// Show game over menu instead of main menu
	SETTINGS.showGameOverMenu(winner);
}
