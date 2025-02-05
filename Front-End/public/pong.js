import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { Group, remove } from 'three/addons/libs/tween.module.js';
import Stats from 'three/addons/libs/stats.module.js';

function renderPong() {
	document.querySelector('.App').innerHTML = `
		<div class="gamecontainer">
		<div id="menu">
			<button id="newGameButton">New Game</button>
			<button id="settingsButton">Settings</button>
			<button id="exitButton">Exit</button>
		</div>
		<div id="gameModeMenu" style="display: none;">
			<button id="onePlayerButton">1 Player</button>
			<button id="twoPlayerButton">2 Player</button>
			<button id="backButton">Back</button>
		</div>
		<div id="settingsMenu" style="display: none;">
			<div class="color-setting">
				<label for="player1Color">Player 1 Color:</label>
				<div class="color-pickers">
					<input type="color" id="player1Color" name="player1Color" value="#4deeea">
					<input type="color" id="player1Emissive" name="player1Emissive" value="#4deeea">
				</div>
			</div>
			<div class="color-setting">
				<label for="player2Color">Player 2 Color:</label>
				<div class="color-pickers">
					<input type="color" id="player2Color" name="player2Color" value="#ffe700">
					<input type="color" id="player2Emissive" name="player2Emissive" value="#ffe700">
				</div>
			</div>
			<div class="color-setting">
				<label for="ballColor">Ball Color:</label>
				<div class="color-pickers">
					<input type="color" id="ballColor" name="ballColor" value="#0bff01">
					<input type="color" id="ballEmissive" name="ballEmissive" value="#00ff00">
				</div>
			</div>
			<div class="color-setting">
				<label for="ringColor">Ring Color:</label>
				<div class="color-pickers">
					<input type="color" id="ringColor" name="ringColor" value="#ff0000">
					<input type="color" id="ringEmissive" name="ringEmissive" value="#0000ff">
				</div>
			</div>
			<div class="color-setting">
				<label for="showStats">Show Stats:</label>
				<input type="checkbox" id="showStats" name="showStats">
			</div>
			<button id="saveSettingsButton">Save</button>
			<button id="resetSettingsButton">Reset</button>
			<button id="backFromSettingsButton">Back</button>
		</div>
		<div id="pauseMenu" style="display: none;">
			<button id="resumeButton">Resume Game</button>
			<button id="exitButtonPause">Exit</button>
		</div>
		<img id="gameOverImage" src="public/gungeon.png" alt="Game Over" style="display: none;">
		<script type="module" src="/main.js"></script>
	</div>
	`;

	document.getElementById('newGameButton').addEventListener('click', showGameModeMenu);
	document.getElementById('settingsButton').addEventListener('click', showSettingsMenu);
	document.getElementById('exitButton').addEventListener('click', exitGame);
	document.getElementById('onePlayerButton').addEventListener('click', startOnePlayerGame);
	document.getElementById('twoPlayerButton').addEventListener('click', startTwoPlayerGame);
	document.getElementById('backButton').addEventListener('click', showMainMenu);
	document.getElementById('saveSettingsButton').addEventListener('click', saveSettings);
	document.getElementById('resetSettingsButton').addEventListener('click', resetSettings);
	document.getElementById('backFromSettingsButton').addEventListener('click', showMainMenu);
	document.getElementById('resumeButton').addEventListener('click', resumeGame);
	document.getElementById('exitButtonPause').addEventListener('click', exitGame);
	document.getElementById('player1Color').addEventListener('input', (event) => {
		mat.p1.color.set(event.target.value);
	});

	document.getElementById('player1Emissive').addEventListener('input', (event) => {
		mat.p1.emissive.set(event.target.value);
	});

	document.getElementById('player2Color').addEventListener('input', (event) => {
		mat.p2.color.set(event.target.value);
	});

	document.getElementById('player2Emissive').addEventListener('input', (event) => {
		mat.p2.emissive.set(event.target.value);
	});

	document.getElementById('ballColor').addEventListener('input', (event) => {
		mat.ball.color.set(event.target.value);
	});

	document.getElementById('ballEmissive').addEventListener('input', (event) => {
		mat.ball.emissive.set(event.target.value);
	});

	document.getElementById('ringColor').addEventListener('input', (event) => {
		mat.ring.color.set(event.target.value);
	});

	document.getElementById('ringEmissive').addEventListener('input', (event) => {
		mat.ring.emissive.set(event.target.value);
	});

	document.getElementById('showStats').addEventListener('change', (event) => {
		toggleStats(event.target.checked);
	});

	document.getElementById('menu').style.display = 'block';
}

