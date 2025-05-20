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
const MATERIAL = new THREE.MeshNormalMaterial();
const HELPER_MATERIAL = new THREE.MeshNormalMaterial({
	transparent: true,
	opacity: 0,
});

export default class Player {
	constructor(scene, position) {
		this.scene = scene;
		this.geometry = GEOMETRY;
		this.material = MATERIAL;
		this.mesh = new THREE.Mesh(GEOMETRY, MATERIAL);
		this.helperMesh = new THREE.Mesh(HELPER_GEOMETRY, HELPER_MATERIAL);

		this.mesh.add(this.helperMesh);
		this.mesh.position.copy(position);

		state.game.add(this.mesh);
		state.players.push(this);
	}

	checkBoundaries(moveY) {
		const nextPosition = this.mesh.position.z + moveY;
		const halfHeight = state.p.height / 2;
		const topBoundary = state.boundaries.y - halfHeight;
		const bottomBoundary = -state.boundaries.y + halfHeight;

		if (nextPosition <= bottomBoundary) {
			this.mesh.position.z = bottomBoundary;
			return false;
		}
		if (nextPosition >= topBoundary) {
			this.mesh.position.z = topBoundary;
			return false;
		}

		return true;
	}

	// Add movement method
	move(moveY) {
		if (this.checkBoundaries(moveY)) {
			this.mesh.position.z += moveY;
		}
	}
}
