import { setVariables, getVariables } from "../var.js";
import { getCookie } from "../cookie.js";
import { loginUser } from "../login/login.js";
import { registerUser } from "../register/register.js";
import { renderPong } from "./locale/pong.js";
import { showAlertForXSeconds } from "../alert/alert.js";

// Load CSS files
const pongContainerCSS = document.createElement("link");
pongContainerCSS.rel = "stylesheet";
pongContainerCSS.href = "/pongContainer/pongContainer.css";
document.head.appendChild(pongContainerCSS);

const friendListCSS = document.createElement("link");
friendListCSS.rel = "stylesheet";
friendListCSS.href = "/pong/friendlist.css";
document.head.appendChild(friendListCSS);

// Load mobile controls CSS
const mobileControlsCSS = document.createElement("link");
mobileControlsCSS.rel = "stylesheet";
mobileControlsCSS.href = "/pong/mobile-controls.css";
document.head.appendChild(mobileControlsCSS);

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
				<button class="btn btn-success" onclick="PongStatistic()">
					<i class="fas fa-gamepad me-2"></i>statistic
				</button>
			</div>
			
		</div>
	`;

}

async function PongStatistic() {
	try {
		const { token, url_api, userId } = getVariables();
		console.log("[PongStatistic] Fetching player stats for user_id:", userId);
		const response = await fetch(
			// `${url_api}/user/user/user?user_id=15`,
			`${url_api}/pong/player/stats?user_id=${userId}`,
			{
				method: "GET",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
					"X-CSRFToken": getCookie("csrftoken"),
				},
			}
		);
		const data = await response.json();
		console.log("[PongStatistic] API response:", data);
	} catch (error) {
		console.error("[PongStatistic] API error:", error);
	}
}

window.PongStatistic = PongStatistic;

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
		showAlertForXSeconds(
			"Failed to load friend list. Please try again.",
			"error",
			5,
			{ asToast: true , game: true }
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
			`🎮 Starting multiplayer game with ${friendName} (ID: ${friendId})`
		);

		// Show loading state
		const inviteBtn = document.querySelector(
			`[data-friend-id="${friendId}"] .btn-game-invite`
		);
		if (inviteBtn) {
			inviteBtn.innerHTML =
				'<i class="fas fa-spinner fa-spin me-1"></i>Connecting...';
			inviteBtn.disabled = true;
		}

		// Close friend list
		closeFriendList();

		window.navigateTo(`#pongmulti?opponent=${friendId}&opponentName=${encodeURIComponent(friendName)}`);
	} catch (error) {
		console.error("💥 Error starting multiplayer game:", error);
		showAlertForXSeconds("❌ Failed to start multiplayer game", "error", 5, {asToast: true, game: true});


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
	const registerSuccess = await registerUser(username, email, password, false);
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

	document.getElementById("loginButton").addEventListener("click", function () {
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

// Mobile Controls Functions
function createMobileControls() {
	// Remove existing controls
	removeMobileControls();
	
	const mobileControls = document.createElement('div');
	mobileControls.id = 'mobile-pong-controls';
	mobileControls.className = 'mobile-pong-controls';
	mobileControls.innerHTML = `
		<div class="mobile-controls-left">
			<button class="mobile-btn mobile-btn-up" id="mobileUpBtn">
				<i class="fas fa-chevron-up"></i>
			</button>
			<button class="mobile-btn mobile-btn-down" id="mobileDownBtn">
				<i class="fas fa-chevron-down"></i>
			</button>
		</div>
	`;
	
	document.body.appendChild(mobileControls);
	attachMobileControlEvents();
}

function attachMobileControlEvents() {
	const upBtn = document.getElementById('mobileUpBtn');
	const downBtn = document.getElementById('mobileDownBtn');
	
	if (!upBtn || !downBtn) return;
	
	/**
	 * Simulates a keyboard event for the specified key and event type.
	 * This is used to mimic 'w' (KeyW) and 's' (KeyS) key presses for mobile controls.
	 *
	 * @param {string} key - The key to simulate ('w' or 's').
	 * @param {string} type - The type of keyboard event ('keydown' or 'keyup').
	 */
	function simulateKeyEvent(key, type) {
		const event = new KeyboardEvent(type, {
			key: key,
			code: key === 'w' ? 'KeyW' : 'KeyS',
			keyCode: key === 'w' ? 87 : 83,
			which: key === 'w' ? 87 : 83,
			bubbles: true
		});
		document.dispatchEvent(event);
	}
	
	// Up button (W key)
	upBtn.addEventListener('touchstart', (e) => {
		e.preventDefault();
		simulateKeyEvent('w', 'keydown');
		upBtn.classList.add('active');
	});
	
	upBtn.addEventListener('touchend', (e) => {
		e.preventDefault();
		simulateKeyEvent('w', 'keyup');
		upBtn.classList.remove('active');
	});
	
	// Down button (S key)
	downBtn.addEventListener('touchstart', (e) => {
		e.preventDefault();
		simulateKeyEvent('s', 'keydown');
		downBtn.classList.add('active');
	});
	
	downBtn.addEventListener('touchend', (e) => {
		e.preventDefault();
		simulateKeyEvent('s', 'keyup');
		downBtn.classList.remove('active');
	});
	
	// Mouse events for testing on desktop
	upBtn.addEventListener('mousedown', (e) => {
		e.preventDefault();
		simulateKeyEvent('w', 'keydown');
		upBtn.classList.add('active');
	});
	
	upBtn.addEventListener('mouseup', (e) => {
		e.preventDefault();
		simulateKeyEvent('w', 'keyup');
		upBtn.classList.remove('active');
	});
	
	downBtn.addEventListener('mousedown', (e) => {
		e.preventDefault();
		simulateKeyEvent('s', 'keydown');
		downBtn.classList.add('active');
	});
	
	downBtn.addEventListener('mouseup', (e) => {
		e.preventDefault();
		simulateKeyEvent('s', 'keyup');
		downBtn.classList.remove('active');
	});
	
	// Prevent context menu
	[upBtn, downBtn].forEach(btn => {
		btn.addEventListener('contextmenu', (e) => {
			e.preventDefault();
		});
	});
}

// TODO: Implement a function to update the mobile score display if required in the future.

function showMobileControls() {
	const controls = document.getElementById('mobile-pong-controls');
	if (controls) {
		controls.style.display = 'flex';
		controls.classList.add('show');
	} else {
		createMobileControls();
	}
}

function hideMobileControls() {
	const controls = document.getElementById('mobile-pong-controls');
	if (controls) {
		controls.style.display = 'none';
		controls.classList.remove('show');
	}
}

function removeMobileControls() {
	const existingControls = document.getElementById('mobile-pong-controls');
	if (existingControls) {
		existingControls.remove();
	}
}

/**
 * Detects if the current device is a mobile device or has touch capabilities.
 * 
 * This function uses the following methods to determine if the device is mobile:
 * 1. Checks if the `ontouchstart` event is supported in the `window` object.
 * 2. Checks if `navigator.maxTouchPoints` (number of touch points) is greater than 0.
 * 3. Uses a regular expression to match common mobile device user agents in `navigator.userAgent`.
 * 
 * Note: This detection method is not foolproof and may produce false positives or negatives.
 * For example, some desktop devices with touch screens may be detected as mobile devices,
 * and some mobile devices with unusual user agents may not be detected.
 * 
 * @returns {boolean} True if the device is detected as mobile or touch-capable, false otherwise.
 */
function isMobileDevice() {
	return 'ontouchstart' in window || 
		   navigator.maxTouchPoints > 0 || 
		   /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Auto-show mobile controls when game starts (call this from your game initialization)
function initializeMobileControls() {
	if (isMobileDevice()) {
		createMobileControls();
		showMobileControls();
	}
}

// Export mobile control functions
window.createMobileControls = createMobileControls;
window.showMobileControls = showMobileControls;
window.hideMobileControls = hideMobileControls;
window.removeMobileControls = removeMobileControls;
window.initializeMobileControls = initializeMobileControls;

// Global cleanup function for pong
window.cleanupMobileControls = function() {
	if (typeof window.removeMobileControls === 'function') {
		window.removeMobileControls();
	}
};

// Clean up mobile controls on page unload
window.addEventListener('beforeunload', () => {
	if (typeof window.removeMobileControls === 'function') {
		window.removeMobileControls();
	}
});

export { renderPongInfo };

// Initialize the pong container