export { renderPong, showGameModeMenu, showSettingsMenu, exitGame, startOnePlayerGame, startTwoPlayerGame, resumeGame, saveSettings, resetSettings, showMainMenu };

let look = { x: 0, y: 0, z: 0 }
let cam = { x: 0, y: 0, z: 100 }
let ring = { x: 0, y: window.innerHeight * 15 / 100, z: 10, h: 3 }
ring.x = (9 / 16 * ring.y) - ring.h;
let player = { y: ring.x / 6, h: 2.5, z: 5 }

let mat = {
	ring: new THREE.MeshStandardMaterial({ color: '#ff0000', emissive: '#0000ff', emissiveIntensity: 0.5, metalness: 0, roughness: 0 }),
	p1: new THREE.MeshStandardMaterial({ color: '#4deeea', emissive: '#4deeea', emissiveIntensity: 0.5, metalness: 0, roughness: 0.5 }),
	p2: new THREE.MeshStandardMaterial({ color: '#ffe700', emissive: '#ffe700', emissiveIntensity: 0.5, metalness: 0, roughness: 0.5 }),
	ball: new THREE.MeshStandardMaterial({ color: '#0bff01', emissive: '#0bff01', emissiveIntensity: 1, metalness: 0, roughness: 0 }),
	score: new THREE.MeshStandardMaterial({ color: '#0bff01', emissive: '#0bff01', emissiveIntensity: 1, metalness: 1, roughness: 0.5 }),
}

let isPaused = true;
let isStarted = false;
let IAisActive = false;
const maxScore = 3;
let wallHitPosition = 0;

//Scene setup

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(cam.x, cam.y, cam.z);
camera.lookAt(look.x, look.y, look.z);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);


//Ring setup

const r_bottom = new THREE.Mesh(new THREE.BoxGeometry(ring.y, ring.h, ring.z), mat.ring);
const r_top = new THREE.Mesh(new THREE.BoxGeometry(ring.y, ring.h, ring.z), mat.ring);
const r_left = new THREE.Mesh(new THREE.BoxGeometry(ring.h, ring.x, ring.z), mat.ring);
const r_right = new THREE.Mesh(new THREE.BoxGeometry(ring.h, ring.x, ring.z), mat.ring);


r_bottom.position.set(0, -((ring.x + ring.h) / 2), 0);
r_top.position.set(0, ((ring.x + ring.h) / 2), 0);
r_left.position.set(-((ring.y - ring.h) / 2), 0, 0);
r_right.position.set(((ring.y - ring.h) / 2), 0, 0);
const ring3D = new THREE.Group();
ring3D.add(r_bottom, r_top, r_left, r_right);


//Players setup

const p1 = new THREE.Mesh(new THREE.BoxGeometry(player.h, player.y, player.z), mat.p1);
const p2 = new THREE.Mesh(new THREE.BoxGeometry(player.h, player.y, player.z), mat.p2);
p1.position.set(-(ring.y * 2 / 5), 0, 0);
p2.position.set((ring.y * 2 / 5), 0, 0);

let player_speed = ring.y / 115;
let p1_score = 0;
let p2_score = 0;
let p1_move_y = 0;
let p2_move_y = 0;

//Ball setup

let ball_radius = ring.y / 80;
let ball_speed = ring.y / 150;
const ball = new THREE.Mesh(new THREE.SphereGeometry(ball_radius), mat.ball);
let angle = Math.floor(Math.random() * 70);
if (angle % 2)
	angle *= -1;
if (angle % 3)
	angle += 180;
let hit_position = 0;
ball.position.set(0, 0, 0);

//Light setup

let dirLight = new THREE.DirectionalLight(0xffffff, 10);
dirLight.position.set(0, 0, 400);
dirLight.target = ball;
scene.add(dirLight);

