import { toggleProfile } from "../home/home.js";
import { getVariables, setVariables } from '../var.js';
import { cleanupPong } from "../pong/locale/settings.js";

function Logout() {
    try {
        cleanupPong();
        console.log("Cleanup Pong completato");
    } catch (error) {
        console.log("Cleanup Pong non necessario o già eseguito");
    }

    // Chiude tutti i WebSocket attivi
    const webSocketInstances = window.activeWebSockets || [];
    if (webSocketInstances.length > 0) {
        webSocketInstances.forEach(socket => {
						if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
								socket.close();
						}
        });
        window.activeWebSockets = [];
    }
    
		if (window.notificationHeartbeatInterval) {
				clearInterval(window.notificationHeartbeatInterval);
				window.notificationHeartbeatInterval = null;
		}

    // Rimuove contenuto di chatContainer
    const chatContainer = document.querySelector('#chatContainer');
    if (chatContainer) {
        chatContainer.innerHTML = '';
    }
    if (window.displayedDates) {
        window.displayedDates.clear();
    }

    // rimuove dati e token
    localStorage.removeItem('variables');
    sessionStorage.clear();

    document.cookie.split(";").forEach(cookie => {
        const [name] = cookie.trim().split("=");
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    });

		console.clear();
		
    setVariables({
        token: null,
        refreshToken: null,
        userEmail: null,
        userUsername: null,
        userId: null,
        name: null,
        surname: null,
        birthdate: null,
        bio: null,
        level: 0,
        exp: 0,
        profileImageUrl: null,
        has_two_factor_auth: false,
        multiplayer_username: null,
        multiplayer_id: null
    });
    navigateTo('#login');
}

function settingsPopup(event) {
    // Ferma la propagazione dell'evento click
    if (event) {
        event.stopPropagation();
    }

    // Se esiste già un dropdown, lo rimuoviamo prima
    const existingDropdown = document.querySelector('.settings-dropdown');
    if (existingDropdown) {
        existingDropdown.remove();
        document.removeEventListener('click', window.currentOutsideClickHandler);
        window.removeEventListener('resize', window.currentResizeHandler);
    }

    // Ottieni il pulsante trigger
    const triggerButton = event ? event.currentTarget : document.getElementById('toggleSettingsButton');
    
    // Crea il dropdown
    const dropdown = document.createElement('div');
    dropdown.className = 'dropdown-menu show settings-dropdown';
    dropdown.style.position = 'fixed'; // Usiamo fixed invece di absolute
    
    // Inizializza il posizionamento
    updateDropdownPosition();
    
    dropdown.innerHTML = `
        <div class="dropdown-header fw-bold">Settings</div>
        <button class="dropdown-item" id="toggleProfileButton">Profile</button>
        <button class="dropdown-item" id="toggleLogoutButton">logout</button>
        <div class="dropdown-divider"></div>
        <button class="dropdown-item" id="closeSettingsButton">Close</button>
    `;
    
    document.body.appendChild(dropdown);
    
    // Funzione per aggiornare la posizione del dropdown
    function updateDropdownPosition() {
        const buttonRect = triggerButton.getBoundingClientRect();
        dropdown.style.top = `${buttonRect.bottom + 2}px`;
        dropdown.style.left = `${Math.max(0, buttonRect.left - 130)}px`;
    }
    
    // Event listener per il resize
    function handleResize() {
        updateDropdownPosition();
    }
    
    // Salviamo il riferimento alla funzione globalmente
    window.currentResizeHandler = handleResize;
    
    // Aggiungiamo l'event listener per il resize
    window.addEventListener('resize', window.currentResizeHandler);
    
    // Aggiungi event listeners per i pulsanti
    document.getElementById('closeSettingsButton').addEventListener('click', closePopup);
    document.getElementById('toggleProfileButton').addEventListener('click', () => {
        closePopup();
        toggleProfile();
    });
    document.getElementById('toggleLogoutButton').addEventListener('click', () => {
        closePopup();
        Logout();
    });
    
    // Funzione per gestire click esterni
    function handleOutsideClick(e) {
        if (!dropdown.contains(e.target) && e.target !== triggerButton) {
            closePopup();
        }
    }
    
    // Salviamo il riferimento alla funzione globalmente per poterla rimuovere dopo
    window.currentOutsideClickHandler = handleOutsideClick;
    
    // Aggiungiamo l'event listener con un piccolo ritardo
    setTimeout(() => {
        document.addEventListener('click', window.currentOutsideClickHandler);
    }, 10);
}

function closePopup() {
    const dropdown = document.querySelector('.settings-dropdown');
    if (dropdown) {
        document.body.removeChild(dropdown);
        document.removeEventListener('click', window.currentOutsideClickHandler);
        window.removeEventListener('resize', window.currentResizeHandler);
    }
}

export { settingsPopup, Logout };