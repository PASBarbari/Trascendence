/**
 * Configurazione del gioco responsiva che si adatta alle dimensioni della finestra
 */

// Configurazione di default (fallback)
const DEFAULT_CONFIG = {
    ring_length: 1344,  // 1920 * 0.7
    ring_height: 648,   // 1080 * 0.6
    ring_width: 10.8,   // 1080 * 0.01
    ring_thickness: 5.4, // 1080 * 0.005
    player_length: 97.2, // 648 * 0.15
    player_height: 4.32, // 5.4 * 0.8
    player_width: 4.32,  // 5.4 * 0.8
    player_speed: 13.44, // 1344 * 0.01
    ball_radius: 13.44,  // 1344 * 0.01
    ball_speed: 10.75,   // 1344 * 0.008
    game_fps: 60,
    player_1_start_x: -537.6, // -1344 * 0.4
    player_2_start_x: 537.6,  // 1344 * 0.4
    player_start_y: 0,
    ball_start_x: 0,
    ball_start_y: 0,
    boundary_top: 291.6,    // 648 * 0.45
    boundary_bottom: -291.6, // -648 * 0.45
    boundary_left: -604.8,   // -1344 * 0.45
    boundary_right: 604.8,   // 1344 * 0.45
};

let gameConfig = { ...DEFAULT_CONFIG };

/**
 * Ottiene le dimensioni attuali della finestra
 * @returns {Object} Dimensioni width e height
 */
function getWindowDimensions() {
    const container = document.getElementById("threejs-container");
    if (container) {
        const rect = container.getBoundingClientRect();
        return {
            width: rect.width,
            height: rect.height
        };
    }
    return {
        width: window.innerWidth,
        height: window.innerHeight
    };
}

/**
 * Carica la configurazione responsiva dal server
 * @returns {Promise<Object>} La configurazione del gioco
 */
async function loadGameConfig() {
    try {
        const dimensions = getWindowDimensions();

        console.log("🔍 Loading config for dimensions:", dimensions);

        const response = await fetch('/pong/config/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                width: dimensions.width,
                height: dimensions.height
            })
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success && data.config) {
                gameConfig = { ...data.config };
                console.log("✅ Game config loaded from server:", gameConfig);
                console.log("📏 Config calculated for:", `${dimensions.width}x${dimensions.height}`);
                return gameConfig;
            }
        }

        console.warn("⚠️ Failed to load config from server, using defaults");
        gameConfig = { ...DEFAULT_CONFIG };
        return gameConfig;
    } catch (error) {
        console.error("❌ Error loading game config:", error);
        gameConfig = { ...DEFAULT_CONFIG };
        return gameConfig;
    }
}

/**
 * Ottiene la configurazione del gioco. Se non è stata ancora caricata, la carica.
 * @returns {Promise<Object>} La configurazione del gioco
 */
async function getGameConfig() {
    if (!gameConfig || Object.keys(gameConfig).length === 0) {
        await loadGameConfig();
    }
    return gameConfig;
}

/**
 * Aggiorna la configurazione del gioco con nuovi valori.
 * @param {Object} newConfig - I nuovi valori di configurazione
 */
function updateGameConfig(newConfig) {
    gameConfig = { ...gameConfig, ...newConfig };
    console.log("🔄 Game config updated:", gameConfig);
}

/**
 * Ricarica la configurazione quando la finestra viene ridimensionata
 * @returns {Promise<Object>} La nuova configurazione
 */
async function reloadConfigOnResize() {
    console.log("🔄 Window resized, reloading config...");
    await loadGameConfig();
    return gameConfig;
}

/**
 * Verifica se la configurazione è stata caricata.
 * @returns {boolean} True se la configurazione è stata caricata
 */
function isConfigLoaded() {
    return gameConfig !== null && Object.keys(gameConfig).length > 0;
}

// Esporta le funzioni per l'uso in altri moduli
window.gameConfigModule = {
    loadGameConfig,
    getGameConfig,
    updateGameConfig,
    reloadConfigOnResize,
    isConfigLoaded
};
