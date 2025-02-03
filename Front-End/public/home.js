	import { renderTaskAvaiable } from './taskAvaiable.js';
	import { renderTaskActive } from './taskActive.js';
	import { renderNotification } from './notification.js';
	import { renderProfile } from './profile.js';
	import { renderExpandableSidebar } from './ExpandableSidebar.js';
	
	function renderHome() {
		const appDiv = document.querySelector('.App');
		appDiv.innerHTML = `
			<div class="home">
				<div class="navbar">
					<img src="public/logo.png" alt="logo" class="logo-image" />
					<button class="propic-button" id="toggleProfileButton">
						<img src="public/propic.jpeg" alt="propic" class="propic-image" />
					</button>
				</div>
				<div class="undernavbar">
					<div class="expandable-sidebar-container"></div>
					<div class="content">
						<div class="profile" id="profile" style="display: none;"></div>
						<div class="task-container" id="taskAvailableContainer"></div>
						<div class="task-container" id="taskActiveContainer"></div>
						<div class="task-container" id="notificationContainer"></div>
					</div>
				</div>
			</div>
		`;
	
		const profileDiv = document.getElementById('profile');
		const toggleProfileButton = document.getElementById('toggleProfileButton');
	
		toggleProfileButton.addEventListener('click', function() {
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
	}
	
	export { renderHome };