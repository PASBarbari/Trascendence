/* global bootstrap */
import { showAlertForXSeconds } from "../../alert/alert.js";
import { getVariables } from "../../var.js";
import {
	messageHistory,
	renderFriendRequest,
	showGameInvitationModal,
} from "../notification.js";

// Game-related message handlers
export function handleGameInvitationMessage(message) {
	console.log("Processing game invitation message:", message);

	const gameData = message.message?.data || {};
	const inviterName = gameData.inviter_name || "Someone";
	const gameType = gameData.game_type || "a game";

	// Store invitation in message history for user action
	messageHistory.push({
		user_id: gameData.inviter_id || 0,
		type: "game_invitation",
		userData: gameData,
		invitation_id: gameData.invitation_id,
	});

	renderFriendRequest(); // Reuse existing notification rendering
	showAlertForXSeconds(
		`${inviterName} invited you to play ${gameType}`,
		"info",
		5,
		{ asToast: true, game: false, notification: true }
	);
}
export function handleGameStartedMessage(message) {
	console.log("Processing game started message:", message);

	const gameData = message.message?.data || {};
	const gameType = gameData.game_type || "game";

	showAlertForXSeconds(`Your ${gameType} has started!`, "success", 5, {
		asToast: true,
		game: false,
		notification: true,
	});

	// Redirect to game if needed
	if (gameData.game_url) {
		setTimeout(() => {
			window.location.href = gameData.game_url;
		}, 2000);
	}
}
export function handleGameEndedMessage(message) {
	console.log("Processing game ended message:", message);

	const gameData = message.message?.data || {};
	const result = gameData.result || "completed";
	const gameType = gameData.game_type || "game";

	showAlertForXSeconds(`Your ${gameType} has ${result}`, "info", 5, {
		asToast: true,
		game: false,
		notification: true,
	});
} //pong
export function handleGameCreatedMessage(message) {
	console.log("🚀 DEBUG: handleGameCreatedMessage called!");
	console.log("🚀 DEBUG: Full message:", JSON.stringify(message, null, 2));

	const gameData = message?.message || {};
	const gameId = gameData.game_id;
	const player1Data = gameData.player_1 || {};
	const player2Data = gameData.player_2 || {};

	console.log("🚀 DEBUG: gameData:", gameData);
	// console.log("🚀 DEBUG: gameId:", gameId);
	// console.log("🚀 DEBUG: player1Data:", player1Data);
	// console.log("🚀 DEBUG: player2Data:", player2Data);
	const { userId } = getVariables();
	const currentUserId = parseInt(userId);

	// console.log("🚀 DEBUG: currentUserId:", currentUserId);
	// console.log("🚀 DEBUG: player1Data.user_id:", player1Data.user_id);
	// console.log("🚀 DEBUG: player2Data.user_id:", player2Data.user_id);
	// Determine if this user is the inviter or the invited player
	const isPlayer1 = player1Data.user_id === currentUserId;
	const isPlayer2 = player2Data.user_id === currentUserId;

	// console.log("🚀 DEBUG: isPlayer1:", isPlayer1);
	// console.log("🚀 DEBUG: isPlayer2:", isPlayer2);
	if (isPlayer2) {
		// This user is the invited player (player 2) - show invitation modal
		const inviterName = player1Data.username || "Someone";
		const inviterId = player1Data.user_id;

		// console.log("🚀 DEBUG: Player 2 detected! Showing invitation modal");
		// console.log("🚀 DEBUG: inviterName:", inviterName);
		// console.log("🚀 DEBUG: inviterId:", inviterId);
		// console.log("🚀 DEBUG: gameId:", gameId);
		// Show the invitation modal
		showGameInvitationModal(inviterName, inviterId, gameId);
	} else if (isPlayer1) {
		console.log("🚀 DEBUG: Player 1 detected! (Game creator)");
	} else {
		console.log("🚀 DEBUG: Neither player 1 nor player 2!");
	}
}
export function handlePongInvitationMessage(message) {
	console.log("Processing pong invitation message:", message);

	const gameData = message.message?.data || message.data || {};
	const inviterName = gameData.inviter_name || gameData.username || "Someone";
	const inviterId = gameData.inviter_id || gameData.user_id;
	const roomId = gameData.room_id || gameData.game_id;
	const gameUrl = gameData.game_url;

	// Show invitation modal
	showPongInvitationModal(inviterName, inviterId, roomId, gameUrl);
}
function showPongInvitationModal(inviterName, inviterId, roomId, gameUrl) {
	// Remove any existing invitation modals
	const existingModal = document.getElementById("pongInvitationModal");
	if (existingModal) {
		existingModal.remove();
	}

	const modalHTML = `
        <div class="modal fade" id="pongInvitationModal" tabindex="-1" data-bs-backdrop="static">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title">
                            <i class="fas fa-table-tennis me-2"></i>Pong Invitation
                        </h5>
                    </div>
                    <div class="modal-body text-center">
                        <div class="mb-3">
                            <i class="fas fa-gamepad fa-3x text-primary mb-3"></i>
                            <h6>${inviterName} wants to play Pong with you!</h6>
                            <p class="text-muted">Do you want to join the game?</p>
                            <div class="small text-info">
                                <i class="fas fa-info-circle me-1"></i>
                                Game Room: ${roomId}
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer justify-content-center">
                        <button type="button" class="btn btn-secondary me-2" onclick="declinePongInvitation()">
                            <i class="fas fa-times me-1"></i>Maybe Later
                        </button>
                        <button type="button" class="btn btn-success" onclick="acceptPongInvitation('${gameUrl}')">
                            <i class="fas fa-play me-1"></i>Join Game
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

	document.body.insertAdjacentHTML("beforeend", modalHTML);

	// Show the modal
	const modal = document.getElementById("pongInvitationModal");
	if (typeof bootstrap !== "undefined" && bootstrap.Modal) {
		const bsModal = new bootstrap.Modal(modal);
		bsModal.show();

		// Auto-decline after 30 seconds
		setTimeout(() => {
			if (document.getElementById("pongInvitationModal")) {
				bsModal.hide();
				modal.remove();
			}
		}, 30000);
	} else {
		// Fallback if Bootstrap is not available
		modal.style.display = "block";
		modal.classList.add("show");
	}

	// Show toast notification as well
	showAlertForXSeconds(
		`🎮 ${inviterName} invited you to play Pong!`,
		"info",
		5,
		{ asToast: true, game: false, notification: true }
	);
}
// Add these global functions
window.acceptPongInvitation = function (gameUrl) {
	console.log(`Accepting pong invitation: ${gameUrl}`);

	// Close the modal
	const modal = document.getElementById("pongInvitationModal");
	if (modal) {
		if (typeof bootstrap !== "undefined" && bootstrap.Modal) {
			const bsModal = bootstrap.Modal.getInstance(modal);
			if (bsModal) bsModal.hide();
		}
		modal.remove();
	}

	// Navigate to multiplayer game
	window.location.hash = gameUrl;

	showAlertForXSeconds("Joining Pong game...", "success", 5, {
		asToast: false,
		game: false,
		notification: true,
	});
};
window.declinePongInvitation = function () {
	console.log("Declining pong invitation");

	// Close the modal
	const modal = document.getElementById("pongInvitationModal");
	if (modal) {
		if (typeof bootstrap !== "undefined" && bootstrap.Modal) {
			const bsModal = bootstrap.Modal.getInstance(modal);
			if (bsModal) bsModal.hide();
		}
		modal.remove();
	}

	showAlertForXSeconds("Game invitation declined", "info", 5, {
		asToast: true,
		game: false,
		notification: true,
	});
};
