import * as THREE from "three";
import { FontLoader } from "three/addons/loaders/FontLoader.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import { Group, remove } from "three/addons/libs/tween.module.js";
import { moveIA } from "./ai.js";
import { state } from "./state.js";

const clock = new THREE.Clock();

// Function to send ball state to slave (only for master)
function sendBallStateToSlave() {
	if (!state.isMaster || !state.socket || state.socket.readyState !== WebSocket.OPEN) {
		return;
	}

	const now = Date.now();
	// Throttle to reduce message frequency
	if (now - state.lastBallStateSent < state.ballStateThrottle) {
		return; // Throttle ball state updates
	}

	if (!state.ball || !state.ball.mesh) {
		return;
	}

	// Only send if ball position changed significantly
	if (state.lastSentBallPosition) {
		const dx = Math.abs(state.ball.mesh.position.x - state.lastSentBallPosition.x);
		const dy = Math.abs(state.ball.mesh.position.y - state.lastSentBallPosition.y);
		const dz = Math.abs(state.ball.mesh.position.z - state.lastSentBallPosition.z);

		// Only send if moved more than 0.5 units in any direction
		if (dx < 0.5 && dy < 0.5 && dz < 0.5) {
			return;
		}
	}

	const ballStateMessage = {
		type: "ball_state",
		position: [
			state.ball.mesh.position.x,
			state.ball.mesh.position.y,
			state.ball.mesh.position.z
		],
		velocity: [
			state.ball.velocity.x,
			state.ball.velocity.y,
			state.ball.velocity.z
		],
		timestamp: now
	};

	state.socket.send(JSON.stringify(ballStateMessage));
	state.lastBallStateSent = now;

	// Store last sent position for comparison
	state.lastSentBallPosition = {
		x: state.ball.mesh.position.x,
		y: state.ball.mesh.position.y,
		z: state.ball.mesh.position.z
	};
}

