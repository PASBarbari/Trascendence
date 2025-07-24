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
            <div class="task-container" id="notificationContainer"></div>
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

// [DOM] Input elements should have autocomplete attributes (suggested: "current-password"): (More info: https://goo.gl/9p2vKq) <input type=​"password" id=​"password" placeholder=​"Password" class=​"form-control" required>​

// <input type="password" id="password" placeholder="Password" class="form-control" required=""></input>

export { renderHome, toggleProfile };
