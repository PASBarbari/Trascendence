import { setVariables, getVariables, calculateInitials } from "../var.js";
import { updateChatList } from "../chat/ExpandableSidebar.js";
import { getCookie } from "../cookie.js";
import { showAlertForXSeconds } from "../alert/alert.js";
import { initFriendAutocomplete } from "./friendAutocomplete.js";

const link = document.createElement("link");
link.rel = "stylesheet";
link.href = "/notification/notification.css";
document.head.appendChild(link);

let messageHistory = [];
let socket;

async function handleFriendRequest(str_method, receiver_id, receiver_username, index) {
	// Pulisce l'input dopo aver inviato la richiesta
	receiver_id = Number(receiver_id);
	const friendInput = document.getElementById("friendID");
	if (friendInput) {
		friendInput.value = "";
	}
	const { url_api } = getVariables();
	console.log(`/----handleFriendRequest ${str_method}----\\`);
	console.log("Friend ID:", receiver_id);
	console.log("Index:", index);

	let card = document.getElementById(`notification-card-${index}`);
	if (!card) {
		card = document.getElementById(`notification-card-${receiver_id}`);
	}
	const deleteCard = document.getElementById(`friend-item-${index}`);

	try {
		const response = await fetch(`${url_api}/user/user/addfriend`, {
			method: str_method,
			headers: {
				Authorization: `Bearer ${getVariables().token}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				receiver: receiver_id,
			}),
		});

		if (response.ok) {
			const data = await response.json();
			console.log("Friend Request Sent:", data);

			if (index !== undefined && index !== null && index >= 0) {
				messageHistory.splice(index, 1);
			}
			if (str_method === 'DELETE') {
				messageHistory = messageHistory.filter(msg => msg.user_id !== receiver_id);
			}

			const info = data.info;
			console.log("Info handleFriendRequest:", info); //------------------------
			if (info === "friend request accepted") {
				console.log("Friend request accepted handleFriendRequest");
				if (card) {
					card.remove();
				}
				getFriends();
			} else if (info === "friendship deleted") {
				console.log("friendship deleted handleFriendRequest");
				if (deleteCard) {
					deleteCard.remove();
				}
				if (card) {
					card.remove();
				}
				getFriends();
			} else if (info === "friend request sent") {
				console.log("Friend request sent handleFriendRequest");
				console.log("receiver_id:", receiver_id);
				console.log("receiver_username:", receiver_username);
				renderSentFriendRequest(receiver_id, receiver_username, true);
			} else {
				console.log("else handleFriendRequest");
				getFriends();
			}
		} else {
			const errorData = await response.json();
			console.error("Error in server response:", errorData);
		}
	} catch (error) {
		console.error("Error in request:", error);
	}
}


function renderSentFriendRequest(receiver_id, receiver_username, addToDOM = false) {
	console.log("/***********renderSentFriendRequest************/");
	console.log("Rendering sent friend request for ID:", receiver_id);
	console.log("Rendering sent friend request for Username:", receiver_username);

	const notificationContent = document.getElementById("notificationContent");

	// Create the HTML
	const htmlToAdd = `
		<div class="card mb-3" id="notification-card-${receiver_username}">
			<div class="card-body" style="display: flex; align-items: center;">
				<p class="card-text" style="flex-grow: 1; margin: 0;">Friend request sent to <b>${receiver_username}</b></p>
				<button class="btn btn-outline-danger" type="button"
					onclick="handleFriendRequest('DELETE', ${receiver_id}, '${receiver_username}')">
					<i class="bi bi-eraser-fill"></i>
				</button>
			</div>
		</div>
	`;

	if (addToDOM) {
		const notificationContent = document.getElementById("notificationContent");
		notificationContent.innerHTML += htmlToAdd;
	}

	return htmlToAdd;
}

async function getFriends() {
	const { token, userId, url_api } = getVariables();
	console.log("/----getFirends notification.js----\\");
	console.log("User ID:", userId);
	console.log("Token:", token);
	console.log("indirizzo:", `${url_api}/user/friend`);
	try {
		const response = await fetch(`${url_api}/user/user/friend`, {
			method: "GET",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
				"X-CSRFToken": getCookie("csrftoken"),
			},
		});
		if (response.ok) {
			const data = await response.json();
			console.log("getFriends data:", data);

			const acceptedFriends = data.filter(
				(friendship) => friendship.accepted === true
			);
			console.log("Accepted Friends:", acceptedFriends);
			const pendingFriends = data.filter(
				(friendship) => friendship.accepted === false
			);
			console.log("Pending Friends:", pendingFriends);
			renderFriendsList(acceptedFriends);
			renderFriendRequest2(pendingFriends);
		} else {
			console.error(
				"Errore nella risposta del server:",
				response.statusText
			);
		}
	} catch (error) {
		console.error("Errore nella richiesta:", error);
	}
	console.log("\\____getFirends notification.js____/");
}

function renderFriendsList(friends) {
	console.log("/***********renderFriendsList************/");
	const { userId } = getVariables();
	const friendsList = document.getElementById("friendsList");
	const numericUserId = Number(userId);

	if (friends.length === 0) {
		friendsList.innerHTML = `
			<div class="text-center text-muted py-3">
				<i class="bi bi-people"></i>
				<p class="mb-0">No friends yet. Add some friends to get started!</p>
			</div>
		`;
		return;
	}

	friendsList.innerHTML = friends
		.map((friend, index) => {
			const friendInfo = friend.friend_info;
			const friendId = friendInfo.user_id || friend.friend_id;
			const username = friendInfo.username || "Unknown";
			const email = friendInfo.email || "";

			const friend_initials = calculateInitials(username);

			return `
				<div class="friend-item d-flex align-items-center p-3 border rounded mb-2" id="friend-item-${index}">
					<!-- Friend Avatar -->
					<div class="friend-avatar me-3 d-flex align-items-center justify-content-center bg-primary text-white rounded-circle"
						 style="width: 45px; height: 45px; font-weight: 600;">
						${friend_initials}
					</div>

					<!-- Friend Info -->
					<div class="flex-grow-1">
						<h6 class="mb-0 fw-semibold">${username}</h6>
					</div>

					<!-- Action Buttons -->
					<div>
						<button class="btn btn-outline-danger btn-sm" type="button"
								onclick="handleFriendRequest('DELETE', ${friendId}, '', ${index})"
								title="Remove friend">
							<i class="bi bi-trash"></i>
						</button>
					</div>
				</div>
			`;
		})
		.join("");
}

// Add these functions after the renderFriendsList function

/**
 * Invite a friend to play a game
 */
async function inviteToGame(friendId, friendName) {
	try {
		console.log(`Inviting ${friendName} (ID: ${friendId}) to play`);

		const { token, url_api } = getVariables();

		// TODO: Replace with your actual game invitation API endpoint
		const response = await fetch(`${url_api}/pong/api/invite/`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
				"X-CSRFToken": getCookie("csrftoken"),
			},
			body: JSON.stringify({
				invited_user_id: friendId,
				game_type: "pong",
				message: `${friendName}, let's play Pong!`,
			}),
		});

		if (response.ok) {
			showNotificationToast(
				`🎮 Game invitation sent to ${friendName}!`,
				"success"
			);
		} else {
			throw new Error("Failed to send invitation");
		}
	} catch (error) {
		console.error("Error sending game invitation:", error);
		showNotificationToast("❌ Failed to send game invitation", "error");
	}
}

