import * as THREE from "three";
import Stats from "three/addons/libs/stats.module.js";

export let state = {
	look: { x: 0, y: 0, z: 0 },
	cam: { x: 0, y: 20, z: 100 },
	ring: {
		height: 0,
		length: Math.max((window.innerHeight * 15) / 100, 120), // FIXED: Minimum field length of 120
		depth: 10,
		thickness: 3,
	},
	p: { height: 0, width: 2.5, depth: 2.5 },
	mat: {
		plane: new THREE.MeshPhongMaterial({ color: 0x089c00, shininess: 100 }),
		ring: new THREE.MeshPhongMaterial({ color: 0xffe700, shininess: 100 }),
		p1: new THREE.MeshPhongMaterial({
			color: 0x4deeea,
			shininess: 100,
		}),
		p2: new THREE.MeshPhongMaterial({
			color: 0x4deeea,
			shininess: 100,
		}),
		helper: new THREE.MeshPhongMaterial({
			color: 0xff2b2b,
			transparent: true,
			opacity: 0.5,
			visible: false,
		}),
		ball: new THREE.MeshPhongMaterial({
			color: 0x8c5fb3,
			shininess: 100,
		}),
		score: new THREE.MeshPhongMaterial({ color: 0xff2b2b, shininess: 100 }),
	},
	P1cursor: null,
	P2cursor: null,
	isPaused: true,
	isStarted: false,
	IAisActive: false,
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
	lightTarget: null,
	p1: null,
	p2: null,
	players: [],
	ball: null,
	ring3D: null,
	ground: null,
	stats: null,
	game: new THREE.Group(),
	scoreText: null,
	winnerText: null,
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
	score: {
		p1: 0,
		p2: 0,
	},
	scoreMesh: {
		p1: null,
		p2: null,
	},
	lights: [],
	plane: null,
	maxScore: 1,
	// Multiplayer variables
	isMultiplayer: false,
	room_id: null,
	localPlayerId: null,
	remotePlayerId: null,
	socket: null,
	lastSyncTime: 0,
	interpolationDelay: 100, // ms
	networkBuffer: [],
	connectionState: "disconnected", // disconnected, connecting, connected
	reconnectAttempts: 0,
	maxReconnectAttempts: 3,
	lastInputSent: 0,
	inputThrottle: 16, // ~60fps
	lastPositionSent: 0,
	// Master-Slave architecture for multiplayer
	isMaster: false, // Master simulates ball physics, slave receives ball state
	lastBallStateSent: 0,
	ballStateThrottle: 50, // ~20fps for ball state sync (reduced from 60fps)
	lastBallStateTimestamp: 0, // Track last processed ball state timestamp
	// WebRTC per latenza ultra-bassa
	isWebRTC: false, // Modalità WebRTC attiva
	webrtcConnection: null, // Istanza PongWebRTC
	inviteeWebRTCChoice: false, // Scelta del ricevente dell'invito
	pendingGameInvitation: null, // Invito in sospeso
	pendingWebRTCConnection: false, // Connessione WebRTC in attesa
	webrtcRoomId: null, // Room ID per WebRTC

	// Invitee game joining
	shouldJoinExistingGame: false, // Flag per unirsi a gioco esistente
	existingGameData: null, // Dati del gioco esistente per invitee
	// Resize observer for container monitoring
	resizeObserver: null,
};

state.ring.height = (9 / 16) * state.ring.length;
state.p.height = state.ring.height / 6;
state.player_speed = state.ring.length / 80;
state.ball_radius = state.ring.length / 80;
state.ball_speed = state.ring.length / 150;
state.angle = Math.floor(Math.random() * 70);
if (state.angle % 2) state.angle *= -1;
if (state.angle % 3) state.angle += 180;
state.stats = new Stats();

state.latestBallState = null;
state.latestPaddlePosition = null;
state.paddleRenderStats = null;
state.ballMessageStats = null;
state.positionSendCount = 0;
state.lastPositionSent = 0;
state.lastP1PositionSent = 0;
state.lastP2PositionSent = 0;
state.player1Id = null;
state.player2Id = null;
