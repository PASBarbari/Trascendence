import * as THREE from "three";

export default class Ball {
	speed = 10;
	velocity = new THREE.Vector3(0.5, 0, 1);

	constructor(scene, radius, boundaries) {
		this.scene = scene;
		this.radius = radius;
		this.boundaries = boundaries;
		this.geometry = new THREE.SphereGeometry(this.radius);
		this.material = new THREE.MeshNormalMaterial();
		this.mesh = new THREE.Mesh(this.geometry, this.material);

		this.velocity.multiplyScalar(this.speed);

		this.scene.add(this.mesh);
	}

	update(dt) {
		const s = this.velocity.clone().multiplyScalar(dt);
		const tPos = this.mesh.position.clone().add(s);

		//gestione collisioni
		const dx =
			this.boundaries.x - this.radius - Math.abs(this.mesh.position.x);
		const dz =
			this.boundaries.y - this.radius - Math.abs(this.mesh.position.z);
		if (dx <= 0) {
			tPos.set(0, 0, 0);
			this.velocity.x *= -1;
		}
		if (dz <= 0) {
			this.velocity.z *= -1;
			tPos.z =
				(this.boundaries.y - this.radius + dz) *
				Math.sign(this.mesh.position.z);
		}

		this.mesh.position.copy(tPos);
	}
}
