import { renderLogin } from './login/login.js';
import { renderRegister } from './register/register.js';
import { renderHome } from './home/home.js';
import { renderPong } from './pong/pong.js';
import { renderExpandableSidebar } from './chat/ExpandableSidebar.js';
//import { renderProfile } from './profile/profile.js';

const routes = {
    404: {
        template: "/templates/404.html",
        title: "404",
        description: "Page not found",
    },
    "/": {
        render: renderLogin,
        title: "Login",
        description: "This is the login page",
    },
    login: {
        render: renderLogin,
        title: "Login",
        description: "This is the login page",
    },
    register: {
        render: renderRegister,
        title: "Register",
        description: "This is the register page",
    },
    home: {
        render: renderHome,
        title: "Home",
        description: "This is the home page",
    },
    pong: {
        render: renderPong,
        title: "Pong",
        description: "This is the pong game",
    }
};

const navigateTo = (path) => {
    const hashParts = window.location.hash.split('&').slice(1); // Mantieni solo gli stati dei div
    const newHash = `#${path}&${hashParts.join('&')}`;
    window.location.hash = newHash;
};

const locationHandler = async () => {
    const hashParts = window.location.hash.replace("#", "").split('&');
    const location = hashParts[0] || "login";
    const route = routes[location] || routes["404"];
    if (route.template) {
        const html = await fetch(route.template).then((response) => response.text());
        document.getElementById("content").innerHTML = html;
    } else if (route.render) {
        route.render();
    }
    document.title = route.title;
    document.querySelector('meta[name="description"]').setAttribute("content", route.description);

    // Gestisci gli stati dei div aperti
    hashParts.slice(1).forEach(part => {
        const [key, value] = part.split('-');
        if (key === 'chatContainer' && value === 'open') {
            const chatContainer = document.getElementById('chatContainer');
            if (chatContainer) {
                chatContainer.classList.add('open');
                const toggleChatButton = document.getElementById('toggleChatButton');
                if (toggleChatButton) {
                    toggleChatButton.innerHTML = `<i class="bi bi-chevron-left"></i>`;
                }
            }
        }
    });
};

const initializeApp = () => {
    renderExpandableSidebar();
    //renderProfile();
    locationHandler();
};

window.addEventListener("hashchange", locationHandler);
window.addEventListener("load", initializeApp);
window.navigateTo = navigateTo;