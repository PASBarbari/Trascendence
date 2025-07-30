import * as THREE from "three";
import { state } from "../state.js";

export function initLights() {
	// Remove any previous lights
	if (state.lights && Array.isArray(state.lights)) {
		state.lights.forEach((light) => {
			if (light && light.parent) light.parent.remove(light);
		});
	}
	state.lights = [];

	// Ambient light for base visibility
	const ambientLight = new THREE.AmbientLight(0xffffff, 1);
	state.scene.add(ambientLight);
	state.lights.push(ambientLight);

	// Directional light that will point to the ball
	const dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
	dirLight.position.set(0, 50, 50);
	dirLight.castShadow = true;
	dirLight.shadow.mapSize.width = 1024;
	dirLight.shadow.mapSize.height = 1024;
	dirLight.shadow.camera.left = -100;
	dirLight.shadow.camera.right = 100;
	dirLight.shadow.camera.top = 100;
	dirLight.shadow.camera.bottom = -100;
	dirLight.shadow.camera.near = 1;
	dirLight.shadow.camera.far = 200;

	const cameraHelper = new THREE.CameraHelper(dirLight.shadow.camera);
	if (!cameraHelper) {
		console.warn("CameraHelper not created, check THREE.js version.");
	}
	// state.scene.add(cameraHelper);
	// state.lights.push(cameraHelper);

	// Create a target object for the light
	const lightTarget = new THREE.Object3D();
	state.scene.add(lightTarget);
	dirLight.target = lightTarget;
	state.lightTarget = lightTarget;

	state.scene.add(dirLight);
	state.lights.push(dirLight);

	// Set the light's shadow properties
	const dirLightHelper = new THREE.DirectionalLightHelper(
		dirLight,
		10,
		0xffaa00
	);
	if (!dirLightHelper) {
		console.warn("DirectionalLightHelper not created, check THREE.js version.");
	}
	// state.scene.add(dirLightHelper);
	// state.lights.push(dirLightHelper);

	// Store the target for updates
}
