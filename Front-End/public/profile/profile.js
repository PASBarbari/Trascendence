import { setVariables, getVariables } from "../var.js";
import { getCookie } from "../cookie.js";
import { showAlertForXSeconds } from "../alert/alert.js";

const link = document.createElement("link");
link.rel = "stylesheet";
link.href = "/profile/profile.css";
document.head.appendChild(link);

async function PatchProfile(name, surname, birthdate, bio) {
	const { userId, url_api } = getVariables();

	try {
		const response = await fetch(`${url_api}/user/user/${userId}/`, {
			// user/levelup user_id e exp
			method: "PATCH",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${getVariables().token}`,
			},
			body: JSON.stringify({
				account_id: userId,
				first_name: name,
				last_name: surname,
				birth_date: birthdate,
				bio: bio,
			}),
		});

		if (response.ok) {
			const data = await response.json();
			console.log("Profile:", data);
		} else {
			const errorData = await response.json();
			console.error("Errore nella risposta del server:", errorData);
		}
	} catch (error) {
		console.error("Errore nella richiesta:", error);
	}
}

// Aggiungi questa funzione al tuo file
async function downloadImageAsBlob(imageUrl, token) {
	try {
		const imageResponse = await fetch(imageUrl, {
			headers: {
				Authorization: `Bearer ${token}`
			}
		});

		if (imageResponse.ok) {
			const imageBlob = await imageResponse.blob();
			const localImageUrl = URL.createObjectURL(imageBlob);
			console.log("Immagine scaricata e convertita in URL locale:", localImageUrl);
			return localImageUrl;
		} else {
			console.error("Errore nel recupero dell'immagine:", imageResponse.status);
			return null;
		}
	} catch (error) {
		console.error("Errore durante il download dell'immagine:", error);
		return null;
	}
}

async function GetProfile() {
	const { userId, token, url_api } = getVariables();
	try {
		const response = await fetch(`${url_api}/user/user/user/me/`, {
			method: "GET",
			headers: {
				"Content-Type": "application/json",
				"X-CSRFToken": getCookie("csrftoken"),
				Authorization: `Bearer ${token}`,
			},
		});

		if (response.ok) {
			const data = await response.json();
			console.log("Profile:", data);

			let localImageUrl = null;
			let avatarUrl = "";
			if (data.current_avatar_url) {
				// Estrai solo il nome del file
				const filename = data.current_avatar_url.split('/').pop();
				
				// URL corretto per il proxy
				// avatarUrl = `https://minio.trascendence.42firenze.it/jwt-validator/minio-proxy/avatars/${filename}?token=${token}`;
				avatarUrl = `https://minio.trascendence.42firenze.it/jwt-validator/minio-proxy/avatars/${encodeURIComponent(filename)}`;
				// avatarUrl = avatarUrl.replace(" ", "%20");

				console.log("Downloading profile image from:", avatarUrl);
			}

			if (avatarUrl !== "") {
				localImageUrl = await downloadImageAsBlob(avatarUrl, token);
			}

			setVariables({
				name: data.first_name || "",
				surname: data.last_name || "",
				birthdate: data.birth_date || "",
				bio: data.bio || "",
				level: data.level ?? "",
				exp: data.exp ?? "",
				profileImageUrl: localImageUrl || "",
				has_two_factor_auth: data.has_two_factor_auth || false,
			});
			console.log("level e exp:", data.level, data.exp);
			console.log("Variables after GetProfile:", getVariables()); // Aggiungi questo per il debug

		} else {
			const errorData = await response.json();
			console.error("Error fetching profile:", errorData);
		}
	} catch (error) {
		console.error("Error fetching profile:", error);
	}
}

async function initializeProfile() {
	if (document.readyState === "loading") {
		await new Promise((resolve) => {
			document.addEventListener("DOMContentLoaded", resolve);
		});
	}

	// Verifica che l'elemento esista
	if (!document.getElementById("profile")) {
		console.error("TODO remove Elemento #profile non trovato nel DOM");
		return;
	}

	await GetProfile();
	renderProfile();
}

