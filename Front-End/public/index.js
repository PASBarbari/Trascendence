import { renderLogin } from "./login/login.js";
import { renderRegister } from "./register/register.js";
import { renderHome } from "./home/home.js";
import { renderPong } from "./pong/locale/pong.js";
import { renderExpandableSidebar } from "./chat/ExpandableSidebar.js";
//import { renderProfile } from './profile/profile.js';
import { settingsPopup, Logout } from "./settings/settings.js";
import { cleanupPong } from "./pong/locale/settings.js";
import { getVariables, setVariables } from "./var.js";

function preloadPongCSS() {
	const link = document.createElement("link");
	link.rel = "stylesheet";
	link.href = "/pong/locale/pong.css";
	document.head.appendChild(link);
	console.log("Pong CSS precaricato");
}

const routes = {
	404: {
		template: "/templates/404.html",
		title: "404",
		description: "Page not found",
		protected: false,
	},
	"/": {
		render: renderLogin,
		title: "Login",
		description: "This is the login page",
		protected: false,
	},
	login: {
		render: renderLogin,
		title: "Login",
		description: "This is the login page",
		protected: false,
	},
	register: {
		render: renderRegister,
		title: "Register",
		description: "This is the register page",
		protected: false,
	},
	home: {
		render: renderHome,
		title: "Home",
		description: "This is the home page",
		protected: true,
	},
	pong: {
		render: renderPong,
		// module: () => import("./pong/pongContainer.js").then(module => module.renderPong),
		title: "Pong",
		description: "This is the pong game",
		protected: true,
	},
};

const navigateTo = (path) => {
	window.location.hash = path;
};

import { processOAuthRedirect } from "./var.js";
let currentRoute = "";

const locationHandler = async () => {
	const wasOAuthRedirect = processOAuthRedirect();

	var location = window.location.hash.replace("#", "");

	if (routes[location]?.protected && !checkAuth()) {
		console.log("Utente non autenticato, reindirizzamento a login");
		Logout();
		return;
	}

	if (location === 'login' && checkAuth()) {
		console.log("Utente autenticato, reindirizzamento a home");
		window.location.hash = "home";
		return;
	}

	if (location.length == 0) {
		window.location.hash = "login";
		return;
	}

	if (!routes[location]) {
        console.log(`Route "${location}" non trovata, reindirizzamento a login`);
        window.location.hash = "login";
        return;
    }

	if (currentRoute === "pong" && location !== "pong") {
		console.log("Navigando via da Pong, eseguo cleanup...");
		cleanupPong();
	}

	currentRoute = location;

	if (wasOAuthRedirect && location === "home") {
		console.log("OAuth login successful!");
	}

	const route = routes[location] || routes["404"];
	if (route.template) {
		const html = await fetch(route.template).then((response) =>
			response.text()
		);
		document.getElementById("content").innerHTML = html;
	} else if (route.render) {
		route.render();
	}
	document.title = route.title;
	document
		.querySelector('meta[name="description"]')
		.setAttribute("content", route.description);
};

const initializeApp = () => {
    console.log("Inizializzazione dell'applicazione...");
    console.log("URL corrente:", window.location.href);
    console.log("Hash:", window.location.hash);
    console.log("Search:", window.location.search);

    if (window.location.pathname !== '/' && window.location.pathname !== '/index.html') {
        const currentHash = window.location.hash;
        window.location.href = '/' + currentHash;
        return;
    }

    preloadPongCSS();
    renderExpandableSidebar();

    const toggleSettingsButton = document.getElementById("toggleSettingsButton");
    if (toggleSettingsButton) {
        toggleSettingsButton.addEventListener("click", (event) => {
            event.preventDefault();
            settingsPopup(event);
        });
    }

    locationHandler();
    
    const currentHash = window.location.hash;
    if (currentHash === "#pong") {
        console.log("Rilevato refresh su pagina Pong, forzo il rendering...");
        cleanupPong().then(() => {
            console.log("Cleanup completato, avvio rendering...");
            renderPong();
        });
    }
};

function checkAuth() {
	const token = getVariables().token;
	if (token && token.length > 0) {
		try {
			const payload = JSON.parse(atob(token.split('.')[1]));
			const currentTime = Math.floor(Date.now() / 1000);
			return payload.exp >= currentTime;
		} catch {
			return false;
    	}
	}
	return false;
}

window.addEventListener("hashchange", locationHandler);
window.addEventListener("load", initializeApp);
window.navigateTo = navigateTo;
