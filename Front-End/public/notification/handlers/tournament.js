import { showAlertForXSeconds } from "../../alert/alert.js";
import { deleteTournamentDiv, renderNewTournament } from "../../pong/tournament.js";
// tournaments
export function handleTournamentCreatedMessage(message) {
	console.log("Processing tournament created message:", message);
	showAlertForXSeconds(
		`🏆 Tournament created: ${message.message.name}`,
		"success",
		3,
		{ asToast: true , game: true, notification: false }
	);

	renderNewTournament(message);
}

export function handleTournamentDeletedMessage(message) {
	console.log("Processing tournament deleted message:", message);
	if (!message.message || !message.message.tournament_id || !message.message.name) {
		console.error("Invalid tournament deletion message format");
		return;
	}

	deleteTournamentDiv(message.message.tournament_id);
	// console.log("Tournament deleted:", message.tournament_id);

	showAlertForXSeconds(
		`🏆 Tournament deleted: ${message.message.name}`,
		"info",
		3,
		{ asToast: true, game: true, notification: false }
	);
}