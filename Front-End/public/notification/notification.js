import { setVariables, getVariables } from '../var.js';
import { updateChatList } from '../chat/ExpandableSidebar.js';
import { getCookie } from '../cookie.js';

const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = '/public/notification/notification.css';
document.head.appendChild(link);

let messageHistory = [];
let socket;

async function handleFriendRequest(str_method, user_id, friend_id, index) {
	
	// Pulisce l'input dopo aver inviato la richiesta
	const friendInput = document.getElementById('friendID');
	if (friendInput) {
		friendInput.value = '';
	}
	const { url_api } = getVariables();
	console.log(`/----handleFriendRequest ${str_method}----\\`);
	console.log("User ID:", user_id);
	console.log("Friend ID:", friend_id);
	const card = document.getElementById(`notification-card-${index}`);
	const deleteCard = document.getElementById(`friend-item-${index}`);
	try {
		const response = await fetch(`${url_api}/user/addfriend`, {
			method: str_method,
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				user_1: user_id,
				user_2: friend_id,
			}),
		});

		if (response.ok) {
			const data = await response.json();
			console.log("Friend Request Sent:", data);

			const info = data.info;
			console.log("Info handleFriendRequest:", info);                               //------------------------
			if (info === "friend request accepted") {
				console.log("Friend request accepted handleFriendRequest");
				if (card) {
					card.remove();
				}
				getFriends();
			}
			else if (info === "friendship deleted") {
				console.log("friendship deleted handleFriendRequest");
				if (deleteCard) {
					deleteCard.remove();
				}
			}
			else {
				console.log("else handleFriendRequest");
				//renderNotification();
			}	
		} else {
			const errorData = await response.json();
			console.error("Error in server response:", errorData);
		}
	} catch (error) {
		console.error("Error in request:", error);
	}
}

async function getFriends() {
	const { token, userId, url_api } = getVariables();
	console.log("/----getFirends notification.js----\\");
	console.log("User ID:", userId);
	console.log("Token:", token);
	console.log("indirizzo:", `${url_api}/user/friend?user_id=${userId}&accepted=true`)
	try {
		const response = await fetch(
			`${url_api}/user/friend?user_id=${userId}&accepted=true`,
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
			const data = await response.json();
			console.log("getFriends data:", data);
			renderFriendsList(data);
		} else {
			console.error("Errore nella risposta del server:", response.statusText);
		}
	} catch (error) {
		console.error("Errore nella richiesta:", error);
	}
	console.log("\\____getFirends notification.js____/");
}

function renderFriendsList(friends) {
    console.log("/***********renderFriendsList************/");
    const { userId } = getVariables();
    const friendsList = document.getElementById('friendsList');
    const numericUserId = Number(userId);

    friendsList.innerHTML = friends.map((friend, index) => {
        const friendId = (friend.user_1 === numericUserId) ? friend.user_2 : friend.user_1;
        return `
            <div class="friend-item" id="friend-item-${index}">
                <p>Friend ID: ${friendId}</p>
                <button class="btn btn-outline-danger btn-square" type="button"
                    onclick="handleFriendRequest('DELETE', '${userId}', ${friendId}, ${index})">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        `;
    }).join('');
}

function renderFriendRequest() {
    console.log("/***********renderFriendRequest************/");
    const { userId } = getVariables();
    const notificationContent = document.getElementById('notificationContent');
    notificationContent.innerHTML = messageHistory.map((message, index) => {	
        return `
            <div class="card mb-3" id="notification-card-${index}">
                <div class="card-body">
                    <p class="card-text">User ID: ${message.user_id}</p>
                    <button class="btn btn-outline-primary" type="button"
                        onclick="handleFriendRequest('PATCH', ${Number(message.message)}, '${userId}', ${index})">
                        Accept
                    </button>
                    <button class="btn btn-outline-secondary" type="button"
                        onclick="handleFriendRequest('DELETE', '${userId}', ${Number(message.message)}, ${index})">
                        Decline
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function renderNotification() {
	console.log("/***********renderNotification************/");
	const { userId } = getVariables();
	const notificationContainer = document.getElementById('notificationContainer');
	notificationContainer.innerHTML = `
		<div class="notification-box">
			<div class="d-flex justify-content-between align-items-center mb-3">
				<h5>Notifications</h5>
			</div>
			<div id="friendsList" class="mb-3"></div>
			<div id="notificationContent" class="d-flex flex-column gap-3"></div>
			<div class="input-group mb-3">
				<input type="text" class="form-control" id="friendID" placeholder="User ID">
				<button class="btn btn-outline-primary" type="button" onclick="handleFriendRequest('POST', '${userId}', Number(document.getElementById('friendID').value))">Send Friend Request</button>
				<button class="btn btn-outline-secondary" type="button" onclick="handleFriendRequest('DELETE', '${userId}', Number(document.getElementById('friendID').value))">Delete Friend Request</button>
			</div>
		</div>
	`;

	renderFriendRequest();
	getFriends();
}

function initializeWebSocket() {
	const { token, wss_api } = getVariables();
	const wsUrl = `${wss_api}/notification/ws/user_notifications/?token=${token}`;

	socket = new WebSocket(wsUrl);

	socket.onmessage = function (event) {
		const message = JSON.parse(event.data);
		
		console.log("/----websocket notification.js----\\");
		console.log("Nuovo messaggio:", message);

		const messageId = message.id;
		const sender = message.Sender;
		const sender_id = Number(message.message);
		const isSent = message.is_sent;
		const userId = message.user_id;
		const info = message.message;
		console.log("Message ID:", messageId);
		console.log("Sender:", sender);
		console.log("sender_id:", sender_id);
		console.log("Is Sent:", isSent);
		console.log("User ID:", userId);
		console.log("Info:", info);                        //------------------------

		messageHistory.push(message);
		if (info === "accepted your friend request") {
			getFriends();
		}
		else if (info.includes("deleted friendship with")) {
			getFriends()
			// const parts = info.split(' ');
			// const friendId = parts[parts.length - 1]; // ultimo token, es. "4"
			// console.log("deleted friendship with ID:", friendId);

			// const friendItems = Array.from(document.querySelectorAll('.friend-item'));
			// const itemToRemove = friendItems.find(item => item.innerText.includes(`Friend ID: ${friendId}`));
			// if (itemToRemove) {
			// 	itemToRemove.remove();
			// }
		}
		else if (info.includes("Chat Room")) {
			updateChatList();
		}
		else {
			renderFriendRequest();
		}

		console.log("\\____websocket notification.js____/");
	};

	socket.onopen = function () {
		console.log("WebSocket connection is active");
	};

	socket.onclose = function () {
		console.log("token:", token);
		console.log("WebSocket connection is not active");
	};
}

document.addEventListener('DOMContentLoaded', function () {	
	window.renderNotification = renderNotification;
	window.handleFriendRequest = handleFriendRequest;
	window.getFriends = getFriends;
	window.initializeWebSocket = initializeWebSocket;
});

export { renderNotification, handleFriendRequest, getFriends, initializeWebSocket };