import { setVariables, getVariables } from "../var.js";
import { getCookie } from "../cookie.js";
import { loginUser } from "../login/login.js";
import { registerUser } from "../register/register.js";
//import { createGame } from './serverSide.js';

const link = document.createElement("link");
link.rel = "stylesheet";
link.href = "/public/pongContainer/pongContainer.css";
document.head.appendChild(link);

function renderPongInfo() {
	const pongInfoContainer = document.getElementById("pongContainer");
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

async function handleLocalePong() {
	// TODO comunque chiamata a gu anche se in singolo e Redirect to pong game
	const { createGame } = await import("./serverSide.js");
	const { userId } = getVariables();
	createGame(userId, 13);
	window.navigateTo("#pong");
}

function handleMultiPong() {
	showLoginBox();
}

function showLoginBox() {
	const loginBox = document.createElement("div");
	loginBox.className = "login-box-modal";
	loginBox.innerHTML = `
		<div class="login_box">
			<h1>Login</h1>
			<div class="login_form">
				<form class="login_form" id="loginForm">
					<div class="mb-3">
						<input type="email" id="loginemail" placeholder="Email" class="form-control" required />
					</div>
					<div class="mb-3">
						<input type="password" id="loginpassword" placeholder="Password" class="form-control" required />
					</div>
					<div class="empty"></div>
					<button type="submit" class="btn btn-primary w-100" style="height: 40px;">Login</button>
					<button type="button" id="registerButton" class="btn btn-secondary w-100 mt-2" style="height: 40px;">Register</button>
				</form>
			</div>
		</div>
	`;
	document.body.appendChild(loginBox);

	// Aggiungi un event listener per chiudere il modale quando si clicca fuori
	window.addEventListener("click", function (event) {
		if (event.target === loginBox) {
			closeLoginBox();
		}
	});

	document
		.getElementById("loginForm")
		.addEventListener("submit", async function (e) {
			e.preventDefault();
			const email = document.getElementById("loginemail").value;
			const password = document.getElementById("loginpassword").value;
			await onHandleSubmit(e, email, password);
		});

	document
		.getElementById("registerButton")
		.addEventListener("click", function () {
			closeLoginBox();
			showRegisterBox();
		});
}

function closeLoginBox() {
	const loginBox = document.querySelector(".login-box-modal");
	if (loginBox) {
		loginBox.remove();
	}
}

function showRegisterBox() {
	const registerBox = document.createElement("div");
	registerBox.className = "register-box-modal";
	registerBox.innerHTML = `
		<div class="login_box">
			<h1>Register</h1>
			<div class="login_form">
				<form class="login_form" id="registerForm">
					<div class="mb-3">
						<input type="text" id="registerusername" placeholder="Username" class="form-control" required />
					</div>
					<div class="mb-3">
						<input type="email" id="registeremail" placeholder="Email" class="form-control" required />
					</div>
					<div class="mb-3">
						<input type="password" id="registerpassword" placeholder="Password" class="form-control" required />
					</div>
					<button type="submit" class="btn btn-primary w-100" style="height: 40px;">Register</button>
					<button type="button" id="loginButton" class="btn btn-secondary w-100 mt-2" style="height: 40px;">Login</button>
				</form>
			</div>
		</div>
	`;
	document.body.appendChild(registerBox);

	// Aggiungi un event listener per chiudere il modale quando si clicca fuori
	window.addEventListener("click", function (event) {
		if (event.target === registerBox) {
			closeRegisterBox();
		}
	});

	document
		.getElementById("registerForm")
		.addEventListener("submit", async function (e) {
			e.preventDefault();
			const username = document.getElementById("registerusername").value;
			const email = document.getElementById("registeremail").value;
			const password = document.getElementById("registerpassword").value;
			await onHandleRegisterSubmit(e, username, email, password);
		});

	document
		.getElementById("loginButton")
		.addEventListener("click", function () {
			closeRegisterBox();
			showLoginBox();
		});
}

function closeRegisterBox() {
	const registerBox = document.querySelector(".register-box-modal");
	if (registerBox) {
		registerBox.remove();
	}
}

async function onHandleSubmit(e, email, password) {
	e.preventDefault();
	const csrftoken = getCookie("csrftoken");
	const loginSuccess = await loginUser(email, password, csrftoken, false);
	if (loginSuccess) {
		//TODO chiamata a Gu per poi aprire pong
		window.navigateTo("#pong");
	}
}

async function onHandleRegisterSubmit(e, username, email, password) {
	e.preventDefault();
	const registerSuccess = await registerUser(
		username,
		email,
		password,
		false
	);
	if (registerSuccess) {
		showLoginBox();
	}
}

window.handleLocalePong = handleLocalePong;
window.handleMultiPong = handleMultiPong;
window.closeLoginBox = closeLoginBox;
window.closeRegisterBox = closeRegisterBox;

export { renderPongInfo };
