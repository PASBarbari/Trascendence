import { state } from "./state.js";

class AIOpponent {
	constructor(difficulty = "medium") {
		this.difficulty = difficulty;
		this.lastUpdateTime = 0;
		this.updateInterval = 1000; // AI can only refresh view once per second
		this.prediction = null;
		this.strategy = this.initializeStrategy(difficulty);
		this.frameCounter = 0;
		this.reactionDelay = this.getReactionDelay();
		this.lastDecisionTime = 0;
		this.debugCounter = 0;

		console.log(`🤖 AI Constructor: Created ${difficulty} AI opponent`);
	}

	initializeStrategy(difficulty) {
		console.log(`🎯 AI Strategy: Initializing ${difficulty} strategy`);
		switch (difficulty) {
			case "easy":
				return new EasyStrategy();
			case "medium":
				return new MediumStrategy();
			case "hard":
				return new HardStrategy();
			case "expert":
				return new ExpertStrategy();
			default:
				return new MediumStrategy();
		}
	}

	getReactionDelay() {
		// Simulate human reaction time based on difficulty
		let delay;
		switch (this.difficulty) {
			case "easy":
				delay = 200 + Math.random() * 300; // 200-500ms
				break;
			case "medium":
				delay = 100 + Math.random() * 200; // 100-300ms
				break;
			case "hard":
				delay = 50 + Math.random() * 100; // 50-150ms
				break;
			case "expert":
				delay = 20 + Math.random() * 50; // 20-70ms
				break;
			default:
				delay = 150 + Math.random() * 150;
		}
		console.log(
			`⏱️ AI Reaction: New reaction delay: ${delay.toFixed(1)}ms for ${
				this.difficulty
			}`
		);
		return delay;
	}

	// AI can only refresh its view once per second
	updateGameView() {
		const currentTime = performance.now();

		if (currentTime - this.lastUpdateTime >= this.updateInterval) {
			this.lastUpdateTime = currentTime;
			console.log(
				`👁️ AI Vision: Refreshing game view at frame ${this.frameCounter}`
			);

			// Take a "snapshot" of the game state
			const gameSnapshot = this.captureGameState();

			if (gameSnapshot) {
				console.log(
					`📸 AI Snapshot: Ball at (${gameSnapshot.ball.position.x.toFixed(
						1
					)}, ${gameSnapshot.ball.position.z.toFixed(
						1
					)}), velocity (${gameSnapshot.ball.velocity.x.toFixed(
						1
					)}, ${gameSnapshot.ball.velocity.z.toFixed(1)})`
				);
				console.log(
					`📸 AI Snapshot: AI paddle at z=${gameSnapshot.aiPaddle.position.z.toFixed(
						1
					)}`
				);
			}

			// Make prediction based on this snapshot
			this.prediction = this.strategy.predictBallTrajectory(gameSnapshot);

			if (this.prediction) {
				console.log(
					`🔮 AI Prediction: Target=${this.prediction.targetPosition?.toFixed(
						1
					)}, Confidence=${
						this.prediction.confidence
					}, Time=${this.prediction.timeToReach?.toFixed(2)}s`
				);
			} else {
				console.log(`❌ AI Prediction: Failed to make prediction`);
			}

			// Generate new reaction delay for next action
			this.reactionDelay = this.getReactionDelay();

			return true; // View was updated
		}

		return false; // Using cached prediction
	}

	captureGameState() {
		if (!state.ball || !state.players[1]) {
			console.log(
				`⚠️ AI Capture: Missing game objects - ball:${!!state.ball}, player1:${!!state
					.players[1]}`
			);
			return null;
		}

		const gameState = {
			ball: {
				position: state.ball.mesh.position.clone(),
				velocity: state.ball.velocity.clone(),
				speed: state.ball.speed,
			},
			aiPaddle: {
				position: state.players[1].mesh.position.clone(),
				height: state.p.height,
				width: state.p.width,
			},
			boundaries: state.boundaries,
			timestamp: performance.now(),
		};

		console.log(`📊 AI State: Captured game state successfully`);
		return gameState;
	}

