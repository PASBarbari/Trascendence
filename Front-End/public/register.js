	import { setVariables, getVariables } from './var.js';
	
	function renderRegister() {
		const appDiv = document.querySelector('.App');
	
		// Aggiungi dinamicamente i file CSS per la pagina di registrazione
		const loginLink = document.createElement('link');
		loginLink.rel = 'stylesheet';
		loginLink.href = 'login.css';
		document.head.appendChild(loginLink);
	
		const registerLink = document.createElement('link');
		registerLink.rel = 'stylesheet';
		registerLink.href = 'register.css';
		document.head.appendChild(registerLink);
	
		appDiv.innerHTML = `
			<div class="register">
				<div class="login_box">
					<h1>Register</h1>
					<div class="login_form">
						<form class="login_form" id="registerForm">
							<div class="mb-3">
								<input type="text" id="username" placeholder="Username" class="form-control" required />
							</div>
							<div class="mb-3">
								<input type="email" id="email" placeholder="Email" class="form-control" required />
							</div>
							<div class="mb-3">
								<input type="password" id="password" placeholder="Password" class="form-control" required />
							</div>
							<div class="empty"></div>
							<button type="submit" class="btn btn-primary w-100" style="height: 40px;">Register</button>
							<button type="button" id="loginButton" class="btn btn-secondary w-100 mt-2" style="height: 40px;">Login</button>
						</form>
					</div>
				</div>
			</div>
		`;
	
		document.getElementById('registerForm').addEventListener('submit', async function(e) {
			e.preventDefault();
			const username = document.getElementById('username').value;
			const email = document.getElementById('email').value;
			const password = document.getElementById('password').value;
			await onHandleSubmit(e, username, email, password);
		});
	
		document.getElementById('loginButton').addEventListener('click', function() {
			window.navigateTo('/login');
		});
	}
	
	async function onHandleSubmit(e, username, email, password) {
		e.preventDefault();
		if (email && password) {
			console.log('Username:', username);
			console.log('Email:', email);
			console.log('Password:', password);
			try {
				const response = await fetch('http://localhost:8000/login/register', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'X-CSRFToken': getCookie('csrftoken'),
					},
					body: JSON.stringify({ username, email, password }),
				});
	
				if (response.ok) {
					const data = await response.json();
					console.log('Risposta dal server:', data);
					window.navigateTo('/login');
				} else {
					const errorData = await response.json();
					console.error('Errore nella risposta del server:', errorData.error);
					if (errorData.error === "['email already in use']") {
						alert('L\'email inserita è già in uso. Scegli un\'altra email.');
					} else if (errorData.error === "['weak password']") {
						alert('La password deve contenere almeno 8 caratteri.');
					} else if (errorData.error === "['username already in use']") {
						alert('Per favore, inserisci un nome utente valido.');
					} else {
						alert('Si è verificato un errore. Per favore, riprova.');
					}
					console.error('Errore nella risposta del server:', response.statusText);
				}
			} catch (error) {
				console.error('Errore nella richiesta:', error);
			}
		} else {
			console.log('Per favore, inserisci sia username che password.');
		}
	}
	
	function getCookie(name) {
		let cookieValue = null;
		if (document.cookie && document.cookie !== '') {
			const cookies = document.cookie.split(';');
			for (let i = 0; i < cookies.length; i++) {
				const cookie = cookies[i].trim();
				if (cookie.substring(0, name.length + 1) === (name + '=')) {
					cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
					break;
				}
			}
		}
		return cookieValue;
	}
	
	export { renderRegister };