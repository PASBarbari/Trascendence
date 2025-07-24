import { getCookie } from "../cookie.js";
import { getVariables } from "../var.js";
import { initFriendAutocomplete } from "../notification/friendAutocomplete.js";
import { showAlertForXSeconds } from "../alert/alert.js";

const pongContainerCSS = document.createElement("link");
pongContainerCSS.rel = "stylesheet";
pongContainerCSS.href = "/pongContainer/pongContainer.css";
document.head.appendChild(pongContainerCSS);

function renderTournament() {
	console.log("/***********tournamentContainer************/");

	const tournamentContainer = document.getElementById("tournamentContainer");
	tournamentContainer.innerHTML = `
		<div class="tournament">
			<div class="d-flex justify-content-between align-items-center mb-3">
				<h5>Tournaments</h5>
			</div>
			<button id="createTournamentButton" class="btn btn-outline-primary mb-3">
				<i class="bi bi-plus"></i>
			</button>
			<div id="createTournamentForm"></div>
		</div>
	`;

	const createTournamentButton = document.getElementById("createTournamentButton");
	createTournamentButton.addEventListener("click", () => {
		const buttonIcon = createTournamentButton.querySelector("i");
		const createTournamentFormdiv = document.getElementById("createTournamentForm");
		if (createTournamentFormdiv.innerHTML === "") {
			createTournament();
        buttonIcon.classList.remove("bi-plus");
        buttonIcon.classList.add("bi-x");
		} else {
			createTournamentFormdiv.innerHTML = "";
			buttonIcon.classList.remove("bi-x");
			buttonIcon.classList.add("bi-plus");
		}
	});

}


function createTournament() {
    const createTournamentForm = document.getElementById("createTournamentForm");
    createTournamentForm.innerHTML = `
        <form id="addTournamentForm" class="d-flex flex-column">
            <input type="text" id="tournamentName" placeholder="Nome del torneo" class="form-control mb-2" />
            <input type="number" id="maxParticipants" placeholder="Numero massimo di partecipanti" class="form-control mb-2" min="2" max="64" />
            <div class="input-group mb-2" style="position:relative;">
                <input type="text" id="userIdsInput" placeholder="Aggiungi membri con Username" class="form-control" autocomplete="off"/>
                <div id="suggestionListTournament" class="list-group" style="display:none; position:absolute; left:0; right:0; top:100%; z-index:1000;"></div>
            </div>
            <div id="selectedUserIds" class="mb-2"></div>
            <div class="right-button">
                <button type="submit" class="btn btn-outline-primary">
                    <i class="bi bi-plus"></i>
                </button>
            </div>
        </form>
    `;

    const userIdsInput = createTournamentForm.querySelector("#userIdsInput");
    const badgeContainer = createTournamentForm.querySelector("#selectedUserIds");
    let selectedUsers = [];

    function renderSelectedUserIds() {
        badgeContainer.innerHTML = selectedUsers.map(user => `
            <span class="badge rounded-pill bg-primary me-1 mb-1" style="font-size:1rem;">
                ${user.username}
                <button type="button" class="btn-close btn-close-white btn-sm ms-1" aria-label="Remove" data-userid="${user.id}" style="font-size:0.7em; vertical-align:middle;"></button>
            </span>
        `).join("");
        badgeContainer.querySelectorAll(".btn-close").forEach(btn => {
            btn.addEventListener("click", function() {
                const idToRemove = this.getAttribute("data-userid");
                selectedUsers = selectedUsers.filter(u => String(u.id) !== idToRemove);
                renderSelectedUserIds();
            });
        });
    }

    initFriendAutocomplete({
        inputId: "userIdsInput",
        suggestionListId: "suggestionListTournament",
        handlerOnSelect: (input, userId, item) => {
            userId = String(userId);
            const username = item?.textContent?.split(" ")[0] || userId;
            if (!selectedUsers.some(u => String(u.id) === userId)) {
                selectedUsers.push({ id: userId, username });
                renderSelectedUserIds();
            }
            input.value = "";
        }
    });

    createTournamentForm
        .querySelector("#addTournamentForm")
        .addEventListener("submit", async function (e) {
            e.preventDefault();

            const tournamentName = document.getElementById("tournamentName").value;
            const maxParticipants = document.getElementById("maxParticipants").value;
            const { userId, token, url_api } = getVariables();

            let userIdsArray = selectedUsers.map(u => u.id);
            if (userIdsArray.includes(userId)) {
                userIdsArray.splice(userIdsArray.indexOf(userId), 1);
            }
						const	 maxParticipantsValue = parseInt(document.getElementById("maxParticipants").value, 10);
						if (maxParticipantsValue < 2 || maxParticipantsValue > 64) {
								showAlertForXSeconds("Il numero massimo di partecipanti deve essere tra 2 e 64.", "error", 3, {asToast: true});
								return;
						}

            console.log("Utenti torneo:", userIdsArray);
						console.log("Nome torneo:", tournamentName);
						console.log("Max partecipanti:", maxParticipantsValue);

            try {
                const response = await fetch(
                    `${url_api}/pong/tournament`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "X-CSRFToken": getCookie("csrftoken"),
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                            name: tournamentName,
                            max_partecipants: maxParticipantsValue,
                            partecipants: [3],
                        }),
                    }
                );

                if (response.ok) {
                    const data = await response.json();
                    console.log("Torneo creato:", data);

										//clean form
										document.getElementById("tournamentName").value = "";
										document.getElementById("maxParticipants").value = "";
										selectedUsers = [];
										renderSelectedUserIds();
                    // Aggiorna la lista dei tornei se hai una funzione simile
                    // updateTournamentList();
                } else {
                    const errorData = await response.json();
                    console.error(
                        "Errore nella risposta del server:",
                        errorData
                    );
                }
            } catch (error) {
                console.error("Errore nella richiesta:", error);
            }
        });

    return createTournamentForm;
}

function renderNewTournament(tournamentData) {
    console.log("Rendering new tournament:", tournamentData.message);

		const createTournamentFormdiv = document.getElementById("createTournamentForm");
		if (createTournamentFormdiv.innerHTML !== "") createTournamentFormdiv.innerHTML = "";

    const createTournamentForm = document.getElementById("createTournamentForm");
    const div = document.createElement("div");
    div.textContent = "ciao";
    createTournamentForm.appendChild(div);
}

export { renderTournament, renderNewTournament };