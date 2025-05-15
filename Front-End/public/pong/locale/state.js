import * as THREE from "three";
import Stats from "three/addons/libs/stats.module.js";

export let state = {
	look: { x: 0, y: 0, z: 0 },
	cam: { x: 0, y: 20, z: 100 },
	ring: {
		height: 0,
		length: (window.innerHeight * 15) / 100,
		depth: 10,
		thickness: 3,
	},
	p: { height: 0, width: 2.5, depth: 2.5 },
	mat: {
		ring: new THREE.MeshNormalMaterial({}),
	},
	P1cursor: null,
	P2cursor: null,
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
	boundaries: null,
	p1: null,
	p2: null,
	ball: null,
	ring3D: null,
	ground: null,
	stats: null,
	game: new THREE.Group(),
	scoreText: null,
	winnerText: null,
	stats: null,
	r_bottom: null,
	r_top: null,
	r_left: null,
	r_right: null,
	keys: {
		w: false,
		s: false,
		ArrowUp: false,
		ArrowDown: false,
	},
	controls: null,
	animationFrameId: null,
};

state.ring.height = (9 / 16) * state.ring.length;
state.p.height = state.ring.height / 6;
state.player_speed = state.ring.length / 115;
state.ball_radius = state.ring.length / 80;
state.ball_speed = state.ring.length / 150;
state.angle = Math.floor(Math.random() * 70);
if (state.angle % 2) state.angle *= -1;
if (state.angle % 3) state.angle += 180;
state.stats = new Stats();
