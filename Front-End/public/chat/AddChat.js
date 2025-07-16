import { getCookie } from "../cookie.js";
import { getVariables } from "../var.js";
import { updateChatList } from "./ExpandableSidebar.js";
import { initFriendAutocomplete } from "../notification/friendAutocomplete.js";

const link = document.createElement("link");
link.rel = "stylesheet";
link.href = "/chat/chat.css";
document.head.appendChild(link);

function renderAddChat() {
	const addChatContainer = document.createElement("div");
	addChatContainer.className = "add-chat";
	addChatContainer.innerHTML = `
		<form id="addChatForm" class="d-flex flex-column">
			<input type="text" id="roomName" placeholder="Nome del gruppo" class="form-control mb-2" />
			<input type="text" id="roomDescription" placeholder="Descrizione" class="form-control mb-2" />
			<div class="input-group mb-2" style="position:relative;">
				<input type="text" id="userIdsInput" placeholder="Aggiungi membri con Username" class="form-control" autocomplete="off"/>
				<div id="suggestionListChat" class="list-group" style="display:none; position:absolute; left:0; right:0; top:100%; z-index:1000;"></div>
			</div>
			<div id="selectedUserIds" class="mb-2"></div>
			<div class="right-button">
				<button type="submit" class="btn btn-outline-primary">
					<i class="bi bi-plus"></i>
				</button>
			</div>
		</form>
	`;

	document.body.appendChild(addChatContainer);


const userIdsInput = addChatContainer.querySelector("#userIdsInput");
const badgeContainer = addChatContainer.querySelector("#selectedUserIds");
let selectedUsers = [];

function renderSelectedUserIds() {
	badgeContainer.innerHTML = selectedUsers.map(user => `
		<span class="badge rounded-pill bg-primary me-1 mb-1" style="font-size:1rem;">
			${user.username}
			<button type="button" class="btn-close btn-close-white btn-sm ms-1" aria-label="Remove" data-userid="${user.id}" style="font-size:0.7em; vertical-align:middle;"></button>
		</span>
	`).join("");
	badgeContainer.querySelectorAll(".btn-close").forEach(btn => {
		btn.addEventListener("click", function() {
			const idToRemove = this.getAttribute("data-userid");
			selectedUsers = selectedUsers.filter(u => String(u.id) !== idToRemove);
			renderSelectedUserIds();
		});
	});
}

initFriendAutocomplete({
	inputId: "userIdsInput",
	suggestionListId: "suggestionListChat",
	handlerOnSelect: (input, userId, item) => {
		userId = String(userId);
		const username = item?.textContent?.split(" ")[0] || userId;
		if (!selectedUsers.some(u => String(u.id) === userId)) {
			selectedUsers.push({ id: userId, username });
			renderSelectedUserIds();
		}
		input.value = "";
	}
});

	addChatContainer
		.querySelector("#addChatForm")
		.addEventListener("submit", async function (e) {
			e.preventDefault();

			const roomName = document.getElementById("roomName").value;
			const roomDescription = document.getElementById("roomDescription").value;
			const { userId, token, url_api } = getVariables();


	let userIdsArray = selectedUsers.map(u => u.id);
	if (!userIdsArray.includes(userId)) {
		userIdsArray.push(userId);
	}

	console.log("Utenti:", userIdsArray);

			try {
				const response = await fetch(
					`${url_api}/chat/chat/chat_rooms/create/`,
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							"X-CSRFToken": getCookie("csrftoken"),
							Authorization: `Bearer ${token}`,
						},
						body: JSON.stringify({
							room_name: roomName,
							room_description: roomDescription,
							creator: userId,
							users: userIdsArray,
						}),
					}
				);

				if (response.ok) {
					const data = await response.json();
					console.log("Chat room creata:", data);

					// Aggiorna la lista delle chat
					updateChatList();
				} else {
					const errorData = await response.json();
					console.error(
						"Errore nella risposta del server:",
						errorData
					);
				}
			} catch (error) {
				console.error("Errore nella richiesta:", error);
			}
		});

	return addChatContainer;
}

export { renderAddChat };
