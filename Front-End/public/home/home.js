import { renderTaskAvaiable } from '../task/taskAvaiable.js';
import { renderTaskActive } from '../task/taskActive.js';
import { renderNotification, initializeWebSocket } from '../notification/notification.js';
import { renderProfile } from '../profile/profile.js';
import { renderExpandableSidebar } from '../chat/ExpandableSidebar.js';
import { renderPongInfo } from '../pong/pongContainer.js';

const stylesheets = [
    '/public/home/home.css',
    '/public/task/taskAvaiable.css',
    '/public/task/taskActive.css',
    '/public/notification/notification.css',
    '/public/profile/profile.css',
    '/public/chat/ExpandableSidebar.css',
    '/public/pong/pongContainer.css'
];

stylesheets.forEach(href => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
});

// const link = document.createElement('link');
// link.rel = 'stylesheet';
// link.href = '/public/home/home.css';
// document.head.appendChild(link);

function renderHome() {
	const appDiv = document.querySelector('.App');
	appDiv.innerHTML = `
		<div class="home">
			<div class="navbar">
				<img src="public/home/logo.png" alt="logo" class="logo-image" />
				<button class="propic-button" id="toggleProfileButton">
					<img src="public/home/propic.jpeg" alt="propic" class="propic-image" />
				</button>
			</div>
			<div class="undernavbar">
				<div class="expandable-sidebar-container"></div>
				<div class="content">
					<div class="profile" id="profile" style="display: none;"></div>
					<div class="task-container" id="taskAvailableContainer"></div>
					<div class="task-container" id="taskActiveContainer"></div>
					<div class="task-container" id="notificationContainer"></div>
					<div class="task-container" id="pongContainer"></div>

				</div>
			</div>
		</div>
	`;

	const profileDiv = document.getElementById('profile');
	const toggleProfileButton = document.getElementById('toggleProfileButton');

	toggleProfileButton.addEventListener('click', function () {
		const isProfileVisible = profileDiv.style.display === 'block';
		profileDiv.style.display = isProfileVisible ? 'none' : 'block';
		if (!isProfileVisible) {
			renderProfile();
		}
	});

	// Check if profile should be visible on page load
	if (profileDiv.style.display === 'block') {
		renderProfile();
	}

	renderExpandableSidebar();
	renderTaskAvaiable();
	renderTaskActive();
	renderNotification();
	initializeWebSocket();
	renderPongInfo();
}

export { renderHome };