/**
 * Open chat with a friend
 */
function openChatWithFriend(friendId, friendName) {
	console.log(`Opening chat with ${friendName} (ID: ${friendId})`);

	// TODO: Implement chat opening logic
	// This could navigate to chat page or open a chat modal
	// Example:
	// window.navigateTo(`#chat/${friendId}`);
	// or
	// openChatModal(friendId, friendName);

	showNotificationToast(`💬 Opening chat with ${friendName}`, "info");
}

function renderFriendRequest() {
	console.log("/***********renderFriendRequest************/");
	const { userId } = getVariables();
	const notificationContent = document.getElementById("notificationContent");

	notificationContent.innerHTML = messageHistory
		.map((friendRequests, index) => {
			const senderData = friendRequests.userData;
			const senderId = friendRequests.user_id;
			const username = senderData.username || "Unknown";
			console.log("senderdata:", senderData);
			return `
			<div class="card mb-3" id="notification-card-${index}">
				<div class="card-body" style="display: flex; align-items: center;">
					<p class="card-text" style="flex-grow: 1; margin: 0;">Friend request from: <b>${username}</b></p>
					<button class="btn btn-outline-success me-2" type="button"
						onclick="handleFriendRequest('PATCH', ${senderId}, '', ${index})">
						<i class="bi bi-hand-thumbs-up-fill"></i>
					</button>
					<button class="btn btn-outline-danger" type="button"
						onclick="handleFriendRequest('DELETE', ${senderId}, '', ${index})">
						<i class="bi bi-hand-thumbs-down-fill"></i>
					</button>
				</div>
			</div>
		`;
		})
		.join("");
}

function renderFriendRequest2(friends) {
	console.log("/***********renderFriendRequest2************/");
	const { userId } = getVariables();
	const notificationContent = document.getElementById("notificationContent");
	console.log("Friends:", friends);


	const existingFriendIds = friends.map(f => f.friend_info.user_id);
	messageHistory = messageHistory.filter(msg => {
		// Mantieni solo i messaggi che esistono ancora come pending friends
		return existingFriendIds.includes(msg.user_id);
	});

	notificationContent.innerHTML = friends
		.map((friendship, index) => {
			const Data = friendship.friend_info;
			const otherId = friendship.friend_info.user_id;
			const actualSenderId = friendship.friend_info.sent_by.user_id;
			const username = friendship.friend_info.username || "Unknown";
			console.log("otherId:", otherId);
			console.log("actualSenderId:", actualSenderId);
			console.log("userId:", userId);
			if (actualSenderId == userId) {
				return renderSentFriendRequest(otherId, username);
				//return ""; // Skip if the user sent the request
			} else {
				return `
				<div class="card mb-3" id="notification-card-${index}">
					<div class="card-body" style="display: flex; align-items: center;">
						<p class="card-text" style="flex-grow: 1; margin: 0;">Friend request from: <b>${username}</b></p>
						<button class="btn btn-outline-success me-2" type="button"
							onclick="handleFriendRequest('PATCH', ${otherId}, '', ${index})">
							<i class="bi bi-hand-thumbs-up-fill"></i>
						</button>
						<button class="btn btn-outline-danger" type="button"
							onclick="handleFriendRequest('DELETE', ${otherId}, '', ${index})">
							<i class="bi bi-hand-thumbs-down-fill"></i>
						</button>
					</div>
				</div>
				`;
			}
		})
		.join("");
}

