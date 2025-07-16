import { getVariables } from "../var.js";
import { handleFriendRequest } from "./notification.js";
import { blockUser } from "../chat/blockUser.js";

let debounceTimeout = null;

export function initFriendAutocomplete({ inputId = "friendID", suggestionListId = "suggestionList", handlerOnSelect = null } = {}) {
	const friendInput = document.getElementById(inputId);
	const suggestionList = document.getElementById(suggestionListId);
	const inputGroup = friendInput?.closest('.input-group');
	const { url_api, token } = getVariables();
	if (friendInput && suggestionList && inputGroup) {
		suggestionList.style.width = inputGroup.offsetWidth + "px";
		friendInput.addEventListener("focus", () => {
			suggestionList.style.width = inputGroup.offsetWidth + "px";
			suggestionList.style.display = "block";
		});

		friendInput.addEventListener("input", () => {
			if (debounceTimeout) clearTimeout(debounceTimeout);
			debounceTimeout = setTimeout(() => {
				if (friendInput.value.trim() === "") {
					suggestionList.style.display = "none";
					suggestionList.innerHTML = "";
					return;
				}
				suggestionList.style.display = "block";
				searchUsers(url_api, token, friendInput.value)
					.then((results) => {
						updateSuggestionList(suggestionList, results, friendInput, handlerOnSelect);
					})
					.catch((error) => {
						console.error("Error searching users:", error);
					});
			}, 100);
		});

		friendInput.addEventListener("blur", () => {
			setTimeout(() => suggestionList.style.display = "none", 150);
		});
	}
}

export function updateSuggestionList(suggestionList, results, friendInput, handlerOnSelect) {
	if (!results || results.length === 0) {
		suggestionList.innerHTML = `<a class="list-group-item list-group-item-action disabled">Nessun risultato</a>`;
		return;
	}
	const isBlockUser = friendInput.id === "blockUserInput";
	suggestionList.innerHTML = results.map(user =>
		`<a type="button" class="list-group-item list-group-item-action" data-userid="${user.user_id}">${user.username} 
			<i class="bi ${isBlockUser ? "bi-lock-fill text-danger" : "bi-cart-plus text-success"} float-end"></i>
		</a>`
	).join('');

	suggestionList.querySelectorAll("a[data-userid]").forEach(item => {
		item.addEventListener("mousedown", function(e) {
			const userId = Number(this.getAttribute("data-userid"));
			const username = this.textContent.trim();
			if (typeof handlerOnSelect === "function") {
				handlerOnSelect(friendInput, userId, this);
			} else if (friendInput.id === "blockUserInput") {
            // Chiamata diretta per il blocco utenti
            blockUser(userId, username);
            suggestionList.style.display = "none";
            if (friendInput) {
                friendInput.value = "";
                friendInput.dataset.userid = "";
      			}
			} else {
				handleFriendRequest('POST', userId, username);
				suggestionList.style.display = "none";
				if (friendInput) friendInput.value = "";
			}
			suggestionList.style.display = "none";
		});
	});
}

export async function searchUsers(url_api, token, query) {
	const response = await fetch(`${url_api}/user/user/search?search=${query}&page=1&page_size=4`, {
		method: "GET",
		headers: {
			"Content-Type": "application/json",
			"Authorization": `Bearer ${token}`
		},
	});

	if (response.ok) {
		const data = await response.json();
		return data.results || [];
	} else {
		console.error("searchUsers error:", response);
		return [];
	}
}