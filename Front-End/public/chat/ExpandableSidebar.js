import { getVariables } from '../var.js';
import { renderAddChat } from './AddChat.js';
import { renderChatBubble } from './ChatBubble.js';
import { getCookie } from '../cookie.js';

const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = '/chat/chat.css';
document.head.appendChild(link);

const displayedDates = new Set();
let addChatContainer = null;

function isFirstMessageOfDay(date) {
	const dateString = date.toLocaleDateString('it-IT');
	if (!displayedDates.has(dateString)) {
		displayedDates.add(dateString);
		return true;
	}
	return false;
}

async function getChatRooms() {
	const { userId, token, url_api } = getVariables();
	console.log("/-----ExpandableSidebar.js-----\\");
	console.log("user_id in sidechat: ", userId);
	console.log("Token getChatRooms:", token);
	console.log(`${url_api}/chat/chat_rooms/getchat/`);
	console.log("\\_____ExpandableSidebar.js_____/");
	try {
		const response = await fetch(
			`${url_api}/chat/chat/chat_rooms/getchat/`,
			{
				method: "GET",
				headers: {
					'Content-Type': 'application/json',
					'X-CSRFToken': getCookie('csrftoken'),
					'Authorization': `Bearer ${token}`,
				},
			}
		);

		if (response.ok) {
			const data = await response.json();
			console.log("Risposta di getChatRooms:", data);
			return data;
		} else {
			const errorData = await response.json();
			console.error("Errore nella risposta di getChatRooms:", errorData);
			return null;
		}
	} catch (error) {
		console.error("Errore nella richiesta di getChatRooms:", error);
		return null;
	}
}

function renderExpandableSidebar() {
    const sidebarContainer = document.querySelector('.expandable-sidebar-container');
    sidebarContainer.innerHTML = `
        <div class="sidebar">
            <button id="toggleChatButton" class="btn btn-light mb-2">
                <i class="bi bi-chevron-right"></i>
            </button>
            <button id="createChatButton" class="btn btn-light mb-2">
                <i class="bi bi-plus"></i>
            </button>
            <button id="singleChatButton" class="btn btn-light mb-2">
                <i class="bi bi-chat-dots"></i>
            </button>
            <button id="groupChatButton" class="btn btn-light mb-2">
                <i class="bi bi-people"></i>
            </button>
            <button id="randomChatButton" class="btn btn-light mb-2">
                <i class="bi bi-shuffle"></i>
            </button>
        </div>
        <div id="chatContainer" class="chat-container"></div>
    `;

    const toggleChatButton = document.getElementById('toggleChatButton');
    const chatContainer = document.getElementById('chatContainer');
    let chatContainerOpen = false;

    toggleChatButton.addEventListener('click', function () {
        chatContainerOpen = !chatContainerOpen;
        chatContainer.classList.toggle('open', chatContainerOpen);
        
        toggleChatButton.innerHTML = chatContainerOpen ? `
            <i class="bi bi-chevron-left"></i>
        ` : `
            <i class="bi bi-chevron-right"></i>
        `;
    });

	document.getElementById('createChatButton').addEventListener('click', function () {
		if (addChatContainer) {
			chatContainer.removeChild(addChatContainer);
			addChatContainer = null;
		} else {
			addChatContainer = renderAddChat();
			chatContainer.insertBefore(addChatContainer, chatContainer.firstChild);
		}
	});

	document.getElementById('singleChatButton').addEventListener('click', function () {
		renderChatItem({
			id: '5',
			name: 'Eve',
			lastMessage: 'Thanks for your help!',
			type: 'single'
		});
	});

	document.getElementById('groupChatButton').addEventListener('click', function () {
		alert('error');
	});

	document.getElementById('randomChatButton').addEventListener('click', function () {
		alert('Random Chat clicked');
	});

	// Fetch chat rooms and render them
	updateChatList();
	console.log("Chat rooms fetched and rendered.");
}

async function updateChatList() {
	const chats = await getChatRooms();
	if (chats) {
		const chatContainer = document.querySelector('.chat-container');
		if (addChatContainer && chatContainer.contains(addChatContainer)) {
			chatContainer.removeChild(addChatContainer);
			addChatContainer = null;
		}
		
		chatContainer.innerHTML = ''; // Pulisce il contenitore delle chat
		chats.forEach(chat => {
			if (!chat.room_id) {
				console.error("Chat ID non trovato:", chat);
				return;
			}

			renderChatItem({
				id: chat.room_id,
				name: chat.room_name,
				lastMessage: chat.room_description,
				type: chat.type
			});
		});
	}
}

function scrollToBottom(element) {
	element.scrollTop = element.scrollHeight;
}

