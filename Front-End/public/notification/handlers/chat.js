import { updateChatList } from "../../chat/ExpandableSidebar.js";
import { showAlertForXSeconds } from "../../alert/alert.js";
import { getVariables } from "../../var.js";
// Chat-related message handlers
export function handleChatRoomCreatedMessage(message) {
	console.log("Processing chat room created message:", message);

	// Update chat list to show new room
	updateChatList();

	// Show notification
	const roomData = message.message?.data || {};
	const roomName = roomData.room_name || "A new chat room";
	showNotificationToast(`${roomName} was created`, "info");
}

export function handleChatRoomJoinedMessage(message) {
	console.log("Processing chat room joined message:", message);

	// Update chat list
	updateChatList();

	// Show notification
	const roomData = message.message?.data || {};
	const roomName = roomData.room_name || "a chat room";
	const userName = roomData.user_name || "Someone";
	showNotificationToast(`${userName} joined ${roomName}`, "info");
}

export function handleChatRoomLeftMessage(message) {
	console.log("Processing chat room left message:", message);

	// Update chat list
	updateChatList();

	// Show notification
	const roomData = message.message?.data || {};
	const roomName = roomData.room_name || "a chat room";
	const userName = roomData.user_name || "Someone";
	showNotificationToast(`${userName} left ${roomName}`, "info");
}//chat
export function handleChatInviteMessage(message) {
	console.log("Processing chat invite message:", message);

	console.log("test: ", message.message.data);

	const chatData = message.message?.data || {};
	const roomName = chatData.room_name || "a chat room";
	const creatorName = chatData.creator_name || "Someone";
	const roomId = chatData.room_id;

	// Mostra notifica toast
	if (creatorName != getVariables().userUsername) {
		showAlertForXSeconds(
			`You have been invited to join "${roomName}" by ${creatorName}`,
			"success",
			5,
			{ asToast: true }
		);
	}

	// Aggiorna la lista delle chat
	if (typeof updateChatList === "function") {
		updateChatList();
	}
}
/**
 * Open chat with a friend
 */
function openChatWithFriend(friendId, friendName) {
	console.log(`Opening chat with ${friendName} (ID: ${friendId})`);

	// TODO: Implement chat opening logic
	// This could navigate to chat page or open a chat modal
	// Example:
	// window.navigateTo(`#chat/${friendId}`);
	// or
	// openChatModal(friendId, friendName);
	showAlertForXSeconds(`💬 Opening chat with ${friendName}`, "info", 5, {
		asToast: false,
		game: false,
		notification: true,
	});
}

