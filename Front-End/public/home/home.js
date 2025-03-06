import { renderTaskAvaiable } from '../task/taskAvaiable.js';
import { renderTaskActive } from '../task/taskActive.js';
import { renderNotification, initializeWebSocket } from '../notification/notification.js';
import { renderPongInfo } from '../pong/pongContainer.js';
import { initializeProfile, renderProfile } from '../profile/profile.js';

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

async function toggleProfile() {
    const profileDiv = document.getElementById('profile');
    if (profileDiv) {
        if (profileDiv.style.display === 'none') {
            profileDiv.style.display = 'block';
            await initializeProfile();
        } else {
            profileDiv.style.display = 'none';
        }
    } else {
        console.error("Elemento #profile non trovato nel DOM");
    }
}

function renderHome() {
    const contentDiv = document.getElementById('content');
    contentDiv.innerHTML = `
        <!--div class="home"-->
            <!--div class="undernavbar"-->
                <div class="content-home">
                    <div class="profile" id="profile" style="display: none;"></div>
                    <div class="task-container" id="taskAvailableContainer"></div>
                    <div class="task-container" id="taskActiveContainer"></div>
                    <div class="task-container" id="notificationContainer"></div>
                    <div class="task-container" id="pongContainer"></div>
                </div>
            <!--/div-->
        <!--/div-->
    `;

    renderTaskAvaiable();
    renderTaskActive();
    renderNotification();
    initializeWebSocket();
    renderPongInfo();
}

export { renderHome, toggleProfile };