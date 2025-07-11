// IMPLEMENTAZIONE WEBRTC PER PONG - LATENZA ULTRA-BASSA
import { state } from "./locale/state.js";
import { getVariables } from "../var.js";
import { getCookie } from "../cookie.js";
import * as THREE from "three";

class PongWebRTC {
    constructor(isInitiator = false) {
        this.isInitiator = isInitiator;
        this.peerConnection = null;
        this.dataChannel = null;
        this.signalingSocket = null;

        // Connection management
        this.connectionTimeout = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 3;
        this.connectionTimeoutMs = 15000; // 15 secondi timeout
        this.iceCandidatesGathered = 0;
        this.iceTypes = new Set(); // Track types of ICE candidates gathered

        // Statistiche performance
        this.stats = {
            messagesSent: 0,
            messagesReceived: 0,
            lastLatency: 0,
            avgLatency: 0,
            latencyHistory: []
        };

        // WebRTC Configuration ottimizzata per gaming con fallback TURN
        this.rtcConfig = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
                // Server TURN pubblici di backup per NAT traversal
                {
                    urls: 'turn:openrelay.metered.ca:80',
                    username: 'openrelayproject',
                    credential: 'openrelayproject'
                },
                {
                    urls: 'turn:openrelay.metered.ca:443',
                    username: 'openrelayproject',
                    credential: 'openrelayproject'
                }
            ],
            iceCandidatePoolSize: 10,
            iceTransportPolicy: 'all', // Usa tutti i tipi di candidati
            bundlePolicy: 'max-bundle',
            rtcpMuxPolicy: 'require'
        };

        this.setupPeerConnection();

        // Log della configurazione ICE per debug
        console.log('🧊 ICE Configuration:', JSON.stringify(this.rtcConfig, null, 2));
    }

    setupPeerConnection() {
        this.peerConnection = new RTCPeerConnection(this.rtcConfig);

        // Handle ICE candidates with detailed logging
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.iceCandidatesGathered++;
                this.iceTypes.add(event.candidate.type);

                console.log(`🧊 ICE candidate #${this.iceCandidatesGathered}: ${event.candidate.type} (${event.candidate.protocol}) ${event.candidate.address}:${event.candidate.port}`);

                if (this.signalingSocket && this.signalingSocket.readyState === WebSocket.OPEN) {
                    this.sendSignalingMessage({
                        type: 'ice-candidate',
                        candidate: event.candidate.toJSON()
                    });
                    console.log('🧊 ICE candidate sent');
                } else {
                    console.warn('⚠️ Cannot send ICE candidate - signaling socket not ready');
                }
            } else {
                console.log(`🧊 ICE gathering completed - Total: ${this.iceCandidatesGathered} candidates, Types: [${Array.from(this.iceTypes).join(', ')}]`);
            }
        };

        // Handle ICE gathering state
        this.peerConnection.onicegatheringstatechange = () => {
            console.log(`🧊 ICE gathering state: ${this.peerConnection.iceGatheringState}`);
        };

        // Handle ICE connection state
        this.peerConnection.oniceconnectionstatechange = () => {
            console.log(`🧊 ICE connection state: ${this.peerConnection.iceConnectionState}`);
            if (this.peerConnection.iceConnectionState === 'failed') {
                console.error('❌ ICE connection failed - network connectivity issues');
            }
        };

        // Handle connection state changes
        this.peerConnection.onconnectionstatechange = () => {
            const state = this.peerConnection.connectionState;
            console.log(`🔗 WebRTC Connection State: ${state}`);
            this.updateConnectionStatus(state);

            if (state === 'connected') {
                this.clearConnectionTimeout();
                this.reconnectAttempts = 0;
                console.log('✅ WebRTC connection successfully established!');

                // Show success notification
                this.showConnectionSuccessNotification();
            } else if (state === 'failed' || state === 'disconnected') {
                console.error(`❌ WebRTC connection ${state}`);
                this.handleConnectionFailure();
            } else if (state === 'connecting') {
                this.startConnectionTimeout();
            }
        };

        // Handle data channel (for slave/receiver)
        this.peerConnection.ondatachannel = (event) => {
            console.log('📡 Data channel received');
            this.setupDataChannel(event.channel);
        };

        // Create data channel if initiator
        if (this.isInitiator) {
            this.dataChannel = this.peerConnection.createDataChannel('pong-realtime', {
                ordered: false, // Non ordinato per velocità massima
                maxRetransmits: 0 // No retransmit per latenza minima (rimuovo maxPacketLifeTime)
            });
            this.setupDataChannel(this.dataChannel);
            console.log('📡 Data channel created as initiator');
        }
    }

    setupDataChannel(channel) {
        this.dataChannel = channel;

        channel.onopen = () => {
            console.log('🚀 WebRTC Data Channel APERTO! Latenza ultra-bassa attiva.');
            this.clearConnectionTimeout(); // Clear any pending timeout
            this.reconnectAttempts = 0; // Reset reconnect counter
            this.startHealthMonitoring(); // Start monitoring connection health
            this.onWebRTCReady();
        };

        channel.onmessage = (event) => {
            this.handleGameMessage(JSON.parse(event.data));
        };

        channel.onerror = (error) => {
            console.error('❌ Errore Data Channel:', error);
        };

        channel.onclose = () => {
            console.log('🔌 Data Channel chiuso');
        };
    }

    // Inizializza signaling via WebSocket esistente
    initializeSignaling(room_id) {
        const { token, wss_api } = getVariables();
        const wsUrl = `${wss_api}/pong/ws/webrtc-signaling/${room_id}/?token=${token}`;

        this.signalingSocket = new WebSocket(wsUrl);

        this.signalingSocket.onopen = () => {
            console.log('📞 Signaling WebSocket connesso');
        };

        this.signalingSocket.onmessage = async (event) => {
            const message = JSON.parse(event.data);
            await this.handleSignalingMessage(message);
        };

        this.signalingSocket.onerror = (error) => {
            console.error('❌ Errore Signaling:', error);
        };

        this.signalingSocket.onclose = () => {
            console.log('📞 Signaling WebSocket chiuso');
        };
    }

    // Signaling methods
    sendSignalingMessage(message) {
        if (this.signalingSocket && this.signalingSocket.readyState === WebSocket.OPEN) {
            this.signalingSocket.send(JSON.stringify(message));
            console.log(`📤 Signaling message sent: ${message.type}`);
        } else {
            console.error('❌ Cannot send signaling message - socket not ready');
        }
    }

    // ...existing code...

    async handleSignalingMessage(message) {
        try {
            switch (message.type) {
                case 'offer':
                    console.log('📨 Offer ricevuto');
                    await this.peerConnection.setRemoteDescription(message.offer);
                    const answer = await this.peerConnection.createAnswer();
                    await this.peerConnection.setLocalDescription(answer);
                    this.sendSignalingMessage({
                        type: 'answer',
                        answer: answer
                    });
                    break;

                case 'answer':
                    console.log('📨 Answer ricevuto');
                    await this.peerConnection.setRemoteDescription(message.answer);
                    break;

                case 'ice-candidate':
                    console.log('🧊 ICE candidate ricevuto');
                    await this.peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
                    break;

                default:
                    console.log('📨 Messaggio signaling sconosciuto:', message.type);
            }
        } catch (error) {
            console.error('❌ Errore handling signaling:', error);
        }
    }

    // Connection initialization methods
    async startConnection() {
        try {
            if (this.isInitiator) {
                await this.createOffer();
            }
        } catch (error) {
            console.error('❌ Error starting connection:', error);
            this.handleConnectionFailure();
        }
    }

    async createOffer() {
        try {
            console.log('📤 Creating WebRTC offer...');
            this.startConnectionTimeout();

            const offer = await this.peerConnection.createOffer({
                offerToReceiveAudio: false,
                offerToReceiveVideo: false
            });

            await this.peerConnection.setLocalDescription(offer);

            this.sendSignalingMessage({
                type: 'offer',
                offer: offer
            });

            console.log('📤 WebRTC offer sent');
        } catch (error) {
            console.error('❌ Error creating offer:', error);
            this.handleConnectionFailure();
        }
    }

    // Connection health check
    isConnectionHealthy() {
        return (
            this.peerConnection &&
            this.peerConnection.connectionState === 'connected' &&
            this.dataChannel &&
            this.dataChannel.readyState === 'open'
        );
    }

    // Connection management methods
    startConnectionTimeout() {
        this.clearConnectionTimeout();
        this.connectionTimeout = setTimeout(() => {
            console.error('⏰ WebRTC connection timeout after 15 seconds');
            this.handleConnectionFailure();
        }, this.connectionTimeoutMs);
    }

    clearConnectionTimeout() {
        if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
        }
    }

    handleConnectionFailure() {
        this.clearConnectionTimeout();

        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

            setTimeout(() => {
                this.reconnectWebRTC();
            }, 2000 * this.reconnectAttempts); // Backoff progressivo
        } else {
            console.error('💥 WebRTC connection failed permanently after 3 attempts');
            this.showConnectionError();
        }
    }

    async reconnectWebRTC() {
        try {
            console.log('🔄 Reconnecting WebRTC...');

            // Cleanup existing connection
            if (this.peerConnection) {
                this.peerConnection.close();
            }
            if (this.signalingSocket) {
                this.signalingSocket.close();
            }

            // Reset and reinitialize
            this.setupPeerConnection();

            // Re-initialize signaling if we have a room
            if (state.webrtcRoomId) {
                this.initializeSignaling(state.webrtcRoomId);

                // Start connection process again
                if (this.isInitiator) {
                    setTimeout(() => this.startConnection(), 1000);
                }
            }
        } catch (error) {
            console.error('❌ Error during reconnection:', error);
            this.handleConnectionFailure();
        }
    }

    showConnectionError() {
        // Show user-friendly error message
        const errorMsg = `
            <div style="
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: #ff4757;
                color: white;
                padding: 20px;
                border-radius: 10px;
                z-index: 10000;
                text-align: center;
                max-width: 400px;
            ">
                <h3>🔌 Connection Failed</h3>
                <p>Unable to establish WebRTC connection. This may be due to network restrictions or firewall settings.</p>
                <button onclick="this.parentElement.remove(); window.navigateTo('#home');"
                        style="background: white; color: #ff4757; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; margin-top: 10px;">
                    Return to Home
                </button>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', errorMsg);
    }

    showConnectionSuccessNotification() {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #2ecc71;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: slideIn 0.3s ease-out;
        `;

        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <i class="fas fa-rocket" style="font-size: 18px;"></i>
                <div>
                    <strong>WebRTC Connected!</strong><br>
                    <small>Ultra-low latency gaming active</small>
                </div>
            </div>
        `;

        // Add CSS animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(notification);

        // Auto remove after 3 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.style.animation = 'slideIn 0.3s ease-out reverse';
                setTimeout(() => notification.remove(), 300);
            }
        }, 3000);
    }

    // GAME LOGIC con WebRTC - ULTRA VELOCE
    sendGameData(data) {
        if (this.dataChannel && this.dataChannel.readyState === 'open') {
            const timestamp = performance.now();
            const message = JSON.stringify({
                ...data,
                timestamp: timestamp,
                id: this.stats.messagesSent++
            });

            this.dataChannel.send(message);
            return timestamp;
        }
        return null;
    }

    handleGameMessage(message) {
        const now = performance.now();
        const latency = now - message.timestamp;

        // Aggiorna statistiche latenza
        this.updateLatencyStats(latency);

        this.stats.messagesReceived++;

        // Log latenza ogni 60 messaggi
        if (this.stats.messagesReceived % 60 === 0) {
            console.log(`⚡ Latenza WebRTC: ${latency.toFixed(1)}ms (avg: ${this.stats.avgLatency.toFixed(1)}ms)`);
        }

        switch (message.type) {
            case 'paddle_position':
                this.applyPaddlePosition(message.player, message.position, latency, message.velocity);
                break;

            case 'ball_state':
                this.applyBallState(message.position, message.velocity, latency);
                break;

            case 'score_update':
                this.applyScoreUpdate(message.p1_score, message.p2_score);
                break;

            case 'game_event':
                this.handleGameEvent(message.event, message.data);
                break;
        }
    }

    updateLatencyStats(latency) {
        this.stats.lastLatency = latency;
        this.stats.latencyHistory.push(latency);

        // Mantieni solo gli ultimi 100 valori
        if (this.stats.latencyHistory.length > 100) {
            this.stats.latencyHistory.shift();
        }

        // Calcola media
        this.stats.avgLatency = this.stats.latencyHistory.reduce((a, b) => a + b, 0) / this.stats.latencyHistory.length;
    }

    // APPLICAZIONE DATI GIOCO
    applyPaddlePosition(player, position, latency, velocity = null) {
        const paddleIndex = player === 1 ? 0 : 1;
        if (state.players[paddleIndex]) {
            // Compensazione latenza per predizione
            const compensationTime = latency / 1000;
            let compensatedY = position[1];

            // Se c'è velocità, predici la posizione
            if (velocity && velocity.y !== undefined) {
                compensatedY += velocity.y * compensationTime;
            }

            // Applica posizione immediatamente - nessun throttling
            state.players[paddleIndex].mesh.position.set(position[0], compensatedY, position[2]);
        }
    }

    applyBallState(position, velocity, latency) {
        if (!state.ball || state.isMaster) return; // Only slave applies received ball state

        // DIAGNOSTICS: Print boundaries for debugging
        if (!this.boundariesLogged) {
            console.log("🏟️ Field boundaries:", state.boundaries);
            console.log("🏟️ Ring dimensions:", { length: state.ring.length, height: state.ring.height });
            this.boundariesLogged = true;
        }

        // FIXED: Validate ball position to prevent extreme values
        const maxBoundary = Math.max(state.boundaries?.x || 100, state.boundaries?.y || 100) * 2;
        const isValidPosition = position.every(coord => Math.abs(coord) < maxBoundary);

        if (!isValidPosition) {
            console.warn("🚨 Invalid ball position received, ignoring:", position, "max boundary:", maxBoundary);
            return;
        }

        // Compensazione latenza per predizione ultra-precisa (limitata a 100ms massimo)
        const clampedLatency = Math.min(latency, 100);
        const compensationTime = clampedLatency / 1000;
        const predictedPosition = [
            position[0] + velocity[0] * compensationTime,
            position[1] + velocity[1] * compensationTime,
            position[2] + velocity[2] * compensationTime
        ];

        // FIXED: Validate predicted position too
        const isValidPredictedPosition = predictedPosition.every(coord => Math.abs(coord) < maxBoundary);

        if (!isValidPredictedPosition) {
            console.warn("🚨 Invalid predicted position, using raw position:", predictedPosition);
            state.ball.mesh.position.set(...position);
        } else {
            // Applica immediatamente - FORZA la posizione senza interferenze
            state.ball.mesh.position.set(...predictedPosition);
        }

        // Aggiorna velocità solo se la pallina si sta muovendo
        if (state.ball.velocity && (velocity[0] !== 0 || velocity[1] !== 0 || velocity[2] !== 0)) {
            state.ball.velocity.set(...velocity);
        } else if (state.ball.velocity) {
            // Se velocità è zero, ferma completamente la pallina
            state.ball.velocity.set(0, 0, 0);
        }

        // Debug: log ball reset detection (ball is near center with low velocity)
        const isNearCenter = Math.abs(position[0]) < 10 && Math.abs(position[1]) < 10 && Math.abs(position[2]) < 10;
        const isLowVelocity = Math.abs(velocity[0]) < 50 && Math.abs(velocity[1]) < 50 && Math.abs(velocity[2]) < 50;

        if (isNearCenter && isLowVelocity) {
            console.log("🏓 Ball reset detected - position:", position, "velocity:", velocity);
        }
    }

    applyScoreUpdate(p1_score, p2_score) {
        state.p1_score = p1_score;
        state.p2_score = p2_score;

        // Aggiorna UI score
        import("./locale/utils.js").then(({ updateScore }) => {
            if (updateScore) {
                updateScore();
            }
        }).catch(() => {});
    }

    handleGameEvent(event, data) {
        switch (event) {
            case 'ball_reset':
                // Reset palla
                if (state.ball && data.position) {
                    state.ball.mesh.position.set(...data.position);
                    state.ball.velocity.set(...data.velocity);
                }
                break;

            case 'game_over':
                state.isStarted = false;
                state.isPaused = true;
                break;
        }
    }

    // INVIO DATI GIOCO
    sendPaddlePosition(player, position, velocity = 0) {
        return this.sendGameData({
            type: 'paddle_position',
            player: player,
            position: position,
            velocity: velocity
        });
    }

    sendBallState(position, velocity) {
        return this.sendGameData({
            type: 'ball_state',
            position: position,
            velocity: velocity
        });
    }

    sendScoreUpdate(p1_score, p2_score) {
        return this.sendGameData({
            type: 'score_update',
            p1_score: p1_score,
            p2_score: p2_score
        });
    }

    sendGameEvent(event, data = {}) {
        return this.sendGameData({
            type: 'game_event',
            event: event,
            data: data
        });
    }

    // CALLBACK quando WebRTC è pronto
    onWebRTCReady() {
        console.log('🎮 WebRTC pronto! Iniziando gioco...');

        // Imposta flag WebRTC
        state.isWebRTC = true;
        state.webrtcConnection = this;

        // Chiudi signaling WebSocket (non più necessario)
        if (this.signalingSocket) {
            this.signalingSocket.close();
            this.signalingSocket = null;
        }

        // Avvia il gioco
        this.startGame();
    }

    startGame() {
        // Nascondi menu
        const menu = document.getElementById("menu");
        if (menu) {
            menu.style.display = "none";
        }

        state.isStarted = true;
        state.isPaused = false;
        state.isMultiplayer = true;

        // Disabilita AI
        state.IAisActive = false;

        // Aggiorna UI status
        this.updateConnectionStatus('connected');

        // Avvia game loop se non già avviato
        if (!state.animationFrameId) {
            import("./locale/gameLogic.js").then(({ animate }) => {
                animate();
            }).catch(error => {
                console.error('❌ Errore avviando animation:', error);
            });
        }
    }

    updateConnectionStatus(status) {
        import("./locale/pong.js").then(({ updateMultiplayerStatus }) => {
            const statusMap = {
                'connecting': `🔄 Connecting via WebRTC... ${this.reconnectAttempts > 0 ? `(Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})` : ''}`,
                'connected': `✅ WebRTC Connected (${this.stats.avgLatency.toFixed(1)}ms avg)`,
                'disconnected': '⚠️ WebRTC Disconnected',
                'failed': '❌ WebRTC Connection Failed'
            };

            const message = statusMap[status] || status;
            updateMultiplayerStatus(status, message);

            // Log dettagliato per debug
            console.log(`📊 Connection Status: ${status} - ${message}`);
        }).catch(error => {
            console.warn('Could not update multiplayer status:', error);
        });
    }

    // Health monitoring
    startHealthMonitoring() {
        this.healthCheckInterval = setInterval(() => {
            if (!this.isConnectionHealthy() && state.isWebRTC) {
                console.warn('⚠️ Connection health check failed');
                this.handleConnectionFailure();
            }
        }, 10000); // Check every 10 seconds
    }

    stopHealthMonitoring() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
    }

    // Cleanup
    destroy() {
        this.stopHealthMonitoring();
        this.clearConnectionTimeout();

        if (this.dataChannel) {
            this.dataChannel.close();
        }
        if (this.peerConnection) {
            this.peerConnection.close();
        }
        if (this.signalingSocket) {
            this.signalingSocket.close();
        }

        state.isWebRTC = false;
        state.webrtcConnection = null;

        console.log('🗑️ WebRTC cleanup completato');
    }
}

// INTEGRAZIONE NEL GAME LOOP
export function webrtcGameLoop() {
    if (!state.isWebRTC || !state.webrtcConnection) return;

    const connection = state.webrtcConnection;

    // Invia posizione paddle quando cambia (ULTRA FREQUENTE)
    if (state.isMaster && state.players[0] && state.p1_move_y !== 0) {
        const pos = state.players[0].mesh.position;
        connection.sendPaddlePosition(1, [pos.x, pos.y, pos.z], state.p1_move_y);
    }

    if (!state.isMaster && state.players[1] && state.p2_move_y !== 0) {
        const pos = state.players[1].mesh.position;
        connection.sendPaddlePosition(2, [pos.x, pos.y, pos.z], state.p2_move_y);
    }

    // Master invia stato palla (ULTRA FREQUENTE per sincronizzazione perfetta)
    if (state.isMaster && state.ball) {
        const pos = state.ball.mesh.position;
        const vel = state.ball.velocity;

        // DIAGNOSTICS: Print boundaries for debugging (Master)
        if (!connection.masterBoundariesLogged) {
            console.log("🏟️ MASTER Field boundaries:", state.boundaries);
            console.log("🏟️ MASTER Ring dimensions:", { length: state.ring.length, height: state.ring.height });
            connection.masterBoundariesLogged = true;
        }

        // FIXED: Validate ball position before sending
        const maxBoundary = Math.max(state.boundaries?.x || 100, state.boundaries?.y || 100) * 2;
        const isValidPosition = [pos.x, pos.y, pos.z].every(coord => Math.abs(coord) < maxBoundary);

        if (isValidPosition) {
            // Invia sempre lo stato della pallina per sincronizzazione perfetta
            connection.sendBallState(
                [pos.x, pos.y, pos.z],
                [vel.x, vel.y, vel.z]
            );
        } else {
            console.warn("🚨 MASTER: Invalid ball position, not sending:", [pos.x, pos.y, pos.z], "max boundary:", maxBoundary);
            console.warn("🚨 MASTER: Ball velocity:", [vel.x, vel.y, vel.z]);
        }
    }
}

// FUNZIONE PRINCIPALE DI INIZIALIZZAZIONE
export async function initializeWebRTCGame(room_id, isInitiator) {
    console.log(`🚀 Inizializzando WebRTC Game - Room: ${room_id}, Initiator: ${isInitiator}`);

    const connection = new PongWebRTC(isInitiator);

    // Salva room ID per riconnessioni
    state.webrtcRoomId = room_id;

    // Inizializza signaling
    connection.initializeSignaling(room_id);

    // Se è l'initiator, crea l'offer dopo un delay per permettere al signaling di connettersi
    if (isInitiator) {
        const waitForSignaling = () => {
            if (connection.signalingSocket && connection.signalingSocket.readyState === WebSocket.OPEN) {
                console.log('📞 Signaling ready, starting connection...');
                connection.startConnection();
            } else {
                console.log('⏳ Waiting for signaling socket to open...');
                if (connection.signalingSocket) {
                    connection.signalingSocket.addEventListener('open', () => {
                        console.log('📞 Signaling opened, starting connection...');
                        connection.startConnection();
                    }, { once: true });
                } else {
                    // Retry after delay if signaling socket not initialized yet
                    setTimeout(waitForSignaling, 500);
                }
            }
        };

        setTimeout(waitForSignaling, 1000);
    }

    return connection;
}

export { PongWebRTC };