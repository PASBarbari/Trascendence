import * as THREE from "three";
import { state } from "../state.js";
export default class Ball {
	speed = 10;
	velocity = new THREE.Vector3(0.5, 0, 1);

	constructor(scene, radius, boundaries, players) {
		this.scene = scene;
		this.players = players;
		this.radius = radius;
		this.boundaries = boundaries;

		this.geometry = new THREE.SphereGeometry(this.radius);
		this.material = new THREE.MeshNormalMaterial();
		this.mesh = new THREE.Mesh(this.geometry, this.material);

		this.velocity.multiplyScalar(this.speed);

		this.raycaster = new THREE.Raycaster();
		this.raycaster.near = 0;
		this.raycaster.far = this.boundaries.y * 2.5;

		this.pointCollision = new THREE.Mesh(
			new THREE.SphereGeometry(1),
			new THREE.MeshBasicMaterial({ color: 0xff0000 })
		);
		state.game.add(this.pointCollision);
		state.game.add(this.mesh);
		state.ball = this;
	}

	update(dt) {
		const s = this.velocity.clone().multiplyScalar(dt);
		const tPos = this.mesh.position.clone().add(s);

		this.dir = this.velocity.clone().normalize();
		this.raycaster.set(this.mesh.position, this.dir);

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

		// Get target player based on ball direction
		const target = state.players[this.velocity.x > 0 ? 1 : 0];
		// Check collision with helper mesh
		if (target && target.mesh) {
			const helperMesh = target.mesh.children[0]; // This gets the helperMesh
			console.log(
				"Checking collision with player helper mesh",
				helperMesh
			);
			// if (helperMesh) {
			// 	const intersections =
			// 		this.raycaster.intersectObject(helperMesh);
			// 	if (intersections) {
			// 		console.log("Collision detected with player!");
			// 		this.pointCollision.position.copy(intersections.point);

			// 		// Add spin based on hit position
			// 		// const offset =
			// 		// 	intersections[0].point.z - target.mesh.position.z;
			// 		// this.velocity.z += offset * 0.1;

			// 		// // Normalize and maintain speed
			// 		// this.velocity.normalize().multiplyScalar(this.speed);
			// 	} else {
			// 		this.pointCollision.position.set(0, 0, 0);
			// 	}
			// }
		}
		this.mesh.position.copy(tPos);
	}
}
