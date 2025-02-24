import * as THREE from "three";
import { FontLoader } from "three/addons/loaders/FontLoader.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import { Group, remove } from "three/addons/libs/tween.module.js";
import { state } from "./state.js";
import * as IA from "./ai.js";
import * as UTILS from "./utils.js";
import * as SETUP from "./setup.js";
import * as SETTINGS from "./settings.js";

export { spawnPowerUp, handlePowerUpCollision, resetPowerUps };

const powerUpTypes = [
	{
		type: "ringRotationX",
		color: 0x00ff00,
		effect: () => {
			state.scene.rotation.x += Math.PI;
		},
	},
	{
		type: "ringRotationY",
		color: 0x00ffff,
		effect: () => {
			state.scene.rotation.y += Math.PI;
		},
	},
	{
		type: "ringRotationZ",
		color: 0xffff00,
		effect: () => {
			state.scene.rotation.z += Math.PI;
		},
	},
];

function spawnPowerUp() {
	const powerUpType =
		powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
	const geometry = new THREE.SphereGeometry(2, 32, 32);
	const material = new THREE.MeshStandardMaterial({
		color: powerUpType.color,
		emissive: powerUpType.color,
		emissiveIntensity: 0.5,
		metalness: 0,
		roughness: 0,
	});
	const powerUp = new THREE.Mesh(geometry, material);

	powerUp.position.set(
		((Math.random() - 0.5) * state.ring.height) / 1.5,
		((Math.random() - 0.5) * state.ring.length) / 1.5,
		0
	);

	powerUp.userData = { type: powerUpType.type, effect: powerUpType.effect };
	state.scene.add(powerUp);
	state.powerUps.push(powerUp);
}

function handlePowerUpCollision() {
	state.powerUps.forEach((powerUp, index) => {
		if (UTILS.checkCollision(state.ball, powerUp)) {
			// Handle the power-up effect here
			console.log(`${powerUp.userData.type} power-up collected!`);
			powerUp.userData.effect();
			state.scene.remove(powerUp);
			state.powerUps.splice(index, 1);
		}
	});
}

function resetPowerUps() {
	// Reset player speed
	state.player_speed = state.game.playerSpeed;
	state.ball_speed = state.game.ballSpeed;
	state.ball_radius = state.game.ballRadius;
	state.p1.material.color.set(state.game.player1Color);
	state.p1.material.emissive.set(state.game.player1Emissive);
	state.p2.material.color.set(state.game.player2Color);
	state.p2.material.emissive.set(state.game.player2Emissive);
	state.ball.material.color.set(state.game.ballColor);
	state.r_bottom.material.color.set(state.game.ringColor);
	state.r_bottom.material.emissive.set(state.game.ringEmissive);
	state.r_top.material.color.set(state.game.ringColor);
	state.r_top.material.emissive.set(state.game.ringEmissive);
	state.r_left.material.color.set(state.game.ringColor);
	state.r_left.material.emissive.set(state.game.ringEmissive);
	state.r_right.material.color.set(state.game.ringColor);
	state.r_right.material.emissive.set(state.game.ringEmissive);
	state.scene.rotation.set(0, 0, 0);
}
