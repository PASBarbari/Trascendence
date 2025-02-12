import * as THREE from 'three';
import { state } from './state.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';


export function createScore() {
	const loader = new FontLoader();
	const fonts = loader.load(
		// resource URL
		'https://threejs.org/examples/fonts/helvetiker_regular.typeface.json',

		// onLoad callback
		function (font) {
			// do something with the font
			const geometry = new TextGeometry(state.p1_score + ' : ' + state.p2_score, {
				font: font,
				size: 10,
				depth: 1,
				curveSegments: 12,
			});
			geometry.computeBoundingBox();
			const centerOffset = -(geometry.boundingBox.max.x - geometry.boundingBox.min.x) / 2;
			state.scoreText = new THREE.Mesh(geometry, state.mat.score);
			state.scoreText.position.set(centerOffset, state.ring.y / 3, 0);
			state.scene.add(state.scoreText);
		},

		// onProgress callback
		function (xhr) {
			// console.log( (xhr.loaded / xhr.total * 100) + '% loaded' );
		},

		// onError callback
		function (err) {
			console.log('An error happened');
		}
	);
}

export function updateScore() {
	if (state.scoreText) {
		state.scene.remove(state.scoreText);
	}
	createScore();
}

export function toggleStats(show) {
	stats.dom.style.display = show ? 'block' : 'none';
}