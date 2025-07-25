import { renderTaskAvaiable } from "../task/taskAvaiable.js";
import { renderTaskActive } from "../task/taskActive.js";
import {
	renderNotification,
	initializeWebSocket,
} from "../notification/notification.js";
import { renderPongInfo } from "../pong/pongContainer.js";
import { initializeProfile, renderProfile } from "../profile/profile.js";
import { renderTournament } from "../pong/tournament.js";

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
		console.error("Elemento #profile non trovato nel DOM");
	}
}

function renderHome() {
    const contentDiv = document.getElementById('content');
    contentDiv.innerHTML = `
        <div class="content-home">
            <div class="profile" id="profile" style="display: block;"></div>
            <!-- <div class="task-container" id="taskAvailableContainer"></div> -->
            <!-- <div class="task-container" id="taskActiveContainer"></div> -->
						<div style="min-width: 40%">
            	<div class="task-container" id="notificationContainer"></div>
						</div>
						<div class="task-double-container">
							<div class="task-container gap" id="pongContainer"></div>
							<div class="task-container" id="tournamentContainer"></div>
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
}

// 5notification.js:1473 WebSocket is not open, cannot send heartbeat
// sendHeartBeat @ notification.js:1473
// (anonymous) @ notification.js:1467
// setInterval
// startHeartbeat @ notification.js:1466
// socket.onopen @ notification.js:1021Understand this warning

export { renderHome, toggleProfile };
