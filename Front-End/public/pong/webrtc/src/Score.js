import * as THREE from "three";
import { state } from "../state.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import { FontLoader } from "three/addons/loaders/FontLoader.js";

export function createScore() {
	const fontLoader = new FontLoader();
	const fontUrl =
		"https://threejs.org/examples/fonts/helvetiker_regular.typeface.json";
	fontLoader.load(fontUrl, function (font) {
		const textGeometry = new TextGeometry("0", {
			font: font,
			size: 20,
			depth: 0.5,
			curveSegments: 12,
			bevelEnabled: false,
			bevelThickness: 0.1,
			bevelSize: 0.1,
			bevelOffset: 0,
			bevelSegments: 5,
		});
		textGeometry.center();

		state.scoreMesh.p1 = new THREE.Mesh(textGeometry, state.mat.score);
		state.scoreMesh.p2 = new THREE.Mesh(textGeometry, state.mat.score);
		state.scoreMesh.p1.position.x = -state.boundaries.x * 0.6;
		state.scoreMesh.p2.position.x = state.boundaries.x * 0.6;
		state.scoreMesh.p1.position.y = state.boundaries.y * 1.3;
		state.scoreMesh.p2.position.y = state.boundaries.y * 1.3;
		// state.scoreMesh.p1.rotateX(-Math.PI / 2);
		// state.scoreMesh.p2.rotateX(-Math.PI / 2);
		// state.game.add(state.scoreMesh.p1, state.scoreMesh.p2);
		state.scene.add(state.scoreMesh.p1, state.scoreMesh.p2);
	});
}

export function updateScore(player) {
	const scoreValue = player === "p1" ? state.p1_score : state.p2_score;
	const scoreMesh = player === "p1" ? state.scoreMesh.p1 : state.scoreMesh.p2;

	// Don't proceed if the score mesh isn't created yet
	if (!scoreMesh) {
		return;
	}

	const fontLoader = new FontLoader();
	const fontUrl =
		"https://threejs.org/examples/fonts/helvetiker_regular.typeface.json";

	fontLoader.load(fontUrl, function (font) {
		// Create new text geometry with current score
		const textGeometry = new TextGeometry(scoreValue.toString(), {
			font: font,
			size: 20,
			depth: 0.5,
			curveSegments: 12,
			bevelEnabled: false,
			bevelThickness: 0.1,
			bevelSize: 0.1,
			bevelOffset: 0,
			bevelSegments: 5,
		});

		textGeometry.center();

		// Store the original position and rotation
		const originalPosition = scoreMesh.position.clone();
		const originalRotation = scoreMesh.rotation.clone();

		// Remove old geometry and replace with new one
		scoreMesh.geometry.dispose();
		scoreMesh.geometry = textGeometry;

		// Restore original position and rotation
		scoreMesh.position.copy(originalPosition);
		scoreMesh.rotation.copy(originalRotation);
	});
}
