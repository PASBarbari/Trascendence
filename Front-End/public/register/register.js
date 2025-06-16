import { setVariables, getVariables } from "../var.js";
import { getCookie } from "../cookie.js";
import { showAlertForXSeconds } from "../alert/alert.js";

const link = document.createElement("link");
link.rel = "stylesheet";
link.href = "/register/register.css";
document.head.appendChild(link);

function renderRegister() {
	const contentDiv = document.getElementById("content");
	contentDiv.innerHTML = `
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
                        <button type="submit" class="btn btn-primary w-100" style="height: 40px;">Register</button>
                        <button type="button" id="loginButton" class="btn btn-secondary w-100 mt-2" style="height: 40px;">Login</button>
                    </form>
                </div>
            </div>
        </div>
    `;

	document
		.getElementById("registerForm")
		.addEventListener("submit", async function (e) {
			e.preventDefault();
			const username = document.getElementById("username").value;
			const email = document.getElementById("email").value;
			const password = document.getElementById("password").value;
			await onHandleSubmit(e, username, email, password);
		});

	document
		.getElementById("loginButton")
		.addEventListener("click", function () {
			window.navigateTo("#login");
		});
}

async function onHandleSubmit(e, username, email, password) {
	e.preventDefault();
	await registerUser(username, email, password, true);
}

/**
 * Gestisce la registrazione dell'utente.
 *
 * @param {boolean} isBaseRegister - true per la registrazione base, false per la registrazione multiplayer per pong.
 * @returns {Promise<boolean>} - Ritorna true se la registrazione ha successo, altrimenti false.
 */
async function registerUser(username, email, password, isBaseRegister) {
	if (email && password) {
		const { url_api } = getVariables();
		console.log("Username:", username);
		console.log("Email:", email);
		console.log("Password:", password);
		try {
			const response = await fetch(`${url_api}/login/login/register`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-CSRFToken": getCookie("csrftoken"),
				},
				body: JSON.stringify({ username, email, password }),
			});

			if (response.ok) {
				const data = await response.json();
				console.log("Risposta dal server:", data);
				if (isBaseRegister) {
					window.navigateTo("#login");
				}
				return true;
			} else {
				const errorData = await response.json();
				console.error(
					"Errore nella risposta del server:",
					errorData.error
				);
				if (errorData.error === "['email already in use']") {
					showAlertForXSeconds(
						"L'email inserita è già in uso. Scegli un'altra email.",
						"error",
						5,
						{ asToast: true }
					);
				} else if (errorData.error === "['weak password']") {
					showAlertForXSeconds(
						"La password deve contenere almeno 8 caratteri.",
						"error",
						5,
						{ asToast: true }
					);
				} else if (errorData.error === "['username already in use']") {
					showAlertForXSeconds(
						"Per favore, inserisci un nome utente valido.",
						"error",
						5,
						{ asToast: true }
					);
				} else if (errorData.error === "{'email': [ErrorDetail(string='Enter a valid email address.', code='invalid')]}") {
					showAlertForXSeconds(
						"Per favore, inserisci un'email valida.",
						"error",
						5,
						{ asToast: true }
					);
				} else {
					showAlertForXSeconds(
						"Si è verificato un errore. Per favore, riprova.",
						"error",
						5,
						{ asToast: true }
					);
				}
				return false;
			}
		} catch (error) {
			console.error("Errore nella richiesta:", error);
			return false;
		}
	} else {
		console.log("Per favore, inserisci sia username che password.");
		return false;
	}
}

export { renderRegister, registerUser };