	// Calculate move amount like the original moveIA function
	calculateMoveAmount() {
		this.frameCounter++;
		this.debugCounter++;

		// Log every 60 frames (roughly once per second at 60fps)
		if (this.debugCounter % 60 === 0) {
			console.log(
				`🔄 AI Update: Frame ${this.frameCounter}, Debug cycle ${
					this.debugCounter / 60
				}`
			);
		}

		// Update view only once per second
		const viewUpdated = this.updateGameView();

		if (viewUpdated) {
			console.log(
				`✅ AI View: View updated on frame ${this.frameCounter}`
			);
		}

		if (!this.prediction) {
			console.log(
				`🚫 AI Decision: No prediction available, returning 0 movement`
			);
			return 0;
		}

		// Apply reaction delay - don't make new decisions too quickly
		const currentTime = performance.now();
		const timeSinceLastDecision = currentTime - this.lastDecisionTime;

		if (timeSinceLastDecision < this.reactionDelay) {
			const remainingDelay = this.reactionDelay - timeSinceLastDecision;
			console.log(
				`⏳ AI Reaction: Still in reaction delay, ${remainingDelay.toFixed(
					1
				)}ms remaining, using last move: ${this.lastMoveAmount || 0}`
			);
			return this.lastMoveAmount || 0;
		}

		this.lastDecisionTime = currentTime;
		console.log(
			`⚡ AI Decision: Making new decision after ${timeSinceLastDecision.toFixed(
				1
			)}ms`
		);

		// Use strategy to get target position
		const decision = this.strategy.makeDecision(
			this.prediction,
			state.players[1]
		);

		console.log(
			`🎯 AI Strategy: Decision target=${decision.targetPosition?.toFixed(
				1
			)}, confidence=${decision.confidence}`
		);

		// Convert direction to move amount (similar to original logic)
		let moveAmount = 0;
		if (decision.targetPosition !== undefined) {
			const ai = state.players[1];
			if (ai && ai.mesh) {
				const aiZ = ai.mesh.position.z;
				const targetZ = decision.targetPosition;
				const moveDistance = targetZ - aiZ;

				// Apply difficulty-based imprecision
				const imprecision = this.strategy.getImprecision();
				const adjustedMoveDistance = moveDistance + imprecision;

				console.log(
					`📐 AI Movement: Current=${aiZ.toFixed(
						1
					)}, Target=${targetZ.toFixed(
						1
					)}, Distance=${moveDistance.toFixed(
						1
					)}, Imprecision=${imprecision.toFixed(
						1
					)}, Adjusted=${adjustedMoveDistance.toFixed(1)}`
				);

				if (Math.abs(adjustedMoveDistance) > state.player_speed) {
					moveAmount =
						Math.sign(adjustedMoveDistance) * state.player_speed;
					console.log(
						`🏃 AI Movement: Clamped to max speed: ${moveAmount.toFixed(
							1
						)} (max: ${state.player_speed})`
					);
				} else {
					moveAmount = adjustedMoveDistance;
					console.log(
						`🚶 AI Movement: Using calculated amount: ${moveAmount.toFixed(
							1
						)}`
					);
				}
			} else {
				console.log(`❌ AI Movement: AI paddle not found`);
			}
		} else {
			console.log(`❌ AI Movement: No target position in decision`);
		}

		this.lastMoveAmount = moveAmount;
		console.log(`➡️ AI Final: Move amount = ${moveAmount.toFixed(1)}`);
		return moveAmount;
	}
}

// Strategy Classes - Updated to return target positions
class EasyStrategy {
	predictBallTrajectory(gameState) {
		if (!gameState) {
			console.log(`🔴 Easy AI: No game state for prediction`);
			return null;
		}

		// Simple prediction - just track ball current position with some error
		const errorMargin = 20; // Large error for easy mode
		const predictedY =
			gameState.ball.position.z + (Math.random() - 0.5) * errorMargin;

		const prediction = {
			targetPosition: predictedY,
			confidence: 0.3,
			timeToReach: this.calculateTimeToReach(gameState),
		};

		console.log(
			`🟢 Easy AI: Simple prediction - current ball Z=${gameState.ball.position.z.toFixed(
				1
			)}, predicted=${predictedY.toFixed(
				1
			)} (error margin: ${errorMargin})`
		);
		return prediction;
	}

