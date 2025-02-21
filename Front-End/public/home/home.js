import { renderTaskAvaiable } from '../task/taskAvaiable.js';
import { renderTaskActive } from '../task/taskActive.js';
import { renderNotification, initializeWebSocket } from '../notification/notification.js';
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

function renderHome() {
    const contentDiv = document.getElementById('content');
    contentDiv.innerHTML = `
        <div class="home">
            <!--div class="undernavbar"-->
                <!--div class="expandable-sidebar-container"></div-->
                <!--div class="content"-->
                    <div class="profile" id="profile" style="display: none;"></div>
                    <div class="task-container" id="taskAvailableContainer"></div>
                    <div class="task-container" id="taskActiveContainer"></div>
                    <div class="task-container" id="notificationContainer"></div>
                    <div class="task-container" id="pongContainer"></div>
                <!--/div-->
            <!--/div-->
        </div>
    `;

    renderTaskAvaiable();
    renderTaskActive();
    renderNotification();
    initializeWebSocket();
    renderPongInfo();
}

export { renderHome };