function renderProfile() {
	const {
		userUsername,
		userEmail,
		userId,
		name,
		surname,
		birthdate,
		bio,
		level,
		exp,
		profileImageUrl,
		has_two_factor_auth,
	} = getVariables();
	console.log("level e exp:", level, exp);
	let edit = false;

	const profileDiv = document.getElementById("profile");
	profileDiv.innerHTML = `
		<div class="profile-card">
			<div class="profile-card-content">
				<div class="profile-card-details">
					<form class="profile-form" id="profileForm">
						<div class="profile-form-group">
							<label for="username">Username</label>
							<input type="text" id="username" name="username" value="${userUsername}" readonly class="form-control readonly-input">
						</div>
						<div class="profile-form-group">
							<label for="user_id">User ID</label>
							<input type="text" id="user_id" name="user_id" value="${userId}" readonly class="form-control readonly-input">
						</div>
						<div class="profile-form-group">
							<label for="email">Email</label>
							<input type="email" id="email" name="email" value="${userEmail}" readonly class="form-control readonly-input">
						</div>
						<div class="profile-form-group">
							<label for="birthdate">Data di nascita</label>
							<input type="date" id="birthdate" name="birthdate" value="${birthdate}" readonly class="form-control readonly-input">
						</div>
						<div class="profile-form-group">
							<label for="name">Nome</label>
							<input type="text" id="name" name="name" value="${name}" readonly class="form-control readonly-input">
						</div>
						<div class="profile-form-group">
							<label for="surname">Cognome</label>
							<input type="text" id="surname" name="surname" value="${surname}" readonly class="form-control readonly-input">
						</div>
						<div class="profile-form-group">
							<label for="bio">Bio</label>
							<textarea id="bio" name="bio" readonly class="form-control readonly-input" rows="1">${bio}</textarea>
						</div>

						<div class="profile-form-group level">
							<label for="level" id="level">Level: ${level}, Exp: ${exp}</label>
							<input type="range" id="exp" name="exp" min="0" max="100" value="${exp}" readonly class="form-range readonly-input custom-range">
							<!--span id="expValue">exp: ${exp}</span-->
						</div>

						<div class="profile-form-group">
							<label for="2fAuth" style="height:21px"></label>
							<button id="toggle2FAButton" type="button" class="btn btn-secondary">
								${has_two_factor_auth ? "Disable" : "Enable"} 2FA
							</button>
						</div>

					</form>
				</div>
				<div class="profile-card-image-container">
					<button class="profile-image-circle">
						<img src="${profileImageUrl || '/profile/placeholder.jpeg'}" alt="Profile" class="profile-card-image" />
						<div class="edit-icon-overlay">
							<i class="bi bi-pencil"></i>
						</div>
					</button>
					<div class="buttons">
						<button id="editButton" class="edit-button btn btn-light">
							<i class="bi bi-pencil edit-icon"></i>
						</button>
						<button id="saveButton" class="save-button btn btn-light">
							<i class="bi bi-save save-icon"></i>
						</button>
					</div>
				</div>
			</div>
		</div>
	`;

	const form = document.getElementById("profileForm");
	const editButton = document.getElementById("editButton");
	const saveButton = document.getElementById("saveButton");
	const profileImageContainer = document.querySelector(
		".profile-card-image-container"
	);
	const profileImage = document.querySelector(".profile-image-circle");

	editButton.addEventListener("click", function (e) {
		e.preventDefault();
		edit = !edit;
		if (edit) {
			form.querySelectorAll(
				'input:not([id="username"]):not([id="user_id"]):not([id="email"]):not([id="level"]):not([id="exp"]), textarea'
			).forEach((input) => {
				input.removeAttribute("readonly");
				input.classList.remove("readonly-input");
			});
			profileImageContainer.classList.add("edit-mode");
		} else {
			form.querySelectorAll("input, textarea").forEach((input) => {
				input.setAttribute("readonly", true);
				input.classList.add("readonly-input");
			});
			profileImageContainer.classList.remove("edit-mode");
		}
	});

	saveButton.addEventListener("click", function (e) {
		e.preventDefault();
		const updatedName = document.getElementById("name").value;
		const updatedSurname = document.getElementById("surname").value;
		const updatedBirthdate = document.getElementById("birthdate").value;
		const updatedBio = document.getElementById("bio").value;

		setVariables({
			name: updatedName,
			surname: updatedSurname,
			birthdate: updatedBirthdate,
			bio: updatedBio,
		});

		PatchProfile(updatedName, updatedSurname, updatedBirthdate, updatedBio);

		edit = false;
		form.querySelectorAll("input, textarea").forEach((input) => {
			input.setAttribute("readonly", true);
			input.classList.add("readonly-input");
		});
		profileImageContainer.classList.remove("edit-mode");
	});

	// Aggiungi l'event listener per aggiornare lo stile della barra di scorrimento
	const expInput = document.getElementById("exp");
	// const expValueSpan = document.getElementById('expValue');

	expInput.addEventListener("input", function () {
		// expValueSpan.textContent = `exp: ${expInput.value}`;
		expInput.style.setProperty("--value", `${expInput.value}%`);
	});

	// Imposta il valore iniziale
	expInput.style.setProperty("--value", `${expInput.value}%`);

	const toggle2FAButton = document.getElementById("toggle2FAButton");
	toggle2FAButton.addEventListener("click", async function(e) {
		e.preventDefault();
		console.log("2FA button clicked");
		if (has_two_factor_auth) {
			// Disable 2FA
			try {
				const response = await fetch(`${getVariables().url_api}/login/login/2fa/disable/`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"Authorization": `Bearer ${getVariables().token}`
						}
					});
				if (response.ok) {
					setVariables({
						has_two_factor_auth: false
					});
					showAlertForXSeconds("2FA disabled successfully", "success", 3, { asToast: true });
					console.log("2FA disabled successfully");
					toggle2FAButton.innerText = "Enable 2FA";
					renderProfile();
				} else {
					const data = await response.json();
					alert(data.error || "Error disabling 2FA");
				}
			} catch (error) {
				alert("Error disabling 2FA");
			}
		}
		else {
			try {
				// Fetch the OTP URI from the server
				const response = await fetch(`${getVariables().url_api}/login/login/2fa/setup/`, {
					method: "GET",
					headers: {
						"Authorization": `Bearer ${getVariables().token}`
					}
				});

				if (!response.ok) {
					throw new Error("Failed to fetch 2FA setup");
				}

				const data = await response.json();
				const otpUri = data.otp_uri;

				const qrModal = document.createElement("div");
				qrModal.className = "login-box-modal";
				qrModal.innerHTML = `
					<div class="login_box">
						<h1>Set up Two-Factor Authentication</h1>
						<p>Scan this QR Code with your authenticator app (such as Google Authenticator)</p>
						<div id="qrCodeContainer" style="text-align:center; margin: 20px 0;"></div>
						<form id="setup2FAForm" class="d-flex flex-column align-items-center">
							<div class="form-group" style="width: 100%; margin-bottom: 15px;">
								<label for="otpCode">Enter the code shown in the app:</label>
								<input type="text" id="otpCode" class="form-control" required>
							</div>
							<div style="display: flex; gap: 10px; width: 100%;">
								<button type="submit" class="btn btn-primary" style="flex: 1;">Verify</button>
								<button type="button" id="closeQrModal" class="btn btn-secondary" style="flex: 1;">Cancel</button>
							</div>
						</form>
					</div>
				`;
				document.body.appendChild(qrModal);

				// Genera il QR code usando la libreria
				const qrCodeContainer = qrModal.querySelector("#qrCodeContainer");
				new QRCode(qrCodeContainer, {
					text: otpUri,
					width: 200,
					height: 200,
					correctLevel: QRCode.CorrectLevel.H
				});

				const closeQrModalBtn = qrModal.querySelector("#closeQrModal");
				closeQrModalBtn.addEventListener("click", function () {
					document.body.removeChild(qrModal);
				});

				const setup2FAForm = qrModal.querySelector("#setup2FAForm");
				setup2FAForm.addEventListener("submit", async function (event) {
				event.preventDefault();
				const otpCode = qrModal.querySelector("#otpCode").value;

				try {
					const response = await fetch(`${getVariables().url_api}/login/login/2fa/setup/`, {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							"Authorization": `Bearer ${getVariables().token}`
						},
						body: JSON.stringify({ otp_code: otpCode })
					});

					if (response.ok) {
						console.log("2FA setup successful");
						// Successo: chiudi la modale e aggiorna lo stato 2FA
						setVariables({
							has_two_factor_auth: true
						});
						toggle2FAButton.innerText = "Disable 2FA";
						showAlertForXSeconds("2FA setup successful", "success", 3, { asToast: true });
						document.body.removeChild(qrModal);
						renderProfile();
					} else {
						console.error("2FA setup failed");
						showAlertForXSeconds("Invalid OTP code. Please try again.", "error", 3, { asToast: true });
					}
				} catch (error) {
					alert("Errore di rete durante la verifica del codice OTP");
				}
			});

			} catch (error) {
				console.error("Errore durante la configurazione del 2FA:", error);
			}
		}
	});

	// Event listener per l'immagine del profilo
	profileImage.addEventListener("click", function (e) {
		e.preventDefault();
		e.stopPropagation();

		const profileImageSelector = document.createElement("div");
		profileImageSelector.className = "login-box-modal";
		profileImageSelector.innerHTML = `
		<div class="login_box">
			<h1>Seleziona un'immagine</h1>
			<div class="profile-image-preview">
				<img src="${profileImageUrl || '/profile/placeholder.jpeg'}" alt="Profile" class="profile-card-image" id="imagePreview" />
			</div>
			<div class="profile-image-controls">
				<label for="imageUpload" class="upload-btn">Scegli un file</label>
				<input type="file" id="imageUpload" accept="image/*" style="display: none;">
				<button id="uploadImageBtn" class="btn btn-primary">Carica immagine</button>
				<button id="cancelImageBtn" class="btn btn-secondary">Annulla</button>
			</div>
		</div>
	`;
		document.body.appendChild(profileImageSelector);

		// Add event listeners for the file input and buttons
		const imageUpload = profileImageSelector.querySelector("#imageUpload");
		const imagePreview =
			profileImageSelector.querySelector("#imagePreview");
		const uploadImageBtn =
			profileImageSelector.querySelector("#uploadImageBtn");
		const cancelImageBtn =
			profileImageSelector.querySelector("#cancelImageBtn");

		// Preview the selected image
		imageUpload.addEventListener("change", function (event) {
			const file = event.target.files[0];
			if (file) {
				const reader = new FileReader();
				reader.onload = function (e) {
					imagePreview.src = e.target.result;
				};
				reader.readAsDataURL(file);
			}
		});
					//TODO se carichi l'immagine poi fa get a https://https//minio.trascendence.42firenze.it/user-media/avatars/Avatar_for_marco24 perche' data.avatar e' sbagliato

		// Upload the selected image
		uploadImageBtn.addEventListener("click", async function () {
			const file = imageUpload.files[0];
			if (!file) {
				console.error("Nessun file selezionato");
				return;
			}

			// Check if file is an image png or jpeg
			if (!file.type.startsWith("image/")) {
				console.error("Il file selezionato non è un'immagine");
				return;
			}
			// Check if file size is greater than 10MB (10 * 1024 * 1024 bytes)
			const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
			if (file.size > MAX_FILE_SIZE) {
				console.error("File troppo grande, massimo 10MB");
				return;
			}

			try {
				const formData = new FormData();
				formData.append("image", file);
				//add https to url al posto di http

				const { userId, token, url_api } = getVariables();

				const response = await fetch(
					`${url_api}/user/user/avatar`,
					{
						method: "POST",
						headers: {
							Authorization: `Bearer ${token}`,
							// Don't set Content-Type here, it will be set automatically for FormData
						},
						body: formData,
					}
				);

				if (response.ok) {
					const data = await response.json();
					console.log("Immagine caricata con successo:", data);

					let avatarPost = data.avatar;

					// Rimuovi doppi protocolli (se presenti)
					if (avatarPost && avatarPost.match(/^https?:\/\/https?:\/\//)) {
						avatarPost = avatarPost.replace(/^(https?:\/\/)https?:\/\//, "$1");
					}
					
					// Forza HTTPS se necessario
					if (avatarPost && avatarPost.startsWith("http://")) {
						avatarPost = avatarPost.replace("http://", "https://");
					}
					
					// Estrai il nome del file per consistenza con il resto del codice
					if (avatarPost) {
						const filename = avatarPost.split('/').pop();
						// Usa lo stesso formato usato nella funzione GetProfile
						avatarPost = `https://minio.trascendence.42firenze.it/jwt-validator/minio-proxy/avatars/${encodeURIComponent(filename)}`;
					}
					
					console.log("URL normalizzato:", avatarPost);

					// Scarica l'immagine come blob
					const localImageUrl = await downloadImageAsBlob(avatarPost, token);
					if (localImageUrl) {
						setVariables({
							profileImageUrl: localImageUrl
						});
						
						// Aggiorna l'immagine nell'UI
						document.querySelector(".profile-card-image").src = localImageUrl;
					} else {
						// Fallback all'anteprima locale
						document.querySelector(".profile-card-image").src = imagePreview.src;
					}

					// Close the modal
					closeProfileImageSelector();
				} else {
					const errorData = await response.json();
					console.error(
						"Errore nel caricamento dell'immagine:",
						errorData
					);
				}
			} catch (error) {
				console.error("Errore durante il caricamento:", error);
			}
		});

		// Cancel button
		cancelImageBtn.addEventListener("click", function () {
			closeProfileImageSelector();
		});

		function closeProfileImageSelector() {
			document.body.removeChild(profileImageSelector);
		}

		window.addEventListener("click", function (event) {
			if (event.target === profileImageSelector) {
				closeProfileImageSelector();
			}
		});
	});
}

// initializeProfile();

export { renderProfile, initializeProfile };
