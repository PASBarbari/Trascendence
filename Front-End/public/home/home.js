import {
	renderNotification,
	initializeWebSocket,
} from "../notification/notification.js";
import { renderPongInfo } from "../pong/pongContainer.js";
import { initializeProfile } from "../profile/profile.js";
import { renderTournament } from "../pong/tournament.js";
import { renderMatchHistory } from "../pong/matchHistory.js";

const stylesheets = [
	"home/home.css",
	"task/taskAvaiable.css",
	"task/taskActive.css",
	"notification/notification.css",
	"profile/profile.css",
	"chat/ExpandableSidebar.css",
	"pong/pongContainer.css",
];

stylesheets.forEach((href) => {
	const link = document.createElement("link");
	link.rel = "stylesheet";
	link.href = href;
	document.head.appendChild(link);
});

async function toggleProfile() {
	const profileDiv = document.getElementById("profile");
	if (profileDiv) {
		if (profileDiv.style.display === "block") {
			profileDiv.style.display = "none";
		} else {
			profileDiv.style.display = "block";
			await initializeProfile();
		}
	} else {
		console.log("Elemento #profile non trovato nel DOM");
	}
}

function renderHome() {
	const contentDiv = document.getElementById("content");
	contentDiv.innerHTML = `
        <div class="content-home">
            <div class="profile" id="profile" style="display: block;"></div>
            <!-- <div class="task-container" id="taskAvailableContainer"></div> -->
            <!-- <div class="task-container" id="taskActiveContainer"></div> -->
						<div style="min-width: 40%">
            	<div class="task-container" id="notificationContainer"></div>
						</div>
						<div class="task-container" id="tournamentContainer"></div>
						<div class="task-container" id="pongContainer"></div>

						<div style="min-width: 40%">
							<div class="task-container" id="matchHistoryContainer"></div>
						</div>
        </div>
    `;

	//renderTaskAvaiable();
	//renderTaskActive();
	renderNotification();
	initializeWebSocket();
	renderPongInfo();
	initializeProfile();
	renderTournament();
	renderMatchHistory();

	// Se esiste un elemento .content, resetta il margine e rimuovi classi di animazione
	const animatedContent = document.querySelector(".content");
	if (animatedContent) {
		animatedContent.classList.remove("animate-margin", "animate-margin-logout");
		animatedContent.style.margin = "0 10px 10px 0";
	}
}

// 5notification.js:1473 WebSocket is not open, cannot send heartbeat
// sendHeartBeat @ notification.js:1473
// (anonymous) @ notification.js:1467
// setInterval
// startHeartbeat @ notification.js:1466
// socket.onopen @ notification.js:1021Understand this warning

export { renderHome, toggleProfile };
