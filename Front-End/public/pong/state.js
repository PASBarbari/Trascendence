import * as THREE from 'three';
import Stats from 'three/addons/libs/stats.module.js';

export let state = {
    look: { x: 0, y: 0, z: 0 },
    cam: { x: 0, y: 0, z: 100 },
    ring: { x: 0, y: window.innerHeight * 15 / 100, z: 10, h: 3 },
    player: { y: 0, h: 2.5, z: 5 },
    mat: {
        ring: new THREE.MeshStandardMaterial({ color: '#ff0000', emissive: '#0000ff', emissiveIntensity: 0.5, metalness: 0, roughness: 0 }),
        p1: new THREE.MeshStandardMaterial({ color: '#4deeea', emissive: '#4deeea', emissiveIntensity: 0.5, metalness: 0, roughness: 0.5 }),
        p2: new THREE.MeshStandardMaterial({ color: '#ffe700', emissive: '#ffe700', emissiveIntensity: 0.5, metalness: 0, roughness: 0.5 }),
        ball: new THREE.MeshStandardMaterial({ color: '#0bff01', emissive: '#0bff01', emissiveIntensity: 0.5, metalness: 0, roughness: 0 }),
        score: new THREE.MeshStandardMaterial({ color: '#0bff01', emissive: '#0bff01', emissiveIntensity: 1, metalness: 1, roughness: 0.5 }),
    },
    isPaused: true,
    isStarted: false,
    IAisActive: false,
    maxScore: 3,
    wallHitPosition: 0,
    player_speed: 0,
    p1_score: 0,
    p2_score: 0,
    p1_move_y: 0,
    p2_move_y: 0,
    ball_radius: 0,
    ball_speed: 0,
    angle: 0,
    hit_position: 0,
    powerUps: [],
    powerUpInterval: 10000,
    spawnPowerUpFlag: false,
    lastPowerUpSpawnTime: 0,
    scene: null,
    camera: null,
    renderer: null,
    p1: null,
    p2: null,
	p1_id: null,
	p2_id: null,
    ball: null,
    ring3D: null,
    stats: null,
    game: null,
    scoreText: null,
    winnerText: null,
	stats: null,
	r_bottom: null,
	r_top: null,
	r_left: null,
	r_right: null,
	game: {
		ballColor: null,
		player1Color: null,
		player1Emissive: null,
		player2Color: null,
		player2Emissive: null,
		ringColor: null,
		ringEmissive: null,
		ballSpeed: null,
		playerSpeed: null,
		ballRadius: null,
	},
	keys: {
		w: false,
		s: false,
		ArrowUp: false,
		ArrowDown: false,
	},
};

state.ring.x = (9 / 16 * state.ring.y) - state.ring.h;
state.player.y = state.ring.x / 6;
state.player_speed = state.ring.y / 115;
state.ball_radius = state.ring.y / 80;
state.ball_speed = state.ring.y / 150;
state.angle = Math.floor(Math.random() * 70);
if (state.angle % 2)
	state.angle *= -1;
if (state.angle % 3)
	state.angle += 180;
state.stats = new Stats();
state.r_bottom = new THREE.Mesh(new THREE.BoxGeometry(state.ring.y, state.ring.h, state.ring.z), state.mat.ring);
state.r_top = new THREE.Mesh(new THREE.BoxGeometry(state.ring.y, state.ring.h, state.ring.z), state.mat.ring);
state.r_left = new THREE.Mesh(new THREE.BoxGeometry(state.ring.h, state.ring.x, state.ring.z), state.mat.ring);
state.r_right = new THREE.Mesh(new THREE.BoxGeometry(state.ring.h, state.ring.x, state.ring.z), state.mat.ring);

