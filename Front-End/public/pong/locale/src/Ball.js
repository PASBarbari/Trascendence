import * as THREE from "three";
import { state } from "../state.js";
export default class Ball {
	speed = 25;
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

		// Debug ball parameters
		console.log("Ball position:", this.mesh.position);
		console.log("Direction:", this.dir);
		console.log("Velocity:", this.velocity);

		// Regular boundary collision code...
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

		// Debug target selection
		const playerIndex = this.velocity.x > 0 ? 1 : 0;
		// console.log("Selected player index:", playerIndex);
		// console.log("Players array:", state.players);

		const target = state.players[playerIndex];
		// console.log("Target player:", target);

		// Check collision with helper mesh
		if (target && target.mesh) {
			const helperMesh = target.mesh.children[0];

			// Try raycasting first
			const intersections = this.raycaster.intersectObject(helperMesh);

			// Get distance between ball and paddle
			const distanceToTarget = this.mesh.position.distanceTo(
				target.mesh.position
			);

			// Debug info
			console.log("Distance to target:", distanceToTarget);
			console.log("Target position:", target.mesh.position);
			console.log("Ball position:", this.mesh.position);

			// Calculate collision box for the paddle

			// Check for collision based on distance and position
			if (
				(intersections && intersections.length > 0) ||
				(Math.abs(this.mesh.position.x - target.mesh.position.x) <
					this.radius + state.p.width / 2 &&
					Math.abs(this.mesh.position.z - target.mesh.position.z) <
						state.p.height / 2)
			) {
				console.log("COLLISION DETECTED!");

				// Visual feedback
				this.pointCollision.position.copy(this.mesh.position.clone());

				// Bounce physics
				this.velocity.x *= -1.2;
				console.log("New velocity after bounce:", this.velocity);

				// Add spin based on hit position
				const offset = this.mesh.position.z - target.mesh.position.z;
				this.velocity.z += offset * 0.2;

				// Normalize and maintain speed
				this.velocity.normalize().multiplyScalar(this.speed);
			}
		} else {
			console.warn("Target or target.mesh not found");
		}

		this.mesh.position.copy(tPos);
	}
}
