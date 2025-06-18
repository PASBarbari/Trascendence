import { getCookie } from "../cookie.js";
import { getVariables } from "../var.js";
import { updateChatList } from "./ExpandableSidebar.js";

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
			<input type="text" id="userIds" placeholder="Aggiungi membri con userID" class="form-control mb-2" />
			<div class="right-button">
				<button type="submit" class="btn btn-outline-primary">
					<i class="bi bi-plus"></i>
				</button>
			</div>
		</form>
	`;

	addChatContainer
		.querySelector("#addChatForm")
		.addEventListener("submit", async function (e) {
			e.preventDefault();

			const roomName = document.getElementById("roomName").value;
			const roomDescription =
				document.getElementById("roomDescription").value;
			const userIds = document.getElementById("userIds").value;
			const { userId, token, url_api } = getVariables();

			let userIdsArray = userIds
				.split(",")
				.map((id) => id.trim())
				.filter((id) => id);
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
