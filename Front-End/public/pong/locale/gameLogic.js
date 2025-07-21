import * as THREE from "three";
import { FontLoader } from "three/addons/loaders/FontLoader.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import { Group, remove } from "three/addons/libs/tween.module.js";
import { moveIA } from "./ai.js";
import { state } from "./state.js";

const clock = new THREE.Clock();

export function animate() {
	const originalDelta = clock.getDelta();
	const deltaTime = originalDelta; // Convert to milliseconds

	if (state.isPaused === false) {
		if (state.stats) {
			state.stats.update();
		}
		
		// Skip ball physics in multiplayer - server is authoritative
		if (state.ball && !state.isMultiplayer) {
			state.ball.update(deltaTime);
		}

		// Skip player movement calculations in multiplayer - server controls positions
		if (!state.isMultiplayer) {
			if (state.players[0]) {
				state.players[0].move(state.p1_move_y);
			}

			if (state.players[1] && state.IAisActive) {
				moveIA();
			} else if (state.players[1]) {
				state.players[1].move(state.p2_move_y);
			}
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
