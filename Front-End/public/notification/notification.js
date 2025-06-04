import { setVariables, getVariables } from '../var.js';
import { updateChatList } from '../chat/ExpandableSidebar.js';
import { getCookie } from '../cookie.js';

const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = '/notification/notification.css';
document.head.appendChild(link);

let messageHistory = [];
let socket;

async function handleFriendRequest(str_method, receiver_id, index) {
	
	// Pulisce l'input dopo aver inviato la richiesta
	receiver_id = Number(receiver_id);
	const friendInput = document.getElementById('friendID');
	if (friendInput) {
		friendInput.value = '';
	}
	const { url_api } = getVariables();
	console.log(`/----handleFriendRequest ${str_method}----\\`);
	console.log("Friend ID:", receiver_id);
	const card = document.getElementById(`notification-card-${index}`);
	const deleteCard = document.getElementById(`friend-item-${index}`);
	try {
		const response = await fetch(`${url_api}/user/user/addfriend`, {
			method: str_method,
			headers: {
				"Authorization": `Bearer ${getVariables().token}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				receiver: receiver_id
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
	console.log("indirizzo:", `${url_api}/user/friend?user_id=${userId}`)
	try {
		const response = await fetch(
			`${url_api}/user/user/friend?user_id=${userId}`,
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

			const acceptedFriends = data.filter(friendship => friendship.accepted === true);
			console.log("Accepted Friends:", acceptedFriends);
			const pendingFriends = data.filter(friendship => friendship.accepted === false);
			console.log("Pending Friends:", pendingFriends);
			renderFriendsList(acceptedFriends);
			//renderFriendRequest(pendingFriends);
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
                    onclick="handleFriendRequest('DELETE', ${friendId}, ${index})">
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

    notificationContent.innerHTML = messageHistory.map((friendRequests, index) => {	
		const senderData = friendRequests.userData;
		const senderId = friendRequests.user_id;
        return `
            <div class="card mb-3" id="notification-card-${index}">
                <div class="card-body">
                    <p class="card-text">User ID: ${senderId}</p>
                    <button class="btn btn-outline-primary" type="button"
                        onclick="handleFriendRequest('PATCH', ${senderId}, ${index})">
                        Accept
                    </button>
                    <button class="btn btn-outline-secondary" type="button"
                        onclick="handleFriendRequest('DELETE', ${senderId}, ${index})">
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
				<button class="btn btn-outline-primary" type="button" onclick="handleFriendRequest('POST', Number(document.getElementById('friendID').value))">Send Friend Request</button>
				<button class="btn btn-outline-secondary" type="button" onclick="handleFriendRequest('DELETE', Number(document.getElementById('friendID').value))">Delete Friend Request</button>
			</div>
		</div>
	`;

	renderFriendRequest();
	getFriends();
}

function initializeWebSocket() {
	const { token, wss_api } = getVariables();
	const wsUrl = `${wss_api}/notifications/ws/user_notifications/?token=${token}`;

	socket = new WebSocket(wsUrl);

	socket.onmessage = function (event) {
		const message = JSON.parse(event.data);
		
		console.log("/----websocket notification.js----\\");
		console.log("Nuovo messaggio:", message);

		if (message.message && typeof message.message === 'object' && message.message.type === 'friend_request') {
			const userData = message.message.data;
			console.log(`User avatar: ${userData.current_avatar_url}`);
			console.log(`User status: ${userData.first_name} ${userData.last_name}`);
			console.log(`User level: ${userData.level}`);
			console.log(`User ID: ${userData.user_id}`);
			console.log(`Friend request from: ${userData.username}`);

			const sender_avatar = userData.current_avatar_url || '/static/default_avatar.png';
			const sender_name = `${userData.first_name} ${userData.last_name}`;
			const sender_level = userData.level || 0;
			const sender_id = userData.user_id || 0;
			const sender_username = userData.username || 'Unknown User';
			
			messageHistory.push({
				user_id: sender_id,
				type: 'friend_request',
				userData: userData
			});
			
			renderFriendRequest();
		}
		else if (typeof message.message === 'string')
		{
        	const info = message.message;
        
			if (info === "accepted your friend request")
			{
				getFriends();
			}
			else if (info.includes("deleted friendship with"))
			{
				getFriends();
			}
			else if (info.includes("Chat Room"))
			{
				updateChatList();
			}
			else
			{
				renderFriendRequest();
			}
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