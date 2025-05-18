import { state } from "./state.js";

export function moveIA() {
	const iaSpeed = state.player_speed;
	const delay = 1;
	const timeStep = 0.01;
	let simulatedBallY = state.ball.position.y;
	let simulatedBallX = state.ball.position.x;
	let simulatedAngle = state.angle;
	let timeElapsed = 0;

	while (timeElapsed < delay) {
		simulatedBallY +=
			state.ball_speed *
			Math.sin((simulatedAngle * Math.PI) / 180) *
			timeStep;
		simulatedBallX +=
			state.ball_speed *
			Math.cos((simulatedAngle * Math.PI) / 180) *
			timeStep;
		timeElapsed += timeStep;

		if (
			simulatedBallY + state.ball_radius + state.ball_speed >
				state.ring.length / 2 ||
			simulatedBallY - state.ball_radius + state.ball_speed <
				-state.ring.length / 2
		) {
			simulatedAngle *= -1;
		}
	}

	const futureBallY = simulatedBallY;

	if (futureBallY > state.p2.position.y + state.player.length / 4) {
		state.p2_move_y = iaSpeed;
	} else if (futureBallY < state.p2.position.y - state.player.length / 4) {
		state.p2_move_y = -iaSpeed;
	} else {
		state.p2_move_y = 0;
	}

	if (
		(state.p2_move_y > 0 &&
			state.p2.position.y + state.player.length / 2 <=
				state.ring.length / 2 - state.ring.thickness / 2) ||
		(state.p2_move_y < 0 &&
			state.p2.position.y - state.player.length / 2 >=
				-state.ring.length / 2 + state.ring.thickness / 2)
	) {
		state.p2.position.y += state.p2_move_y;
	}
}
