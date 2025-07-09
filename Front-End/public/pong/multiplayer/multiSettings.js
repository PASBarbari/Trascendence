import { state } from "../locale/state.js";
import { cleanupPong } from "../locale/settings.js";
import * as SERVER from "./serverSide.js";

// Nel multiSettings.js
export function setPlayerReady() {
    console.log("Setting player ready...");

    console.log("🔍 Current WebSocket state:", {
        socket: SERVER.socket ? "exists" : "null",
        readyState: SERVER.socket?.readyState,
        isOpen: SERVER.socket?.readyState === WebSocket.OPEN
    });

    if (SERVER.socket && SERVER.socket.readyState === WebSocket.OPEN) {
        const message = {
            type: "player_ready",
            message: "Player is ready to start"
        };

        console.log("📤 Sending ready message:", message);
        console.log("📤 Message as JSON:", JSON.stringify(message));

        SERVER.socket.send(JSON.stringify(message));
        console.log("📤 Sent player ready signal");

        // ✅ AGGIUNGI LISTENER TEMPORANEO PER VEDERE SE ARRIVA RISPOSTA
        const originalOnMessage = SERVER.socket.onmessage;
        let responseReceived = false;

        const timeoutId = setTimeout(() => {
            if (!responseReceived) {
                console.error("❌ NO RESPONSE from server after 5 seconds!");
                console.error("❌ Server might not be handling 'player_ready' messages");
            }
        }, 5000);

        // Temporary message listener
        const tempListener = (event) => {
            responseReceived = true;
            clearTimeout(timeoutId);
            console.log("📨 RESPONSE RECEIVED after ready signal:", JSON.parse(event.data));
            // Restore original listener
            SERVER.socket.onmessage = originalOnMessage;
            // Call original handler
            if (originalOnMessage) {
                originalOnMessage(event);
            }
        };

        SERVER.socket.onmessage = tempListener;

        // Update button state
        const readyButton = document.getElementById("readyButton");
        if (readyButton) {
            readyButton.disabled = true;
            readyButton.innerHTML = '<i class="fas fa-clock me-2"></i>Waiting...';
            console.log("✅ Ready button updated to waiting state");
        }
    } else {
        console.error("❌ WebSocket is not connected");
        console.error("Socket state:", SERVER.socket?.readyState);
    }
}




// Aggiungi questa funzione temporanea nel multiSettings.js per testare
export function testServerResponse() {
    if (SERVER.socket && SERVER.socket.readyState === WebSocket.OPEN) {
        console.log("🧪 Testing server response...");

        // Test 1: Echo test
        SERVER.socket.send(JSON.stringify({
            type: "ping",
            message: "test ping"
        }));

        // Test 2: Different ready message format
        setTimeout(() => {
            SERVER.socket.send(JSON.stringify({
                type: "ready",
                player_ready: true
            }));
        }, 1000);

        // Test 3: Another format
        setTimeout(() => {
            SERVER.socket.send(JSON.stringify({
                action: "player_ready",
                status: "ready"
            }));
        }, 2000);

        console.log("🧪 Test messages sent, check for responses...");
    }
}

// Chiama questa funzione dalla console per testare: testServerResponse()
window.testServerResponse = testServerResponse;






export function exitWaitingRoom() {
    console.log("Exiting waiting room...");

    // Send quit signal to server
    SERVER.sendQuitGame();

    // Clean up and go home
    cleanupAndExit();
}

export function pauseGame() {
    if (!state.isStarted) return;

    console.log("Pausing game...");
    state.isPaused = true;

    // Show pause menu
    document.getElementById("pauseMenu").style.display = "block";

    // Notify server (optional - depends on if you want server-side pause)
    // SERVER.sendPause();
}

export function resumeGame() {
    if (!state.isStarted) return;

    console.log("Resuming game...");
    state.isPaused = false;

    // Hide pause menu
    document.getElementById("pauseMenu").style.display = "none";

    // Notify server (optional)
    // SERVER.sendResume();
}