function renderNotification() {
	console.log("/***********renderNotification************/");
	const { userId } = getVariables();
	const notificationContainer = document.getElementById(
		"notificationContainer"
	);
	notificationContainer.innerHTML = `
		<div class="notification-box">
			<div class="d-flex justify-content-between align-items-center mb-3">
				<h5>Friends</h5>
			</div>
			<div id="friendsList" class="mb-3"></div>
			<div id="notificationContent" class="d-flex flex-column gap-3"></div>
			<div class="input-group">
				<input type="text" class="form-control" id="friendID" placeholder="Friend Username" style="width: 32%;" autocomplete="off" >
				<!--<button class="btn btn-outline-primary" type="button"
					onclick="handleFriendRequest('POST', Number(document.getElementById('friendID').value))"><i class="bi bi-cart-plus"></i></button>-->

				<!--<button class="btn btn-outline-secondary" type="button"
				onclick="handleFriendRequest('DELETE', Number(document.getElementById('friendID').value))">Delete Friend Request</button>-->
				</div>
			<div id="suggestionList" class="list-group" style="display:none; position: absolute;">
						<!-- Suggestions will be populated here -->
			</div>
		</div>
	`;

	renderFriendRequest();
	getFriends();
	initFriendAutocomplete({
		inputId: "friendID",
		suggestionListId: "suggestionList"
	});
}

// Message validation utilities
function validateFriendRequestData(userData) {
	const requiredFields = ["user_id", "username"];
	const missingFields = requiredFields.filter((field) => !userData[field]);

	if (missingFields.length > 0) {
		console.warn("Friend request missing required fields:", missingFields);
		return false;
	}

	return true;
}

function normalizeUserData(userData) {
	return {
		...userData,
		user_id: userData.user_id || 0,
		username: userData.username || "Unknown User",
		first_name: userData.first_name || "",
		last_name: userData.last_name || "",
		level: userData.level || 0,
		current_avatar_url:
			userData.current_avatar_url || "/static/default_avatar.png",
	};
}

// WebSocket connection management
function closeWebSocketConnection() {
	if (socket && socket.readyState === WebSocket.OPEN) {
		console.log("Closing WebSocket connection");
		socket.close(1000, "User initiated close");
	}
}

/**
 * EXTENSIBLE WebSocket MESSAGE HANDLER SYSTEM
 *
 * This system allows easy addition of new message types by simply adding:
 * 1. A handler function following the naming convention: handle[Type]Message
 * 2. A type detection case in getMessageType
 *
 * Features:
 * - Auto-registration of message handlers
 * - Type-safe message routing
 * - Comprehensive error handling
 * - Easy extensibility for new message types
 */

// ==================== MESSAGE HANDLER REGISTRY ====================

/**
 * Central registry for all WebSocket message handlers
 * Add new message types here following the pattern:
 * 'message_type': handler_function
 */
const MESSAGE_HANDLERS = {
	// Core message types
	friend_request: handleFriendRequestMessage,
	friend_request_accepted: handleFriendAcceptedMessage,
	friendship_deleted: handleFriendDeletedMessage,
	friend_blocked: handleFriendBlockedMessage,
	friend_unblocked: handleFriendUnblockedMessage,

	// Chat-related messages
	chat_room_created: handleChatInviteMessage,
	chat_room_joined: handleChatInviteMessage,
	chat_room_left: handleChatRoomLeftMessage,
	chat_message: handleChatMessage,

	// Game-related messages
	game_invitation: handleGameInvitationMessage,
	game_started: handleGameStartedMessage,
	game_ended: handleGameEndedMessage,
	game_created: handleGameCreatedMessage,
	tournament_started: handleTournamentStartedMessage,
	tournament_ended: handleTournamentEndedMessage,

	// System messages
	system_notification: handleSystemNotificationMessage,
	maintenance_mode: handleMaintenanceModeMessage,
	user_status_changed: handleUserStatusChangedMessage,

	// String-based messages (legacy support)
	string_message: handleStringMessage,

	pong_invitation: handlePongInvitationMessage,

	// Fallback handler
	default: handleDefaultMessage,
};

function handlePongInvitationMessage(message) {
	console.log("Processing pong invitation message:", message);

	const gameData = message.message?.data || message.data || {};
	const inviterName = gameData.inviter_name || gameData.username || "Someone";
	const inviterId = gameData.inviter_id || gameData.user_id;
	const roomId = gameData.room_id || gameData.game_id;
	const gameUrl = gameData.game_url;

	// Show invitation modal
	showPongInvitationModal(inviterName, inviterId, roomId, gameUrl);
}

