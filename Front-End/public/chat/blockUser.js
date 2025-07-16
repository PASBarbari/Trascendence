import { getVariables } from '../var.js';
import { getCookie } from '../cookie.js';
import { showAlertForXSeconds } from '../alert/alert.js';
import { updateBlockedUsers } from './ExpandableSidebar.js';
import { initFriendAutocomplete } from '../notification/friendAutocomplete.js';

const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = '/chat/chat.css';
document.head.appendChild(link);

/**
 * Blocca un utente
 * @param {number} userId - ID dell'utente da bloccare
 * @param {string} username - Username dell'utente da bloccare
 */
async function blockUser(userId, username) {
    const { token, url_api } = getVariables();
    
    try {
        const response = await fetch(
            `${url_api}/chat/chat/block_user/${userId}`,
            {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken'),
                    'Authorization': `Bearer ${token}`,
                },
            }
        );

        if (response.ok) {
            const data = await response.json();
            showAlertForXSeconds(
                `${username} has been blocked successfully`,
                "success",
                3,
                { asToast: true }
            );
            
            // Aggiorna la lista degli utenti bloccati
            await updateBlockedUsers();
            
            return true;
        } else {
            const errorData = await response.json();
            showAlertForXSeconds(
                errorData.error || "Failed to block user",
                "error",
                3,
                { asToast: true }
            );
            return false;
        }
    } catch (error) {
        console.error("Error blocking user:", error);
        showAlertForXSeconds(
            "Network error while blocking user",
            "error",
            3,
            { asToast: true }
        );
        return false;
    }
}

/**
 * Sblocca un utente
 * @param {number} userId - ID dell'utente da sbloccare
 * @param {string} username - Username dell'utente da sbloccare
 */
async function unblockUser(userId, username) {
    const { token, url_api } = getVariables();
    
    try {
        const response = await fetch(
            `${url_api}/chat/chat/block_user/${userId}`,
            {
                method: "DELETE",
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken'),
                    'Authorization': `Bearer ${token}`,
                },
            }
        );

        if (response.ok) {
            const data = await response.json();
            showAlertForXSeconds(
                `${username} has been unblocked successfully`,
                "success",
                3,
                { asToast: true }
            );
            
            // Aggiorna la lista degli utenti bloccati
            await updateBlockedUsers();
            
            return true;
        } else {
            const errorData = await response.json();
            showAlertForXSeconds(
                errorData.error || "Failed to unblock user",
                "error",
                3,
                { asToast: true }
            );
            return false;
        }
    } catch (error) {
        console.error("Error unblocking user:", error);
        showAlertForXSeconds(
            "Network error while unblocking user",
            "error",
            3,
            { asToast: true }
        );
        return false;
    }
}

/**
 * Ottiene la lista degli utenti bloccati
 */
async function getBlockedUsersList() {
    const { token, url_api } = getVariables();
    
    try {
        const response = await fetch(
            `${url_api}/chat/chat/blocked_users/`,
            {
                method: "GET",
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken'),
                    'Authorization': `Bearer ${token}`,
                },
            }
        );

        if (response.ok) {
            const data = await response.json();
						console.log("Blocked users data:", data);
            return data || [];
        } else if (response.status === 404) {
            // Nessun utente bloccato
            return [];
        } else {
            console.error("Error fetching blocked users:", response.status);
            return [];
        }
    } catch (error) {
        console.error("Error fetching blocked users:", error);
        return [];
    }
}

/**
 * Crea un'interfaccia per gestire gli utenti bloccati
 */
function showBlockedUsersModal() {
    // Crea il modal
    const blockedUserListModal = document.createElement('div');
    blockedUserListModal.className = 'add-chat';
    blockedUserListModal.innerHTML = `
            <h2>Blocked Users</h2>
            <div id="blockedUsersList" style="max-height: 400px; overflow-y: auto;">
            </div>
    `;

    loadBlockedUsers(blockedUserListModal);

		blockedUserListModal.innerHTML += `
		<div class="input-group mb-3">
				<input type="text" class="form-control" id="blockUserInput" placeholder="Username" autocomplete="off">
				<div id="blockUserSuggestionList" class="list-group" style="display:none; position:absolute; left:0; right:0; top:100%; z-index:1000;"></div>
		</div>
		`;

    return blockedUserListModal;
}



function helperAutocomplete(blockedUserListModal) {
	setTimeout(() => {
    initFriendAutocomplete({
        inputId: "blockUserInput",
        suggestionListId: "blockUserSuggestionList"
    });
}, 0);
}

/**
 * Carica e mostra gli utenti bloccati nel modal
 */
async function loadBlockedUsers(blockedUserListModal) {
    const blockedUsers = await getBlockedUsersList();
    const listContainer = blockedUserListModal.querySelector('#blockedUsersList');
    
    if (blockedUsers.length === 0) {
        listContainer.innerHTML = `
            <div class="text-center text-muted">
                <i class="bi bi-person-check fs-1"></i>
                <p>No blocked users</p>
            </div>
        `;
        return;
    }
    
    listContainer.innerHTML = blockedUsers.map(user => `
        <div class="d-flex justify-content-between align-items-center p-2 border-bottom">
            <div>
                <strong>${user.username}</strong>
                <small class="text-muted d-block">ID: ${user.user_id}</small>
            </div>
            <button class="btn btn-sm btn-outline-success" onclick="unblockUserFromModal(${user.user_id}, '${user.username}')">
                <i class="bi bi-person-plus"></i> Unblock
            </button>
        </div>
    `).join('');
}

/**
 * Funzione globale per sbloccare utente dal modal
 */
window.unblockUserFromModal = async function(userId, username) {
    const success = await unblockUser(userId, username);
    if (success) {
        // Ricarica la lista nel modal
        const modal = document.querySelector('.login-box-modal');
        if (modal) {
            loadBlockedUsers(modal);
        }
    }
};

// Rende le funzioni disponibili globalmente
window.blockUser = blockUser;
// window.unblockUser = unblockUser;
// window.showBlockedUsersModal = showBlockedUsersModal;

export { blockUser, unblockUser, getBlockedUsersList, showBlockedUsersModal, helperAutocomplete };
