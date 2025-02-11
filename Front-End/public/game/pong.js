import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { Group, remove } from 'three/addons/libs/tween.module.js';
import { state } from './state.js';
import { moveIA } from './ai.js';
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
		state.mat.p1.color.set(event.target.value);
	});

	document.getElementById('player1Emissive').addEventListener('input', (event) => {
		state.mat.p1.emissive.set(event.target.value);
	});

	document.getElementById('player2Color').addEventListener('input', (event) => {
		state.mat.p2.color.set(event.target.value);
	});

	document.getElementById('player2Emissive').addEventListener('input', (event) => {
		state.mat.p2.emissive.set(event.target.value);
	});

	document.getElementById('ballColor').addEventListener('input', (event) => {
		state.mat.ball.color.set(event.target.value);
	});

	document.getElementById('ballEmissive').addEventListener('input', (event) => {
		state.mat.ball.emissive.set(event.target.value);
	});

	document.getElementById('ringColor').addEventListener('input', (event) => {
		state.mat.ring.color.set(event.target.value);
	});

	document.getElementById('ringEmissive').addEventListener('input', (event) => {
		state.mat.ring.emissive.set(event.target.value);
	});

	document.getElementById('showStats').addEventListener('change', (event) => {
		toggleStats(event.target.checked);
	});

	document.getElementById('menu').style.display = 'block';
}

export { renderPong, showGameModeMenu, showSettingsMenu, exitGame, startOnePlayerGame, startTwoPlayerGame, resumeGame, saveSettings, resetSettings, showMainMenu };

//Scene setup

state.scene = new THREE.Scene();
state.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
state.camera.position.set(state.cam.x, state.cam.y, state.cam.z);
state.camera.lookAt(state.look.x, state.look.y, state.look.z);

state.renderer = new THREE.WebGLRenderer();
state.renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(state.renderer.domElement);


//Ring setup

const r_bottom = new THREE.Mesh(new THREE.BoxGeometry(state.ring.y, state.ring.h, state.ring.z), state.mat.ring);
const r_top = new THREE.Mesh(new THREE.BoxGeometry(state.ring.y, state.ring.h, state.ring.z), state.mat.ring);
const r_left = new THREE.Mesh(new THREE.BoxGeometry(state.ring.h, state.ring.x, state.ring.z), state.mat.ring);
const r_right = new THREE.Mesh(new THREE.BoxGeometry(state.ring.h, state.ring.x, state.ring.z), state.mat.ring);


r_bottom.position.set(0, -((state.ring.x + state.ring.h) / 2), 0);
r_top.position.set(0, ((state.ring.x + state.ring.h) / 2), 0);
r_left.position.set(-((state.ring.y - state.ring.h) / 2), 0, 0);
r_right.position.set(((state.ring.y - state.ring.h) / 2), 0, 0);
state.ring3D = new THREE.Group();
state.ring3D.add(r_bottom, r_top, r_left, r_right);


//Players setup

state.p1 = new THREE.Mesh(new THREE.BoxGeometry(state.player.h, state.player.y, state.player.z), state.mat.p1);
state.p2 = new THREE.Mesh(new THREE.BoxGeometry(state.player.h, state.player.y, state.player.z), state.mat.p2);
state.p1.position.set(-(state.ring.y * 2 / 5), 0, 0);
state.p2.position.set((state.ring.y * 2 / 5), 0, 0);

//Ball setup

state.ball = new THREE.Mesh(new THREE.SphereGeometry(state.ball_radius), state.mat.ball);
state.ball.position.set(0, 0, 0);

//Light setup

let dirLight = new THREE.DirectionalLight(0xffffff, 10);
dirLight.position.set(0, 0, 400);
dirLight.target = state.ball;
state.scene.add(dirLight);

//Score setup