function showPongInvitationModal(inviterName, inviterId, roomId, gameUrl) {
	// Remove any existing invitation modals
	const existingModal = document.getElementById("pongInvitationModal");
	if (existingModal) {
		existingModal.remove();
	}

	const modalHTML = `
        <div class="modal fade" id="pongInvitationModal" tabindex="-1" data-bs-backdrop="static">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title">
                            <i class="fas fa-table-tennis me-2"></i>Pong Invitation
                        </h5>
                    </div>
                    <div class="modal-body text-center">
                        <div class="mb-3">
                            <i class="fas fa-gamepad fa-3x text-primary mb-3"></i>
                            <h6>${inviterName} wants to play Pong with you!</h6>
                            <p class="text-muted">Do you want to join the game?</p>
                            <div class="small text-info">
                                <i class="fas fa-info-circle me-1"></i>
                                Game Room: ${roomId}
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer justify-content-center">
                        <button type="button" class="btn btn-secondary me-2" onclick="declinePongInvitation()">
                            <i class="fas fa-times me-1"></i>Maybe Later
                        </button>
                        <button type="button" class="btn btn-success" onclick="acceptPongInvitation('${gameUrl}')">
                            <i class="fas fa-play me-1"></i>Join Game
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

	document.body.insertAdjacentHTML("beforeend", modalHTML);

	// Show the modal
	const modal = document.getElementById("pongInvitationModal");
	if (typeof bootstrap !== "undefined" && bootstrap.Modal) {
		const bsModal = new bootstrap.Modal(modal);
		bsModal.show();

		// Auto-decline after 30 seconds
		setTimeout(() => {
			if (document.getElementById("pongInvitationModal")) {
				bsModal.hide();
				modal.remove();
			}
		}, 30000);
	} else {
		// Fallback if Bootstrap is not available
		modal.style.display = "block";
		modal.classList.add("show");
	}

	// Show toast notification as well
	showNotificationToast(
		`🎮 ${inviterName} invited you to play Pong!`,
		"info"
	);
}

// Add these global functions
window.acceptPongInvitation = function (gameUrl) {
	console.log(`Accepting pong invitation: ${gameUrl}`);

	// Close the modal
	const modal = document.getElementById("pongInvitationModal");
	if (modal) {
		if (typeof bootstrap !== "undefined" && bootstrap.Modal) {
			const bsModal = bootstrap.Modal.getInstance(modal);
			if (bsModal) bsModal.hide();
		}
		modal.remove();
	}

	// Navigate to multiplayer game
	window.location.hash = gameUrl;

	showNotificationToast("Joining Pong game...", "success");
};

window.declinePongInvitation = function () {
	console.log("Declining pong invitation");

	// Close the modal
	const modal = document.getElementById("pongInvitationModal");
	if (modal) {
		if (typeof bootstrap !== "undefined" && bootstrap.Modal) {
			const bsModal = bootstrap.Modal.getInstance(modal);
			if (bsModal) bsModal.hide();
		}
		modal.remove();
	}

	showNotificationToast("Game invitation declined", "info");
};

//chat
function handleChatInviteMessage(message) {
	console.log("Processing chat invite message:", message);

	console.log("test: ", message.message.data);

	const chatData = message.message?.data || {};
	const roomName = chatData.room_name || "a chat room";
	const creatorName = chatData.creator_name || "Someone";
	const roomId = chatData.room_id;

	// Mostra notifica toast
	if (creatorName != getVariables().userUsername) {
		showAlertForXSeconds(
			`You have been invited to join "${roomName}" by ${creatorName}`,
			"success",
			5,
			{ asToast: true }
		);
	}

	// Aggiorna la lista delle chat
	if (typeof updateChatList === "function") {
		updateChatList();
	}
}

//pong
function handleGameCreatedMessage(message) {
	console.log("🚀 DEBUG: handleGameCreatedMessage called!");
	console.log("🚀 DEBUG: Full message:", JSON.stringify(message, null, 2));

	const gameData = message?.message || {};
	const gameId = gameData.game_id;
	const player1Data = gameData.player_1 || {};
	const player2Data = gameData.player_2 || {};

	console.log("🚀 DEBUG: gameData:", gameData);
	console.log("🚀 DEBUG: gameId:", gameId);
	console.log("🚀 DEBUG: player1Data:", player1Data);
	console.log("🚀 DEBUG: player2Data:", player2Data);

	const { userId } = getVariables();
	const currentUserId = parseInt(userId);

	console.log("🚀 DEBUG: currentUserId:", currentUserId);
	console.log("🚀 DEBUG: player1Data.user_id:", player1Data.user_id);
	console.log("🚀 DEBUG: player2Data.user_id:", player2Data.user_id);

	// Determine if this user is the inviter or the invited player
	const isPlayer1 = player1Data.user_id === currentUserId;
	const isPlayer2 = player2Data.user_id === currentUserId;

	console.log("🚀 DEBUG: isPlayer1:", isPlayer1);
	console.log("🚀 DEBUG: isPlayer2:", isPlayer2);

	if (isPlayer2) {
		// This user is the invited player (player 2) - show invitation modal
		const inviterName = player1Data.username || "Someone";
		const inviterId = player1Data.user_id;

		console.log("🚀 DEBUG: Player 2 detected! Showing invitation modal");
		console.log("🚀 DEBUG: inviterName:", inviterName);
		console.log("🚀 DEBUG: inviterId:", inviterId);
		console.log("🚀 DEBUG: gameId:", gameId);

		// Show the invitation modal
		showGameInvitationModal(inviterName, inviterId, gameId);
	} else if (isPlayer1) {
		console.log("🚀 DEBUG: Player 1 detected! (Game creator)");
	} else {
		console.log("🚀 DEBUG: Neither player 1 nor player 2!");
	}
}

function showGameInvitationModal(inviterName, inviterId, gameId) {
	console.log("🎮 DEBUG: showGameInvitationModal called!");
	console.log("🎮 DEBUG: inviterName:", inviterName);
	console.log("🎮 DEBUG: inviterId:", inviterId);
	console.log("🎮 DEBUG: gameId:", gameId);

	// Remove any existing invitation modals
	const existingModal = document.getElementById("gameInvitationModal");
	if (existingModal) {
		console.log("🎮 DEBUG: Removing existing modal");
		existingModal.remove();
	}

	console.log("🎮 DEBUG: Creating modal HTML...");
	const modalHTML = `
        <div class="modal fade" id="gameInvitationModal" tabindex="-1" data-bs-backdrop="static">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title">
                            <i class="fas fa-table-tennis me-2"></i>Pong Game Invitation
                        </h5>
                    </div>
                    <div class="modal-body text-center">
                        <div class="mb-3">
                            <i class="fas fa-gamepad fa-3x text-primary mb-3"></i>
                            <h6>${inviterName} wants to play Pong with you!</h6>
                            <p class="text-muted">Do you want to join the game?</p>
                            <div class="small text-info">
                                <i class="fas fa-info-circle me-1"></i>
                                Game ID: ${gameId}
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer justify-content-center">
                        <button type="button" class="btn btn-secondary me-2" onclick="declineGameInvitation()">
                            <i class="fas fa-times me-1"></i>Maybe Later
                        </button>
                        <button type="button" class="btn btn-success" onclick="acceptGameInvitation('${gameId}', '${inviterId}', '${inviterName}')">
                            <i class="fas fa-play me-1"></i>Join Game
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

	console.log("🎮 DEBUG: Adding modal to document...");
	document.body.insertAdjacentHTML("beforeend", modalHTML);

	// Show the modal
	const modal = document.getElementById("gameInvitationModal");
	console.log("🎮 DEBUG: Modal element found:", !!modal);

	if (modal) {
		console.log(
			"🎮 DEBUG: Modal HTML:",
			modal.outerHTML.substring(0, 200) + "..."
		);
	}

	if (typeof bootstrap !== "undefined" && bootstrap.Modal) {
		console.log("🎮 DEBUG: Bootstrap Modal available, showing modal...");
		const bsModal = new bootstrap.Modal(modal);
		bsModal.show();

		// Auto-decline after 30 seconds
		setTimeout(() => {
			if (document.getElementById("gameInvitationModal")) {
				console.log("🎮 DEBUG: Auto-declining modal after 30 seconds");
				bsModal.hide();
				modal.remove();
			}
		}, 30000);
	} else {
		console.log(
			"🎮 DEBUG: Bootstrap Modal not available, using fallback..."
		);
		// Fallback if Bootstrap is not available
		modal.style.display = "block";
		modal.classList.add("show");
		modal.style.position = "fixed";
		modal.style.top = "0";
		modal.style.left = "0";
		modal.style.width = "100%";
		modal.style.height = "100%";
		modal.style.backgroundColor = "rgba(0,0,0,0.5)";
		modal.style.zIndex = "9999";
	}

	// Show toast notification as well
	console.log("🎮 DEBUG: Showing toast notification...");
	showNotificationToast(
		`🎮 ${inviterName} invited you to play Pong!`,
		"info"
	);
}

