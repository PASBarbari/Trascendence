import { getCookie } from "../cookie.js";
import { getVariables } from "../var.js";

const pongContainerCSS = document.createElement("link");
pongContainerCSS.rel = "stylesheet";
pongContainerCSS.href = "/pongContainer/pongContainer.css";
document.head.appendChild(pongContainerCSS);

export function renderMatchHistory() {
	console.log("/***********matchHistoryContainer************/");

	const matchHistoryContainer = document.getElementById("matchHistoryContainer");
	
	matchHistoryContainer.innerHTML = `
	<div class="matchHistoryContainer">
				<div class="d-flex align-items-center mb-2" style="justify-content: space-between;">
					<h5 class="mb-0 me-2">Match History</h5>
					<div id="matchPagination" class="d-inline-block"></div>
				</div>
				<div id="matchHistoryList" class="match-history-list">
					<!-- Match history items will be dynamically inserted here -->
				</div>
			</div>
 </div>
	`;

		matchHistory();
}

async function matchHistory(page = 1) {
	let matchHistory = [];
	const { token, url_api, userId } = getVariables();
	const pageSize = 5;
	try {
		console.log("[PongHistory] Fetching game history for user_id:", userId, "page:", page);
		const response = await fetch(
			`${url_api}/pong/games/history?user_id=${userId}&page_size=${pageSize}&page=${page}`,
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
		console.log("[PongHistory] API response:", data);
		matchHistory = data.results;

		const matchHistoryList = document.getElementById("matchHistoryList");
		if (!matchHistoryList) {
			console.error("[PongHistory] Match history list not found");
			return;
		}
		matchHistoryList.innerHTML = ""; // Clear existing items
		if (matchHistory.length === 0) {
			matchHistoryList.innerHTML = `<p class="text-muted">No match history available.</p>`;
		}

		for (const match of matchHistory) {
			const winner = match.winner == null ? "not finished" : match.winner.username || "Unknown";
			const opponent = match.player_1.user_id == userId ? match.player_2 : match.player_1;
			const opponentScore = match.player_1.user_id == userId ? match.player_2_score : match.player_1_score;
			const myScore = match.player_1.user_id == userId ? match.player_1_score : match.player_2_score;
			const scores = `${myScore} - ${opponentScore}`;
			// const status = match.status || "Unknown";
			const tournament = match.tournament_id == null ? "" : "tournament: " + match.tournament_id.name;
			const winnerColor = match.winner == null ? "text-bg-secondary" : match.winner.user_id == userId ? "text-bg-success" : "text-bg-danger";

			const matchItem = document.createElement("div");
			matchItem.className = "match-history-item";
			matchItem.innerHTML = `
				<div class="match-details">
					<h6 style="margin: 0; font-size: 0.9em; color: #6c757d;">
						<i class="bi bi-calendar-event" style="color: var(--bs-secondary-color) !important; margin-right: 0.5rem;"></i> 
						${new Date(match.begin_date).toLocaleDateString()}
					</h6>
					<h6 style="margin: 0;">winner: <span class="badge ${winnerColor}">${winner}</span></h6>
				</div>
				<div class="match-details">
					<h6 style="margin: 0;">Score: <span class="badge text-bg-primary">${scores}</span> vs ${opponent.username || "Unknown"}</h6>
					<h6 style="margin: 0;">${tournament}</h6>
				</div>
				<hr class="my-2">
			`;
			matchHistoryList.appendChild(matchItem);
		}

		// PAGINAZIONE SEMPLICE: solo freccia sinistra e destra
		// PAGINAZIONE accanto a <h5>Match History</h5>
		const pagination = document.getElementById("matchPagination");
		if (pagination) {
			const prevDisabled = !data.previous ? "disabled" : "";
			const nextDisabled = !data.next ? "disabled" : "";
			pagination.innerHTML = `
				<button class="btn btn-outline-secondary me-1" id="prevPageBtn" ${prevDisabled}>
					<i class="fas fa-arrow-left"></i>
				</button>
				<button class="btn btn-outline-secondary" id="nextPageBtn" ${nextDisabled}>
					<i class="fas fa-arrow-right"></i>
				</button>
			`;
			// Event listeners
			document.getElementById("prevPageBtn").onclick = () => {
				if (data.previous) {
					let prevPage = new URL(data.previous).searchParams.get("page");
					prevPage = prevPage ? Number(prevPage) : 1;
					if (prevPage < 1) prevPage = 1;
					window.matchHistory(prevPage);
				}
			};
			document.getElementById("nextPageBtn").onclick = () => {
				if (data.next) {
					const nextPage = new URL(data.next).searchParams.get("page");
					window.matchHistory(Number(nextPage));
				}
			};
		}
	} catch (error) {
		console.error("[PongHistory] API error:", error);
		return;
	}
}

window.matchHistory = matchHistory;