function renderChatItem(chat) {
	const { wss_api, url_api } = getVariables();
	const chatContainer = document.querySelector('.chat-container');
	const chatItem = document.createElement('div');
	chatItem.className = 'chat-item';
	chatItem.dataset.id = chat.id;

	chatItem.innerHTML = `
		<div class="chat-item-header">
			<div class="chat-item-header-content">
				<div class="avatar">
					<div class="avatar-placeholder"></div>
				</div>
				<div class="chat-item-info">
					<div class="chat-item-name">${chat.name}</div>
					<div class="chat-item-message">${chat.lastMessage}</div>
				</div>
				<div class="chat-item-icon">
					<i class="bi bi-chevron-down"></i>
				</div>
			</div>
		</div>
		<div class="chat-item-content" style="display: none;">
			<div class="scrollable-content"></div>
			<form class="chats-input">
				<input type="text" placeholder="Type a message" />
				<button type="submit">
					<i class="bi bi-send"></i>
				</button>
			</form>
		</div>
	`;

	chatContainer.insertBefore(chatItem, chatContainer.firstChild);

	const chatItemHeader = chatItem.querySelector('.chat-item-header');
	const chatItemContent = chatItem.querySelector('.chat-item-content');
	const chatItemIcon = chatItem.querySelector('.chat-item-icon i');

	let socket = null;

	chatItemHeader.addEventListener('click', async function () {
		const isOpen = chatItemContent.style.display === 'block';
		chatItemContent.style.display = isOpen ? 'none' : 'block';
		chatItemIcon.className = isOpen ? 'bi bi-chevron-down' : 'bi bi-chevron-up';

		if (!isOpen) {
			// Apri il WebSocket per la chat room
			const { token } = getVariables();
			socket = new WebSocket(`${wss_api}/chat/chat?room_id=${chat.id}&token=${token}`);
			socket.onopen = () => {
				console.log(`WebSocket connection opened for chat room ${chat.id}`);
			};

			socket.onmessage = (event) => {
				const data = JSON.parse(event.data);
				console.log(`Messaggio ricevuto per chat room ${chat.id}:`, data);

				const messageDate = new Date(data.timestamp);
				const chatContent = chatItem.querySelector('.scrollable-content');

				if (isFirstMessageOfDay(messageDate)) {
					const dateMessage = document.createElement('div');
					dateMessage.className = 'date-message';
					dateMessage.textContent = messageDate.toLocaleDateString('it-IT');
					chatContent.appendChild(dateMessage);
				}

				// Aggiungi il messaggio alla chat room corrispondente
				const chatBubble = renderChatBubble({
					sender: data.sender,
					date: new Date(data.timestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
					message: data.message,
					isSingleChat: chat.type === 'single'
				});
				chatContent.appendChild(chatBubble);

				scrollToBottom(chatContent);
			};

			socket.onclose = () => {
				console.log(`WebSocket connection closed for chat room ${chat.id}`);
				// Cancella i messaggi quando il WebSocket viene chiuso
				chatItem.querySelector('.scrollable-content').innerHTML = '';
			};

			socket.onerror = (error) => {
				console.error(`WebSocket error for chat room ${chat.id}:`, error);
			};

			// Fetch old messages
			try {
				const response = await fetch(
					`${url_api}/chat/chat/chat_rooms/${chat.id}/get_message/`,
					{
						method: "GET",
						headers: {
							"Content-Type": "application/json",
							"X-CSRFToken": getCookie('csrftoken'),
							"Authorization": `Bearer ${token}`,
						},
					}
				);
				if (response.ok) {
					const data = await response.json();
					const chatContent = chatItem.querySelector('.scrollable-content');
					data.forEach(msg => {
						const messageDate = new Date(msg.timestamp);

						if (isFirstMessageOfDay(messageDate)) {
							const dateMessage = document.createElement('div');
							dateMessage.className = 'date-message';
							dateMessage.textContent = messageDate.toLocaleDateString('it-IT');
							chatContent.appendChild(dateMessage);
						}

						const chatBubble = renderChatBubble({
							sender: msg.sender,
							date: new Date(msg.timestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
							message: msg.message,
							isSingleChat: chat.type === 'single'
						});
						chatContent.appendChild(chatBubble);
					});

					scrollToBottom(chatContent);
				} else {
					const text = await response.text();
        			console.error("Server error in get_message:", response.status, text);
				}
			} catch (error) {
				console.error("Errore nella richiesta:", error);
			}
		} else {
			// Chiudi il WebSocket quando la chat viene chiusa
			if (socket) {
				socket.close();
				socket = null;
			}
		}
	});

	const chatsInput = chatItem.querySelector('.chats-input');
	const inputField = chatsInput.querySelector('input');
	const sendButton = chatsInput.querySelector('button');

	// Modifica da apportare nel file ExpandableSidebar.js
	// Nella funzione renderChatItem dove invii il messaggio
	
	chatsInput.addEventListener('submit', function (e) {
		e.preventDefault();
		const message = inputField.value;
		if (message.trim() !== "" && socket && socket.readyState === WebSocket.OPEN) {
			// Usa userUsername per identificare l'utente
			const userVariables = getVariables();
			const messageData = {
				type: "chat_message",
				room_id: chat.id,
				message: message,
				timestamp: new Date().toISOString(),
				sender: userVariables.userUsername,
			};
			socket.send(JSON.stringify(messageData));
			inputField.value = '';
			
			scrollToBottom(chatItem.querySelector('.scrollable-content'));
		} else {
			alert("Connessione WebSocket non attiva");
		}
	});
}

export { renderExpandableSidebar, updateChatList };