// Add these global functions
window.acceptGameInvitation = function (gameId, opponentId, opponentName) {
	console.log(
		`Accepting game invitation: game=${gameId}, opponent=${opponentId}`
	);

	// Close the modal
	const modal = document.getElementById("gameInvitationModal");
	if (modal) {
		if (typeof bootstrap !== "undefined" && bootstrap.Modal) {
			const bsModal = bootstrap.Modal.getInstance(modal);
			if (bsModal) bsModal.hide();
		}
		modal.remove();
	}

	// Navigate to multiplayer game with the correct parameters
	// Use gameId as roomId since that's what your backend uses
	const gameUrl = `#pongmulti?room=${gameId}&opponent=${opponentId}&opponentName=${encodeURIComponent(
		opponentName
	)}`;
	window.navigateTo(gameUrl);
	showNotificationToast(`Joining game with ${opponentName}...`, "success");
};

window.declineGameInvitation = function () {
	console.log("Declining game invitation");

	// Close the modal
	const modal = document.getElementById("gameInvitationModal");
	if (modal) {
		if (typeof bootstrap !== "undefined" && bootstrap.Modal) {
			const bsModal = bootstrap.Modal.getInstance(modal);
			if (bsModal) bsModal.hide();
		}
		modal.remove();
	}

	showNotificationToast("Game invitation declined", "info");
};

/**
 * Enhanced message type detection with support for multiple message formats
 */
function getMessageType(message) {
	// Validate message structure
	if (!message || typeof message !== "object") {
		console.warn("Invalid message structure:", message);
		return "default";
	}

	// Check for structured message with explicit type
	if (message.message && typeof message.message === "object") {
		const messageType = message.message.type;

		if (messageType) {
			console.log(`Detected structured message type: ${messageType}`);
			return messageType;
		}
	}

	// Check for direct type field
	if (message.type && typeof message.type === "string") {
		console.log(`Detected direct message type: ${message.type}`);
		return message.type;
	}

	// Handle string-based messages (legacy support)
	if (typeof message.message === "string") {
		const stringMessage = message.message.toLowerCase();

		// Map string patterns to specific message types
		const stringTypeMapping = {
			"accepted your friend request": "friend_accepted",
			"deleted friendship with": "friend_deleted",
			"blocked you": "friend_blocked",
			"unblocked you": "friend_unblocked",
			"chat room": "chat_room_created",
			"joined chat room": "chat_room_joined",
			"left chat room": "chat_room_left",
			"game invitation": "game_invitation",
			"game started": "game_started",
			"game ended": "game_ended",
			tournament: "tournament_started",
			maintenance: "maintenance_mode",
		};

		// Find matching string pattern
		for (const [pattern, type] of Object.entries(stringTypeMapping)) {
			if (stringMessage.includes(pattern)) {
				console.log(
					`Detected string message type: ${type} (pattern: ${pattern})`
				);
				return type;
			}
		}

		console.log("Detected generic string message");
		return "string_message";
	}

	// Log unhandled message types for debugging
	console.log("Unhandled message type:", message);
	return "default";
}

// Centralized error handling for message processing
function handleMessageError(error, message) {
	console.error("Error processing WebSocket message:", {
		error: error.message,
		stack: error.stack,
		message: message,
	});

	// Fallback to default handler
	handleDefaultMessage();
}

