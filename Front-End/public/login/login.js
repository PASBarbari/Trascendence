import { setVariables, getVariables, calculateInitials } from "../var.js";
import { getCookie } from "../cookie.js";
import { showAlertForXSeconds } from "../alert/alert.js";

const link = document.createElement("link");
link.rel = "stylesheet";
link.href = "/login/login.css";
document.head.appendChild(link);

function renderLogin() {
	const contentDiv = document.getElementById("content");
	contentDiv.innerHTML = `
		<div class="login">
			<div class="login_box">
				<h1>Login</h1>
				<div class="login_form">
					<form class="login_form" id="loginForm">
						<div class="mb-3">
							<input type="email" id="email" placeholder="Email" class="form-control" required autocomplete="email"/>
						</div>
						<div class="mb-3">
							<input type="password" id="password" placeholder="Password" class="form-control" required autocomplete="current-password"/>
						</div>
						<button type="submit" class="btn btn-primary w-100" style="height: 40px;">Login</button>
						<button type="button" id="registerButton" class="btn btn-secondary w-100 mt-2" style="height: 40px;">Register</button>
						<button type="button" id="loginGoogle" class="btn btn-danger w-100 mt-2" style="height: 40px;">Login with Google</button>
						<button type="button" id="login42" class="btn btn-primary w-100 mt-2" style="height: 40px;">Login with 42</button>
					</form>
				</div>
			</div>
		</div>
	`;

	document
		.getElementById("loginForm")
		.addEventListener("submit", async function (e) {
			e.preventDefault();
			const email = document.getElementById("email").value;
			const password = document.getElementById("password").value;
			if (password.length < 8) {
				showAlertForXSeconds(
					"Password must be at least 8 characters long.",
					"error",
					3,
					{ asToast: true }
				);
				return;
			}
			await onHandleSubmit(e, email, password);
		});

	document
		.getElementById("registerButton")
		.addEventListener("click", function () {
			window.navigateTo("#register");
		});

	document
		.getElementById("loginGoogle")
		.addEventListener("click", () => handleOAuthLogin("google"));

	document
		.getElementById("login42")
		.addEventListener("click", () => handleOAuthLogin("42"));
}

/**
 * Gestisce il login OAuth per diversi provider - VERSIONE LOCALSTORAGE
 * @param {string} provider - Il provider OAuth ("google" o "42")
 */
