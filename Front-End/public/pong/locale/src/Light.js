import { AmbientLight } from "three";
import { state } from "../state.js";
import * as THREE from "three";

export function initLights() {
	// Set the background color of the scene

	const LIGHT_COLOR = 0xffff00;
	const AMBIENT_COLOR = 0x404040;

	const dirlLight = new THREE.DirectionalLight(LIGHT_COLOR, 1);
	const ambientLight = new THREE.AmbientLight(AMBIENT_COLOR, 0.5);

	dirlLight.position.set(0, 80, 20);
	dirlLight.castShadow = true;

	const lightHelper = new THREE.DirectionalLightHelper(dirlLight, 1);
	lightHelper.visible = true;
	// Create a helper to visualize the directional light

	// Store the helper to update it later if needed
	dirlLight.helper = lightHelper;

	// Store the lights in the state
	state.lights = [dirlLight, lightHelper, ambientLight];
	state.scene.add(dirlLight, lightHelper, ambientLight);
}
