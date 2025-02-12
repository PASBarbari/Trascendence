import * as THREE from 'three';
import { state } from "./state.js";
import { createScore } from "./utils.js";
import Stats from 'three/addons/libs/stats.module.js';

//Scene setup

export function setupGame(){

	state.scene = new THREE.Scene();
	state.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
	state.camera.position.set(state.cam.x, state.cam.y, state.cam.z);
	state.camera.lookAt(state.look.x, state.look.y, state.look.z);

	state.renderer = new THREE.WebGLRenderer();
	state.renderer.setSize(window.innerWidth, window.innerHeight);
	document.body.appendChild(state.renderer.domElement);


	//Ring setup

	state.r_bottom = new THREE.Mesh(new THREE.BoxGeometry(state.ring.y, state.ring.h, state.ring.z), state.mat.ring);
	state.r_top = new THREE.Mesh(new THREE.BoxGeometry(state.ring.y, state.ring.h, state.ring.z), state.mat.ring);
	state.r_left = new THREE.Mesh(new THREE.BoxGeometry(state.ring.h, state.ring.x, state.ring.z), state.mat.ring);
	state.r_right = new THREE.Mesh(new THREE.BoxGeometry(state.ring.h, state.ring.x, state.ring.z), state.mat.ring);


	state.r_bottom.position.set(0, -((state.ring.x + state.ring.h) / 2), 0);
	state.r_top.position.set(0, ((state.ring.x + state.ring.h) / 2), 0);
	state.r_left.position.set(-((state.ring.y - state.ring.h) / 2), 0, 0);
	state.r_right.position.set(((state.ring.y - state.ring.h) / 2), 0, 0);
	state.ring3D = new THREE.Group();
	state.ring3D.add(state.r_bottom, state.r_top, state.r_left, state.r_right);


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

	//stats setup

	state.stats = new Stats();
	state.stats.showPanel(0);
	document.body.appendChild(state.stats.dom);
	state.stats.dom.style.display = 'none'; // Hide stats by default

	//Game setup

	const game = new THREE.Group();
	game.add(state.ring3D, state.p1, state.p2, state.ball);
	state.scene.add(game);
	createScore();
	state.renderer.render(state.scene, state.camera);
}