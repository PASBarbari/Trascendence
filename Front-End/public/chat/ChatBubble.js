import { getVariables, calculateInitials } from "../var.js";

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
	showOtherProfile(chatBubble);

	return chatBubble;
}

function showOtherProfile(chatBubble) {
    const avatarButton = chatBubble.querySelector(".avatar");
    if (avatarButton && chatBubble.classList.contains("false")) {
        avatarButton.addEventListener("click", () => {
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

                // Crea il menu profilo
                const menu = document.createElement('div');
                menu.className = 'profile-menu';
                menu.style.position = 'absolute';
                menu.style.top = '0';
                menu.style.left = '0';
                menu.style.width = '100%';
                menu.style.zIndex = '9999';
                menu.style.background = 'rgba(255,255,255,0.95)';
                menu.style.border = '1px solid #ccc';
                menu.style.padding = '16px';
                menu.style.borderRadius = '8px';
                menu.style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)';
                menu.innerHTML = `
                    <small>Visualizza profilo</small><br>
										nome e cognome
										email
										userid
										partite vinte
										partite perse
										partite giocate
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
