import { renderLogin } from './login/login.js';
import { renderRegister } from './register/register.js';
import { renderHome } from './home/home.js';
import { setVariables, getVariables } from './var.js';
// import { renderNotification, initializeWebSocket } from './notification/notification.js';

document.addEventListener('DOMContentLoaded', function () {
	// if (getVariables().userId === null) {
	// 	navigateTo('/login'); // controlla se le variabili sono presenti sennò reindirizza a login
	// } else {
	// 	console.log('var presenti');
	// }

	function navigateTo(path) {
		window.history.pushState({}, path, window.location.origin + path);
		handleRoute();
	}

	async function handleRoute() {
		const routes = {
			'/': () => navigateTo('/login'),
			'/login': () => renderLogin(),
			'/register': () => renderRegister(),
			'/home': () => renderHome(),
			'/mine': () => window.location.href = 'https://minesweeper.online/it/',
			'/pong': async () => {
				const { renderPong } = await import('./pong/serverSide.js');
				renderPong();
			},
			// '/notifications': () => {
			// 	renderNotification();
			// 	initializeWebSocket(); // senza richiamare questo, il websocket partiva sempre
			// } //ma che minchia e' sta roba? dimenticato
		};

		const path = window.location.pathname;
		const route = routes[path] || routes['/login'];
		route();
	}

	document.querySelector('.App').innerHTML = `
		<nav class="navbar navbar-expand-lg navbar-light bg-light">
			<a class="navbar-brand" href="#">Navbar</a>
			<div class="collapse navbar-collapse">
				<ul class="navbar-nav mr-auto">
					<li class="nav-item"><a class="nav-link" href="/login" data-link>Login</a></li>
					<li class="nav-item"><a class="nav-link" href="/register" data-link>Register</a></li>
					<li class="nav-item"><a class="nav-link" href="/home" data-link>Home</a></li>
					<li class="nav-item"><a class="nav-link" href="/mine" data-link>Mine</a></li>
					<li class="nav-item"><a class="nav-link" href="/pong" data-link>Pong</a></li>
					//<!--li class="nav-item"><a class="nav-link" href="/notifications" data-link>Notifications</a></li-->
				</ul>
			</div>
		</nav>
		<div class="content"></div>
	`;

	document.querySelectorAll('[data-link]').forEach(link => {
		link.addEventListener('click', function (event) {
			event.preventDefault();
			navigateTo(event.target.getAttribute('href'));
		});
	});

	window.onpopstate = handleRoute;
	window.navigateTo = navigateTo; // Assicurati che navigateTo sia accessibile globalmente
	handleRoute();
});