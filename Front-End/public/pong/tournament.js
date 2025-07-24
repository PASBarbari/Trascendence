import { getCookie } from "../cookie.js";
import { getVariables } from "../var.js";
import { initFriendAutocomplete } from "../notification/friendAutocomplete.js";
import { showAlertForXSeconds } from "../alert/alert.js";
import { initializeWebSocket } from "../notification/notification.js";

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

	renderNewTournament({ message: "Torneo creato con successo!" });

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
			
let socket;

async function renderNewTournament(tournamentData) {
    console.log("Rendering new tournament:", tournamentData.message);
		const tournamentStat = await tournamentStats();
		console.log("Tournament stats:", tournamentStat.results);

		const createTournamentFormdiv = document.getElementById("createTournamentForm");
		if (createTournamentFormdiv.innerHTML !== "") createTournamentFormdiv.innerHTML = "";

    const createTournamentForm = document.getElementById("createTournamentForm");
		tournamentStat.results.forEach(tournament => {
			const tournamentDiv = document.createElement("div");
			tournamentDiv.className = "tournament-item";
			tournamentDiv.innerHTML = `
				<h5>${tournament.name}</h5>
				<p>Max Partecipanti: ${tournament.max_partecipants}</p>
				<p>Partecipanti: ${tournament.partecipants}</p>
				<p>Stato: ${tournament.status}</p>
				<p>Inizio: ${new Date(tournament.begin_date).toLocaleString()}</p>
				<button class="btn btn-outline-primary" id="join-button" data-tournament-id="${tournament.id}">
					join
				</button>
				<button class="btn btn-outline-secondary" id="start-button" data-tournament-id="${tournament.id}">
					start
				</button>
			`;
			createTournamentForm.appendChild(tournamentDiv);

			const joinButton = tournamentDiv.querySelector("#join-button");
			joinButton.addEventListener("click", async () => {
				initializeWebSocketTournament(tournament.id);
			});

			const startButton = tournamentDiv.querySelector("#start-button");
			startButton.addEventListener("click", async () => {
				if (socket && socket.readyState === WebSocket.OPEN) {
					socket.send(JSON.stringify({
							type: "start_tournament",
							message: "suca",
							// puoi aggiungere altri dati se il backend li richiede
					}));
					console.log("Messaggio 'start_tournament' inviato via WebSocket");
				} else {
						showAlertForXSeconds("Connessione WebSocket non attiva!", "error", 3, { asToast: true });
				}
			});
		});
}

//se non ci sono abbastanza player, mandi errore error tournament need at least 2 type: error


function initializeWebSocketTournament(room_id) {
	const { token, wss_api } = getVariables();

	const wsUrl = `${wss_api}/pong/ws/tournament/${room_id}/?token=${token}`;
	console.log("Connecting to tournaments:", wsUrl);

	socket = new WebSocket(wsUrl);
	if (!window.activeWebSockets) window.activeWebSockets = [];
		window.activeWebSockets.push(socket);

	socket.onopen = function () {
		console.log("WebSocket connection established for tournament:", room_id);
	};

	socket.onmessage = function (event) {
		const message = JSON.parse(event.data);
		console.log("WebSocket message received:", message);
	};

	socket.onerror = function (error) {
		console.error("WebSocket error occurred:", error);
	};

	socket.onclose = function (event) {
		console.error("WebSocket closed:", event);
	};
}
	
async function tournamentStats() {
	// pong/pong/user-tournaments get -> history of tournaments. ?user_id per qualcunaltro ?current_only=true prende i tornei non completati. ?status=active per i tornei attivi, ?status=completed pending (no ready) active.
	try {
		const { token, url_api, userId } = getVariables();
		console.log("[PongStatistic] Fetching player stats for user_id:", userId);
		const response = await fetch(
			`${url_api}/pong/user-tournaments`,
			{
				method: "GET",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
					"X-CSRFToken": getCookie("csrftoken"),
				},
			}
		);
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		const data = await response.json();
		console.log("[PongStatistic] API response:", data);
		return data;


	} catch (error) {
		console.error("[PongStatistic] API error:", error);
	}
}

export { renderTournament, renderNewTournament };