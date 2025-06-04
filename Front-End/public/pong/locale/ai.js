import { state } from "./state.js";

let frameCounter = 0;

export function moveIA() {
	const ai = state.players[1];
	const ball = state.ball;

	frameCounter++;
	if (!ai || !ai.mesh || !ball || !ball.mesh) return;
	const aiZ = ai.mesh.position.z;
	const ballZ = ball.mesh.position.z;
	const moveDistance = ballZ - aiZ;
	let moveAmount = 0;
	if (Math.abs(moveDistance) > state.player_speed) {
		moveAmount = Math.sign(moveDistance) * state.player_speed;
	} else {
		moveAmount = moveDistance;
	}
	ai.move(moveAmount);
}
