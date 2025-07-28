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
        <h1 style="display: flex; justify-content: center; align-items: center;">Register</h1>
        <form class="login_form" id="registerForm">
          <input type="text" id="username" placeholder="Username" class="form-control" required style="min-width: 50px; max-width: 300px;" autocomplete="username" />
          <input type="email" id="email" placeholder="Email" class="form-control" required style="min-width: 50px; max-width: 300px;" autocomplete="email" />
          <input type="password" id="password" placeholder="Password" class="form-control" required style="min-width: 50px; max-width: 300px;" autocomplete="new-password" />
          <button type="submit" class="btn btn-primary" style="border-radius: 0.4rem; min-width: 50px; max-width: 300px; width: 100%;">Register</button>
          <button type="button" id="loginButton" class="btn btn-outline-secondary" style="min-width: 50px; max-width: 300px; width: 100%;">Login</button>
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
	if (email && password && username) {
		const { url_api } = getVariables();
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

				showAlertForXSeconds(
					"Registration successful! Please login with your credentials.",
					"success",
					3,
					{ asToast: true }
				);

				if (isBaseRegister) {
					window.navigateTo("#login");
				}
				return true;
			} else {
				const errorData = await response.json();
				console.error("Registration error:", errorData);

				// Handle different error formats
				let errorMessage = "An error occurred during registration";

				if (errorData.error) {
					// Handle array format errors
					if (Array.isArray(errorData.error)) {
						errorMessage = errorData.error.join(", ");
					} else if (typeof errorData.error === "string") {
						// Handle string errors that might be stringified arrays
						if (
							errorData.error.includes("['") &&
							errorData.error.includes("']")
						) {
							// Parse string that looks like "['error message']"
							const match = errorData.error.match(/\['(.+?)'\]/);
							if (match) {
								errorMessage = match[1];
							}
						} else {
							errorMessage = errorData.error;
						}
					}
				} else if (typeof errorData === "object") {
					// Handle Django REST Framework validation errors
					const errors = [];
					for (const [field, fieldErrors] of Object.entries(
						errorData
					)) {
						if (Array.isArray(fieldErrors)) {
							fieldErrors.forEach((error) => {
								if (typeof error === "object" && error.string) {
									errors.push(`${field}: ${error.string}`);
								} else {
									errors.push(`${field}: ${error}`);
								}
							});
						} else {
							errors.push(`${field}: ${fieldErrors}`);
						}
					}
					if (errors.length > 0) {
						errorMessage = errors.join("; ");
					}
				}

				// Show user-friendly error messages
				if (
					errorMessage.includes("email already in use") ||
					(errorMessage.includes("email") &&
						errorMessage.includes("already"))
				) {
					showAlertForXSeconds(
						"This email is already registered. Please use a different email.",
						"error",
						5,
						{ asToast: true }
					);
				} else if (
					errorMessage.includes("weak password") ||
					errorMessage.includes("password")
				) {
					showAlertForXSeconds(
						"Password must be at least 8 characters long and contain letters and numbers.",
						"error",
						5,
						{ asToast: true }
					);
				} else if (
					errorMessage.includes("username already in use") ||
					errorMessage.includes("username")
				) {
					showAlertForXSeconds(
						"This username is already taken. Please choose a different username.",
						"error",
						5,
						{ asToast: true }
					);
				} else if (
					errorMessage.includes("Enter a valid email address")
				) {
					showAlertForXSeconds(
						"Please enter a valid email address.",
						"error",
						5,
						{ asToast: true }
					);
				} else {
					showAlertForXSeconds(
						`Registration failed: ${errorMessage}`,
						"error",
						5,
						{ asToast: true }
					);
				}

				return false;
			}
		} catch (error) {
			console.error("Registration error:", error);
			showAlertForXSeconds(
				"Connection error during registration. Please try again later.",
				"error",
				3,
				{ asToast: true }
			);
			return false;
		}
	} else {
		showAlertForXSeconds(
			"Please fill in all required fields.",
			"error",
			3,
			{ asToast: true }
		);
		return false;
	}
}

export { renderRegister, registerUser };
