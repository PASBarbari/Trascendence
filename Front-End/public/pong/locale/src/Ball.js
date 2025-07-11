import * as THREE from "three";
import { state } from "../state.js";
export default class Ball extends THREE.EventDispatcher {
	speed = 25;
	velocity = new THREE.Vector3(1, 0, 0);

	constructor(scene, radius, boundaries, players) {
		super();
		this.scene = scene;
		this.players = players;
		this.radius = radius;
		this.boundaries = boundaries;

		this.geometry = new THREE.SphereGeometry(this.radius);
		this.material = state.mat.ball;
		this.mesh = new THREE.Mesh(this.geometry, this.material);

		// Initialize velocity to zero - will be set when game starts
		this.velocity.set(0, 0, 0);

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
		console.log(`🔄 Ball speed reset! Previous speed: ${this.speed}, resetting to 25`);
		this.speed = 25;
		// Set initial velocity direction (right) and speed
		this.velocity.set(1, 0, 0);
		this.velocity.normalize().multiplyScalar(this.speed);
		console.log(`✅ Ball speed reset complete. New velocity: x=${this.velocity.x.toFixed(2)}, z=${this.velocity.z.toFixed(2)}`);
	}

	update(dt) {
		// Only update ball movement if game is started
		if (!state.isStarted) {
			return;
		}

		// Calculate number of sub-steps based on ball speed
		const substeps = Math.max(1, Math.ceil(this.speed / 15));
		const subDt = dt / substeps;

		// Execute multiple smaller steps
		for (let i = 0; i < substeps; i++) {
			this.updateStep(subDt);
		}
	}

	updateStep(dt) {
		const s = this.velocity.clone().multiplyScalar(dt);
		const tPos = this.mesh.position.clone().add(s);

		this.dir = this.velocity.clone().normalize();
		this.raycaster.set(this.mesh.position, this.dir);

		// FIXED: Improved boundary collision detection
		// Check X boundaries (goals) - ball should score and reset
		if (Math.abs(tPos.x) >= (this.boundaries.x - this.radius)) {
			const message = tPos.x > 0 ? "p1" : "p2";
			console.log(`⚽ GOAL! Ball crossed boundary, scoring for ${message}`);
			this.dispatchEvent({ type: "score", message: message });
			// Reset ball to center
			tPos.set(0, 0, 0);
			this.resetSpeed();
			// Reverse X direction for new serve
			this.velocity.x *= -1;
			this.mesh.position.copy(tPos);
			return; // Skip further processing this frame
		}

		// Check Z boundaries (top/bottom walls) - ball should bounce
		if (Math.abs(tPos.z) >= (this.boundaries.y - this.radius)) {
			this.velocity.z *= -1;
			// Clamp position to boundary
			tPos.z = Math.sign(tPos.z) * (this.boundaries.y - this.radius);
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
			const paddleWidth = state.p.width + state.ball_radius;
			const paddleHeight = state.p.height + state.ball_radius;
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

			// Collision with inner face
			if (
				isInFrontOfInnerFace &&
				isWithinPaddleHeight &&
				distFromInnerFace <= this.radius
			) {
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

				// Log collision and speed
				console.log(`🏓 Ball collision with Player ${playerIndex + 1}! Speed before: ${speed.toFixed(2)}`);

				// FIX: Reverse X direction based on which player was hit
				// If player 0 (left), ball should go right (positive X)
				// If player 1 (right), ball should go left (negative X)
				const xDir = playerIndex === 0 ? 1 : -1;

				// Set new velocity based on bounce angle
				this.velocity.x = xDir * Math.cos(bounceAngle) * speed;
				this.velocity.z = Math.sin(bounceAngle) * speed;

				// Slightly increase speed with each hit to prevent endless rallies
				// More aggressive acceleration like classic Pong
				this.speed *= 1.1; // Increased from 1.05 to 1.1 for more aggressive acceleration
				this.speed = Math.min(this.speed, 100); // Increased max speed from 60 to 100

				console.log(`🚀 Ball speed after acceleration: ${this.speed.toFixed(2)}`);
				console.log(`📐 Ball velocity: x=${this.velocity.x.toFixed(2)}, z=${this.velocity.z.toFixed(2)}`);

				// Update velocity magnitude to match new speed
				this.velocity.normalize().multiplyScalar(this.speed);
			}
		}

		this.mesh.position.copy(tPos);
	}
}
