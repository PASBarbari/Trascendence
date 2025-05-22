import * as THREE from "three";
import { FontLoader } from "three/addons/loaders/FontLoader.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import { Group, remove } from "three/addons/libs/tween.module.js";
import { state } from "./state.js";
import * as IA from "./ai.js";
import * as UTILS from "./utils.js";
import * as SETUP from "./setup.js";
import * as SETTINGS from "./settings.js";
import * as UP from "./powerups.js";
import Ball from "./src/Ball.js";

const clock = new THREE.Clock();

export function animate() {
	const deltaTime = clock.getDelta();

	if (state.isPaused === false) {
		if (state.stats) {
			state.stats.update();
		}
		if (state.ball) {
			state.ball.update(deltaTime);
			// if (state.ball && state.lightTarget) {
			// 	state.lightTarget.position.copy(state.ball.mesh.position);
			// 	state.lightTarget.updateMatrixWorld(); // Ensure world matrix is updated
			// }
		}

		if (state.players[0]) {
			state.players[0].move(state.p1_move_y);
		}

		if (state.players[1]) {
			state.players[1].move(state.p2_move_y);
		}

		if (state.controls) {
			state.controls.update();
		}
		if (state.renderer && state.scene && state.camera) {
			state.renderer.render(state.scene, state.camera);
		}
	}
	state.animationFrameId = requestAnimationFrame(animate);
}