//Score setup

let scoreText;

function createScore() {
	const loader = new FontLoader();
	const fonts = loader.load(
		// resource URL
		'https://threejs.org/examples/fonts/helvetiker_regular.typeface.json',

		// onLoad callback
		function (font) {
			// do something with the font
			const geometry = new TextGeometry(p1_score + ' : ' + p2_score, {
				font: font,
				size: 10,
				depth: 1,
				curveSegments: 12,
			});
			geometry.computeBoundingBox();
			const centerOffset = -(geometry.boundingBox.max.x - geometry.boundingBox.min.x) / 2;
			scoreText = new THREE.Mesh(geometry, mat.score);
			scoreText.position.set(centerOffset, ring.y / 3, 0);
			scene.add(scoreText);
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

function updateScore() {
	if (scoreText) {
		scene.remove(scoreText);
	}
	createScore();
}

//stats setup

const stats = new Stats();
stats.showPanel(0);
document.body.appendChild(stats.dom);
stats.dom.style.display = 'none'; // Hide stats by default

function toggleStats(show) {
	stats.dom.style.display = show ? 'block' : 'none';
}

//Game setup

const game = new THREE.Group();
game.add(ring3D, p1, p2, ball);
scene.add(game);
createScore();
renderer.render(scene, camera);

//Game logic

let previousTimestamp = 0;
const timeStep = 1000 / 60;

const animate = (timestamp) => {
	stats.begin();
	requestAnimationFrame(animate);
	const deltaTime = timestamp - previousTimestamp;
	if (deltaTime >= timeStep) {
		previousTimestamp = timestamp;
		if (!isPaused) {
			if (p1IsHit()) {
				hit_position = (ball.position.y - p1.position.y);
				wallHitPosition = 0;
				angle = hit_position / (player.h, player.y) * -90;
				if (ball_speed < 5 * player.h)
					ball_speed += 0.1;
			}
			else if (p2IsHit()) {
				hit_position = (ball.position.y - p2.position.y);
				wallHitPosition = 0;
				angle = 180 + (hit_position / (player.h, player.y) * 90);
				if (ball_speed < 5 * player.h)
					ball_speed += 0.1;
			}
			else if ((wallHitPosition <= 0 && ball.position.y + ball_radius + ball_speed >= ring.x / 2)
				|| (wallHitPosition >= 0 && ball.position.y - ball_radius - ball_speed <= -ring.x / 2)) {
				wallHitPosition = ball.position.y;
				angle *= -1;
			}
			else if (ball.position.x - ball_radius < r_left.position.x + ring.h) {
				console.log("p2 ha segnato");
				p2_score += 1;
				score();
			}
			else if (ball.position.x + ball_radius > r_right.position.x - ring.h) {
				console.log("p1 ha segnato");
				p1_score += 1;
				score();
			}
			ball.position.y += ball_speed * -Math.sin(angle * Math.PI / 180);
			ball.position.x += ball_speed * Math.cos(angle * Math.PI / 180);
			if ((p1_move_y > 0 && p1.position.y + player.y / 2 <= ring.x / 2 - ring.h / 2)
				|| (p1_move_y < 0 && p1.position.y - player.y / 2 >= - ring.x / 2 + ring.h / 2))
				p1.position.y += p1_move_y;
			if (IAisActive)
				moveIA();
			if ((p2_move_y > 0 && p2.position.y + player.y / 2 <= ring.x / 2 - ring.h / 2)
				|| (p2_move_y < 0 && p2.position.y - player.y / 2 >= - ring.x / 2 + ring.h / 2))
				p2.position.y += p2_move_y;
			if ((spawnPowerUpFlag && timestamp - lastPowerUpSpawnTime > powerUpInterval) && powerUps.length < 2) {
				spawnPowerUp();
				lastPowerUpSpawnTime = timestamp;
			}
	
			// Handle power-up collisions
			handlePowerUpCollision();
		}
		renderer.render(scene, camera);
		stats.end();
	}
}
requestAnimationFrame(animate);

function p1IsHit() {
	if ((ball.position.x - ball_radius - ball_speed <= p1.position.x + player.h / 2)
		&& (ball.position.x - ball_speed > p1.position.x - player.h / 2)
		&& (ball.position.y - ball_radius <= p1.position.y + player.y / 2)
		&& (ball.position.y + ball_radius >= p1.position.y - player.y / 2))
		return true;
	return false;
}

function p2IsHit() {
	if ((ball.position.x + ball_radius + ball_speed >= p2.position.x - player.h / 2)
		&& (ball.position.x + ball_speed < p2.position.x + player.h / 2)
		&& (ball.position.y - ball_radius <= p2.position.y + player.y / 2)
		&& (ball.position.y + ball_radius >= p2.position.y - player.y / 2))
		return true;
	return false;
}

function score() {
	wallHitPosition = 0;
	updateScore();
	ball.position.set(0, 0, 0);
	ball_speed = ring.y / 150;
	angle = Math.floor(Math.random() * 70);
	if (angle % 2)
		angle *= -1;
	if (angle % 3)
		angle += 180;

	if (p1_score >= maxScore || p2_score >= maxScore) {
		game_over();
	}
}

//AI

function moveIA() {
	const iaSpeed = ring.y / 200;
	const delay = 1;
	const timeStep = 0.01;
	let simulatedBallY = ball.position.y;
	let simulatedBallX = ball.position.x;
	let simulatedAngle = angle;
	let timeElapsed = 0;

	while (timeElapsed < delay) {
		simulatedBallY += ball_speed * Math.sin(simulatedAngle * Math.PI / 180) * timeStep;
		simulatedBallX += ball_speed * Math.cos(simulatedAngle * Math.PI / 180) * timeStep;
		timeElapsed += timeStep;

		if (simulatedBallY + ball_radius + ball_speed > ring.x / 2 || simulatedBallY - ball_radius + ball_speed < -ring.x / 2) {
			simulatedAngle *= -1;
		}
	}

	const futureBallY = simulatedBallY;

	if (futureBallY > p2.position.y + player.y / 4) {
		p2_move_y = iaSpeed;
	} else if (futureBallY < p2.position.y - player.y / 4) {
		p2_move_y = - iaSpeed;
	} else {
		p2_move_y = 0;
	}

	if ((p2_move_y > 0 && p2.position.y + player.y / 2 <= ring.x / 2 - ring.h / 2)
		|| (p2_move_y < 0 && p2.position.y - player.y / 2 >= -ring.x / 2 + ring.h / 2)) {
		p2.position.y += p2_move_y;
	}
}

let powerUps = [];
const powerUpInterval = 5000; // 5 seconds
let spawnPowerUpFlag = false; // Flag to control power-up spawning
let lastPowerUpSpawnTime = 0;

function spawnPowerUp() {
    const geometry = new THREE.SphereGeometry(0.5, 32, 32);
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const powerUp = new THREE.Mesh(geometry, material);

    powerUp.position.set(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
        0
    );

    scene.add(powerUp);
    powerUps.push(powerUp);
}

function checkCollision(ball, powerUp) {
    const ballPosition = new THREE.Vector3().setFromMatrixPosition(ball.matrixWorld);
    const powerUpPosition = new THREE.Vector3().setFromMatrixPosition(powerUp.matrixWorld);

    const distance = ballPosition.distanceTo(powerUpPosition);
    return distance < ball_radius; // Adjust the collision distance as needed
}

function handlePowerUpCollision() {
    powerUps.forEach((powerUp, index) => {
        if (checkCollision(ball, powerUp)) {
            // Handle the power-up effect here
            console.log('Power-up collected!');
            scene.remove(powerUp);
            powerUps.splice(index, 1);
        }
    });
}

//Game restart

function restart_game() {
	p1_score = 0;
	p2_score = 0;
	wallHitPosition = 0; 1
	document.getElementById('gameOverImage').style.display = 'none';
	removeWinnerText();
	updateScore();
	ball.position.set(0, 0, 0);
	ball_speed = ring.y / 150;
	p1.position.set(-(ring.y * 2 / 5), 0, 0);
	p2.position.set((ring.y * 2 / 5), 0, 0);
	angle = Math.floor(Math.random() * 70);
	if (angle % 2)
		angle *= -1;
	if (angle % 3)
		angle += 180;
	cam = { x: 0, y: 0, z: 100 };
	look = { x: 0, y: 0, z: 0 };
	camera.position.set(cam.x, cam.y, cam.z);
	camera.lookAt(look.x, look.y, look.z)
	if (powerUps.length > 0) {
		powerUps.forEach(powerUp => scene.remove(powerUp));
		powerUps = [];
	}
}

//Game over

let particleSystem;

function createParticleExplosion(position) {
	const particleCount = 1000;
	const particles = new THREE.BufferGeometry();
	const positions = new Float32Array(particleCount * 3);
	const velocities = new Float32Array(particleCount * 3);
	const colors = new Float32Array(particleCount * 3);

	for (let i = 0; i < particleCount; i++) {
		const i3 = i * 6;
		positions[i3] = position.x;
		positions[i3 + 1] = position.y;
		positions[i3 + 2] = position.z;

		velocities[i3] = (Math.random() - 0.5) * 128;
		velocities[i3 + 1] = (Math.random() - 0.5) * 128;
		velocities[i3 + 2] = (Math.random() - 0.5) * 128;

		colors[i3] = Math.random();
		colors[i3 + 1] = Math.random();
		colors[i3 + 2] = Math.random();
	}

	particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
	particles.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
	particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));

	const pMaterial = new THREE.PointsMaterial({
		size: 0.5,
		vertexColors: true,
		blending: THREE.AdditiveBlending,
		transparent: true
	});

	particleSystem = new THREE.Points(particles, pMaterial);
	scene.add(particleSystem);

	// Animate particles
	const animateParticles = () => {
		requestAnimationFrame(animateParticles);
		const positions = particles.attributes.position.array;
		const velocities = particles.attributes.velocity.array;

		for (let i = 0; i < particleCount; i++) {
			const i3 = i * 3;
			positions[i3] += velocities[i3] * 0.1;
			positions[i3 + 1] += velocities[i3 + 1] * 0.1;
			positions[i3 + 2] += velocities[i3 + 2] * 0.1;
		}

		particles.attributes.position.needsUpdate = true;
		renderer.render(scene, camera);
	};
	animateParticles();

	setTimeout(() => {
		disposeParticleSystem(particleSystem);
	}, 2000);
}

function disposeParticleSystem(particleSystem) {
	if (particleSystem) {
		particleSystem.geometry.dispose();
		particleSystem.material.dispose();
		scene.remove(particleSystem);
		particleSystem = null;
	}
}

let winnerText;

function createWinnerText(winner) {
	const loader = new FontLoader();
	loader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', function (font) {
		const geometry = new TextGeometry(`${winner} Wins!`, {
			font: font,
			size: 10,
			depth: 1,
			curveSegments: 12,
			bevelEnabled: false,
		});
		geometry.computeBoundingBox();
		const centerOffset = -0.5 * (geometry.boundingBox.max.x - geometry.boundingBox.min.x);
		winnerText = new THREE.Mesh(geometry, mat.score);
		winnerText.position.set(centerOffset, 20, 0);
		scene.add(winnerText);
		renderer.render(scene, camera);
	});
}

