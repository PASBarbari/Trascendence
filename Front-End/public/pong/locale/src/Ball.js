import * as THREE from "three";
import { state } from "../state.js";
export default class Ball extends THREE.EventDispatcher {
	speed = 25;
	velocity = new THREE.Vector3(0.5, 0, 1);

	constructor(scene, radius, boundaries, players) {
		super();
		this.scene = scene;
		this.players = players;
		this.radius = radius;
		this.boundaries = boundaries;

		this.geometry = new THREE.SphereGeometry(this.radius);
		this.material = state.mat.ball;
		this.mesh = new THREE.Mesh(this.geometry, this.material);

		this.velocity.multiplyScalar(this.speed);

		this.raycaster = new THREE.Raycaster();
		this.raycaster.near = 0;
		this.raycaster.far = this.boundaries.y * 2.5;

		this.mesh.castShadow = true;
		// this.pointCollision = new THREE.Mesh(
		// 	new THREE.SphereGeometry(1),
		// 	new THREE.MeshBasicMaterial({ color: 0xff0000 })
		// );
		// state.game.add(this.pointCollision);
		state.game.add(this.mesh);
		state.ball = this;
	}

	resetSpeed() {
		this.speed = 25;
		this.velocity.normalize().multiplyScalar(this.speed);
	}

	update(dt) {
		const s = this.velocity.clone().multiplyScalar(dt);
		const tPos = this.mesh.position.clone().add(s);

		this.dir = this.velocity.clone().normalize();
		this.raycaster.set(this.mesh.position, this.dir);

		// Debug ball parameters
		// Regular boundary collision code...
		const dx =
			this.boundaries.x - this.radius - Math.abs(this.mesh.position.x);
		const dz =
			this.boundaries.y - this.radius - Math.abs(this.mesh.position.z);
		if (dx <= 0) {
			const message = this.mesh.position.x > 0 ? "p1" : "p2";
			this.dispatchEvent({ type: "score", message: message });
			tPos.set(0, 0, 0);
			this.resetSpeed();
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

			// Get paddle dimensions
			const paddleWidth = state.p.width;
			const paddleHeight = state.p.height;
			const paddleHalfWidth = paddleWidth / 2;
			const paddleHalfHeight = paddleHeight / 2;

			// Calculate relative position of ball to paddle
			const relativePos = this.mesh.position
				.clone()
				.sub(target.mesh.position);

			// Inner face X position (facing the playing field)
			const innerFaceX =
				playerIndex === 0 ? paddleHalfWidth : -paddleHalfWidth;
			// Bottom edge Z position
			const bottomEdgeZ = -paddleHalfHeight;

			// Distance from inner face and bottom edge
			const distFromInnerFace = Math.abs(relativePos.x - innerFaceX);
			const distFromBottom = Math.abs(relativePos.z - bottomEdgeZ);

			// Check if ball is in front of the inner face or above/below the bottom edge
			const isInFrontOfInnerFace =
				(playerIndex === 0 && relativePos.x > innerFaceX) ||
				(playerIndex === 1 && relativePos.x < innerFaceX);
			const isNearBottom =
				Math.abs(relativePos.z - bottomEdgeZ) < this.radius;

			// Check if the ball is within the paddle's height range (for inner face collision)
			const isWithinPaddleHeight =
				Math.abs(relativePos.z) <= paddleHalfHeight;

			// Check if the ball is within the paddle's width range (for bottom edge collision)
			const isWithinPaddleWidth =
				Math.abs(relativePos.x) <= paddleHalfWidth;

			// ...existing code...

			// ...existing code...

			// Collision with inner face
			if (
				isInFrontOfInnerFace &&
				isWithinPaddleHeight &&
				distFromInnerFace <= this.radius
			) {
				console.log("COLLISION DETECTED on inner face!");

				// Visual feedback
				const collisionPoint = target.mesh.position.clone();
				collisionPoint.x += innerFaceX;
				collisionPoint.z += relativePos.z;
				// this.pointCollision.position.copy(collisionPoint);

				// Calculate hit position relative to paddle center (range: -1 to 1)
				const hitPosition = relativePos.z / paddleHalfHeight;

				// Bounce angle varies based on hit position (center = straight, edges = angled)
				// Max angle is about 75 degrees (1.3 radians)
				const bounceAngle = hitPosition * 1.3;

				// Calculate new velocity components
				const speed = this.speed;

				// FIX: Reverse X direction based on which player was hit
				// If player 0 (left), ball should go right (positive X)
				// If player 1 (right), ball should go left (negative X)
				const xDir = playerIndex === 0 ? 1 : -1;

				// Set new velocity based on bounce angle
				this.velocity.x = xDir * Math.cos(bounceAngle) * speed;
				this.velocity.z = Math.sin(bounceAngle) * speed;

				// Slightly increase speed with each hit to prevent endless rallies
				this.speed *= 1.1;
				console.log("New speed after hit:", this.speed);
				this.speed = Math.min(this.speed, 90); // Cap max speed
			}
		} else {
			console.warn("Target or target.mesh not found");
		}

		this.mesh.position.copy(tPos);
	}
}