// Message Handler Functions
function handleFriendRequestMessage(message) {
	const userData = message.message.data;

	// Validate friend request data
	if (!validateFriendRequestData(userData)) {
		console.error("Invalid friend request data received");
		return;
	}

	console.log("Processing friend request message:");
	console.log(`User avatar: ${userData.current_avatar_url}`);
	console.log(`User status: ${userData.first_name} ${userData.last_name}`);
	console.log(`User level: ${userData.level}`);
	console.log(`User ID: ${userData.user_id}`);
	console.log(`Friend request from: ${userData.username}`);

	// Store message in history with normalized data
	messageHistory.push({
		user_id: userData.user_id,
		type: "friend_request",
		userData: normalizeUserData(userData),
	});

	renderFriendRequest();
}

function handleStringMessage(message) {
	const info = message.message;

	console.log("Processing string message:", info);

	// Route string messages based on content
	const stringMessageActions = {
		"accepted your friend request": () => getFriends(),
		"deleted friendship with": () => getFriends(),
		"Chat Room": () => updateChatList(),
	};

	// Find matching action or default to renderFriendRequest
	const matchedAction = Object.keys(stringMessageActions).find((key) =>
		info.includes(key)
	);

	if (matchedAction) {
		stringMessageActions[matchedAction]();
	} else {
		renderFriendRequest();
	}
}

function handleDefaultMessage(message = null) {
	console.log("Processing default/unknown message:", message);
	renderFriendRequest();
}

function initializeWebSocket() {
	const { token, wss_api } = getVariables();

	// Use secure header-based authentication instead of query parameters
	const wsUrl = `${wss_api}/notifications/ws/user_notifications/?token=${token}`;

	// Create WebSocket with token in query string
	socket = new WebSocket(wsUrl);

	socket.onmessage = function (event) {
		console.log("/----websocket notification.js----\\");

		try {
			const message = JSON.parse(event.data);
			console.log("Received message:", message);

			// Determine message type and route to appropriate handler
			const messageType = getMessageType(message);
			const handler =
				MESSAGE_HANDLERS[messageType] || MESSAGE_HANDLERS["default"];

			console.log(`Routing to handler: ${messageType}`);
			handler(message);
		} catch (error) {
			console.error("Failed to parse WebSocket message:", error);
			handleMessageError(error, event.data);
		}

		console.log("\\____websocket notification.js____/");
	};

	socket.onopen = function () {
		console.log("WebSocket connection established successfully");
		// Reset any reconnection attempts if successful
		if (window.wsReconnectAttempts) {
			window.wsReconnectAttempts = 0;
		}
	};

	socket.onclose = function (event) {
		console.log("WebSocket connection closed:", {
			code: event.code,
			reason: event.reason,
			wasClean: event.wasClean,
		});

		// Handle different close codes
		if (event.code === 1006) {
			console.warn("WebSocket connection lost unexpectedly");
		} else if (event.code === 1000) {
			console.log("WebSocket closed normally");
		} else {
			console.warn("WebSocket closed with code:", event.code);
		}
	};

	socket.onerror = function (error) {
		console.error("WebSocket error occurred:", error);
	};
}

document.addEventListener("DOMContentLoaded", function () {
	window.renderNotification = renderNotification;
	window.handleFriendRequest = handleFriendRequest;
	window.getFriends = getFriends;
	window.initializeWebSocket = initializeWebSocket;
	window.closeWebSocketConnection = closeWebSocketConnection;
	window.registerMessageHandler = registerMessageHandler;
	window.unregisterMessageHandler = unregisterMessageHandler;
	window.getRegisteredMessageTypes = getRegisteredMessageTypes;
	window.testMessageHandler = testMessageHandler;
});

export {
	renderNotification,
	handleFriendRequest,
	getFriends,
	initializeWebSocket,
	closeWebSocketConnection,
	registerMessageHandler,
	unregisterMessageHandler,
	getRegisteredMessageTypes,
	testMessageHandler,
	MESSAGE_HANDLERS,
};

// ==================== DYNAMIC HANDLER REGISTRATION ====================

/**
 * Register a new message handler dynamically
 * @param {string} messageType - The message type to handle
 * @param {function} handlerFunction - The function to handle this message type
 */
function registerMessageHandler(messageType, handlerFunction) {
	if (typeof handlerFunction !== "function") {
		console.error(`Handler for ${messageType} must be a function`);
		return false;
	}

	MESSAGE_HANDLERS[messageType] = handlerFunction;
	console.log(`Registered new message handler: ${messageType}`);
	return true;
}

/**
 * Remove a message handler
 * @param {string} messageType - The message type to remove
 */
function unregisterMessageHandler(messageType) {
	if (messageType === "default") {
		console.error("Cannot remove default message handler");
		return false;
	}

	delete MESSAGE_HANDLERS[messageType];
	console.log(`Unregistered message handler: ${messageType}`);
	return true;
}

/**
 * Get all registered message types
 * @returns {string[]} Array of registered message types
 */
function getRegisteredMessageTypes() {
	return Object.keys(MESSAGE_HANDLERS);
}

/**
 * Test a message handler with sample data
 * @param {string} messageType - The message type to test
 * @param {object} sampleMessage - Sample message data for testing
 */
function testMessageHandler(messageType, sampleMessage) {
	const handler = MESSAGE_HANDLERS[messageType];
	if (!handler) {
		console.error(`No handler found for message type: ${messageType}`);
		return false;
	}

	console.log(`Testing handler for: ${messageType}`);
	try {
		handler(sampleMessage);
		console.log(`✅ Handler test successful for: ${messageType}`);
		return true;
	} catch (error) {
		console.error(`❌ Handler test failed for: ${messageType}`, error);
		return false;
	}
}

// ==================== MESSAGE PROCESSING UTILITIES ====================