function removeWinnerText() {
	if (winnerText) {
		scene.remove(winnerText);
	}
}

function game_over() {
	isStarted = false;
	isPaused = true;
	document.getElementById('gameOverImage').style.display = 'block';
	const winner = p1_score >= maxScore ? 'Player 1' : 'Player 2';
	createWinnerText(winner);
	showMainMenu();
}

//Resize handler

window.addEventListener('resize', () => {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
});


//Keyboard setup

document.addEventListener("keydown", function (event) {
	if (event.key.toLowerCase() == 'w')
		p1_move_y = player_speed;
	if (event.key.toLowerCase() == 's')
		p1_move_y = -player_speed;
	if (event.key == 'ArrowUp' && !IAisActive)
		p2_move_y = player_speed;
	if (event.key == 'ArrowDown' && !IAisActive)
		p2_move_y = -player_speed;
	if (event.key == 'Escape' && isStarted) {
		if (isPaused) {
			resumeGame();
		} else {
			isPaused = true;
			showPauseMenu();
		}
	}
});

document.addEventListener("keyup", function (event) {
	if (event.key.toLowerCase() == 'w')
		p1_move_y = 0;
	if (event.key.toLowerCase() == 's')
		p1_move_y = 0;
	if (event.key == 'ArrowUp' && !IAisActive)
		p2_move_y = 0;
	if (event.key == 'ArrowDown' && !IAisActive)
		p2_move_y = 0;

});

