import { getVariables } from './var.js';

function renderChatBubble({ sender, date, message, isSingleChat }) {
    const { userUsername } = getVariables();
    const isSenderMe = userUsername === sender;

    const chatBubble = document.createElement('div');
    chatBubble.className = `chat-bubble ${isSenderMe ? "true" : "false"}`;
    chatBubble.innerHTML = `
        ${!isSingleChat && !isSenderMe ? `
            <div class="avatar">
                <div class="avatar-placeholder"></div>
                <div class="date under">${date}</div>
            </div>
        ` : ''}
        <div class="chat-content ${isSenderMe ? "true" : ""}">
            ${!isSingleChat && !isSenderMe ? `<div class="username">${sender}</div>` : ''}
            <div class="message">${message}</div>
		</div>
        ${isSingleChat || isSenderMe ? `<div class="date ${isSenderMe ? "true" : "false"}">${date}</div>` : ''}
    `;

    return chatBubble;
}

export { renderChatBubble };