	makeDecision(prediction, aiPaddle) {
		if (!prediction || !aiPaddle) {
			console.log(
				`🔴 Easy AI: Missing data for decision - prediction:${!!prediction}, paddle:${!!aiPaddle}`
			);
			return { targetPosition: 0 };
		}

		console.log(
			`🟢 Easy AI: Decision - target=${prediction.targetPosition.toFixed(
				1
			)}`
		);
		return {
			targetPosition: prediction.targetPosition,
			confidence: prediction.confidence,
		};
	}

	getImprecision() {
		// Easy AI has large imprecision
		const imprecision = (Math.random() - 0.5) * 15;
		console.log(
			`🎲 Easy AI: Applied imprecision: ${imprecision.toFixed(1)}`
		);
		return imprecision;
	}

	calculateTimeToReach(gameState) {
		const ballToAI = Math.abs(
			gameState.aiPaddle.position.x - gameState.ball.position.x
		);
		const timeToReach = ballToAI / gameState.ball.speed;
		console.log(
			`⏱️ Easy AI: Time to reach calculation - distance=${ballToAI.toFixed(
				1
			)}, speed=${gameState.ball.speed.toFixed(
				1
			)}, time=${timeToReach.toFixed(2)}s`
		);
		return timeToReach;
	}
}

class MediumStrategy {
	predictBallTrajectory(gameState) {
		if (!gameState) {
			console.log(`🔴 Medium AI: No game state for prediction`);
			return null;
		}

		console.log(
			`🟡 Medium AI: Starting trajectory prediction with physics simulation`
		);

		// More sophisticated prediction with bounce calculation
		let ballPos = gameState.ball.position.clone();
		let ballVel = gameState.ball.velocity.clone();
		const timeStep = 0.016; // 60fps
		const maxSteps = 120; // 2 seconds prediction

		console.log(
			`🟡 Medium AI: Initial ball pos=(${ballPos.x.toFixed(
				1
			)}, ${ballPos.z.toFixed(1)}), vel=(${ballVel.x.toFixed(
				1
			)}, ${ballVel.z.toFixed(1)})`
		);

		// Simulate ball movement with wall bounces
		for (let i = 0; i < maxSteps; i++) {
			ballPos.add(ballVel.clone().multiplyScalar(timeStep));

			// Check wall bounces
			if (Math.abs(ballPos.z) >= gameState.boundaries.y) {
				ballVel.z *= -1;
				ballPos.z = Math.sign(ballPos.z) * gameState.boundaries.y;
				console.log(
					`🟡 Medium AI: Wall bounce detected at step ${i}, new vel Z=${ballVel.z.toFixed(
						1
					)}`
				);
			}

			// If ball reaches AI paddle X position
			if (
				ballVel.x > 0 &&
				ballPos.x >= gameState.aiPaddle.position.x - 5
			) {
				console.log(
					`🟡 Medium AI: Ball will reach paddle at step ${i}, predicted Z=${ballPos.z.toFixed(
						1
					)}`
				);
				return {
					targetPosition: ballPos.z,
					confidence: 0.7,
					timeToReach: i * timeStep,
				};
			}
		}

		console.log(
			`🟡 Medium AI: Max steps reached, final prediction Z=${ballPos.z.toFixed(
				1
			)}`
		);
		return {
			targetPosition: ballPos.z,
			confidence: 0.5,
			timeToReach: maxSteps * timeStep,
		};
	}

	makeDecision(prediction, aiPaddle) {
		if (!prediction || !aiPaddle) {
			console.log(`🔴 Medium AI: Missing data for decision`);
			return { targetPosition: 0 };
		}

		console.log(
			`🟡 Medium AI: Decision - target=${prediction.targetPosition.toFixed(
				1
			)}, confidence=${prediction.confidence}`
		);
		return {
			targetPosition: prediction.targetPosition,
			confidence: prediction.confidence,
		};
	}

	getImprecision() {
		// Medium AI has moderate imprecision
		const imprecision = (Math.random() - 0.5) * 8;
		console.log(
			`🎲 Medium AI: Applied imprecision: ${imprecision.toFixed(1)}`
		);
		return imprecision;
	}
}

