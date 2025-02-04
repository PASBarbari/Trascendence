import { setVariables, getVariables } from './var.js';
import { getCookie } from './cookie.js';
import { renderLogin } from './login.js';
import { renderRegister } from './register.js';

function renderPongInfo() {
	const pongInfoContainer = document.getElementById('pongContainer');
	pongInfoContainer.innerHTML = `
		<div class="pong-card">
			<div class="d-flex justify-content-between align-items-center mb-3">
				<h5 class="card-title">Pong</h5>
			</div>
			<div class="card-body">
				<p class="card-text">A simple pong game</p>
				<button class="btn btn-primary" onclick="handleLocalePong()">locale</button>
				<button class="btn btn-secondary" onclick="handleMultiPong()">multiplayer</button>
			</div>
		</div>
	`;
}

function handleLocalePong() {
	//redorect to pong game
	window.location.href = '/pong';
}

function handleMultiPong() {
	renderLogin();
}

window.handleLocalePong = handleLocalePong;
window.handleMultiPong = handleMultiPong;

export { renderPongInfo };