import { getVariables, calculateInitials, escapeHTML } from "../var.js";
import { getCookie } from "../cookie.js";

const link = document.createElement("link");
link.rel = "stylesheet";
link.href = "/chat/chat.css";
document.head.appendChild(link);

function renderChatBubble({
	senderName,
	date,
	message,
	isSingleChat,
	type,
	senderId,
}) {
	const { userUsername, url_api } = getVariables();
	// User-controlled: senderName should be escaped
	const safeSenderName = escapeHTML(senderName); // escapeHTML needed

	const isSenderMe = userUsername === safeSenderName;
	// User-controlled: initials derived from senderName, already escaped
	const initials = calculateInitials(safeSenderName);
	// User-controlled: message should be escaped
	const safeMessage = escapeHTML(message); // escapeHTML needed

	const chatBubble = document.createElement("div");
	chatBubble.className = `chat-bubble ${isSenderMe ? "true" : "false"}`;
	chatBubble.innerHTML = `
		${
			!isSingleChat && !isSenderMe
				? `
			<button class="avatar">

				<div class="friend-avatar" style="width: 100%; height: 100%; font-weight: 600;">
          ${initials || safeSenderName?.charAt(0).toUpperCase() || "?"}
        </div>


				<div class="date under">${date}</div>
			</button>
		`
				: ""
		}

		<div class="chat-content ${isSenderMe ? "true" : ""}">
			${
				!isSingleChat && !isSenderMe
					? `<div class="username">${safeSenderName}</div>`
					: ""
			}
			<div class="message text-break">
				${safeMessage}

				${
					type === "game_invitation"
						? `<button class="btn btn-outline-primary game-invitation-btn 
							${isSenderMe ? "disabled" : ""}"
						" >
							<i class="bi bi-playstation"></i>
						</button>`
						: ""
				}

			</div>

		</div>

		${
			isSingleChat || isSenderMe
				? `<div class="date ${isSenderMe ? "true" : "false"}">${date}</div>`
				: ""
		}
	`;

	if (!isSingleChat && !isSenderMe) {
		takeDatafromUserId(senderId).then((ImgData) => {
			console.log("[renderChatBubble] ImgData:", ImgData);
			let ProfileImg = ImgData?.current_avatar.image_url || "";
			if (ProfileImg == "/media/placeholder.jpeg") ProfileImg = "";
			else ProfileImg = url_api + "/user" + ProfileImg;

			const avatarDiv = chatBubble.querySelector(".friend-avatar");
			if (avatarDiv) {
				if (
					ProfileImg &&
					(ProfileImg.startsWith(url_api + "/user/") ||
						ProfileImg.startsWith("/media/"))
				) {
					// ProfileImg should be validated if user-controlled (not escaped, but validated)
					avatarDiv.innerHTML = `<img src="${ProfileImg}" alt="avatar" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
				} else {
					// initials and senderName already escaped above
					avatarDiv.textContent =
						initials || senderName?.charAt(0).toUpperCase() || "?";
				}
			}
		});
	}

	gameInvitationButton(chatBubble, senderName, senderId);
	showOtherProfile(chatBubble, senderId);

	return chatBubble;
}

async function showOtherProfile(chatBubble, senderId) {
	const avatarButton = chatBubble.querySelector(".avatar");
	if (avatarButton && chatBubble.classList.contains("false")) {
		avatarButton.addEventListener("click", async () => {
			const messageDiv = chatBubble.querySelector(".message");
			if (messageDiv) {
				// Rimuovi eventuale menu già presente
				const existingMenu = messageDiv.querySelector(".profile-menu");
				const fakeSpan = messageDiv.querySelector(".fake-width");
				if (existingMenu) {
					existingMenu.remove();
					if (fakeSpan) fakeSpan.remove();
					chatBubble
						.querySelector(".chat-content")
						.classList.remove("show-profile-menu");
					messageDiv.classList.remove("show-profile-menu");
					return;
				}

				chatBubble
					.querySelector(".chat-content")
					.classList.add("show-profile-menu");
				messageDiv.classList.add("show-profile-menu");
				messageDiv.style.position = "relative";

				// Aggiungi uno span invisibile per forzare la larghezza
				const span = document.createElement("span");
				span.className = "fake-width";
				span.style.visibility = "hidden";
				span.textContent =
					"[][][][][][][][][][][][][][][][][][profilo][][][][][][][][][][][][][][][][]";
				messageDiv.appendChild(span);

				// Prendi i dati dell'utente
				const dataOtherUser = await takeDatafromUserId(senderId);

				// Crea il menu profilo
				const menu = document.createElement("div");
				menu.className = "profile-menu";
				menu.innerHTML = `
					<p>Name and Surname</p>
					<b>${dataOtherUser.first_name || "-"} ${
					dataOtherUser.last_name || "-"
				}</b> <!-- escapeHTML needed for first_name and last_name -->
					<p>Email</p>
					<b>${dataOtherUser.email || "-"}</b> <!-- escapeHTML needed for email -->
					<p>User ID</p>
					<b>${dataOtherUser.user_id || "-"}</b> <!-- escapeHTML needed for user_id -->
					<p>Birth Date</p>
					<b>${
						dataOtherUser.birth_date || "-"
					}</b> <!-- escapeHTML needed for birth_date -->
					<p>Bio</p>
					<b>${dataOtherUser.bio || "-"}</b> <!-- escapeHTML needed for bio -->
					<!--button class="btn btn-sm btn-secondary close-profile">Chiudi</button-->
				`;

				// menu.querySelector('.close-profile').addEventListener('click', () => {
				//     menu.remove();
				//     span.remove();
				//     chatBubble.querySelector('.chat-content').classList.remove('show-profile-menu');
				//     messageDiv.classList.remove('show-profile-menu');
				// });

				messageDiv.appendChild(menu);
			}
		});
	}
}

async function takeDatafromUserId(userId) {
	try {
		const { token, url_api } = getVariables();
		console.log(
			"[takeDatafromUserId] Fetching player info for user_id:",
			userId
		);
		const response = await fetch(
			`${url_api}/user/user/user?user_id=${userId}`,
			// `${url_api}/pong/player/stats?user_id=${userId}`,
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
		console.log("[takeDatafromUserId] API response:", data[0]);
		return data[0] || {};
	} catch (error) {
		console.error("[takeDatafromUserId] API error:", error);
	}
}

function gameInvitationButton(chatBubble, senderName, senderId) {
	const gameBtn = chatBubble.querySelector(".game-invitation-btn");
	if (gameBtn) {
		gameBtn.addEventListener("click", () => {
			console.log("Game invitation button clicked");

			window.navigateTo(
				`#pongmulti?opponent=${senderId}&opponentName=${encodeURIComponent(
					senderName
				)}`
			);
		});
	}
}

export { renderChatBubble, gameInvitationButton, showOtherProfile };