class HardStrategy {
	predictBallTrajectory(gameState) {
		if (!gameState) {
			console.log(`🔴 Hard AI: No game state for prediction`);
			return null;
		}

		console.log(`🟠 Hard AI: Starting advanced trajectory prediction`);

		// Advanced prediction with multiple bounces
		let ballPos = gameState.ball.position.clone();
		let ballVel = gameState.ball.velocity.clone();
		const timeStep = 0.008; // Higher precision
		const maxSteps = 250;
		let bounceCount = 0;

		for (let i = 0; i < maxSteps; i++) {
			ballPos.add(ballVel.clone().multiplyScalar(timeStep));

			// Wall bounces with slight velocity reduction
			if (Math.abs(ballPos.z) >= gameState.boundaries.y) {
				ballVel.z *= -0.98; // Slight energy loss
				ballPos.z = Math.sign(ballPos.z) * gameState.boundaries.y;
				bounceCount++;
			}

			if (
				ballVel.x > 0 &&
				ballPos.x >= gameState.aiPaddle.position.x - 2
			) {
				console.log(
					`🟠 Hard AI: Advanced prediction complete - ${bounceCount} bounces, target=${ballPos.z.toFixed(
						1
					)}, step=${i}`
				);
				return {
					targetPosition: ballPos.z,
					confidence: 0.9,
					timeToReach: i * timeStep,
					ballSpeed: ballVel.length(),
				};
			}
		}

		console.log(
			`🟠 Hard AI: Max steps reached with ${bounceCount} bounces`
		);
		return {
			targetPosition: ballPos.z,
			confidence: 0.8,
			timeToReach: maxSteps * timeStep,
		};
	}

	makeDecision(prediction, aiPaddle) {
		if (!prediction || !aiPaddle) {
			console.log(`🔴 Hard AI: Missing data for decision`);
			return { targetPosition: 0 };
		}

		// Strategic positioning - aim for paddle edges sometimes
		let adjustedTarget = prediction.targetPosition;
		const shouldAimForEdge = Math.random() < 0.2;

		if (shouldAimForEdge) {
			// Occasionally aim for edge to create angle
			const edgeOffset = (Math.random() - 0.5) * state.p.height * 0.3;
			adjustedTarget += edgeOffset;
			console.log(
				`🟠 Hard AI: Strategic edge shot - offset=${edgeOffset.toFixed(
					1
				)}, new target=${adjustedTarget.toFixed(1)}`
			);
		} else {
			console.log(
				`🟠 Hard AI: Standard shot - target=${adjustedTarget.toFixed(
					1
				)}`
			);
		}

		return {
			targetPosition: adjustedTarget,
			confidence: prediction.confidence,
		};
	}

	getImprecision() {
		// Hard AI has minimal imprecision
		const imprecision = (Math.random() - 0.5) * 3;
		console.log(
			`🎲 Hard AI: Applied minimal imprecision: ${imprecision.toFixed(1)}`
		);
		return imprecision;
	}
}

class ExpertStrategy {
	constructor() {
		this.gameHistory = [];
		this.playerPatterns = new Map();
		console.log(
			`🔥 Expert AI: Strategy initialized with learning capabilities`
		);
	}

	predictBallTrajectory(gameState) {
		// Expert AI learns from player patterns
		this.analyzePlayerBehavior(gameState);

		// Ultra-precise prediction with physics simulation
		return this.simulatePhysics(gameState);
	}

	simulatePhysics(gameState) {
		console.log(`🔥 Expert AI: Using advanced physics simulation`);
		// Implement advanced physics prediction
		// For now, a very accurate version of the hard strategy
		return new HardStrategy().predictBallTrajectory(gameState);
	}

	analyzePlayerBehavior(gameState) {
		// Learn player movement patterns
		this.gameHistory.push({
			timestamp: gameState.timestamp,
			ballPosition: gameState.ball.position.clone(),
			ballVelocity: gameState.ball.velocity.clone(),
		});

		// Keep only recent history
		if (this.gameHistory.length > 60) {
			this.gameHistory.shift();
		}

		if (this.gameHistory.length % 10 === 0) {
			console.log(
				`🧠 Expert AI: Learning - ${this.gameHistory.length} data points collected`
			);
		}
	}

