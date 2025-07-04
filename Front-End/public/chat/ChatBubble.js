import { getVariables, calculateInitials } from "../var.js";

const link = document.createElement("link");
link.rel = "stylesheet";
link.href = "/chat/chat.css";
document.head.appendChild(link);

function renderChatBubble({ sender, date, message, isSingleChat }) {
	const { userUsername } = getVariables();
	const isSenderMe = userUsername === sender;
	const initials = calculateInitials(sender);

	const chatBubble = document.createElement("div");
	chatBubble.className = `chat-bubble ${isSenderMe ? "true" : "false"}`;
	chatBubble.innerHTML = `
		${
			!isSingleChat && !isSenderMe
				? `
			<div class="avatar">

				<div class="friend-avatar"
           style="width: 100%; height: 100%; font-weight: 600;">
          ${initials || sender?.charAt(0).toUpperCase() || '?'}
        </div>


				<div class="date under">${date}</div>
			</div>
		`
				: ""
		}
		<div class="chat-content ${isSenderMe ? "true" : ""}">
			${!isSingleChat && !isSenderMe ? `<div class="username">${sender}</div>` : ""}
			<div class="message text-break">${message}</div>
		</div>
		${
			isSingleChat || isSenderMe
				? `<div class="date ${
						isSenderMe ? "true" : "false"
				  }">${date}</div>`
				: ""
		}
	`;

	return chatBubble;
}

export { renderChatBubble };
