import { getFriends, updateFriendOnlineStatus } from "../notification.js";
import { showNotificationToast } from "../../alert/alert.js";
import { validateFriendRequestData, messageHistory, normalizeUserData, renderFriendRequest } from "../notification.js";

// Message Handler Functions
export function handleFriendRequestMessage(message) {
	const userData = message.message.data;

	// Validate friend request data
	if (!validateFriendRequestData(userData)) {
		console.error("Invalid friend request data received");
		return;
	}

	console.log("Processing friend request message:");
	console.log(`User avatar: ${userData.current_avatar_url}`);
	console.log(`User status: ${userData.first_name} ${userData.last_name}`);
	console.log(`User level: ${userData.level}`);
	console.log(`User ID: ${userData.user_id}`);
	console.log(`Friend request from: ${userData.username}`);

	// Store message in history with normalized data
	messageHistory.push({
		user_id: userData.user_id,
		type: "friend_request",
		userData: normalizeUserData(userData),
	});

	renderFriendRequest();
}// ==================== MESSAGE PROCESSING UTILITIES ====================
// Friend-related message handlers
export function handleFriendAcceptedMessage(message) {
	console.log("Processing friend accepted message:", message);

	// Update friends list to reflect new friendship
	getFriends();

	// Show notification if user data is available
	if (message.message && message.message.data) {
		const userData = message.message.data;
		showNotificationToast(
			`${userData.username || "Someone"} accepted your friend request!`,
			"success"
		);
	} else {
		showNotificationToast("Your friend request was accepted!", "success");
	}
}
export function handleFriendDeletedMessage(message) {
	console.log("Processing friend deleted message:", message);

	// Update friends list to reflect removed friendship
	getFriends();

	// Show notification
	if (message.message && message.message.data) {
		const userData = message.message.data;
		console.log("User data:", userData);
		showNotificationToast(
			`${userData.username || "Someone"} removed you from their friends list`,
			"warning"
		);
	} else {
		showNotificationToast("A friendship was removed", "warning");
	}
}
export function handleFriendBlockedMessage(message) {
	console.log("Processing friend blocked message:", message);

	// Update friends list and remove any ongoing interactions
	getFriends();

	// Show notification
	if (message.message && message.message.data) {
		const userData = message.message.data;
		showNotificationToast(
			`${userData.username || "Someone"} blocked you`,
			"error"
		);
	} else {
		showNotificationToast("You have been blocked by a user", "error");
	}
}
export function handleFriendUnblockedMessage(message) {
	console.log("Processing friend unblocked message:", message);

	// Show notification
	if (message.message && message.message.data) {
		const userData = message.message.data;
		showNotificationToast(
			`${userData.username || "Someone"} unblocked you`,
			"info"
		);
	} else {
		showNotificationToast("You have been unblocked by a user", "info");
	}
}
export function handleFriendStatusUpdateMessage(message) {
	console.log("Processing friend status update message:", message);

	// Extract friend data from message
	let friendUserId, isOnline;

	if (message.friend_user_id !== undefined) {
		// Direct format from Redis pub/sub (expected by OnlineStatusManager)
		friendUserId = message.friend_user_id;
		isOnline = message.is_online;
	} else if (message.message && message.message.friend_user_id !== undefined) {
		// Nested format
		friendUserId = message.message.friend_user_id;
		isOnline = message.message.is_online;
	} else {
		console.warn("Friend status update message missing required data:", message);
		return;
	}

	// Use OnlineStatusManager if available, otherwise fallback to direct update
	if (window.onlineStatusManager) {
		window.onlineStatusManager.updateUserStatus(friendUserId, isOnline);
	} else {
		// Fallback to direct UI update
		updateFriendOnlineStatus(friendUserId, isOnline);
	}

	console.log(`Updated friend ${friendUserId} status to ${isOnline ? 'online' : 'offline'}`);
}