document.addEventListener("wheel", function (event) {
	cam.z += event.deltaY / 10;
	camera.position.set(cam.x, cam.y, cam.z);
});

document.addEventListener("mousemove", function (event) {
	const rect = renderer.domElement.getBoundingClientRect();
	const mouse = {
		x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
		y: -((event.clientY - rect.top) / rect.height) * 2 + 1
	};
	// console.log(mouse);
});

//Menu setup

function saveSettings() {
	const player1Color = document.getElementById('player1Color').value;
	const player1Emissive = document.getElementById('player1Emissive').value;
	const player2Color = document.getElementById('player2Color').value;
	const player2Emissive = document.getElementById('player2Emissive').value;
	const ballColor = document.getElementById('ballColor').value;
	const ballEmissive = document.getElementById('ballEmissive').value;
	const ringColor = document.getElementById('ringColor').value;
	const ringEmissive = document.getElementById('ringEmissive').value;

	mat.p1.color.set(player1Color);
	mat.p1.emissive.set(player1Emissive);
	mat.p2.color.set(player2Color);
	mat.p2.emissive.set(player2Emissive);
	mat.ball.color.set(ballColor);
	mat.ball.emissive.set(ballEmissive);
	mat.ring.color.set(ringColor);
	mat.ring.emissive.set(ringEmissive);

	showMainMenu();

}

