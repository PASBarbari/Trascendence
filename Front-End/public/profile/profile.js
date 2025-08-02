import { setVariables, getVariables } from "../var.js";
import { getCookie } from "../cookie.js";
import { showAlertForXSeconds } from "../alert/alert.js";
import * as QRCode from "qrcode";

const link = document.createElement("link");
link.rel = "stylesheet";
link.href = "/profile/profile.css";
document.head.appendChild(link);

async function PatchProfile(name, surname, birthdate, bio) {
	const { userId, url_api } = getVariables();

	try {
		const response = await fetch(`${url_api}/user/user/me`, {
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
			showAlertForXSeconds("Profile updated successfully", "success", 3, {
				asToast: true,
			});
		} else {
			const errorData = await response.json();
			console.error("Server response error:", errorData);
			showAlertForXSeconds("Error updating profile", "error", 3, {
				asToast: true,
			});
		}
	} catch (error) {
		console.error("Request error:", error);
		showAlertForXSeconds("Network error", "error", 3, { asToast: true });
	}
}

async function GetProfile() {
	const { token, url_api } = getVariables();
	try {
		const response = await fetch(`${url_api}/user/user/me`, {
			method: "GET",
			headers: {
				"Content-Type": "application/json",
				"X-CSRFToken": getCookie("csrftoken"),
				Authorization: `Bearer ${token}`,
			},
		});

		if (response.ok) {
			const data = await response.json();

			let profileImageUrl = "";

			// Handle current_avatar object structure
			if (data.current_avatar && data.current_avatar.image_url) {
				profileImageUrl = url_api + "/user" + data.current_avatar.image_url;
			}

			setVariables({
				name: data.first_name || "",
				surname: data.last_name || "",
				birthdate: data.birth_date === null ? "" : data.birth_date,
				bio: data.bio || "",
				level: data.level ?? "",
				exp: data.exp ?? "",
				profileImageUrl: profileImageUrl,
				has_two_factor_auth: data.has_two_factor_auth || false,
			});
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

	if (!document.getElementById("profile")) {
		console.log("Profile element not found in DOM");
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
		initials,
	} = getVariables();
	let edit = false;
	console.log("[has_two_factor_auth]", has_two_factor_auth);
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
							<label for="exp" >Level: ${level}, Exp: ${exp}</label>
							<input type="range" id="exp" name="exp" min="0" max="100" value="${exp}" readonly class="readonly-input custom-range">
						</div>

						<div class="profile-form-group">
							<label for="toggle2FAButton" style="height:21px"></label>
							<button id="toggle2FAButton" type="button" class="btn btn-outline-danger">
								${has_two_factor_auth ? "Disable" : "Enable"} 2FA
							</button>
						</div>

					</form>
				</div>
				<div class="profile-card-image-container">
					<button class="profile-image-circle ">

			${profileImageUrl
			  ? `<img src="${profileImageUrl}" alt="Profile" class="profile-card-image" />`
			  : `<div class="friend-avatar"
				   style="width: 100%; height: 100%; font-weight: 600; font-size: 2rem;">
				  ${initials || userUsername?.charAt(0).toUpperCase() || '?'}
				 </div>`
			}

						<div class="edit-icon-overlay">
							<i class="bi bi-pencil"></i>
						</div>
					</button>
					<div class="buttons">
						<button id="editButton" class="btn btn-outline-warning">
							<i class="bi bi-pencil edit-icon"></i>
						</button>
						<button id="saveButton" class="btn btn-outline-success">
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
			form
				.querySelectorAll(
					'input:not([id="username"]):not([id="user_id"]):not([id="email"]):not([id="level"]):not([id="exp"]), textarea'
				)
				.forEach((input) => {
					input.removeAttribute("readonly");
					input.classList.remove("readonly-input");
				});
			profileImageContainer.classList.add("edit-mode");

			const birthdateInput = document.getElementById("birthdate");
			if (birthdateInput && birthdateInput.value === "") {
				birthdateInput.type = "date";
			}
		} else {
			form.querySelectorAll("input, textarea").forEach((input) => {
				input.setAttribute("readonly", true);
				input.classList.add("readonly-input");
			});
			profileImageContainer.classList.remove("edit-mode");

			const birthdateInput = document.getElementById("birthdate");
			if (birthdateInput && birthdateInput.value === "") {
				birthdateInput.type = "text";
			}
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

	// Update progress bar styling
	const expInput = document.getElementById("exp");
	expInput.addEventListener("input", function () {
		expInput.style.setProperty("--value", `${expInput.value}%`);
	});
	expInput.style.setProperty("--value", `${expInput.value}%`);

	const toggle2FAButton = document.getElementById("toggle2FAButton");
	toggle2FAButton.addEventListener("click", async function (e) {
		e.preventDefault();
		console.log("[toggle2FAButton] Clicked, has_two_factor_auth:", has_two_factor_auth);
		if (has_two_factor_auth) {
			// Disable 2FA
			try {
				const response = await fetch(
					`${getVariables().url_api}/login/login/2fa/disable/`,
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							Authorization: `Bearer ${getVariables().token}`,
						},
					}
				);
				console.log("[toggle2FAButton] Response:", response);
				if (response.ok) {
					setVariables({
						has_two_factor_auth: false,
					});
					showAlertForXSeconds("2FA disabled successfully", "success", 3, {
						asToast: true,
					});
					toggle2FAButton.innerText = "Enable 2FA";
					renderProfile();
				} else {
					const data = await response.json();
					alert(data.error || "Error disabling 2FA");
				}
			} catch (error) {
				showAlertForXSeconds(
					`Network error while disabling 2FA: ${error.message}`,
					"error",
					3,
					{ asToast: true }
				);
			}
		} else {
			try {
				// Fetch the OTP URI from the server
				const response = await fetch(
					`${getVariables().url_api}/login/login/2fa/setup/`,
					{
						method: "GET",
						headers: {
							Authorization: `Bearer ${getVariables().token}`,
						},
					}
				);

				if (!response.ok) {
					throw new Error("Failed to fetch 2FA setup");
				}

				const data = await response.json();
				const otpUri = data.otp_uri;

				const qrModal = document.createElement("div");
				qrModal.className = "login-box-modal";
				qrModal.innerHTML = `
					<div class="samus-box">
						<h1>Set up Two-Factor Authentication</h1>
						<p>Scan this QR Code with your authenticator app (such as Google Authenticator)</p>
						<div id="qrCodeContainer" style="text-align:center; margin: 20px 0;"></div>
						<form id="setup2FAForm" class="d-flex flex-column align-items-center">
							<div class="form-group" style="width: 100%; margin-bottom: 15px;">
								<label for="otpCode">Enter the code shown in the app:</label>
								<input type="text" id="otpCode" class="form-control" required maxlength="6" inputmode="numeric">
							</div>
							<div style="display: flex; gap: 10px; width: 100%;">
								<button type="submit" class="btn btn-primary" style="flex: 1;">Verify</button>
								<button type="button" id="closeQrModal" class="btn btn-secondary" style="flex: 1;">Cancel</button>
							</div>
						</form>
					</div>
				`;
				document.body.appendChild(qrModal);

				// Chiudi il modal se clicchi fuori dal contenuto
				qrModal.addEventListener("mousedown", function(event) {
					if (event.target === qrModal) {
						document.body.removeChild(qrModal);
					}
				});

				// Genera il QR code usando la libreria
				const qrCodeContainer = document.getElementById("qrCodeContainer");
				const canvas = document.createElement("canvas");
				qrCodeContainer.appendChild(canvas);

				QRCode.toCanvas(canvas, otpUri, { width: 200 }, function (error) {
					if (error) console.error(error);
					else console.log("QR code generated!");
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
						const response = await fetch(
							`${getVariables().url_api}/login/login/2fa/setup/`,
							{
								method: "POST",
								headers: {
									"Content-Type": "application/json",
									Authorization: `Bearer ${getVariables().token}`,
								},
								body: JSON.stringify({ otp_code: otpCode }),
							}
						);

						if (response.ok) {
							console.log("[toggle2FAButton] 2FA setup successful");
							setVariables({
								has_two_factor_auth: true,
							});
							toggle2FAButton.innerText = "Disable 2FA";

							showAlertForXSeconds("2FA setup successful", "success", 3, {
								asToast: true,
							});
							document.body.removeChild(qrModal);
							renderProfile();
						} else {
							showAlertForXSeconds(
								"Invalid OTP code. Please try again.",
								"warn",
								3,
								{ asToast: true }
							);
						}
					} catch (error) {
						showAlertForXSeconds(
							`Network error during OTP verification: ${error.message}`,
							"warn",
							3,
							{ asToast: true }
						);
					}
				});
			} catch (error) {
				console.error("Error during 2FA setup:", error);
			}
		}
	});

	// Profile image upload handler
	profileImage.addEventListener("click", function (e) {
		e.preventDefault();
		e.stopPropagation();

		const { profileImageUrl, initials, userUsername } = getVariables();

		const profileImageSelector = document.createElement("div");
		profileImageSelector.className = "login-box-modal";
		profileImageSelector.innerHTML = `
		<div class="samus-box">
			<h1>Select an image</h1>
			<div class="profile-image-preview">
				${profileImageUrl
		  ? `<img src="${profileImageUrl}" alt="Profile" class="profile-card-image" id="imagePreview" />`
		  : `<div class="friend-avatar"
				   style="width: 100%; height: 100%; font-weight: 600; font-size: 2rem;">
			  ${initials || userUsername?.charAt(0).toUpperCase() || '?'}
			 </div>`
		}
			</div>
			<div class="profile-image-controls">
				<label for="imageUpload" class="upload-btn">Choose file</label>
				<input type="file" id="imageUpload" accept="image/*" style="display: none;">
				<button id="uploadImageBtn" class="btn btn-primary">Upload image</button>
				<button id="cancelImageBtn" class="btn btn-secondary">Cancel</button>
			</div>
		</div>
	`;
		document.body.appendChild(profileImageSelector);

		// Chiudi il modal se clicchi fuori dal contenuto
		profileImageSelector.addEventListener("mousedown", function(event) {
			if (event.target === profileImageSelector) {
				document.body.removeChild(profileImageSelector);
			}
		});

		// Add event listeners for the file input and buttons
		const imageUpload = profileImageSelector.querySelector("#imageUpload");
		// const imagePreview = profileImageSelector.querySelector("#imagePreview");
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
					const previewContainer = profileImageSelector.querySelector(
						".profile-image-preview"
					);

					previewContainer.innerHTML = `<img src="${e.target.result}" alt="Profile" class="profile-card-image" id="imagePreview" />`;
				};
				reader.readAsDataURL(file);
			}
		});

		uploadImageBtn.addEventListener("click", async function () {
			const file = imageUpload.files[0];
			if (!file) {
				showAlertForXSeconds("No file selected", "error", 3, { asToast: true });
				return;
			}

			if (!file.type.startsWith("image/")) {
				showAlertForXSeconds("Selected file is not an image", "error", 3, {
					asToast: true,
				});
				return;
			}

			const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
			if (file.size > MAX_FILE_SIZE) {
				showAlertForXSeconds("File too large, maximum 10MB", "error", 3, {
					asToast: true,
				});
				return;
			}

			try {
				const formData = new FormData();
				formData.append("image", file);

				const { token, url_api } = getVariables();

				const response = await fetch(`${url_api}/user/user/avatar`, {
					method: "POST",
					headers: {
						Authorization: `Bearer ${token}`,
					},
					body: formData,
				});

				if (response.ok) {
					const data = await response.json();

					// Update avatar URL
					const avatarUrl = url_api + "/user" + data.avatar;
					setVariables({
						profileImageUrl: avatarUrl,
					});

					// Update the image in the UI

			const profileImageCircle = document.querySelector(".profile-image-circle");
		  const existingImage = profileImageCircle.querySelector(".profile-card-image");
		  const existingDiv = profileImageCircle.querySelector(".friend-avatar");

		  if (existingImage) {
			  // Se esiste già un'immagine, aggiorna solo il src
			  existingImage.src = avatarUrl;
		  } else if (existingDiv) {
			  // Se esiste il div con iniziali, sostituiscilo con un'immagine
			  existingDiv.outerHTML = `<img src="${avatarUrl}" alt="Profile" class="profile-card-image" />`;
		  }

					showAlertForXSeconds("Avatar uploaded successfully", "success", 3, {
						asToast: true,
					});

					closeProfileImageSelector();
				} else {
					const errorData = await response.json();
					console.error("Error uploading image:", errorData);
					showAlertForXSeconds("Error uploading image", "error", 3, {
						asToast: true,
					});
				}
			} catch (error) {
				console.error("Upload error:", error);
				showAlertForXSeconds("Upload failed", "error", 3, { asToast: true });
			}
		});

		// Cancel button
		cancelImageBtn.addEventListener("click", closeProfileImageSelector);

		function closeProfileImageSelector() {
			document.body.removeChild(profileImageSelector);
		}

		// Close modal when clicking outside
		window.addEventListener("click", function (event) {
			if (event.target === profileImageSelector) {
				closeProfileImageSelector();
			}
		});
	});
}

export { renderProfile, initializeProfile };