function createScore() {
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

function updateScore() {
	if (state.scoreText) {
		state.scene.remove(state.scoreText);
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
game.add(state.ring3D, state.p1, state.p2, state.ball);
state.scene.add(game);
createScore();
state.renderer.render(state.scene, state.camera);

//Game logic

let previousTimestamp = 0;
const timeStep = 1000 / 60;

const animate = (timestamp) => {
	stats.begin();
	requestAnimationFrame(animate);
	const deltaTime = timestamp - previousTimestamp;
	if (deltaTime >= timeStep) {
		previousTimestamp = timestamp;
		if (!state.isPaused) {
			if (p1IsHit()) {
				state.hit_position = (state.ball.position.y - state.p1.position.y);
				state.wallHitPosition = 0;
				state.angle = state.hit_position / (state.player.h, state.player.y) * -90;
				if (state.ball_speed < 5 * state.player.h)
					state.ball_speed += 0.1;
			}
			else if (p2IsHit()) {
				state.hit_position = (state.ball.position.y - state.p2.position.y);
				state.wallHitPosition = 0;
				state.angle = 180 + (state.hit_position / (state.player.h, state.player.y) * 90);
				if (state.ball_speed < 5 * state.player.h)
					state.ball_speed += 0.1;
			}
			else if ((state.wallHitPosition <= 0 && state.ball.position.y + state.ball_radius + state.ball_speed >= state.ring.x / 2)
				|| (state.wallHitPosition >= 0 && state.ball.position.y - state.ball_radius - state.ball_speed <= -state.ring.x / 2)) {
				state.wallHitPosition = state.ball.position.y;
				state.angle *= -1;
			}
			else if (state.ball.position.x - state.ball_radius < r_left.position.x + state.ring.h) {
				console.log("p2 ha segnato");
				state.p2_score += 1;
				score();
			}
			else if (state.ball.position.x + state.ball_radius > r_right.position.x - state.ring.h) {
				console.log("p1 ha segnato");
				state.p1_score += 1;
				score();
			}
			state.ball.position.y += state.ball_speed * -Math.sin(state.angle * Math.PI / 180);
			state.ball.position.x += state.ball_speed * Math.cos(state.angle * Math.PI / 180);
			if ((state.p1_move_y > 0 && state.p1.position.y + state.player.y / 2 <= state.ring.x / 2 - state.ring.h / 2)
				|| (state.p1_move_y < 0 && state.p1.position.y - state.player.y / 2 >= - state.ring.x / 2 + state.ring.h / 2))
				state.p1.position.y += state.p1_move_y;
			if (state.IAisActive)
				moveIA();
			if ((state.p2_move_y > 0 && state.p2.position.y + state.player.y / 2 <= state.ring.x / 2 - state.ring.h / 2)
				|| (state.p2_move_y < 0 && state.p2.position.y - state.player.y / 2 >= - state.ring.x / 2 + state.ring.h / 2))
				state.p2.position.y += state.p2_move_y;
			if ((state.spawnPowerUpFlag && timestamp - state.lastPowerUpSpawnTime > state.powerUpInterval) && state.powerUps.length < 10) {
				spawnPowerUp();
				state.lastPowerUpSpawnTime = timestamp;
			}
	
			// Handle power-up collisions
			handlePowerUpCollision();
		}
		state.renderer.render(state.scene, state.camera);
		stats.end();
	}
}
requestAnimationFrame(animate);

function p1IsHit() {
	if ((state.ball.position.x - state.ball_radius - state.ball_speed <= state.p1.position.x + state.player.h / 2)
		&& (state.ball.position.x - state.ball_speed > state.p1.position.x - state.player.h / 2)
		&& (state.ball.position.y - state.ball_radius <= state.p1.position.y + state.player.y / 2)
		&& (state.ball.position.y + state.ball_radius >= state.p1.position.y - state.player.y / 2))
		return true;
	return false;
}

function p2IsHit() {
	if ((state.ball.position.x + state.ball_radius + state.ball_speed >= state.p2.position.x - state.player.h / 2)
		&& (state.ball.position.x + state.ball_speed < state.p2.position.x + state.player.h / 2)
		&& (state.ball.position.y - state.ball_radius <= state.p2.position.y + state.player.y / 2)
		&& (state.ball.position.y + state.ball_radius >= state.p2.position.y - state.player.y / 2))
		return true;
	return false;
}

function score() {
	state.wallHitPosition = 0;
	updateScore();
	state.ball.position.set(0, 0, 0);
	state.ball_speed = state.ring.y / 150;
	state.angle = Math.floor(Math.random() * 70);
	if (state.angle % 2)
		state.angle *= -1;
	if (state.angle % 3)
		state.angle += 180;

	if (state.p1_score >= state.maxScore || state.p2_score >= state.maxScore) {
		game_over();
	}

	resetPowerUps();
}

//AI

// power-up logic
const powerUpTypes = [
    {
        type: 'slowness',
        color: 0x0000ff,
        effect: () => {
            console.log('Slowness power-up collected!');
            state.player_speed = state.ring.y / 130;
            setTimeout(() => {
                state.player_speed = state.ring.y / 115;
                console.log('Player speed reset to normal:', state.player_speed);
            }, 5000);
        }
    },
    {
        type: 'randomstate.Angle',
        color: 0xff00ff,
        effect: () => {
            console.log('Random state.angle bounce power-up collected!');
            state.angle = Math.floor(Math.random() * 70);
        }
    },
    {
        type: 'ninjaBall',
        color: 0x00ff00,
        effect: () => {
            console.log('Ninja ball power-up collected!');
			state.mat.ball.color.set('#000000');
			state.mat.ball.emissive.set('#000000');
			setTimeout(() => {
				state.mat.ball.color.set('#0bff01')
				state.mat.ball.emissive.set('#0bff01');
				console.log('ball back to normal');
            }, 5000);
        }
    },
    {
        type: 'slowerBall',
        color: 0xff0000,
        effect: () => {
			let originalSpeed = state.ball_speed;
            console.log('Smaller ball power-up collected!');
            state.ball_speed = state.ring.y / 200;
            setTimeout(() => {
                state.ball_speed = originalSpeed;
                console.log('Ball size reset to normal');
            }, 5000);
        }
    },
    {
        type: 'smallerBall',
        color: 0xffff00,
        effect: () => {
            console.log('Smaller ball power-up collected!');
            state.ball.scale.set(0.5, 0.5, 0.5);
            setTimeout(() => {
                state.ball.scale.set(1, 1, 1);
                console.log('Ball size reset to normal');
            }, 5000);
        }
    },
    {
        type: 'changeColors',
        color: 0x00ffff,
        effect: () => {
            console.log('Change colors power-up collected!');
            const originalColors = {
                p1: state.mat.p1.color.getHex(),
                p2: state.mat.p2.color.getHex(),
                ball: state.mat.ball.color.getHex(),
                ring: state.mat.ring.color.getHex()
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
                console.log('Colors reset to original');
            }, 5000);
        }
    }
];

function spawnPowerUp() {
    const powerUpType = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
    const geometry = new THREE.SphereGeometry(2.5, 32, 32);
    const material = new THREE.MeshBasicMaterial({ color: powerUpType.color });
    const powerUp = new THREE.Mesh(geometry, material);

    powerUp.position.set(
        (Math.random() - 0.5) * state.ring.y / 1.5,
        (Math.random() - 0.5) * state.ring.x / 1.5,
        0
    );

    powerUp.userData = { type: powerUpType.type, effect: powerUpType.effect };
    state.scene.add(powerUp);
    state.powerUps.push(powerUp);
}

function checkCollision(ball, powerUp) {
	if (state.ball.position.x - state.ball_radius <= powerUp.position.x + 1.25 
		&& state.ball.position.x + state.ball_radius >= powerUp.position.x - 1.25
		&& state.ball.position.y - state.ball_radius <= powerUp.position.y + 1.25
		&& state.ball.position.y + state.ball_radius >= powerUp.position.y - 1.25)
		return true;
}

function handlePowerUpCollision() {
    state.powerUps.forEach((powerUp, index) => {
        if (checkCollision(state.ball, powerUp)) {
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
    state.mat.p1.color.set('#4deeea');
    state.mat.p1.emissive.set('#4deeea');
    state.mat.p2.color.set('#ffe700');
    state.mat.p2.emissive.set('#ffe700');
    state.mat.ball.color.set('#0bff01');
    state.mat.ball.emissive.set('#0bff01');
    state.mat.ring.color.set('#ff0000');
    state.mat.ring.emissive.set('#0000ff');
}


//Game restart

function restart_game() {
	state.p1_score = 0;
	state.p2_score = 0;
	state.p2_move_y = 0;
	state.p1_move_y = 0;
	state.wallHitPosition = 0;
	state.lastPowerUpSpawnTime = 0;
	document.getElementById('gameOverImage').style.display = 'none';
	removeWinnerText();
	updateScore();
	state.ball.position.set(0, 0, 0);
	state.ball_speed = state.ring.y / 150;
	state.p1.position.set(-(state.ring.y * 2 / 5), 0, 0);
	state.p2.position.set((state.ring.y * 2 / 5), 0, 0);
	state.angle = Math.floor(Math.random() * 70);
	if (state.angle % 2)
		state.angle *= -1;
	if (state.angle % 3)
		state.angle += 180;
	state.camera.position.set(state.cam.x, state.cam.y, state.cam.z);
	state.camera.lookAt(state.look.x, state.look.y, state.look.z)
	if (state.powerUps.length > 0) {
		state.powerUps.forEach(powerUp => state.scene.remove(powerUp));
		state.powerUps = [];
	}
}

//Game over


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
		state.winnerText = new THREE.Mesh(geometry, state.mat.score);
		state.winnerText.position.set(centerOffset, 20, 0);
		state.scene.add(state.winnerText);
		state.renderer.render(state.scene, state.camera);
	});
}

function removeWinnerText() {
	if (state.winnerText) {
		state.scene.remove(state.winnerText);
	}
}

function game_over() {
	state.isStarted = false;
	state.isPaused = true;
	document.getElementById('gameOverImage').style.display = 'block';
	const winner = state.p1_score >= state.maxScore ? 'Player 1' : 'Player 2';
	createWinnerText(winner);
	resetPowerUps();
	state.powerUps.forEach(powerUp => state.scene.remove(powerUp));
	showMainMenu();
}

//Resize handler

window.addEventListener('resize', () => {
	state.camera.aspect = window.innerWidth / window.innerHeight;
	state.camera.updateProjectionMatrix();
	state.renderer.setSize(window.innerWidth, window.innerHeight);
});


//Keyboard setup

document.addEventListener("keydown", function (event) {
	if (event.key.toLowerCase() == 'w')
		state.p1_move_y = state.player_speed;
	if (event.key.toLowerCase() == 's')
		state.p1_move_y = -state.player_speed;
	if (event.key == 'ArrowUp' && !state.IAisActive)
		state.p2_move_y = state.player_speed;
	if (event.key == 'ArrowDown' && !state.IAisActive)
		state.p2_move_y = -state.player_speed;
	if (event.key == 'Escape' && state.isStarted) {
		if (state.isPaused) {
			resumeGame();
		} else {
			state.isPaused = true;
			showPauseMenu();
		}
	}
});

document.addEventListener("keyup", function (event) {
	if (event.key.toLowerCase() == 'w')
		state.p1_move_y = 0;
	if (event.key.toLowerCase() == 's')
		state.p1_move_y = 0;
	if (event.key == 'ArrowUp' && !state.IAisActive)
		state.p2_move_y = 0;
	if (event.key == 'ArrowDown' && !state.IAisActive)
		state.p2_move_y = 0;

});

document.addEventListener("wheel", function (event) {
	state.cam.z += event.deltaY / 10;
	state.camera.position.set(state.cam.x, state.cam.y, state.cam.z);
});

document.addEventListener("mousemove", function (event) {
	const rect = state.renderer.domElement.getBoundingClientRect();
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

	state.mat.p1.color.set(player1Color);
	state.mat.p1.emissive.set(player1Emissive);
	state.mat.p2.color.set(player2Color);
	state.mat.p2.emissive.set(player2Emissive);
	state.mat.ball.color.set(ballColor);
	state.mat.ball.emissive.set(ballEmissive);
	state.mat.ring.color.set(ringColor);
	state.mat.ring.emissive.set(ringEmissive);

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

	state.mat.p1.color.set('#4deeea');
	state.mat.p1.emissive.set('#4deeea');
	state.mat.p2.color.set('#ffe700');
	state.mat.p2.emissive.set('#ffe700');
	state.mat.ball.color.set('#0bff01');
	state.mat.ball.emissive.set('#0bff01');
	state.mat.ring.color.set('#ff0000');
	state.mat.ring.emissive.set('#0000ff');

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
	state.isStarted = true;
	state.IAisActive = true;
	state.isPaused = false;
	state.spawnPowerUpFlag = true;
	animate();
}

function startTwoPlayerGame() {
	document.getElementById('gameModeMenu').style.display = 'none';
	restart_game();
	state.isStarted = true;
	state.isPaused = false;
	state.IAisActive = false;
	state.spawnPowerUpFlag = true;
	animate();
}

function resumeGame() {
	hidePauseMenu();
	state.isPaused = false;
	animate();
}

function exitGame() {
	state.isStarted = false;
	state.isPaused = true;
	state.IAisActive = false;
	showMainMenu();
	restart_game();
}


