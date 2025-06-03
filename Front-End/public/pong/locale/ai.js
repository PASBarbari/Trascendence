import { state } from "./state.js";

// Simple frame counter for debug logging
let frameCounter = 0;

export function moveIA() {
	const ai = state.players[1];
	const ball = state.ball;

	// Increment frame counter
	frameCounter++;

	// If AI or ball don't exist, exit early
	if (!ai || !ai.mesh || !ball || !ball.mesh) return;

	// Get current positions
	const aiZ = ai.mesh.position.z;
	const ballZ = ball.mesh.position.z;

	// Calculate move distance
	const moveDistance = ballZ - aiZ;

	// Limit by player speed
	let moveAmount = 0;
	if (Math.abs(moveDistance) > state.player_speed) {
		moveAmount = Math.sign(moveDistance) * state.player_speed;
	} else {
		moveAmount = moveDistance;
	}

	// Log movement occasionally
	if (frameCounter % 30 === 0) {
		console.log("AI following ball:", {
			ballZ: ballZ,
			aiZ: aiZ,
			moveAmount: moveAmount,
		});
	}

	// Apply movement (this handles boundaries internally)
	ai.move(moveAmount);
}