	makeDecision(prediction, aiPaddle) {
		// Expert AI makes perfect decisions with occasional mistakes
		const decision = new HardStrategy().makeDecision(prediction, aiPaddle);

		// 95% perfect play, 5% intentional "mistakes" to keep it beatable
		const shouldMakeMistake = Math.random() < 0.05;

		if (shouldMakeMistake) {
			// Intentional slight error
			const error = (Math.random() - 0.5) * 20;
			decision.targetPosition += error;
			console.log(
				`🔥 Expert AI: Intentional mistake - error=${error.toFixed(
					1
				)}, new target=${decision.targetPosition.toFixed(1)}`
			);
		} else {
			console.log(
				`🔥 Expert AI: Perfect play - target=${decision.targetPosition.toFixed(
					1
				)}`
			);
		}

		return decision;
	}

	getImprecision() {
		// Expert AI has almost no imprecision
		const imprecision = (Math.random() - 0.5) * 1;
		console.log(
			`🎲 Expert AI: Applied precision imprecision: ${imprecision.toFixed(
				1
			)}`
		);
		return imprecision;
	}
}

// Global AI instance
let aiOpponent = null;

export function initializeAI(difficulty = "medium") {
	console.log(`🚀 AI System: Initializing AI with difficulty: ${difficulty}`);
	aiOpponent = new AIOpponent(difficulty);
	console.log(`✅ AI System: AI initialized successfully`);
}

export function setAIDifficulty(difficulty) {
	if (aiOpponent) {
		console.log(
			`🔧 AI System: Changing difficulty from ${aiOpponent.difficulty} to ${difficulty}`
		);
		aiOpponent.difficulty = difficulty;
		aiOpponent.strategy = aiOpponent.initializeStrategy(difficulty);
		console.log(`✅ AI System: Difficulty changed successfully`);
	} else {
		console.log(
			`⚠️ AI System: Cannot change difficulty - AI not initialized`
		);
	}
}

export function moveIA() {
	// Keep the same logic structure as your original function
	const ai = state.players[1];
	const ball = state.ball;

	// Debug basic checks
	if (!ai || !ai.mesh) {
		console.log(`❌ moveIA: AI player not found or missing mesh`);
		return;
	}

	if (!ball || !ball.mesh) {
		console.log(`❌ moveIA: Ball not found or missing mesh`);
		return;
	}

	let moveAmount = 0;

	if (!aiOpponent) {
		console.log(`🔄 moveIA: AI not initialized, creating new instance`);
		initializeAI();
	}

	if (aiOpponent && state.IAisActive) {
		console.log(
			`🤖 moveIA: Using AI calculation (IAisActive: ${state.IAisActive})`
		);
		// Use AI to calculate move amount
		moveAmount = aiOpponent.calculateMoveAmount();
		console.log(
			`🎮 moveIA: AI calculated move amount: ${moveAmount.toFixed(3)}`
		);
	} else {
		console.log(
			`🔄 moveIA: Using fallback simple AI (IAisActive: ${state.IAisActive})`
		);
		// Fallback to simple AI if no AI opponent
		const aiZ = ai.mesh.position.z;
		const ballZ = ball.mesh.position.z;
		const moveDistance = ballZ - aiZ;

		if (Math.abs(moveDistance) > state.player_speed) {
			moveAmount = Math.sign(moveDistance) * state.player_speed;
		} else {
			moveAmount = moveDistance;
		}
		console.log(
			`🎮 moveIA: Simple AI - aiZ=${aiZ.toFixed(
				1
			)}, ballZ=${ballZ.toFixed(1)}, distance=${moveDistance.toFixed(
				1
			)}, move=${moveAmount.toFixed(1)}`
		);
	}

	// Call the move function like in your original code
	console.log(
		`➡️ moveIA: Executing move with amount: ${moveAmount.toFixed(3)}`
	);
	ai.move(moveAmount);
}

// Cleanup function
export function cleanupAI() {
	if (aiOpponent) {
		console.log(`🧹 AI System: Cleaning up AI opponent`);
		aiOpponent = null;
		console.log(`✅ AI System: Cleanup complete`);
	} else {
		console.log(`ℹ️ AI System: No AI to cleanup`);
	}
}
