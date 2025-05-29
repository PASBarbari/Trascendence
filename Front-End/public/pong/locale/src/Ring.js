// Ring setup
import * as THREE from "three";
import { state } from "../state.js";

export function setupRing() {
	state.boundaries = new THREE.Vector2(
		state.ring.length / 2,
		state.ring.height / 2
	);
	const planeGeometry = new THREE.PlaneGeometry(
		state.boundaries.x * 2,
		state.boundaries.y * 2
	);
	planeGeometry.rotateX(-Math.PI / 2);
	state.plane = new THREE.Mesh(planeGeometry, state.mat.plane);
	state.plane.position.y = -state.ring.thickness - 0.1;
	state.plane.receiveShadow = true;
	state.game.add(state.plane);

	state.r_bottom = new THREE.Mesh(
		new THREE.BoxGeometry(
			state.ring.length + state.ring.thickness * 2,
			state.ring.thickness,
			state.ring.depth
		),
		state.mat.ring
	);
	state.r_top = new THREE.Mesh(
		new THREE.BoxGeometry(
			state.ring.length + state.ring.thickness * 2,
			state.ring.thickness,
			state.ring.depth
		),
		state.mat.ring
	);
	state.r_left = new THREE.Mesh(
		new THREE.BoxGeometry(
			state.ring.thickness,
			state.ring.height,
			state.ring.depth
		),
		state.mat.ring
	);
	state.r_right = new THREE.Mesh(
		new THREE.BoxGeometry(
			state.ring.thickness,
			state.ring.height,
			state.ring.depth
		),
		state.mat.ring
	);

	// state.r_bottom.castShadow = true;
	// state.r_top.castShadow = true;
	// state.r_left.castShadow = true;
	// state.r_right.castShadow = true;
	state.r_bottom.receiveShadow = true;
	state.r_top.receiveShadow = true;
	state.r_left.receiveShadow = true;
	state.r_right.receiveShadow = true;

	state.r_bottom.position.set(
		0,
		-((state.ring.height + state.ring.thickness) / 2),
		0
	);
	state.r_top.position.set(
		0,
		(state.ring.height + state.ring.thickness) / 2,
		0
	);
	state.r_left.position.set(
		-((state.ring.length + state.ring.thickness) / 2),
		0,
		0
	);
	state.r_right.position.set(
		(state.ring.length + state.ring.thickness) / 2,
		0,
		0
	);
	state.ring3D = new THREE.Group();
	state.ring3D.add(state.r_bottom, state.r_top, state.r_left, state.r_right);

	state.ring3D.rotateX(-Math.PI / 2);
	state.game.add(state.ring3D);
}
