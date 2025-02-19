import * as THREE from 'three';
import { state } from './state.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import * as UP from './powerups.js';
import * as SETTINGS from './settings.js';
import * as SETUP from './setup.js';


export function createScore() {
	const loader = new FontLoader();
	const fonts = loader.load(
		// resource URL
		'https://threejs.org/examples/fonts/helvetiker_regular.typeface.json',

		// onLoad callback
		function (font) {
			// do something with the font
			const geometry = new TextGeometry(state.p1_score + ' : ' + state.p2_score, {
				font: font,
				size: 10,
				depth: 1,
				curveSegments: 12,
			});
			geometry.computeBoundingBox();
			const centerOffset = -(geometry.boundingBox.max.x - geometry.boundingBox.min.x) / 2;
			state.scoreText = new THREE.Mesh(geometry, state.mat.score);
			state.scoreText.position.set(centerOffset, state.ring.y / 3, 0);
			state.scene.add(state.scoreText);
		},

		// onProgress callback
		function (xhr) {
			// console.log( (xhr.loaded / xhr.total * 100) + '% loaded' );
		},

		// onError callback
		function (err) {
			console.log('An error happened');
		}
	);
}

export function updateScore() {
	if (state.scoreText) {
		state.scene.remove(state.scoreText);
	}
	createScore();
}

export function toggleStats(show) {
	state.stats.dom.style.display = show ? 'block' : 'none';
}

export function p1IsHit() {
	if (
	  state.ball.position.x - state.ball_radius - state.ball_speed <=
		state.p1.position.x + state.player.h / 2 &&
	  state.ball.position.x - state.ball_speed >
		state.p1.position.x - state.player.h / 2 &&
	  state.ball.position.y - state.ball_radius <=
		state.p1.position.y + state.player.y / 2 &&
	  state.ball.position.y + state.ball_radius >=
		state.p1.position.y - state.player.y / 2
	)
	  return true;
	return false;
  }

export function p2IsHit() {
  if (
	state.ball.position.x + state.ball_radius + state.ball_speed >=
	  state.p2.position.x - state.player.h / 2 &&
	state.ball.position.x + state.ball_speed <
	  state.p2.position.x + state.player.h / 2 &&
	state.ball.position.y - state.ball_radius <=
	  state.p2.position.y + state.player.y / 2 &&
	state.ball.position.y + state.ball_radius >=
	  state.p2.position.y - state.player.y / 2
  )
	return true;
  return false;
}

export function score() {
	state.wallHitPosition = 0;
	updateScore();
	state.ball.position.set(0, 0, 0);
	state.ball_speed = state.ring.y / 150;
	state.angle = Math.floor(Math.random() * 70);
	if (state.angle % 2) state.angle *= -1;
	if (state.angle % 3) state.angle += 180;
  
	if (state.p1_score >= state.maxScore || state.p2_score >= state.maxScore) {
	  game_over();
	}
  
	UP.resetPowerUps();
  }

export function checkCollision(ball, powerUp) {
	if (
	  state.ball.position.x - state.ball_radius <= powerUp.position.x + 1.25 &&
	  state.ball.position.x + state.ball_radius >= powerUp.position.x - 1.25 &&
	  state.ball.position.y - state.ball_radius <= powerUp.position.y + 1.25 &&
	  state.ball.position.y + state.ball_radius >= powerUp.position.y - 1.25
	)
	  return true;
  }

export function createWinnerText(winner) {
	const loader = new FontLoader();
	loader.load(
	  "https://threejs.org/examples/fonts/helvetiker_regular.typeface.json",
	  function (font) {
		const geometry = new TextGeometry(`${winner} Wins!`, {
		  font: font,
		  size: 10,
		  depth: 1,
		  curveSegments: 12,
		  bevelEnabled: false,
		});
		geometry.computeBoundingBox();
		const centerOffset =
		  -0.5 * (geometry.boundingBox.max.x - geometry.boundingBox.min.x);
		state.winnerText = new THREE.Mesh(geometry, state.mat.score);
		state.winnerText.position.set(centerOffset, 20, 0);
		state.scene.add(state.winnerText);
		state.renderer.render(state.scene, state.camera);
	  }
	);
  }

export  function removeWinnerText() {
	if (state.winnerText) {
	  state.scene.remove(state.winnerText);
	}
  }

export function restart_game() {
  state.p1_score = 0;
  state.p2_score = 0;
  state.p2_move_y = 0;
  state.p1_move_y = 0;
  state.wallHitPosition = 0;
  state.lastPowerUpSpawnTime = 0;
  removeWinnerText();
  updateScore();
  state.ball.position.set(0, 0, 0);
  state.ball_speed = state.ring.y / 150;
  state.p1.position.set(-((state.ring.y * 2) / 5), 0, 0);
  state.p2.position.set((state.ring.y * 2) / 5, 0, 0);
  state.angle = Math.floor(Math.random() * 70);
  if (state.angle % 2) state.angle *= -1;
  if (state.angle % 3) state.angle += 180;
  state.camera.position.set(state.cam.x, state.cam.y, state.cam.z);
  state.camera.lookAt(state.look.x, state.look.y, state.look.z);
  if (state.powerUps.length > 0) {
	state.powerUps.forEach((powerUp) => state.scene.remove(powerUp));
	state.powerUps = [];
  }
  state.scene.rotation.set(0, 0, 0);
  SETUP.initGame();
}

export function game_over() {
	state.isStarted = false;
	state.isPaused = true;
	document.getElementById("gameOverImage").style.display = "block";
	const winner = state.p1_score >= state.maxScore ? "Player 1" : "Player 2";
	createWinnerText(winner);
	UP.resetPowerUps();
	state.powerUps.forEach((powerUp) => state.scene.remove(powerUp));
	SETTINGS.showMainMenu();
}