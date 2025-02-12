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
	  type: "slowness",
	  color: 0x0000ff,
	  effect: () => {
		console.log("Slowness power-up collected!");
		state.player_speed = state.ring.y / 130;
		setTimeout(() => {
		  state.player_speed = state.ring.y / 115;
		  console.log("Player speed reset to normal:", state.player_speed);
		}, 5000);
	  },
	},
	{
	  type: "randomstate.Angle",
	  color: 0xff00ff,
	  effect: () => {
		console.log("Random state.angle bounce power-up collected!");
		state.angle = Math.floor(Math.random() * 70);
	  },
	},
	{
	  type: "ninjaBall",
	  color: 0x00ff00,
	  effect: () => {
		console.log("Ninja ball power-up collected!");
		state.mat.ball.color.set("#000000");
		state.mat.ball.emissive.set("#000000");
		setTimeout(() => {
		  state.mat.ball.color.set("#0bff01");
		  state.mat.ball.emissive.set("#0bff01");
		  console.log("ball back to normal");
		}, 5000);
	  },
	},
	{
	  type: "slowerBall",
	  color: 0xff0000,
	  effect: () => {
		let originalSpeed = state.ball_speed;
		console.log("Smaller ball power-up collected!");
		state.ball_speed = state.ring.y / 200;
		setTimeout(() => {
		  state.ball_speed = originalSpeed;
		  console.log("Ball size reset to normal");
		}, 5000);
	  },
	},
	{
	  type: "smallerBall",
	  color: 0xffff00,
	  effect: () => {
		console.log("Smaller ball power-up collected!");
		state.ball.scale.set(0.5, 0.5, 0.5);
		setTimeout(() => {
		  state.ball.scale.set(1, 1, 1);
		  console.log("Ball size reset to normal");
		}, 5000);
	  },
	},
	{
	  type: "changeColors",
	  color: 0x00ffff,
	  effect: () => {
		console.log("Change colors power-up collected!");
		const originalColors = {
		  p1: state.mat.p1.color.getHex(),
		  p2: state.mat.p2.color.getHex(),
		  ball: state.mat.ball.color.getHex(),
		  ring: state.mat.ring.color.getHex(),
		};
		state.mat.p1.color.set(Math.random() * 0xffffff);
		state.mat.p2.color.set(Math.random() * 0xffffff);
		state.mat.ball.color.set(Math.random() * 0xffffff);
		state.mat.ring.color.set(Math.random() * 0xffffff);
		setTimeout(() => {
		  state.mat.p1.color.set(originalColors.p1);
		  state.mat.p2.color.set(originalColors.p2);
		  state.mat.ball.color.set(originalColors.ball);
		  state.mat.ring.color.set(originalColors.ring);
		  console.log("Colors reset to original");
		}, 5000);
	  },
	},
  ];
  
  function spawnPowerUp() {
	const powerUpType =
	  powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
	const geometry = new THREE.SphereGeometry(2.5, 32, 32);
	const material = new THREE.MeshBasicMaterial({ color: powerUpType.color });
	const powerUp = new THREE.Mesh(geometry, material);
  
	powerUp.position.set(
	  ((Math.random() - 0.5) * state.ring.y) / 1.5,
	  ((Math.random() - 0.5) * state.ring.x) / 1.5,
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
	state.player_speed = state.ring.y / 115;
  
	// Reset player sizes
	state.p1.scale.set(1, 1, 1);
	state.p2.scale.set(1, 1, 1);
  
	// Reset ball size
	state.ball.scale.set(1, 1, 1);
  
	// Reset colors
	state.mat.p1.color.set("#4deeea");
	state.mat.p1.emissive.set("#4deeea");
	state.mat.p2.color.set("#ffe700");
	state.mat.p2.emissive.set("#ffe700");
	state.mat.ball.color.set("#0bff01");
	state.mat.ball.emissive.set("#0bff01");
	state.mat.ring.color.set("#ff0000");
	state.mat.ring.emissive.set("#0000ff");
  }
  