export function exitGame() {
    console.log("Exiting game...");

    // Send quit signal to server
    SERVER.sendQuitGame();

    // Clean up and go home
    cleanupAndExit();
}

export function requestRematch() {
    console.log("Requesting rematch...");

    // Disable button and show loading
    const playAgainButton = document.getElementById("playAgainButton");
    if (playAgainButton) {
        playAgainButton.disabled = true;
        playAgainButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Requesting...';
    }

    // Send rematch request to server
    SERVER.sendRematchRequest();
}

export function exitToHome() {
    console.log("Exiting to home...");

    // Send quit signal to server
    SERVER.sendQuitGame();

    // Clean up and go home
    cleanupAndExit();
}

export function showGameOverMenu(winner, gameData) {
    console.log("Showing game over menu", { winner, gameData });

    // Hide other menus
    document.getElementById("waitingRoom").style.display = "none";
    document.getElementById("gameUI").style.display = "none";
    document.getElementById("pauseMenu").style.display = "none";

    // Update winner text
    const winnerText = typeof winner === 'string' ? winner :
                      (winner?.username || `Player ${winner?.player_number || '?'}`);
    document.getElementById("winnerAnnouncement").textContent = `${winnerText} Wins!`;

    // Show game over menu
    document.getElementById("gameOverMenu").style.display = "block";

    // Update game state
    state.isStarted = false;
    state.isPaused = true;
}

export function onRematchAccepted() {
    console.log("Rematch accepted, restarting game...");

    // Hide game over menu
    document.getElementById("gameOverMenu").style.display = "none";

    // Show waiting room again
    document.getElementById("waitingRoom").style.display = "block";

    // Reset game state
    resetGameState();

    // Reset UI
    const readyButton = document.getElementById("readyButton");
    if (readyButton) {
        readyButton.disabled = false;
        readyButton.innerHTML = '<i class="fas fa-check me-2"></i>Ready';
    }

    const playAgainButton = document.getElementById("playAgainButton");
    if (playAgainButton) {
        playAgainButton.disabled = false;
        playAgainButton.innerHTML = '<i class="fas fa-redo me-2"></i>Play Again';
    }
}

export function onRematchDeclined() {
    console.log("Rematch declined");

    // Show message and exit
    setTimeout(() => {
        alert("Rematch declined by opponent");
        cleanupAndExit();
    }, 1000);
}

function resetGameState() {
    // Reset scores
    state.p1_score = 0;
    state.p2_score = 0;
    state.isStarted = false;
    state.isPaused = true;

    // Reset positions if objects exist
    if (state.players[0] && state.players[0].mesh) {
        state.players[0].mesh.position.set(-((state.ring.length * 2) / 5), 0, 0);
    }

    if (state.players[1] && state.players[1].mesh) {
        state.players[1].mesh.position.set((state.ring.length * 2) / 5, 0, 0);
    }

    if (state.ball && state.ball.mesh) {
        state.ball.mesh.position.set(0, 0, 0);
        state.ball.resetSpeed();
    }

    // Update score display
    import("../locale/src/Score.js").then(({ updateScore }) => {
        updateScore("p1");
        updateScore("p2");
    });
}

function cleanupAndExit() {
    // Close WebSocket connection
    if (SERVER.socket) {
        SERVER.socket.close();
    }

    // Clean up Three.js objects
    cleanupPong();

    // Remove event listeners
    document.removeEventListener("keydown", window.multiplayerKeyDownHandler);
    document.removeEventListener("keyup", window.multiplayerKeyUpHandler);

    // Navigate to home
    window.navigateTo("#home");
}

export function onDisconnected(reason) {
    console.log("Disconnected from server:", reason);

    // Show disconnection message
    alert(`Disconnected from game: ${reason}`);

    // Clean up and exit
    cleanupAndExit();
}

export function onOpponentLeft() {
    console.log("Opponent left the game");

    // Show message
    alert("Your opponent has left the game");

    // Clean up and exit
    cleanupAndExit();
}