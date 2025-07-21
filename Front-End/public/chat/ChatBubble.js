import { getVariables, calculateInitials } from "../var.js";
import { getCookie } from "../cookie.js";

const link = document.createElement("link");
link.rel = "stylesheet";
link.href = "/chat/chat.css";
document.head.appendChild(link);

function renderChatBubble({ senderName, date, message, isSingleChat, type, senderId }) {
	const { userUsername } = getVariables();
	const isSenderMe = userUsername === senderName;
	const initials = calculateInitials(senderName);

	const chatBubble = document.createElement("div");
	chatBubble.className = `chat-bubble ${isSenderMe ? "true" : "false"}`;
	chatBubble.innerHTML = `
		${
			!isSingleChat && !isSenderMe
				? `
			<button class="avatar">

				<div class="friend-avatar"
           style="width: 100%; height: 100%; font-weight: 600;">
          ${initials || senderName?.charAt(0).toUpperCase() || '?'}
        </div>


				<div class="date under">${date}</div>
			</button>
		`
				: ""
		}

		<div class="chat-content ${isSenderMe ? "true" : ""}">
			${!isSingleChat && !isSenderMe ? `<div class="username">${senderName}</div>` : ""}
			<div class="message text-break">
				${message}

				${type === "game_invitation" 
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
				? `<div class="date ${
						isSenderMe ? "true" : "false"
				  }">${date}</div>`
				: ""
		}
	`;

	gameInvitationButton(chatBubble, senderName, senderId);
	showOtherProfile(chatBubble, senderId);

	return chatBubble;
}

async function showOtherProfile(chatBubble, senderId) {
    const avatarButton = chatBubble.querySelector(".avatar");
    if (avatarButton && chatBubble.classList.contains("false")) {
        avatarButton.addEventListener("click", async () => {
            const messageDiv = chatBubble.querySelector('.message');
            if (messageDiv) {
                // Rimuovi eventuale menu già presente
                const existingMenu = messageDiv.querySelector('.profile-menu');
                const fakeSpan = messageDiv.querySelector('.fake-width');
                if (existingMenu) {
                    existingMenu.remove();
                    if (fakeSpan) fakeSpan.remove();
                    chatBubble.querySelector('.chat-content').classList.remove('show-profile-menu');
                    messageDiv.classList.remove('show-profile-menu');
                    return;
                }

                chatBubble.querySelector('.chat-content').classList.add('show-profile-menu');
                messageDiv.classList.add('show-profile-menu');
                messageDiv.style.position = 'relative';

                // Aggiungi uno span invisibile per forzare la larghezza
                const span = document.createElement('span');
                span.className = 'fake-width';
                span.style.visibility = 'hidden';
                span.textContent = '[][][][][][][][][][][][][][][][][][profilo][][][][][][][][][][][][][][][][]';
                messageDiv.appendChild(span);

								// Prendi i dati dell'utente
								const dataOtherUser = await takeDatafromUserId(senderId);

                // Crea il menu profilo
                const menu = document.createElement('div');
                menu.className = 'profile-menu';
                menu.innerHTML = `
										<p>Name and Surname</p>
										<b>${dataOtherUser.first_name || '-'} ${dataOtherUser.last_name || '-'}</b>
										<p>Email</p>
										<b>${dataOtherUser.email || '-'}</b>
										<p>User ID</p>
										<b>${dataOtherUser.user_id || '-'}</b>
										<p>Birth Date</p>
										<b>${dataOtherUser.birth_date || '-'}</b>
										<p>Bio</p>
										<b>${dataOtherUser.bio || '-'}</b>
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
		console.log("[takeDatafromUserId] Fetching player info for user_id:", userId);
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

function gameInvitationButton (chatBubble, senderName, senderId) {
    const gameBtn = chatBubble.querySelector('.game-invitation-btn');
    if (gameBtn) {
        gameBtn.addEventListener("click", () => {
            console.log("Game invitation button clicked");

						window.navigateTo(`#pongmulti?opponent=${senderId}&opponentName=${encodeURIComponent(senderName)}`);

        });
    }
}

export { renderChatBubble, gameInvitationButton, showOtherProfile};
