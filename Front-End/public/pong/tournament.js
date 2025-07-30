import { getCookie } from "../cookie.js";
import { getVariables } from "../var.js";
import { initFriendAutocomplete } from "../notification/friendAutocomplete.js";
import { showAlertForXSeconds } from "../alert/alert.js";

const pongContainerCSS = document.createElement("link");
pongContainerCSS.rel = "stylesheet";
pongContainerCSS.href = "/pongContainer/pongContainer.css";
document.head.appendChild(pongContainerCSS);

function renderTournament() {
	console.warn("/***********tournamentContainer************/");

	const tournamentContainer = document.getElementById("tournamentContainer");
	tournamentContainer.innerHTML = `
			<div class="tournament">
					<div class="d-flex justify-content-between align-items-center mb-2">
							<h5>Tournaments</h5>
							<button id="createTournamentButton" class="btn btn-outline-secondary	">
									<i class="bi bi-plus"></i>
							</button>
					</div>
					<div id="createTournamentForm"></div>
					<div id="tournamentList"></div>
			</div>
	`;

	const createTournamentButton = document.getElementById(
		"createTournamentButton"
	);
	createTournamentButton.addEventListener("click", () => {
		const buttonIcon = createTournamentButton.querySelector("i");
		const createTournamentFormdiv = document.getElementById(
			"createTournamentForm"
		);
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
            <div id="selectedUserIds" class="mb-1"></div>
            <div class="right-button">
                <button type="submit" class="btn btn-primary">
                    <i class="bi bi-nintendo-switch me-2"></i>Create
                </button>
            </div>
        </form>
    `;

	// const userIdsInput = createTournamentForm.querySelector("#userIdsInput");
	const badgeContainer = createTournamentForm.querySelector("#selectedUserIds");
	let selectedUsers = [];

	function renderSelectedUserIds() {
		badgeContainer.innerHTML = selectedUsers
			.map(
				(user) => `
            <span class="badge rounded-pill bg-primary me-1 mb-1" style="font-size:1rem;">
                ${user.username}
                <button type="button" class="btn-close btn-close-white btn-sm ms-1" aria-label="Remove" data-userid="${user.id}" style="font-size:0.7em; vertical-align:middle;"></button>
            </span>
        `
			)
			.join("");
		badgeContainer.querySelectorAll(".btn-close").forEach((btn) => {
			btn.addEventListener("click", function () {
				const idToRemove = this.getAttribute("data-userid");
				selectedUsers = selectedUsers.filter(
					(u) => String(u.id) !== idToRemove
				);
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
			if (!selectedUsers.some((u) => String(u.id) === userId)) {
				selectedUsers.push({ id: userId, username });
				renderSelectedUserIds();
			}
			input.value = "";
		},
	});

	createTournamentForm
		.querySelector("#addTournamentForm")
		.addEventListener("submit", async function (e) {
			e.preventDefault();

			const tournamentName = document.getElementById("tournamentName").value;
			// const maxParticipants = document.getElementById("maxParticipants").value;
			const { userId, token, url_api } = getVariables();

			let userIdsArray = selectedUsers.map((u) => u.id);
			if (userIdsArray.includes(userId)) {
				userIdsArray.splice(userIdsArray.indexOf(userId), 1);
			}
			const maxParticipantsValue = parseInt(
				document.getElementById("maxParticipants").value,
				10
			);
			if (maxParticipantsValue < 2 || maxParticipantsValue > 64) {
				showAlertForXSeconds(
					"Il numero massimo di partecipanti deve essere tra 2 e 64.",
					"error",
					3,
					{ asToast: true }
				);
				return;
			}

			console.warn("Utenti torneo:", userIdsArray);
			console.warn("Nome torneo:", tournamentName);
			console.warn("Max partecipanti:", maxParticipantsValue);

			try {
				const response = await fetch(`${url_api}/pong/tournament`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"X-CSRFToken": getCookie("csrftoken"),
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify({
						name: tournamentName,
						max_partecipants: maxParticipantsValue,
						partecipants: userIdsArray,
					}),
				});

				if (response.ok) {
					const data = await response.json();
					console.warn("Torneo creato:", data);

					//clean form
					document.getElementById("tournamentName").value = "";
					document.getElementById("maxParticipants").value = "";
					selectedUsers = [];
					renderSelectedUserIds();
					// Aggiorna la lista dei tornei se hai una funzione simile
					// updateTournamentList();
				} else {
					const errorData = await response.json();
					console.error("Errore nella risposta del server:", errorData);
				}
			} catch (error) {
				console.error("Errore nella richiesta:", error);
			}
		});

	return createTournamentForm;
}

let socket;

async function renderNewTournament(tournamentData) {
	console.warn("Rendering new tournament:", tournamentData.message);
	const tournamentStat = await tournamentStats();
	if (
		!tournamentStat ||
		!tournamentStat.results ||
		tournamentStat.results.length === 0
	) {
		console.warn("Nessun torneo trovato.");
		return;
	}
	console.warn("Tournament stats:", tournamentStat.results);

	const tournamentListDiv = document.getElementById("tournamentList");
	tournamentListDiv.innerHTML = "";

	tournamentStat.results.forEach((tournament) => {
		const tournamentDiv = document.createElement("div");
		tournamentDiv.className = "tournament-item";
		tournamentDiv.id = `tournament-${tournament.id}`;
		tournamentDiv.innerHTML = `
						<h5>${tournament.name}</h5>
						<p>Max Partecipanti: ${tournament.max_partecipants}</p>
						<p>Partecipanti: ${tournament.partecipants}</p>
						<p>Stato: ${tournament.status}</p>
						<p>Inizio: ${new Date(tournament.begin_date).toLocaleString()}</p>
						<button class="btn btn-outline-primary" id="join-button" data-tournament-id="${
							tournament.id
						}">
								join
						</button>
						<button class="btn btn-outline-secondary" id="start-button" data-tournament-id="${
							tournament.id
						}">
								start
						</button>
						<button class="btn btn-outline-secondary" id="tournamentStatsButton" data-tournament-id="${
							tournament.id
						}">
								get_brackets
						</button>
						<button class="btn btn-outline-danger" id="tournamentDelete" data-tournament-id="${
							tournament.id
						}">
								delete
						</button>
				`;
		tournamentListDiv.appendChild(tournamentDiv);

		const joinButton = tournamentDiv.querySelector("#join-button");
		joinButton.addEventListener("click", async () => {
			initializeWebSocketTournament(tournament.id);
		});

		const startButton = tournamentDiv.querySelector("#start-button");
		startButton.addEventListener("click", async () => {
			if (socket && socket.readyState === WebSocket.OPEN) {
				socket.send(
					JSON.stringify({
						type: "start_tournament",
						message: "suca",
						// puoi aggiungere altri dati se il backend li richiede
					})
				);
				console.warn("Messaggio 'start_tournament' inviato via WebSocket");
			} else {
				showAlertForXSeconds("Connessione WebSocket non attiva!", "error", 3, {
					asToast: true,
				});
			}
		});

		const tournamentStatsButton = tournamentDiv.querySelector(
			"#tournamentStatsButton"
		);
		tournamentStatsButton.addEventListener("click", async () => {
			if (socket && socket.readyState === WebSocket.OPEN) {
				socket.send(
					JSON.stringify({
						type: "get_brackets",
						message: "suca2",
					})
				);
				console.warn("Messaggio 'get_brackets' inviato via WebSocket");
			} else {
				showAlertForXSeconds("Connessione WebSocket non attiva!", "error", 3, {
					asToast: true,
				});
			}
		});

		const tournamentDeleteButton =
			tournamentDiv.querySelector("#tournamentDelete");
		tournamentDeleteButton.addEventListener("click", async () => {
			httpTournamentRequest("DELETE", tournament.id);
		});
	});
}

function deleteTournamentDiv(tournamentId) {
	const tournamentDiv = document.getElementById(`tournament-${tournamentId}`);
	if (tournamentDiv) {
		tournamentDiv.remove();
		console.warn(`Torneo ${tournamentId} rimosso dalla lista.`);
	} else {
		console.warn(`Torneo ${tournamentId} non trovato nella lista.`);
	}
}

function httpTournamentRequest(method, tournamentId) {
	const { token, url_api } = getVariables();
	const url = `${url_api}/pong/tournament/${tournamentId}/`;
	fetch(url, {
		method: method,
		headers: {
			"Content-Type": "application/json",
			"X-CSRFToken": getCookie("csrftoken"),
			Authorization: `Bearer ${token}`,
		},
	})
		.then((response) => {
			if (response.ok) {
				console.warn(
					`Torneo ${
						method === "DELETE" ? "eliminato" : "aggiornato"
					} con successo!`
				);
				showAlertForXSeconds(
					`Torneo ${
						method === "DELETE" ? "eliminato" : "aggiornato"
					} con successo!`,
					"success",
					3,
					{ asToast: true }
				);
				renderNewTournament({ message: "Torneo aggiornato con successo!" });
			} else {
				return response.json().then((data) => {
					console.error(`Errore nella richiesta ${method}:`, data);
				});
			}
		})
		.catch((error) => {
			console.error(`Errore nella richiesta ${method}:`, error);
		});
}

//se non ci sono abbastanza player, mandi errore error tournament need at least 2 type: error
//type: success
const handledGameIds = new Set();

function messageHandlerTournament(message) {
	if (message.type === "error") {
		console.error("(Handler) Errore nel torneo:", message.error);
		showAlertForXSeconds(message.error, "error", 3, { asToast: true });
		return;
	} else if (message.type === "success") {
		console.warn("(Handler) Messaggio torneo:", message);
	} else if (message.type === "tournament_connection_success") {
		console.warn("(Handler) Torneo iniziato:", message); //rendere pulsante start premibile se sei il creatore del torneo
	} else if (message.type === "tournament_initialized") {
		console.warn("(Handler) Torneo inizializzato:", message);
	} else if (message.type === "game_created") {
		//arriva 2 volte al creatore
		// se arriva 2 volte la stessa notifica, non fare nulla. salvato globalmente message
		const gameId = message.game_data.game_id;
		if (handledGameIds.has(gameId)) {
			console.error("(Handler) Gioco già gestito:", gameId);
			return;
		}
		handledGameIds.add(gameId);
		console.warn("(Handler) Gioco creato:", message);

		const myId = getVariables().userId;
		const player1Id = message.game_data.player_1.user_id;
		const player2Id = message.game_data.player_2.user_id;
		const player1Name = message.game_data.player_1.username;
		const player2Name = message.game_data.player_2.username;
		const friendId = player1Id === myId ? player2Id : player1Id;
		const friendName = player1Id === myId ? player2Name : player1Name;
		console.log(
			"Friend ID:",
			friendId,
			"Friend Name:",
			friendName,
			"room Id:",
			message.game_data.game_id,
			"tournament Id:",
			message.game_data.tournament_id
		);
		window.navigateTo(
			`#pongmulti?room=${
				message.game_data.game_id
			}&opponent=${friendId}&opponentName=${encodeURIComponent(
				friendName
			)}&tournamentId=${message.game_data.tournament_id}`
		);
	} else if (message.type === "start_round") {
		//arriva 2 volte al creatore
		console.warn("(Handler) round partito:", message);
	} else if (message.type === "brackets") {
		console.warn("(Handler) Brackets ricevuti:", message.brackets);
		console.table(message.brackets);
	} else {
		console.error("(Handler) Messaggio torneo non riconosciuto:", message);
		return;
	}
}

// game_created

function initializeWebSocketTournament(room_id) {
	const { token, wss_api } = getVariables();

	const wsUrl = `${wss_api}/pong/ws/tournament/${room_id}/?token=${token}`;
	console.warn("Connecting to tournaments:", wsUrl);

	socket = new WebSocket(wsUrl);
	if (!window.activeWebSockets) window.activeWebSockets = [];
	window.activeWebSockets.push(socket);

	socket.onopen = function () {
		console.warn("WebSocket connection established for tournament:", room_id);
	};

	socket.onmessage = function (event) {
		const message = JSON.parse(event.data);
		messageHandlerTournament(message);
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
		console.warn("[PongTournament] Fetching player stats for user_id:", userId);
		const response = await fetch(`${url_api}/pong/user-tournaments`, {
			method: "GET",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
				"X-CSRFToken": getCookie("csrftoken"),
			},
		});
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		const data = await response.json();
		console.warn("[PongTournament] API response:", data);
		return data;
	} catch (error) {
		console.error("[PongTournament] API error:", error);
	}
}

export { renderTournament, renderNewTournament, deleteTournamentDiv };
