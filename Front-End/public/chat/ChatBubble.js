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
			<div class="avatar">

				<div class="friend-avatar"
           style="width: 100%; height: 100%; font-weight: 600;">
          ${initials || senderName?.charAt(0).toUpperCase() || '?'}
        </div>


				<div class="date under">${date}</div>
			</div>
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

	return chatBubble;
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

export { renderChatBubble, gameInvitationButton };
