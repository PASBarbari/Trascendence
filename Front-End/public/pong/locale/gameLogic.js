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

export function animate() {
	requestAnimationFrame(animate);
	// state.p1.rotation.x += 0.01;
	// state.p1.rotation.y += 0.01;
	// state.p1.rotation.z += 0.01;
	state.controls.update();
	state.renderer.render(state.scene, state.camera);
}
