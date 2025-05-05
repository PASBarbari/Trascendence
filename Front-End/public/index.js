import { renderLogin } from "./login/login.js";
import { renderRegister } from "./register/register.js";
import { renderHome } from "./home/home.js";
import { renderPong } from "./pong/locale/pong.js";
import { renderExpandableSidebar } from "./chat/ExpandableSidebar.js";
//import { renderProfile } from './profile/profile.js';
import { settingsPopup } from "./settings/settings.js";

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
};

const navigateTo = (path) => {
	window.location.hash = path;
};

import { processOAuthRedirect } from "./var.js";

const locationHandler = async () => {
	const wasOAuthRedirect = processOAuthRedirect();

	var location = window.location.hash.replace("#", "");
	if (location.length == 0) {
		location = "login";
	}

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
	renderExpandableSidebar();
	//renderProfile();

	const toggleSettingsButton = document.getElementById(
		"toggleSettingsButton"
	);
	if (toggleSettingsButton) {
		toggleSettingsButton.addEventListener("click", (event) => {
			event.preventDefault();
			settingsPopup(event);
		});
	}

	locationHandler();
};

window.addEventListener("hashchange", locationHandler);
window.addEventListener("load", initializeApp);
window.navigateTo = navigateTo;
