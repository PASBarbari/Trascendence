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
		// module: () => import("./pong/locale/pong.js").then(module => module.renderPong),
		title: "Pong",
		description: "This is the pong game",
		protected: true,
	},
	pongmulti: {
		render: async () => {
			console.log("Multiplayer pong route accessed");

			// Extract parameters from the hash, not from window.location.search
			const hashParts = window.location.hash.replace("#", "").split("?");
			const queryString = hashParts[1] || "";
			const urlParams = new URLSearchParams(queryString);

			const roomId = urlParams.get("room");
			const opponentId = urlParams.get("opponent");
			const opponentName = urlParams.get("opponentName");
			const tournamentId = urlParams.get("tournamentId");

			console.log("Route params:", { roomId, opponentId, opponentName, tournamentId });

			if (opponentId && opponentName) {
				// Load multiplayer game with invitation data
				try {
					const { renderMultiplayerPong } = await import(
						"./pong/multiplayer/multiplayerPong.js"
					);
					renderMultiplayerPong(
						opponentId,
						decodeURIComponent(opponentName),
						roomId || null,
						tournamentId || null
					);
				} catch (error) {
					console.error("Failed to load multiplayer pong:", error);
					window.navigateTo("#home");
				}
			}
		},
		title: "Multiplayer Pong",
		description: "Multiplayer Pong Game",
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

	// Extract the hash and separate route from query parameters
	let fullLocation = window.location.hash.replace("#", "");
	let location = fullLocation;
	let queryParams = "";

	// Split route from query parameters
	if (fullLocation.includes("?")) {
		[location, queryParams] = fullLocation.split("?", 2);
	}

	console.log("🔧 Routing Debug:");
	console.log("  - Full hash:", fullLocation);
	console.log("  - Route:", location);
	console.log("  - Query params:", queryParams);

	if (routes[location]?.protected && !checkAuth()) {
		console.log("Utente non autenticato, reindirizzamento a login");
		Logout();
		return;
	}

	if (location === "login" && checkAuth()) {
		console.log("Utente autenticato, reindirizzamento a home");
		window.location.hash = "home";
		return;
	}

	if (location.length == 0) {
		window.location.hash = "login";
		return;
	}

	// Check if the route exists (without query parameters)
	if (!routes[location]) {
		console.log(`Route "${location}" non trovata, reindirizzamento a login`);
		window.location.hash = "login";
		return;
	}

	if (
		(currentRoute === "pong" && location !== "pong") ||
		(currentRoute === "pongmulti" && location !== "pongmulti")
	) {
		console.log("Navigando via da Pong, eseguo cleanup...");
		cleanupPong();
	}

	if (routes[location]?.protected && checkAuth()) {
		renderExpandableSidebar();
	}

	currentRoute = location;

	if (wasOAuthRedirect && location === "home") {
		console.log("OAuth login successful!");
	}

	// Use the route without query parameters
	const route = routes[location] || routes["404"];
	if (route.module) {
		console.log(`Caricamento dinamico del modulo per: ${location}`);
		try {
			const renderFunction = await route.module();
			renderFunction();
		} catch (error) {
			console.error("Errore nel caricamento del modulo %s:", location, error);
		}
	} else if (route.template) {
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

const initializeApp = async () => {
	console.log("Inizializzazione dell'applicazione...");
	console.log("URL corrente:", window.location.href);
	console.log("Hash:", window.location.hash);
	console.log("Search:", window.location.search);

	if (getVariables().url_api === null || getVariables().url_api === "") {
		const apiUrl = window.location.origin + "/api";
		const wssUrl =
			window.location.origin
				.replace("https://", "wss://")
				.replace("http://", "ws://") + "/api";
		setVariables({
			url_api: apiUrl,
			wss_api: wssUrl,
		});
	}

	if (
		window.location.pathname !== "/" &&
		window.location.pathname !== "/index.html"
	) {
		const currentHash = window.location.hash;
		window.location.href = "/" + currentHash;
		return;
	}

	preloadPongCSS();

	if (checkAuth()) {
		renderExpandableSidebar();
	}

	const toggleSettingsButton = document.getElementById("toggleSettingsButton");
	if (toggleSettingsButton) {
		toggleSettingsButton.addEventListener("click", (event) => {
			event.preventDefault();
			settingsPopup(event);
		});
	}

	const currentHash = window.location.hash;
	if (currentHash === "#pong") {
		console.log("Rilevato refresh su pagina Pong, forzo il rendering...");
		await cleanupPong();
	}

	locationHandler();
};

function checkAuth() {
	const token = getVariables().token;
	if (token && token.length > 0) {
		try {
			const payload = JSON.parse(atob(token.split(".")[1]));
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

export function getBaseUrl() {
	const hostname = window.location.hostname;
	const port = window.location.port || "8443";

	if (
		hostname === "localhost" ||
		hostname === "127.0.0.1" ||
		hostname === "10.0.2.15"
	) {
		return `http://localhost.xip.io:${port}`;
	} else if (hostname.startsWith("10.11.")) {
		return `http://${hostname}.xip.io:${port}`;
	} else if (hostname.includes(".xip.io")) {
		return `http://${hostname}:${port}`;
	} else {
		return `http://${hostname}.xip.io:${port}`;
	}
}
