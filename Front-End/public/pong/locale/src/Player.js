import * as THREE from "three";
import { state } from "../state.js";

const GEOMETRY = new THREE.BoxGeometry(
	state.p.width,
	state.p.height,
	state.p.depth
);
const HELPER_GEOMETRY = new THREE.BoxGeometry(
	state.p.width + state.ball_radius,
	state.p.height + state.ball_radius,
	state.p.depth + state.ball_radius
);
GEOMETRY.rotateX(Math.PI / 2);
HELPER_GEOMETRY.rotateX(Math.PI / 2);
const MATERIAL = [state.mat.p1, state.mat.p2];

const HELPER_MATERIAL = state.mat.helper;

export default class Player {
	constructor(position, n) {
		this.scene = state.scene;
		this.geometry = GEOMETRY;
		this.material = MATERIAL;
		this.mesh = new THREE.Mesh(GEOMETRY, MATERIAL[n]);

		this.helperMesh = new THREE.Mesh(HELPER_GEOMETRY, HELPER_MATERIAL);

		this.mesh.add(this.helperMesh);
		this.mesh.position.copy(position);

		this.mesh.castShadow = true;

		state.game.add(this.mesh);
		state.players.push(this);
	}

	checkBoundaries(moveY) {
			const nextPosition = this.mesh.position.z + moveY;  // Cambiato da Y a Z
			const halfHeight = state.p.height / 2;
			const topBoundary = state.boundaries.y - halfHeight;    // boundaries.y rappresenta la profondità del campo
			const bottomBoundary = -state.boundaries.y + halfHeight;
	
			if (nextPosition <= bottomBoundary) {
					this.mesh.position.z = bottomBoundary;  // Cambiato da Y a Z
					return false;
			}
			if (nextPosition >= topBoundary) {
					this.mesh.position.z = topBoundary;  // Cambiato da Y a Z
					return false;
			}
	
			return true;
	}

	// Add movement method - CORRECTED: Move along Y axis (up/down) not Z axis (toward camera)
	move(moveY) {
		if (this.checkBoundaries(moveY)) {
			this.mesh.position.z += moveY;
		}
	}
}
