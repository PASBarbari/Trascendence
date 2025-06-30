import { renderTaskAvaiable } from "../task/taskAvaiable.js";
import { renderTaskActive } from "../task/taskActive.js";
import {
	renderNotification,
	initializeWebSocket,
} from "../notification/notification.js";
import { renderPongInfo } from "../pong/pongContainer.js";
import { initializeProfile, renderProfile } from "../profile/profile.js";

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
            <div class="task-container" id="pongContainer"></div>
        </div>
    `;

	//renderTaskAvaiable();
	//renderTaskActive();
	renderNotification();
	initializeWebSocket();
	renderPongInfo();
	initializeProfile();
}

export { renderHome, toggleProfile };