// Friend-related message handlers
function handleFriendAcceptedMessage(message) {
	console.log("Processing friend accepted message:", message);

	// Update friends list to reflect new friendship
	getFriends();

	// Show notification if user data is available
	if (message.message && message.message.data) {
		const userData = message.message.data;
		showNotificationToast(
			`${userData.username || "Someone"} accepted your friend request!`,
			"success"
		);
	} else {
		showNotificationToast("Your friend request was accepted!", "success");
	}
}

function handleFriendDeletedMessage(message) {
	console.log("Processing friend deleted message:", message);

	// Update friends list to reflect removed friendship
	getFriends();

	// Show notification
	if (message.message && message.message.data) {
		const userData = message.message.data;
		console.log("User data:", userData);
		showNotificationToast(
			`${
				userData.username || "Someone"
			} removed you from their friends list`,
			"warning"
		);
	} else {
		showNotificationToast("A friendship was removed", "warning");
	}
}

function handleFriendBlockedMessage(message) {
	console.log("Processing friend blocked message:", message);

	// Update friends list and remove any ongoing interactions
	getFriends();

	// Show notification
	if (message.message && message.message.data) {
		const userData = message.message.data;
		showNotificationToast(
			`${userData.username || "Someone"} blocked you`,
			"error"
		);
	} else {
		showNotificationToast("You have been blocked by a user", "error");
	}
}

function handleFriendUnblockedMessage(message) {
	console.log("Processing friend unblocked message:", message);

	// Show notification
	if (message.message && message.message.data) {
		const userData = message.message.data;
		showNotificationToast(
			`${userData.username || "Someone"} unblocked you`,
			"info"
		);
	} else {
		showNotificationToast("You have been unblocked by a user", "info");
	}
}

// Chat-related message handlers
function handleChatRoomCreatedMessage(message) {
	console.log("Processing chat room created message:", message);

	// Update chat list to show new room
	updateChatList();

	// Show notification
	const roomData = message.message?.data || {};
	const roomName = roomData.room_name || "A new chat room";
	showNotificationToast(`${roomName} was created`, "info");
}

function handleChatRoomJoinedMessage(message) {
	console.log("Processing chat room joined message:", message);

	// Update chat list
	updateChatList();

	// Show notification
	const roomData = message.message?.data || {};
	const roomName = roomData.room_name || "a chat room";
	const userName = roomData.user_name || "Someone";
	showNotificationToast(`${userName} joined ${roomName}`, "info");
}

function handleChatRoomLeftMessage(message) {
	console.log("Processing chat room left message:", message);

	// Update chat list
	updateChatList();

	// Show notification
	const roomData = message.message?.data || {};
	const roomName = roomData.room_name || "a chat room";
	const userName = roomData.user_name || "Someone";
	showNotificationToast(`${userName} left ${roomName}`, "info");
}

function handleChatMessage(message) {
	console.log("Processing chat message:", message);

	// Handle real-time chat message (if chat is open)
	const messageData = message.message?.data || {};
	const senderName = messageData.sender_name || "Someone";
	const roomName = messageData.room_name || "a chat room";

	// Only show notification if user is not currently in that chat room
	if (!isUserInChatRoom(messageData.room_id)) {
		showNotificationToast(
			`New message from ${senderName} in ${roomName}`,
			"info"
		);
	}
}

// Game-related message handlers
function handleGameInvitationMessage(message) {
	console.log("Processing game invitation message:", message);

	const gameData = message.message?.data || {};
	const inviterName = gameData.inviter_name || "Someone";
	const gameType = gameData.game_type || "a game";

	// Store invitation in message history for user action
	messageHistory.push({
		user_id: gameData.inviter_id || 0,
		type: "game_invitation",
		userData: gameData,
		invitation_id: gameData.invitation_id,
	});

	renderFriendRequest(); // Reuse existing notification rendering
	showNotificationToast(
		`${inviterName} invited you to play ${gameType}`,
		"info"
	);
}

function handleGameStartedMessage(message) {
	console.log("Processing game started message:", message);

	const gameData = message.message?.data || {};
	const gameType = gameData.game_type || "game";

	showNotificationToast(`Your ${gameType} has started!`, "success");

	// Redirect to game if needed
	if (gameData.game_url) {
		setTimeout(() => {
			window.location.href = gameData.game_url;
		}, 2000);
	}
}

function handleGameEndedMessage(message) {
	console.log("Processing game ended message:", message);

	const gameData = message.message?.data || {};
	const result = gameData.result || "completed";
	const gameType = gameData.game_type || "game";

	showNotificationToast(`Your ${gameType} has ${result}`, "info");
}

function handleTournamentStartedMessage(message) {
	console.log("Processing tournament started message:", message);

	const tournamentData = message.message?.data || {};
	const tournamentName = tournamentData.tournament_name || "tournament";

	showNotificationToast(
		`Tournament "${tournamentName}" has started!`,
		"success"
	);
}

function handleTournamentEndedMessage(message) {
	console.log("Processing tournament ended message:", message);

	const tournamentData = message.message?.data || {};
	const tournamentName = tournamentData.tournament_name || "tournament";
	const placement = tournamentData.user_placement;

	let notificationText = `Tournament "${tournamentName}" has ended`;
	if (placement) {
		notificationText += `. You finished in ${placement} place!`;
	}

	showNotificationToast(notificationText, "info");
}

// System message handlers
function handleSystemNotificationMessage(message) {
	console.log("Processing system notification:", message);

	const notificationData = message.message?.data || {};
	const notificationText =
		notificationData.text || message.message || "System notification";
	const priority = notificationData.priority || "info";

	showNotificationToast(notificationText, priority);
}

