import { state } from "./state.js";

// Add ball position history
const ballPositionHistory = [];
const HISTORY_LENGTH = 60; // Assuming 60 frames per second

// Variables for prediction timing
let lastPredictionTime = 0;
let currentTarget = null;
let frameCounter = 0;
let continuousPrediction = null; // Store latest prediction for debugging

export function moveIA() {
	const ai = state.players[1];
	const ball = state.ball;

	// Increment frame counter every time
	frameCounter++;

	// If AI or ball don't exist, exit early
	if (!ai || !ai.mesh || !ball || !ball.mesh || !ball.velocity) return;

	// Store ball position for analysis
	if (ball.mesh) {
		ballPositionHistory.push({
			x: ball.mesh.position.x,
			z: ball.mesh.position.z,
		});

		if (ballPositionHistory.length > HISTORY_LENGTH) {
			ballPositionHistory.shift();
		}
	}

	// Calculate continuous prediction EVERY frame (independent of AI decision making)
	if (ball.velocity.x > 0) {
		const paddleLineX = ai.mesh.position.x - state.p.width / 2;
		continuousPrediction = predictIntersectionWithPaddle(
			ball,
			paddleLineX,
			1.0
		);

		// Debug logging - show continuous prediction every 10 frames to avoid console spam
		if (frameCounter % 10 === 0) {
			console.log(
				"Continuous prediction at frame",
				frameCounter,
				":",
				continuousPrediction
			);
		}

		// IMMEDIATELY use the continuous prediction (no delay)
		// Only apply randomness if updating the longer-term target
		const timeSinceLastPrediction = frameCounter - lastPredictionTime;

		if (!currentTarget || timeSinceLastPrediction > 60) {
			// Store a slightly randomized target for long-term movement
			currentTarget = { ...continuousPrediction };

			// Reduced randomness for more precise tracking
			currentTarget.z += (Math.random() - 0.5) * 2;

			console.log("AI updated long-term target:", currentTarget);
			lastPredictionTime = frameCounter;
		}

		// ALWAYS move toward the latest prediction
		const aiZ = ai.mesh.position.z;

		// Use weighted average of current prediction (70%) and long-term target (30%)
		// This creates smoother movement while still tracking accurately
		const targetZ =
			continuousPrediction.z * 0.7 + (currentTarget?.z || 0) * 0.3;
		const moveDistance = targetZ - aiZ;

		let moveAmount = 0;
		// Limit by player speed
		if (Math.abs(moveDistance) > state.player_speed) {
			moveAmount = Math.sign(moveDistance) * state.player_speed;
		} else {
			moveAmount = moveDistance;
		}

		// Apply movement
		ai.move(moveAmount);
	} else {
		// Ball moving away, return to center
		const centerOffset = ai.mesh.position.z * 0.1;
		ai.move(-centerOffset);
	}
}

// Calculate where the ball will intersect with the paddle line
function predictIntersectionWithPaddle(ball, paddleLineX, maxTimeInSeconds) {
	// Guard against invalid inputs
	if (!ball || !ball.mesh || !ball.velocity) {
		return { x: paddleLineX, z: 0 };
	}

	const position = ball.mesh.position.clone();
	const velocity = ball.velocity.clone();

	// If ball is moving away from paddle, return center position
	if (velocity.x <= 0) {
		return { x: paddleLineX, z: 0 };
	}

	// Calculate time to reach paddle line
	const distanceToLine = paddleLineX - position.x;
	let timeToReachLine = distanceToLine / velocity.x;

	// If paddle is too far to reach in maxTimeInSeconds, calculate maxTime position
	if (timeToReachLine > maxTimeInSeconds || timeToReachLine <= 0) {
		return predictBallPosition(ball, maxTimeInSeconds);
	}

	// Calculate Z position at intersection, accounting for bounces
	const zAtIntersection = calculateZWithBounces(
		position.z,
		velocity.z,
		timeToReachLine
	);

	return { x: paddleLineX, z: zAtIntersection };
}

// Helper function to calculate Z position with bounces
function calculateZWithBounces(startZ, velocityZ, time) {
	const ballRadius = state.ball_radius || 1;
	const topBoundary = state.boundaries.y - ballRadius;
	const bottomBoundary = -state.boundaries.y + ballRadius;
	const boundaryHeight = topBoundary - bottomBoundary;

	// Calculate raw Z position without bounds
	let rawZ = startZ + velocityZ * time;

	// Apply bounces using modulo arithmetic trick
	const relativeZ = (rawZ - bottomBoundary) % (2 * boundaryHeight);
	let resultZ;

	if (relativeZ < 0) {
		resultZ = bottomBoundary - relativeZ;
	} else if (relativeZ <= boundaryHeight) {
		resultZ = bottomBoundary + relativeZ;
	} else {
		resultZ = topBoundary - (relativeZ - boundaryHeight);
	}

	return resultZ;
}

// Original prediction function for positions not involving the paddle
function predictBallPosition(ball, timeInSeconds) {
	// Guard against invalid inputs
	if (!ball || !ball.mesh || !ball.velocity) {
		return { x: 0, z: 0 };
	}

	// Rest of the function remains the same...
	// [existing prediction code]

	// Current position and velocity
	const position = ball.mesh.position.clone();
	const velocity = ball.velocity.clone();

	// Calculate total distance traveled
	const velocityPerSecond = velocity.clone().multiplyScalar(timeInSeconds);

	// Simple prediction without bounces
	let prediction = position.clone().add(velocityPerSecond);

	// Check for bounces against top/bottom boundaries
	const ballRadius = state.ball_radius || 1;
	const topBoundary = state.boundaries.y - ballRadius;
	const bottomBoundary = -state.boundaries.y + ballRadius;

	// Simple bounce calculation with incremental steps
	if (prediction.z > topBoundary || prediction.z < bottomBoundary) {
		let bouncePoint = position.clone();
		let bounceVelocity = velocity.clone();

		const steps = 10;
		const timeStep = timeInSeconds / steps;

		for (let i = 0; i < steps; i++) {
			bouncePoint.add(bounceVelocity.clone().multiplyScalar(timeStep));

			if (bouncePoint.z > topBoundary) {
				bouncePoint.z = topBoundary - (bouncePoint.z - topBoundary);
				bounceVelocity.z *= -1;
			} else if (bouncePoint.z < bottomBoundary) {
				bouncePoint.z =
					bottomBoundary + (bottomBoundary - bouncePoint.z);
				bounceVelocity.z *= -1;
			}
		}

		prediction = bouncePoint;
	}

	return prediction;
}
