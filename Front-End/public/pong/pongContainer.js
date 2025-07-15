import { setVariables, getVariables } from "../var.js";
import { getCookie } from "../cookie.js";
import { loginUser } from "../login/login.js";
import { registerUser } from "../register/register.js";
import { renderPong } from "./locale/pong.js";

// Load CSS files
const pongContainerCSS = document.createElement("link");
pongContainerCSS.rel = "stylesheet";
pongContainerCSS.href = "/pongContainer/pongContainer.css";
document.head.appendChild(pongContainerCSS);

const friendListCSS = document.createElement("link");
friendListCSS.rel = "stylesheet";
friendListCSS.href = "/pong/friendlist.css";
document.head.appendChild(friendListCSS);

// Load FontAwesome for icons
const fontAwesome = document.createElement("link");
fontAwesome.rel = "stylesheet";
fontAwesome.href =
	"https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css";
document.head.appendChild(fontAwesome);

// Update your existing renderPongInfo function
function renderPongInfo() {
	const pongInfoContainer = document.getElementById("pongContainer");
	pongInfoContainer.innerHTML = `
        <div class="pong-card">
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h5 class="card-title">Pong</h5>
            </div>
            <div class="card-body">
                <p class="card-text">A simple pong game</p>
                <button class="btn btn-primary" onclick="handleLocalePong()">
                    <i class="fas fa-user me-2"></i>Locale
                </button>
                <button class="btn btn-secondary" onclick="handleMultiPong()">
                    <i class="fas fa-users me-2"></i>Online
                </button>
            </div>
        </div>
    `;
}

async function handleLocalePong() {
	window.navigateTo("#pong");
}

function handleMultiPong() {
	openFriendList();
}

// Load HTML template
async function loadFriendListTemplate() {
	try {
		const response = await fetch("/pong/friendlist.html");
		if (!response.ok) throw new Error("Template not found");
		return await response.text();
	} catch (error) {
		console.error("Error loading friend list template:", error);
		showNotification(
			"Failed to load friend list. Please try again.",
			"error"
		);
		return null;
	}
}

// Get user's initials for avatar
// TODO cambiare con l'avatar del profilo
function getUserInitials(username) {
	if (!username) return "?";
	return username
		.split(" ")
		.map((word) => word.charAt(0))
		.join("")
		.toUpperCase()
		.slice(0, 2);
}