function handleMaintenanceModeMessage(message) {
	console.log("Processing maintenance mode message:", message);

	const maintenanceData = message.message?.data || {};
	const startTime = maintenanceData.start_time;
	const duration = maintenanceData.duration || "unknown duration";

	let notificationText = "Maintenance mode scheduled";
	if (startTime) {
		notificationText += ` starting at ${startTime}`;
	}
	notificationText += ` (${duration})`;

	showNotificationToast(notificationText, "warning");
}

function handleUserStatusChangedMessage(message) {
	console.log("Processing user status changed message:", message);

	const statusData = message.message?.data || {};
	const userName = statusData.username || "A friend";
	const newStatus = statusData.status || "changed status";

	// Only show for friends who come online/offline
	if (statusData.is_friend && ["online", "offline"].includes(newStatus)) {
		showNotificationToast(`${userName} is now ${newStatus}`, "info");
	}
}

// Utility Functions
function showNotificationToast(message, type = "info") {
	console.log(`${type.toUpperCase()}: ${message}`);

	// Create a simple toast notification
	const toast = document.createElement("div");
	toast.className = `alert alert-${
		type === "error" ? "danger" : type
	} toast-notification`;
	toast.style.cssText = `
		position: fixed;
		top: 20px;
		right: 20px;
		z-index: 9999;
		max-width: 300px;
		opacity: 0;
		transition: opacity 0.3s ease;
	`;
	toast.textContent = message;

	document.body.appendChild(toast);

	// Fade in
	setTimeout(() => (toast.style.opacity = "1"), 100);

	// Fade out and remove
	setTimeout(() => {
		toast.style.opacity = "0";
		setTimeout(() => document.body.removeChild(toast), 300);
	}, 5000);
}

function isUserInChatRoom(roomId) {
	// Check if user is currently viewing this chat room
	// This would need to be implemented based on your chat system
	const currentRoomId = getCurrentChatRoomId(); // You'll need to implement this
	return currentRoomId === roomId;
}

function getCurrentChatRoomId() {
	// Implement this based on your chat system
	// For example, check URL parameters or global state
	return null; // Placeholder
}

// Enhanced Message Handler Functions (existing ones updated)

// ==================== USAGE EXAMPLES AND DOCUMENTATION ====================

/**
 * EXAMPLES: How to add new message handlers
 *
 * Example 1: Add a simple custom message handler
 * -----------------------------------------------
 * registerMessageHandler('custom_notification', function(message) {
 *     console.log('Custom notification received:', message);
 *     showNotificationToast(message.message?.text || 'Custom notification', 'info');
 * });
 *
 * Example 2: Add a complex handler with validation
 * ------------------------------------------------
 * registerMessageHandler('payment_notification', function(message) {
 *     const paymentData = message.message?.data;
 *     if (!paymentData || !paymentData.amount) {
 *         console.error('Invalid payment notification data');
 *         return;
 *     }
 *
 *     const amount = paymentData.amount;
 *     const currency = paymentData.currency || 'USD';
 *     const status = paymentData.status || 'completed';
 *
 *     showNotificationToast(
 *         `Payment ${status}: ${amount} ${currency}`,
 *         status === 'completed' ? 'success' : 'warning'
 *     );
 * });
 *
 * Example 3: Backend message format support
 * -----------------------------------------
 * Backend should send messages in one of these formats:
 *
 * Format 1 - Structured message:
 * {
 *     "message": {
 *         "type": "friend_request",
 *         "data": { "user_id": 123, "username": "john_doe", ... }
 *     }
 * }
 *
 * Format 2 - Direct type:
 * {
 *     "type": "game_invitation",
 *     "data": { "game_type": "pong", "inviter_name": "Alice", ... }
 * }
 *
 * Format 3 - String message (legacy):
 * {
 *     "message": "accepted your friend request"
 * }
 *
 * Example 4: Testing handlers
 * ---------------------------
 * testMessageHandler('friend_request', {
 *     message: {
 *         type: 'friend_request',
 *         data: { user_id: 123, username: 'test_user' }
 *     }
 * });
 *
 * Example 5: List all registered handlers
 * ---------------------------------------
 * console.log('Registered handlers:', getRegisteredMessageTypes());
 *
 * Example 6: Remove a handler
 * ---------------------------
 * unregisterMessageHandler('custom_notification');
 */

/**
 * SUPPORTED MESSAGE TYPES (auto-registered):
 *
 * Friend System:
 * - friend_request: New friend request received
 * - friend_accepted: Friend request was accepted
 * - friend_deleted: Friendship was removed
 * - friend_blocked: User was blocked
 * - friend_unblocked: User was unblocked
 *
 * Chat System:
 * - chat_room_created: New chat room created
 * - chat_room_joined: User joined a chat room
 * - chat_room_left: User left a chat room
 * - chat_message: New chat message (if not in room)
 *
 * Game System:
 * - game_invitation: Game invitation received
 * - game_started: Game has started
 * - game_ended: Game has ended
 * - tournament_started: Tournament has started
 * - tournament_ended: Tournament has ended
 *
 * System:
 * - system_notification: General system notification
 * - maintenance_mode: Maintenance mode notification
 * - user_status_changed: User status changed (online/offline)
 * - string_message: Legacy string-based messages
 * - default: Fallback for unknown message types
 */

console.log("🚀 Enhanced WebSocket Notification System Loaded");
console.log("📋 Registered message types:", getRegisteredMessageTypes().length);
console.log("💡 Use registerMessageHandler() to add custom handlers");
console.log("🔧 Use testMessageHandler() to test your handlers");
