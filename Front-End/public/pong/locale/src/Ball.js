import * as THREE from "three";

export default class Ball {
	constructor(scene, radius) {
		this.scene = scene;
		this.radius = radius;
		this.geometry = new THREE.SphereGeometry(this.radius);
		this.material = new THREE.MeshNormalMaterial();
		this.mesh = new THREE.Mesh(this.geometry, this.material);

		this.scene.add(this.mesh);
	}
}
