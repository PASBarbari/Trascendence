import { setVariables, getVariables } from "../var.js";
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
                            <input type="email" id="email" placeholder="Email" class="form-control" required />
                        </div>
                        <div class="mb-3">
                            <input type="password" id="password" placeholder="Password" class="form-control" required />
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
			await onHandleSubmit(e, email, password);
		});

	document
		.getElementById("registerButton")
		.addEventListener("click", function () {
			window.navigateTo("#register");
		});

	document
		.getElementById("loginGoogle")
		.addEventListener("click", async function () {
			const csrftoken = getCookie("csrftoken");
			const { url_api } = getVariables();
			// Navigate to the OAuth flow in the current window
			window.location.href = `${url_api}/login/login/oauth/google/`;
			console.log("Google login");
		});

    document
        .getElementById("login42")
        .addEventListener("click", async function () {
            const csrftoken = getCookie("csrftoken");
            const { url_api } = getVariables();
            // Navigate to the OAuth flow in the current window
            window.location.href = `${url_api}/login/login/oauth/42/`;
            console.log("42 login");
        });
}

async function onHandleSubmit(e, email, password) {
	e.preventDefault();
	if (email && password) {
		console.log("Email:", email);
		console.log("Password:", password);
		const csrftoken = getCookie("csrftoken");
		const loginSuccess = await loginUser(email, password, csrftoken, true);
		if (loginSuccess) {
			//await handleGetUser(csrftoken);
			window.navigateTo("#home");
		}
	} else {
		console.log("Per favore, inserisci sia email che password.");
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
		console.log("Email:", email);
		console.log("Password:", password);
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
				console.log("Risposta dal server:", data);
				
				// Check if 2FA verification is needed
				if (data.temp_token && data.message && data.message.includes('2FA')) {
					// Show OTP verification form
					showOTPVerificationForm(data.temp_token, email);
					return false; // Login not completed yet, waiting for OTP
				}

				if (isBaseLogin) {
					setVariables({ token: data.access_token });
					setVariables({ refreshToken: data.refresh_token });

					const { user_id, email, username } = data;

					setVariables({
						userEmail: email,
						userUsername: username,
						userId: user_id,
					});
				} else {
					setVariables({ multiplayer_username: data.username });
					setVariables({ multiplayer_id: data.user_id });
				}
				return true;
			} else {
				const errorData = await response.json();
				console.error("Errore login:", errorData);
				return false;
			}
		} catch (error) {
			console.error("Exception login:", error);
			return false;
		}
	} else {
		console.log("Per favore, inserisci sia email che password.");
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
    document.getElementById("otpForm").addEventListener("submit", async function(e) {
        e.preventDefault();
        const otpCode = document.getElementById("otpCode").value;
        if (otpCode) {
            const verified = await verifyOTP(tempToken, otpCode, email);
            if (verified) {
                window.navigateTo("#home");
            } else {
				showAlertForXSeconds("Invalid OTP code. Please try again.", "error", 3, { asToast: true });
            }
        }
    });

    // Handle cancel button
    document.getElementById("cancelButton").addEventListener("click", function() {
        // Restore original login form
        contentDiv.innerHTML = originalContent;
        
        // Re-attach event listeners to the restored content
        document.getElementById("loginForm").addEventListener("submit", async function(e) {
            e.preventDefault();
            const email = document.getElementById("email").value;
            const password = document.getElementById("password").value;
            await onHandleSubmit(e, email, password);
        });

        document.getElementById("registerButton").addEventListener("click", function() {
            window.navigateTo("#register");
        });

        document.getElementById("loginGoogle").addEventListener("click", async function() {
            const csrftoken = getCookie("csrftoken");
            const { url_api } = getVariables();
            window.location.href = `${url_api}/login/login/oauth/google/`;
        });

        document.getElementById("login42").addEventListener("click", async function() {
            const csrftoken = getCookie("csrftoken");
            const { url_api } = getVariables();
            window.location.href = `${url_api}/login/login/oauth/42/`;
        });
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
                "Authorization": `Bearer ${tempToken}`
            },
            body: JSON.stringify({ otp_code: otpCode }),
        });

        if (response.ok) {
            const data = await response.json();
            console.log("OTP verification successful:", data);
            
            // Set tokens and user info after successful verification
            setVariables({ token: data.access_token });
            setVariables({ refreshToken: data.refresh_token });

            const { user_id, username, email } = data;
            
            setVariables({
                userEmail: email,
                userUsername: username,
                userId: user_id,
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

async function loginProvider(csrftoken, isBaseLogin, provider) {
	const { url_api } = getVariables();
	try {
		const response = await fetch(
			`${url_api}/login/login/oauth/${provider}`,
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
			console.log("Risposta dal server:", data);

			if (isBaseLogin) {
				setVariables({ token: data.access_token });

				const { user, user_id } = data;
				const { email, username } = user;

				setVariables({
					userEmail: email,
					userUsername: username,
					userId: user_id,
				});
			} else {
				setVariables({ multiplayer_username: data.username });
				setVariables({ multiplayer_id: data.user_id });
			}
			return true;
		} else {
			const errorData = await response.json();
			console.error("Errore login:", errorData);
			return false;
		}
	} catch (error) {
		console.error("Exception login:", error);
		return false;
	}
}

// async function handleGetUser(csrftoken) {
// 	try {
// 		const { token } = getVariables();
// 		const response = await fetch(
// 			"trascendence.42firenze.it/api/login/login/user",
// 			{
// 				method: "GET",
// 				headers: {
// 					"Content-Type": "application/json",
// 					"X-CSRFToken": csrftoken,
// 					Authorization: `Bearer ${token}`,
// 				},
// 			}
// 		);

// 		if (response.ok) {
// 			const data = await response.json();
// 			const { user, user_id } = data;
// 			const { email, username } = user;

// 			setVariables({
// 				userEmail: email,
// 				userUsername: username,
// 				userId: user_id,
// 			});

// 			console.log("User email:", email);
// 			console.log("User username:", username);
// 			console.log("User ID:", user_id);
// 		} else {
// 			const errorData = await response.json();
// 			console.error("Errore nella risposta del server:", errorData);
// 		}
// 	} catch (error) {
// 		console.error("Errore nella richiesta:", error);
// 	}
// }

export { renderLogin, loginUser };
