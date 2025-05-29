import { renderLogin } from "./login/login.js";
import { renderRegister } from "./register/register.js";
import { renderHome } from "./home/home.js";
import { renderPong } from "./pong/locale/pong.js";
import { renderExpandableSidebar } from "./chat/ExpandableSidebar.js";
//import { renderProfile } from './profile/profile.js';
import { settingsPopup } from "./settings/settings.js";
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
		// module: () => import("./pong/pongContainer.js").then(module => module.renderPong),
		title: "Pong",
		description: "This is the pong game",
	},
	oauth: {
		render: () => {
			const oautUrl = getVariables().oauth_url;
			if (oautUrl) {
            	window.location.href = oautUrl; // Reindirizza all'URL di Google OAuth
        	} else {
            	console.error("Oauth URL is not defined in getVariables().oauth_url");
        	}
		},
		title: "OAuth Login",
		description: "This is the OAuth login page",
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

function handleOAuthCallback() {
	console.log("Gestione callback OAuth...");
    // Estrai i parametri dall'URL
    const hashParams = window.location.hash.substring(1).split('?');
    if (hashParams.length < 2) return;
    
    const params = new URLSearchParams(hashParams[1]);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const userId = params.get('user_id');
    const username = params.get('username');
    const email = params.get('email');
    
    if (accessToken && refreshToken) {
        // Salva i token e le info utente
        setVariables({
            token: accessToken,
            refreshToken: refreshToken,
            userId: userId,
            userUsername: username,
            userEmail: email
        });
        
        // Pulisci l'URL
        window.history.replaceState({}, document.title, '/#home');
        
        // Reindirizza alla home
        window.location.hash = "home";
        
        // Aggiungi un piccolo ritardo per assicurarti che il DOM sia aggiornato
        setTimeout(() => {
            // Reinizializza i listener per il menu
            const toggleSettingsButton = document.getElementById("toggleSettingsButton");
            if (toggleSettingsButton) {
                // Rimuovi eventuali vecchi listener
                const newButton = toggleSettingsButton.cloneNode(true);
                toggleSettingsButton.parentNode.replaceChild(newButton, toggleSettingsButton);
                
                // Aggiungi il nuovo listener
                newButton.addEventListener("click", (event) => {
                    event.preventDefault();
                    settingsPopup(event);
                });
            }
            
            // Completa la gestione della navigazione
            locationHandler();
        }, 100);
	}
}

const initializeApp = () => {
	console.log("Inizializzazione dell'applicazione...");
	if (window.location.hash.includes('access_token')) {
        handleOAuthCallback();
        return;
    }

	if (window.location.pathname !== '/' && window.location.pathname !== '/index.html') {
        const currentHash = window.location.hash;
        window.location.href = '/' + currentHash;
        return;
    }

	preloadPongCSS();
	renderExpandableSidebar();
	//renderProfile();

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

window.addEventListener("hashchange", locationHandler);
window.addEventListener("load", initializeApp);
window.navigateTo = navigateTo;