function resetSettings() {

	document.getElementById('player1Color').value = '#4deeea';
	document.getElementById('player1Emissive').value = '#4deeea';
	document.getElementById('player2Color').value = '#ffe700';
	document.getElementById('player2Emissive').value = '#ffe700';
	document.getElementById('ballColor').value = '#0bff01';
	document.getElementById('ballEmissive').value = '#0bff01';
	document.getElementById('ringColor').value = '#ff0000';
	document.getElementById('ringEmissive').value = '#0000ff';

	mat.p1.color.set('#4deeea');
	mat.p1.emissive.set('#4deeea');
	mat.p2.color.set('#ffe700');
	mat.p2.emissive.set('#ffe700');
	mat.ball.color.set('#0bff01');
	mat.ball.emissive.set('#0bff01');
	mat.ring.color.set('#ff0000');
	mat.ring.emissive.set('#0000ff');

	ring3D.material.color.set(ringColor);
	ring3D.material.emissive.set(ringEmissive);
}

function showGameModeMenu() {
	document.getElementById('menu').style.display = 'none';
	document.getElementById('gameModeMenu').style.display = 'block';
}

function showMainMenu() {
	document.getElementById('gameModeMenu').style.display = 'none';
	document.getElementById('settingsMenu').style.display = 'none';
	document.getElementById('pauseMenu').style.display = 'none';
	document.getElementById('menu').style.display = 'block';
}

function showSettingsMenu() {
	document.getElementById('menu').style.display = 'none';
	document.getElementById('settingsMenu').style.display = 'block';
}

function showPauseMenu() {
	document.getElementById('pauseMenu').style.display = 'block';
}

function hidePauseMenu() {
	document.getElementById('pauseMenu').style.display = 'none';
}

function startOnePlayerGame() {
	document.getElementById('gameModeMenu').style.display = 'none';
	restart_game();
	isStarted = true;
	IAisActive = true;
	isPaused = false;
	spawnPowerUpFlag = true;
	animate();
}

function startTwoPlayerGame() {
	document.getElementById('gameModeMenu').style.display = 'none';
	restart_game();
	isStarted = true;
	isPaused = false;
	IAisActive = false;
	animate();
}

function resumeGame() {
	hidePauseMenu();
	isPaused = false;
	animate();
}

function exitGame() {
	isStarted = false;
	isPaused = true;
	IAisActive = false;
	showMainMenu();
	restart_game();
}


