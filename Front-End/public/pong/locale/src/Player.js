import * as THREE from "three";
import { state } from "../state.js";

const GEOMETRY = new THREE.BoxGeometry(
	state.p.width,
	state.p.height,
	state.p.depth
);
GEOMETRY.rotateX(Math.PI / 2);
const MATERIAL = new THREE.MeshNormalMaterial();

export default class Player {
	constructor(scene, position) {
		this.scene = scene;
		this.geometry = GEOMETRY;
		this.material = MATERIAL;
		this.mesh = new THREE.Mesh(GEOMETRY, MATERIAL);
		this.mesh.position.copy(position);
		this.scene.add(this.mesh);
	}

	// movement(x) {
	// 	if (x > state.boundaries.x - state.p.width / 2) {
	// 		this.mesh.position.x += this.;
	// 	}
	// }
}
