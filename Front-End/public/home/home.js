import { renderTaskAvaiable } from '../task/taskAvaiable.js';
import { renderTaskActive } from '../task/taskActive.js';
import { renderNotification, initializeWebSocket } from '../notification/notification.js';
import { renderPongInfo } from '../pong/pongContainer.js';
import { initializeProfile, renderProfile } from '../profile/profile.js';

const stylesheets = [
    'https://trascendence.42firenze.it/public/home/home.css',
    'https://trascendence.42firenze.it/public/task/taskAvaiable.css',
    'https://trascendence.42firenze.it/public/task/taskActive.css',
    'https://trascendence.42firenze.it/public/notification/notification.css',
    'https://trascendence.42firenze.it/public/profile/profile.css',
    'https://trascendence.42firenze.it/public/chat/ExpandableSidebar.css',
    'https://trascendence.42firenze.it/public/pong/pongContainer.css'
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
        <div class="content-home">
            <div class="profile" id="profile" style="display: none;"></div>
            <div class="task-container" id="taskAvailableContainer"></div>
            <div class="task-container" id="taskActiveContainer"></div>
            <div class="task-container" id="notificationContainer"></div>
            <div class="task-container" id="pongContainer"></div>
        </div>
    `;

    renderTaskAvaiable();
    renderTaskActive();
    renderNotification();
    initializeWebSocket();
    renderPongInfo();
}

export { renderHome, toggleProfile };