async function handleOAuthLogin(provider) {
	const csrftoken = getCookie("csrftoken");
	const { url_api } = getVariables();

	let popup = null;
	let storageCheckInterval;

	try {
		const response = await fetch(
			`${url_api}/login/login/oauth/${provider}/`,
			{
				method: "GET",
				headers: {
					"Content-Type": "application/json",
					"X-CSRFToken": csrftoken,
				},
			}
		);

		if (response.ok) {
			const data = await response.json();

			// PULISCI localStorage prima di iniziare
			localStorage.removeItem("oauth_result");

			// Apri il popup OAuth
			popup = window.open(
				data.redirect_url,
				"oauth-popup",
				"width=500,height=600,scrollbars=yes,resizable=yes,left=" +
					(window.screen.width / 2 - 250) +
					",top=" +
					(window.screen.height / 2 - 300)
			);

			if (!popup) {
				showAlertForXSeconds(
					"Popup blocked by browser. Please allow popups for this site.",
					"error",
					5,
					{ asToast: true }
				);
				return;
			}

			// controllo localStorage ogni secondo
			storageCheckInterval = setInterval(() => {
				try {
					const resultString = localStorage.getItem("oauth_result");

					if (resultString) {
						const result = JSON.parse(resultString);

						// Pulisci localStorage
						localStorage.removeItem("oauth_result");

						// Pulisci interval
						clearInterval(storageCheckInterval);
						storageCheckInterval = null;

						// Chiudi popup se ancora aperto
						if (popup && !popup.closed) {
							popup.close();
						}

						// Processa il risultato
						if (result.type === "OAUTH_SUCCESS") {
							// Verifica che i dati ci siano
							if (!result.access_token || !result.refresh_token) {
								console.error(
									"Token mancanti nel risultato:",
									result
								);
								showAlertForXSeconds(
									"OAuth authentication failed: missing tokens",
									"error",
									5,
									{ asToast: true }
								);
								return;
							}

							const initials = calculateInitials(result.username);

							// Salva i token
							setVariables({
								token: result.access_token,
								refreshToken: result.refresh_token,
								userId: result.user_id,
								userUsername: result.username,
								userEmail: result.email,
								initials: initials,
							});

							// Reindirizza alla home
							window.navigateTo("#home");

							// Mostra messaggio di successo
							showAlertForXSeconds(
								"OAuth login successful!",
								"success",
								3,
								{ asToast: true }
							);
						} else if (result.type === "OAUTH_ERROR") {
							showAlertForXSeconds(
								`OAuth login failed: ${result.error}`,
								"error",
								5,
								{ asToast: true }
							);
						}
					}
				} catch (e) {
					console.error("Errore controllo localStorage:", e);
				}
			}, 1000);

			// Timeout di sicurezza (5 minuti)
			setTimeout(() => {
				if (storageCheckInterval) {
					clearInterval(storageCheckInterval);
					storageCheckInterval = null;
				}
				try {
					if (popup) {
						popup.close();
					}
				} catch (e) {
					console.log("Popup già chiuso o non accessibile");
				}
				localStorage.removeItem("oauth_result");
			}, 300000); // 5 minuti
		} else {
			const errorData = await response.json();
			showAlertForXSeconds(
				"Authentication error. Please try again.",
				"error",
				3,
				{ asToast: true }
			);
		}
	} catch (error) {
		showAlertForXSeconds(
			"Connection error during authentication.",
			"error",
			3,
			{ asToast: true }
		);
	}
}

async function onHandleSubmit(e, email, password) {
	e.preventDefault();
	if (email && password) {
		const csrftoken = getCookie("csrftoken");
		const loginSuccess = await loginUser(email, password, csrftoken, true);
		if (loginSuccess) {
			window.navigateTo("#home");
		}
	} else {
		showAlertForXSeconds(
			"Please enter both email and password.",
			"error",
			3,
			{ asToast: true }
		);
	}
}

/**
 * Effettua il login dell'utente.
 *
 * @param {boolean} isBaseLogin - true per il login base, false per il login multiplayer per pong.
 * @returns {Promise<boolean>} - Ritorna true se il login ha successo, altrimenti false.
 */
async function loginUser(email, password, csrftoken, isBaseLogin) {
	if (email && password) {
		const { url_api } = getVariables();
		try {
			const response = await fetch(`${url_api}/login/login/login`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-CSRFToken": csrftoken,
				},
				body: JSON.stringify({ email, password }),
			});

			if (response.ok) {
				const data = await response.json();

				// Check if 2FA verification is needed
				if (
					data.temp_token &&
					data.message &&
					data.message.includes("2FA")
				) {
					// Show OTP verification form
					showOTPVerificationForm(data.temp_token, email);
					return false;
				}

				if (isBaseLogin) {
					setVariables({ token: data.access_token });
					setVariables({ refreshToken: data.refresh_token });

					const { user_id, email, username } = data;
					const initials = calculateInitials(username);

					setVariables({
						userEmail: email,
						userUsername: username,
						userId: user_id,
						initials: initials,
					});
				} else {
					setVariables({ multiplayer_username: data.username });
					setVariables({ multiplayer_id: data.user_id });
				}
				return true;
			} else {
				const errorData = await response.json();
				console.error("Login error:", errorData);

				// Handle different error formats
				let errorMessage = "Invalid credentials";

				if (errorData.error) {
					if (typeof errorData.error === "string") {
						// Handle Django REST Framework validation errors in string format
						if (errorData.error.includes("ErrorDetail")) {
							errorMessage = "Please enter a valid email address";
						} else {
							errorMessage = errorData.error;
						}
					}
				}

				showAlertForXSeconds(
					`Login failed: ${errorMessage}`,
					"error",
					3,
					{ asToast: true }
				);
				return false;
			}
		} catch (error) {
			showAlertForXSeconds(
				"Connection error during login. Please try again later.",
				"error",
				3,
				{ asToast: true }
			);
			return false;
		}
	} else {
		return false;
	}
}

