import { setVariables, getVariables } from './var.js';

async function PatchProfile(name, surname, birthdate, bio) {
    const { userId } = getVariables();

    try {
        const response = await fetch(`http://localhost:8002/user/user/${userId}/`, {
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

function renderProfile() {
    const { userUsername, userEmail, userId, name, surname, birthdate, bio } = getVariables();
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
                    </form>
                </div>
                <div class="profile-card-image-container">
                    <div class="profile-image-circle">
                        <!-- <img src="/placeholder.svg" alt="Profile" class="profile-card-image" /> -->
                    </div>
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

    editButton.addEventListener('click', function(e) {
        e.preventDefault();
        edit = !edit;
        if (edit) {
            form.querySelectorAll('input:not([id="username"]):not([id="user_id"]):not([id="email"]), textarea').forEach(input => {
                input.removeAttribute('readonly');
                input.classList.remove('readonly-input');
            });
        } else {
            form.querySelectorAll('input, textarea').forEach(input => {
                input.setAttribute('readonly', true);
                input.classList.add('readonly-input');
            });
        }
    });

    saveButton.addEventListener('click', function(e) {
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
    });

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
                setVariables({
                    name: data.first_name || "",
                    surname: data.last_name || "",
                    birthdate: data.birth_date || "",
                    bio: data.bio || ""
                });
                document.getElementById('name').setAttribute('value', data.first_name || "");
                document.getElementById('surname').setAttribute('value', data.last_name || "");
                document.getElementById('birthdate').setAttribute('value', data.birth_date || "");
                document.getElementById('bio').value = data.bio || "";
                console.log('Variables after GetProfile:', getVariables()); // Aggiungi questo per il debug
            } else {
                const errorData = await response.json();
                console.error("Errore nella risposta del server:", errorData);
            }
        } catch (error) {
            console.error("Errore nella richiesta:", error);
        }
    }

    GetProfile();
}

export { renderProfile };