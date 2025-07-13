import * as THREE from "three";
import { FontLoader } from "three/addons/loaders/FontLoader.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import { Group, remove } from "three/addons/libs/tween.module.js";
import { moveIA } from "./ai.js";
import { state } from "./state.js";
import { webrtcGameLoop } from "../webrtc-implementation.js";

const clock = new THREE.Clock();

// Function to send ball state to guest (only for host)
function sendBallStateToGuest() {
	if (!state.isHost || !state.socket || state.socket.readyState !== WebSocket.OPEN) {
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

		// WEBSOCKET AUTO-START COMMENTATO - Solo WebRTC
		// if (state.isMultiplayer && !state.isStarted && state.socket && state.socket.readyState === WebSocket.OPEN) {
		//	state.isStarted = true;
		//	state.isPaused = false;
		// }

		// WebRTC auto-start REMOVED - game should start only when both players are ready
		// Game will be started via startGame() method when ready menu signals completion

		// Update game objects only if game is started
		if (state.isStarted) {
			// WEBRTC: Ultra-fast communication
			if (state.isWebRTC) {
				webrtcGameLoop();

				// Ball physics: Only Host simulates, Guest only receives
				if (state.ball) {
					if (state.isHost) {
						// Host: simulate ball physics and send to guest
						state.ball.update(deltaTime);
					}
					// Guest: NEVER update ball physics locally - only receive via WebRTC
					// Ball position is updated in applyBallState() from WebRTC messages
				}

				// Player movement: Immediate local updates + WebRTC sync
				if (state.players[0] && state.p1_move_y !== 0) {
					state.players[0].move(state.p1_move_y);
				}
				if (state.players[1] && state.p2_move_y !== 0) {
					state.players[1].move(state.p2_move_y);
				}

			} else {
				// WEBSOCKET/SINGLE PLAYER: Original logic
			// Ball physics: ONLY WebSocket updates for perfect sync (both host and guest)
			if (state.ball) {
				if (state.isMultiplayer) {
					// In multiplayer, BOTH host and guest get ball updates ONLY from WebSocket
					// Host still sends ball state, but also applies received state for sync
					if (state.isHost) {
						// Host: simulate ball physics locally but don't render directly
						// The rendered position will come from WebSocket for consistency
						state.ball.update(deltaTime);
						sendBallStateToGuest();
					} else {
						// Guest: NO local ball physics, only WebSocket updates
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
					if (state.isHost && state.p1_move_y !== 0) {
						// Host controls P1: move locally then send via WebSocket
						const previousY = state.players[0].mesh.position.y;
						state.players[0].move(state.p1_move_y);

						// Throttle position sending to reduce spam
						const now = Date.now();
						if (!state.lastP1PositionSent || (now - state.lastP1PositionSent) >= 50) { // Max 20 FPS for position sending
							state.lastP1PositionSent = now;
							// Send new position via WebSocket (which will come back and override for sync)
							import("./serverSide.js").then(({ sendPlayerPosition }) => {
								sendPlayerPosition(state.localPlayerId);
							}).catch(() => {
								// Could not send P1 position
							});
						}
					}
				} else {
					// Single player: apply local movement directly
					state.players[0].move(state.p1_move_y);
				}
			}

			// Handle player 2 movement
			if (state.players[1]) {
				if (state.IAisActive && !state.isMultiplayer) {
					// AI only in single player mode
					moveIA();
				} else				if (state.isMultiplayer) {
					// In multiplayer: move locally first, then send position via WebSocket
					if (!state.isHost && state.p2_move_y !== 0) {
						// Guest controls P2: move locally then send via WebSocket
						const previousY = state.players[1].mesh.position.y;
						state.players[1].move(state.p2_move_y);

						// Throttle position sending to reduce spam
						const now = Date.now();
						if (!state.lastP2PositionSent || (now - state.lastP2PositionSent) >= 50) { // Max 20 FPS for position sending
							state.lastP2PositionSent = now;
							// Send new position via WebSocket (which will come back and override for sync)
							import("./serverSide.js").then(({ sendPlayerPosition }) => {
								sendPlayerPosition(state.localPlayerId);
							}).catch(() => {
								// Could not send P2 position
							});
						}
					}
				} else {
					// Single player: apply local movement directly
					state.players[1].move(state.p2_move_y);
				}
			}
			} // Chiude il blocco else per WEBSOCKET/SINGLE PLAYER
		}

		if (state.controls) {
			state.controls.update();
		}
	}
	if (state.renderer && state.scene && state.camera) {
		state.renderer.render(state.scene, state.camera);
	}
	state.animationFrameId = requestAnimationFrame(animate);
}