function showOTPVerificationForm(tempToken, email) {
	const contentDiv = document.getElementById("content");
	// Save the original content to restore if needed
	const originalContent = contentDiv.innerHTML;

	// Show OTP verification form
	contentDiv.innerHTML = `
		<div class="login">
			<div class="login_box auth-card">
				<div class="text-center mb-4">
					<i class="fas fa-shield-alt fa-3x text-primary mb-3"></i>
					<h1 class="auth-title">2FA Verification</h1>
					<p class="auth-subtitle">Please enter the 6-digit code from your authenticator app</p>
				</div>
				<div class="login_form">
					<form class="login_form" id="otpForm">
						<div class="otp-input-container mb-4">
							<input type="text" id="otpCode" placeholder="000000" class="form-control otp-input" maxlength="6" autocomplete="one-time-code" inputmode="numeric" required />
						</div>
						<button type="submit" class="btn btn-primary w-100 auth-btn">
							<i class="fas fa-lock-open me-2"></i>Verify
						</button>
						<button type="button" id="cancelButton" class="btn btn-outline-secondary w-100 mt-3 auth-btn">
							<i class="fas fa-arrow-left me-2"></i>Back to Login
						</button>
					</form>
				</div>
			</div>
		</div>
	`;

	// Handle OTP verification
	document
		.getElementById("otpForm")
		.addEventListener("submit", async function (e) {
			e.preventDefault();
			const otpCode = document.getElementById("otpCode").value;
			if (otpCode) {
				const verified = await verifyOTP(tempToken, otpCode, email);
				if (verified) {
					window.navigateTo("#home");
				} else {
					showAlertForXSeconds(
						"Invalid OTP code. Please try again.",
						"error",
						3,
						{ asToast: true }
					);
				}
			}
		});

	// Handle cancel button
	document
		.getElementById("cancelButton")
		.addEventListener("click", function () {
			// Restore original login form
			contentDiv.innerHTML = originalContent;

			// Re-attach event listeners to the restored content
			document
				.getElementById("loginForm")
				.addEventListener("submit", async function (e) {
					e.preventDefault();
					const email = document.getElementById("email").value;
					const password = document.getElementById("password").value;
					await onHandleSubmit(e, email, password);
				});

			document
				.getElementById("registerButton")
				.addEventListener("click", function () {
					window.navigateTo("#register");
				});

			document
				.getElementById("loginGoogle")
				.addEventListener("click", () => handleOAuthLogin("google"));

			document
				.getElementById("login42")
				.addEventListener("click", () => handleOAuthLogin("42"));
		});
}

async function verifyOTP(tempToken, otpCode, email) {
	const { url_api } = getVariables();
	const csrftoken = getCookie("csrftoken");

	try {
		const response = await fetch(`${url_api}/login/login/2fa/verify/`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-CSRFToken": csrftoken,
				Authorization: `Bearer ${tempToken}`,
			},
			body: JSON.stringify({ otp_code: otpCode }),
		});

		if (response.ok) {
			const data = await response.json();

			// Set tokens and user info after successful verification
			setVariables({ token: data.access_token });
			setVariables({ refreshToken: data.refresh_token });

			const { user_id, username, email } = data;
			const initials = calculateInitials(username);

			setVariables({
				userEmail: email,
				userUsername: username,
				userId: user_id,
				initials: initials,
			});

			return true;
		} else {
			const errorData = await response.json();
			console.error("OTP verification failed:", errorData);
			return false;
		}
	} catch (error) {
		console.error("Exception during OTP verification:", error);
		return false;
	}
}

export { renderLogin, loginUser };