// Create friend item HTML
function createFriendItemHTML(friendship) {
	const friend = friendship.friend_info;
	const username = friend?.username || "Unknown";
	const userId = friend?.user_id;
	const initials = getUserInitials(username);

	return `
        <div class="friend-item" data-friend-id="${userId}">
            <div class="d-flex align-items-center">
                <div class="friend-avatar me-3">
                    ${initials}
                </div>
                <div class="flex-grow-1">
                    <div class="friend-name">${username}</div>
                </div>
                <div class="ms-2">
                    <button class="btn btn-game-invite btn-sm" 
                            onclick="inviteToGame('${userId}', '${username}')">
                        <i class="fas fa-gamepad me-1"></i>
                        Invite
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Send game invitation
// // Uncomment and update the inviteToGame function
async function inviteToGame(friendId, friendName) {
	try {
		console.log(
			`🎮 Starting game invitation to ${friendName} (ID: ${friendId})`
		);

		// Show loading state on button
		const inviteBtn = document.querySelector(
			`[data-friend-id="${friendId}"] .btn-game-invite`
		);
		if (inviteBtn) {
			const originalHTML = inviteBtn.innerHTML;
			inviteBtn.innerHTML =
				'<i class="fas fa-spinner fa-spin me-1"></i>Connecting...';
			inviteBtn.disabled = true;
		}

		// Get current user info for debugging
		const { token, url_api, userId } = getVariables();
		console.log("🔍 Debug Info:");
		console.log("  - Current User ID:", userId);
		console.log("  - Friend ID:", friendId);
		console.log("  - Token present:", token ? "✅ Yes" : "❌ No");
		console.log("  - API URL:", url_api);

		// Import the WebSocket functions
		const { createGame } = await import("./multiplayer/serverSide.js");

		// Try to create a game and establish WebSocket connection
		console.log("🎯 Attempting to create game and establish WebSocket...");

		try {
			// Create game between current user and friend
			await createGame(parseInt(userId), parseInt(friendId));

			// Show success notification
			showNotification(
				`🎮 Game started with ${friendName}! WebSocket connection established.`,
				"success"
			);

			// Close friend list and navigate to game
			closeFriendList();
			// Optional: Navigate to game view
			// window.navigateTo("#pong");
		} catch (gameError) {
			console.error("❌ Failed to create game:", gameError);
		}
	} catch (error) {
		console.error("💥 Complete failure in inviteToGame:", error);
		console.error("Error details:", {
			message: error.message,
			stack: error.stack,
			name: error.name,
		});

		showNotification(
			"❌ Failed to start game. Check console for details.",
			"error"
		);

		// Reset button state
		const inviteBtn = document.querySelector(
			`[data-friend-id="${friendId}"] .btn-game-invite`
		);
		if (inviteBtn) {
			inviteBtn.innerHTML = '<i class="fas fa-gamepad me-1"></i>Invite';
			inviteBtn.disabled = false;
		}
	}
}

// Show Bootstrap toast notification
function showNotification(message, type = "info") {
	// Remove existing toasts
	const existingToasts = document.querySelectorAll(".custom-toast");
	existingToasts.forEach((toast) => toast.remove());

	const toastColors = {
		success: "bg-success",
		error: "bg-danger",
		info: "bg-primary",
		warning: "bg-warning",
	};

	const toastHTML = `
        <div class="toast custom-toast position-fixed top-0 end-0 m-3" role="alert" style="z-index: 9999;">
            <div class="toast-header ${toastColors[type]} text-white">
                <strong class="me-auto">Notification</strong>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast"></button>
            </div>
            <div class="toast-body">
                ${message}
            </div>
        </div>
    `;

	document.body.insertAdjacentHTML("beforeend", toastHTML);

	const toastElement = document.querySelector(".custom-toast:last-child");

	// Check if Bootstrap is available
	if (typeof bootstrap !== "undefined" && bootstrap.Toast) {
		const toast = new bootstrap.Toast(toastElement);
		toast.show();
	} else {
		// Fallback if Bootstrap JS is not loaded
		toastElement.style.display = "block";
		setTimeout(() => {
			if (toastElement && toastElement.parentNode) {
				toastElement.remove();
			}
		}, 3000);
	}

	// Auto remove after 5 seconds
	setTimeout(() => {
		if (toastElement && toastElement.parentNode) {
			toastElement.remove();
		}
	}, 5000);
}

async function openFriendList() {
	let friendListModal = document.getElementById("friendListModal");
	if (friendListModal) return; // Already open

	// Load template
	const template = await loadFriendListTemplate();
	if (!template) return;

	// Create modal container
	friendListModal = document.createElement("div");
	friendListModal.id = "friendListModal";
	friendListModal.className = "friend-list-modal";
	friendListModal.innerHTML = template;
	document.body.appendChild(friendListModal);

	// Add event listeners
	const closeBtn = friendListModal.querySelector("#closeFriendListBtn");
	closeBtn.addEventListener("click", closeFriendList);

	// Click outside to close
	friendListModal.addEventListener("click", function (e) {
		if (e.target === friendListModal) {
			closeFriendList();
		}
	});

	// Load friends data
	await loadFriendsData();
}

async function loadFriendsData() {
	const loadingState = document.getElementById("loadingState");
	const friendListContainer = document.getElementById("friendListContainer");
	const emptyState = document.getElementById("emptyState");
	const errorState = document.getElementById("errorState");

	try {
		const { token, url_api } = getVariables();
		const response = await fetch(
			`${url_api}/user/user/friend?status=accepted`,
			{
				method: "GET",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
					"X-CSRFToken": getCookie("csrftoken"),
				},
			}
		);

		// Hide loading state
		loadingState.style.display = "none";

		if (response.ok) {
			const friendsData = await response.json();
			console.log("Friends data:", friendsData);

			if (friendsData.length === 0) {
				emptyState.style.display = "block";
			} else {
				friendListContainer.style.display = "block";
				friendListContainer.innerHTML = friendsData
					.map(createFriendItemHTML)
					.join("");
			}
		} else if (response.status === 404) {
			emptyState.style.display = "block";
		} else {
			throw new Error(`HTTP ${response.status}`);
		}
	} catch (error) {
		console.error("Error fetching friends:", error);
		loadingState.style.display = "none";
		errorState.style.display = "block";
	}
}

function closeFriendList() {
	const friendListModal = document.getElementById("friendListModal");
	if (friendListModal) {
		friendListModal.style.animation = "fadeIn 0.3s ease-in reverse";
		setTimeout(() => friendListModal.remove(), 300);
	}
}

// ... rest of your existing functions (showLoginBox, etc.) ...

async function onHandleSubmit(e, email, password) {
	e.preventDefault();
	const csrftoken = getCookie("csrftoken");
	const loginSuccess = await loginUser(email, password, csrftoken, false);
	if (loginSuccess) {
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

// Make functions available globally
window.closeFriendList = closeFriendList;
window.handleLocalePong = handleLocalePong;
window.handleMultiPong = handleMultiPong;
window.closeLoginBox = closeLoginBox;
window.closeRegisterBox = closeRegisterBox;
window.inviteToGame = inviteToGame;

export { renderPongInfo };

// Initialize the pong container