export function animate() {
	const originalDelta = clock.getDelta();
	const deltaTime = originalDelta; // Convert to milliseconds

	if (state.isPaused === false) {
		if (state.stats) {
			state.stats.update();
		}

		// In multiplayer mode, check if we should start the game automatically
		if (state.isMultiplayer && !state.isStarted && state.socket && state.socket.readyState === WebSocket.OPEN) {
			console.log("🎮 Multiplayer detected, force starting game...");
			state.isStarted = true;
			state.isPaused = false;
		}

		// Update game objects only if game is started
		if (state.isStarted) {
			// Ball physics: ONLY WebSocket updates for perfect sync (both master and slave)
			if (state.ball) {
				if (state.isMultiplayer) {
					// In multiplayer, BOTH master and slave get ball updates ONLY from WebSocket
					// Master still sends ball state, but also applies received state for sync
					if (state.isMaster) {
						// Master: simulate ball physics locally but don't render directly
						// The rendered position will come from WebSocket for consistency
						state.ball.update(deltaTime);
						sendBallStateToSlave();

						// Debug: Log local ball position for master (this is the "source of truth")
						if (state.debugFrameCount === undefined) state.debugFrameCount = 0;
						state.debugFrameCount++;
						if (state.debugFrameCount % 60 === 0) {
							console.log(`🏀 MASTER Local Ball Physics: Position(${state.ball.mesh.position.x.toFixed(2)}, ${state.ball.mesh.position.y.toFixed(2)}, ${state.ball.mesh.position.z.toFixed(2)})`);
						}
					} else {
						// Slave: NO local ball physics, only WebSocket updates
						if (state.debugFrameCount === undefined) state.debugFrameCount = 0;
						state.debugFrameCount++;
						if (state.debugFrameCount % 60 === 0) {
							console.log(`🏀 SLAVE Waiting for WebSocket: Position(${state.ball.mesh.position.x.toFixed(2)}, ${state.ball.mesh.position.y.toFixed(2)}, ${state.ball.mesh.position.z.toFixed(2)})`);
						}
					}
				} else {
					// Single player mode: always simulate ball locally
					state.ball.update(deltaTime);
				}
			}

			// Handle player 1 movement
			if (state.players[0]) {
				if (state.isMultiplayer) {
					// In multiplayer: move locally first, then send position via WebSocket
					if (state.isMaster && state.p1_move_y !== 0) {
						// Master controls P1: move locally then send via WebSocket
						const previousY = state.players[0].mesh.position.y;
						state.players[0].move(state.p1_move_y);

						// Throttle position sending to reduce spam
						const now = Date.now();
						if (!state.lastP1PositionSent || (now - state.lastP1PositionSent) >= 50) { // Max 20 FPS for position sending
							state.lastP1PositionSent = now;
							// Send new position via WebSocket (which will come back and override for sync)
							import("../multiplayer/serverSide.js").then(({ sendPlayerPosition }) => {
								sendPlayerPosition(state.localPlayerId);
							}).catch(() => {
								console.warn("⚠️ Could not send P1 position");
							});
						}
					}
				} else {
					// Single player: apply local movement directly
					if (state.p1_move_y !== 0) {
						if (state.debugPaddleMovement === undefined) state.debugPaddleMovement = 0;
						state.debugPaddleMovement++;
						if (state.debugPaddleMovement % 30 === 0) {
							console.log(`🏓 P1 Single-player Movement: ${state.p1_move_y}, Position: ${state.players[0].mesh.position.y.toFixed(2)}`);
						}
					}
					state.players[0].move(state.p1_move_y);
				}
			}

			// Handle player 2 movement
			if (state.players[1]) {
				if (state.IAisActive && !state.isMultiplayer) {
					// AI only in single player mode
					moveIA();
				} else if (state.isMultiplayer) {
					// In multiplayer: move locally first, then send position via WebSocket
					if (!state.isMaster && state.p2_move_y !== 0) {
						// Slave controls P2: move locally then send via WebSocket
						const previousY = state.players[1].mesh.position.y;
						state.players[1].move(state.p2_move_y);

						// Throttle position sending to reduce spam
						const now = Date.now();
						if (!state.lastP2PositionSent || (now - state.lastP2PositionSent) >= 50) { // Max 20 FPS for position sending
							state.lastP2PositionSent = now;
							// Send new position via WebSocket (which will come back and override for sync)
							import("../multiplayer/serverSide.js").then(({ sendPlayerPosition }) => {
								sendPlayerPosition(state.localPlayerId);
							}).catch(() => {
								console.warn("⚠️ Could not send P2 position");
							});
						}
					}
				} else {
					// Single player: apply local movement directly
					if (state.p2_move_y !== 0) {
						if (state.debugPaddleMovement2 === undefined) state.debugPaddleMovement2 = 0;
						state.debugPaddleMovement2++;
						if (state.debugPaddleMovement2 % 30 === 0) {
							console.log(`🏓 P2 Single-player Movement: ${state.p2_move_y}, Position: ${state.players[1].mesh.position.y.toFixed(2)}`);
						}
					}
					state.players[1].move(state.p2_move_y);
				}
			}
		}

		if (state.controls) {
			state.controls.update();
		}
	}
	if (state.renderer && state.scene && state.camera) {
		// Debug: Log rendering info for multiplayer slave
		if (state.isMultiplayer && !state.isMaster && state.debugRenderCount === undefined) {
			state.debugRenderCount = 0;
		}
		if (state.isMultiplayer && !state.isMaster) {
			state.debugRenderCount++;
			if (state.debugRenderCount % 120 === 0) { // Every 120 frames (~2 seconds)
				console.log(`🎬 SLAVE Rendering: Ball visible=${state.ball ? 'YES' : 'NO'}, Scene children=${state.scene.children.length}`);
				if (state.ball && state.ball.mesh) {
					console.log(`🎬 SLAVE Ball in scene: ${state.scene.children.includes(state.ball.mesh) ? 'YES' : 'NO'}`);
				}
			}
		}

		state.renderer.render(state.scene, state.camera);
	}
	state.animationFrameId = requestAnimationFrame(animate);
}
