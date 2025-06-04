import { setVariables, getVariables } from "../var.js";
import { getCookie } from "../cookie.js";
import { loginUser } from "../login/login.js";
import { registerUser } from "../register/register.js";
// import { createGame } from "./multiplayer/serverSide.js";
import { renderPong } from "./locale/pong.js";

const link = document.createElement("link");
link.rel = "stylesheet";
link.href = "/pongContainer/pongContainer.css";
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
	// const { createGame } = await import("./multiplayer/serverSide.js");
	// const { userId } = getVariables();
	// createGame(userId, 2);
	window.navigateTo("#pong");
	// renderPong();
}

function handleMultiPong() {
	// const { createGame } = await import("./multiplayer/serverSide.js");
	// const { userId } = getVariables();
	// createGame(userId, 13);
	openFriendList();
	// window.navigateTo("#pong");
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

async function openFriendList() {
	let friendListContainer = document.getElementById("friendListContainer");
	if (!friendListContainer) {
		friendListContainer = document.createElement("div");
		friendListContainer.id = "friendListContainer";
		friendListContainer.className = "friend-list-modal";
		friendListContainer.style.cssText = `
			position: fixed;
			top: 0;
			left: 0;
			width: 100%;
			height: 100%;
			background-color: rgba(0, 0, 0, 0.5);
			display: flex;
			justify-content: center;
			align-items: center;
			z-index: 1000;
		`;
		friendListContainer.innerHTML = `
			<div class="friend-list-box" style="
				background: white;
				padding: 20px;
				border-radius: 8px;
				box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
				max-width: 400px;
				width: 90%;
			">
				<h2>Your Friends</h2>
				<ul id="friendList" class="friend-list" style="
					list-style: none;
					padding: 0;
					margin: 10px 0;
					max-height: 200px;
					overflow-y: auto;
				">
					<!-- Friends will be listed here -->
				</ul>
				<button class="btn btn-secondary mt-2" onclick="closeFriendList()">Close</button>
			</div>
		`;
		document.body.appendChild(friendListContainer);

		// Add click outside to close
		friendListContainer.addEventListener("click", function (e) {
			if (e.target === friendListContainer) {
				closeFriendList();
			}
		});

		// Fetch friends from API
		try {
			const { token, url_api, userId } = getVariables();
			const response = await fetch(
				`${url_api}/user/user/friend?user_id=${userId}&status=accepted`,
				{
					method: "GET",
					headers: {
						"Content-Type": "application/json",
						"Authorization": `Bearer ${token}`,
						'X-CSRFToken': getCookie('csrftoken'),
					},
				}
			);

			if (response.ok) {
				const friendsData = await response.json();
				const friendList = document.getElementById("friendList");
				console.log("Friends data:", friendsData);
				
				if (friendsData.length === 0) {
					const li = document.createElement("li");
					li.textContent = "No friends found";
					li.style.cssText =
						"padding: 10px; text-align: center; color: #666;";
					friendList.appendChild(li);
				} else {
					friendsData.forEach((friendship) => {
						const li = document.createElement("li");
						// Extract friend name (you'll need to adjust based on your serializer structure)
						const friendName =
							friendship.user_1.username ||
							friendship.user_2.username;
						li.textContent = friendName;
						li.style.cssText =
							"padding: 10px; border-bottom: 1px solid #eee; cursor: pointer;";
						li.addEventListener(
							"mouseover",
							() => (li.style.backgroundColor = "#f5f5f5")
						);
						li.addEventListener(
							"mouseout",
							() => (li.style.backgroundColor = "transparent")
						);
						li.addEventListener("click", () => {
							// Handle friend selection for multiplayer
							console.log(`Selected friend: ${friendName}`);
							// TODO: Implement multiplayer game invitation
						});
						friendList.appendChild(li);
					});
				}
			} else if (response.status === 404) {
				console.log("No friends found (404)");
				const friendList = document.getElementById("friendList");
				const li = document.createElement("li");
				li.textContent = "No friends 🥲";
				li.style.cssText =
					"padding: 10px; text-align: center; color: #666;";
				friendList.appendChild(li);
			} else {
				console.error("Failed to fetch friends");
				const friendList = document.getElementById("friendList");
				const li = document.createElement("li");
				li.textContent = "Error loading friends";
				li.style.cssText =
					"padding: 10px; text-align: center; color: #red;";
				friendList.appendChild(li);
			}
		} catch (error) {
			console.error("Error fetching friends:", error);
		}
	}
}

function closeFriendList() {
	const friendListContainer = document.getElementById("friendListContainer");
	if (friendListContainer) {
		friendListContainer.remove();
	}
}

window.closeFriendList = closeFriendList;

window.handleLocalePong = handleLocalePong;
window.handleMultiPong = handleMultiPong;
window.closeLoginBox = closeLoginBox;
window.closeRegisterBox = closeRegisterBox;

export { renderPongInfo };
