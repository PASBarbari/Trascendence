import { setVariables, getVariables } from '../var.js';

const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = '/public/profile/profile.css';
document.head.appendChild(link);

async function PatchProfile(name, surname, birthdate, bio) {
	const { userId } = getVariables();

	try {
		const response = await fetch(`http://localhost:8002/user/user/${userId}/`, { // user/levelup user_id e exp
			method: "PATCH",
			headers: {
				"Content-Type": "application/json",
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

async function GetProfile() {
	const { userId, token } = getVariables();
	try {
		const response = await fetch(`http://localhost:8002/user/user/${userId}/`, {
			method: "GET",
			headers: {
				"Content-Type": "application/json",
				"Authorization": `Bearer ${token}`,
			},
		});

		if (response.ok) {
			const data = await response.json();
			
			console.log("Profile:", data);

			setVariables({
				name: data.first_name || "",
				surname: data.last_name || "",
				birthdate: data.birth_date || "",
				bio: data.bio || "",
				level: data.level ?? "",
				exp: data.exp ?? "",
			});
			console.log('level e exp:', data.level, data.exp);
			console.log('Variables after GetProfile:', getVariables()); // Aggiungi questo per il debug
		} else {
			const errorData = await response.json();
			console.error("Errore nella risposta del server:", errorData);
		}
	} catch (error) {
		console.error("Errore nella richiesta:", error);
	}
}

async function initializeProfile() {
	await GetProfile();
	renderProfile();
}

function renderProfile() {
	const { userUsername, userEmail, userId, name, surname, birthdate, bio, level, exp } = getVariables();
	console.log('level e exp:', level, exp);
	let edit = false;

	const profileDiv = document.getElementById('profile');
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

					</form>
				</div>
				<div class="profile-card-image-container">
					<button class="profile-image-circle">
						<img src="/public/profile/placeholder.jpeg" alt="Profile" class="profile-card-image" />
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

	const form = document.getElementById('profileForm');
	const editButton = document.getElementById('editButton');
	const saveButton = document.getElementById('saveButton');
	const profileImageContainer = document.querySelector('.profile-card-image-container');

	editButton.addEventListener('click', function (e) {
		e.preventDefault();
		edit = !edit;
		if (edit) {
			form.querySelectorAll('input:not([id="username"]):not([id="user_id"]):not([id="email"]):not([id="level"]):not([id="exp"]), textarea').forEach(input => {
				input.removeAttribute('readonly');
				input.classList.remove('readonly-input');
			});
			profileImageContainer.classList.add('edit-mode');
		} else {
			form.querySelectorAll('input, textarea').forEach(input => {
				input.setAttribute('readonly', true);
				input.classList.add('readonly-input');
			});
			profileImageContainer.classList.remove('edit-mode');
		}
	});

	saveButton.addEventListener('click', function (e) {
		e.preventDefault();
		const updatedName = document.getElementById('name').value;
		const updatedSurname = document.getElementById('surname').value;
		const updatedBirthdate = document.getElementById('birthdate').value;
		const updatedBio = document.getElementById('bio').value;

		setVariables({
			name: updatedName,
			surname: updatedSurname,
			birthdate: updatedBirthdate,
			bio: updatedBio
		});

		PatchProfile(updatedName, updatedSurname, updatedBirthdate, updatedBio);

		edit = false;
		form.querySelectorAll('input, textarea').forEach(input => {
			input.setAttribute('readonly', true);
			input.classList.add('readonly-input');
		});
		profileImageContainer.classList.remove('edit-mode');
	});

	// Aggiungi l'event listener per aggiornare lo stile della barra di scorrimento
	const expInput = document.getElementById('exp');
	// const expValueSpan = document.getElementById('expValue');

	expInput.addEventListener('input', function() {
		// expValueSpan.textContent = `exp: ${expInput.value}`;
		expInput.style.setProperty('--value', `${expInput.value}%`);
	});

	// Imposta il valore iniziale
	expInput.style.setProperty('--value', `${expInput.value}%`);
}

initializeProfile();

export { renderProfile };