// IMPLEMENTAZIONE WEBRTC PER PONG - LATENZA ULTRA-BASSA
import { state } from "./webrtc/state.js";
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

		// Statistiche performance - SEMPLIFICATO
		this.stats = {
			messagesSent: 0,
			messagesReceived: 0,
		};

		// Ready state tracking
		this.localPlayerReady = false;
		this.otherPlayerReady = false;

		// WebRTC Configuration ottimizzata per LAN (solo STUN, nessun TURN)
		this.rtcConfig = {
			iceServers: [
				{ urls: "stun:stun.l.google.com:19302" },
				{ urls: "stun:stun1.l.google.com:19302" },
				{ urls: "stun:stun2.l.google.com:19302" },
				// Server TURN pubblici di backup per NAT traversal
				{
					urls: "turn:openrelay.metered.ca:80",
					username: "openrelayproject",
					credential: "openrelayproject",
				},
				{
					urls: "turn:openrelay.metered.ca:443",
					username: "openrelayproject",
					credential: "openrelayproject",
				},
				// Additional STUN servers for better connectivity
				{ urls: "stun:stun3.l.google.com:19302" },
				{ urls: "stun:stun4.l.google.com:19302" },
			],
			iceCandidatePoolSize: 10,
			bundlePolicy: "max-bundle",
			rtcpMuxPolicy: "require",
		};

		this.setupPeerConnection();

		// Log della configurazione ICE per debug
		console.log(
			"🧊 ICE Configuration:",
			JSON.stringify(this.rtcConfig, null, 2)
		);
	}

	setupPeerConnection() {
		this.peerConnection = new RTCPeerConnection(this.rtcConfig);

		// Handle ICE candidates with detailed logging
		this.peerConnection.onicecandidate = (event) => {
			if (event.candidate) {
				this.iceCandidatesGathered++;
				this.iceTypes.add(event.candidate.type);

				console.log(
					`🧊 ICE candidate #${this.iceCandidatesGathered}: ${event.candidate.type} (${event.candidate.protocol}) ${event.candidate.address}:${event.candidate.port}`
				);

				if (
					this.signalingSocket &&
					this.signalingSocket.readyState === WebSocket.OPEN
				) {
					this.sendSignalingMessage({
						type: "ice-candidate",
						candidate: event.candidate.toJSON(),
					});
					console.log("🧊 ICE candidate sent");
				} else {
					console.warn(
						"⚠️ Cannot send ICE candidate - signaling socket not ready"
					);
				}
			} else {
				console.log(
					`🧊 ICE gathering completed - Total: ${
						this.iceCandidatesGathered
					} candidates, Types: [${Array.from(this.iceTypes).join(", ")}]`
				);
			}
		};

		// Handle ICE gathering state
		this.peerConnection.onicegatheringstatechange = () => {
			console.log(
				`🧊 ICE gathering state: ${this.peerConnection.iceGatheringState}`
			);
		};

		// Handle ICE connection state
		this.peerConnection.oniceconnectionstatechange = () => {
			console.log(
				`🧊 ICE connection state: ${this.peerConnection.iceConnectionState}`
			);
			if (this.peerConnection.iceConnectionState === "failed") {
				console.error("❌ ICE connection failed - network connectivity issues");
			}
		};

		// Handle connection state changes
		this.peerConnection.onconnectionstatechange = () => {
			const state = this.peerConnection.connectionState;
			console.log(`🔗 WebRTC Connection State: ${state}`);
			this.updateConnectionStatus(state);

			if (state === "connected") {
				this.clearConnectionTimeout();
				this.reconnectAttempts = 0;
				console.log("✅ WebRTC connection successfully established!");
				console.log(
					`🧊 Final ICE candidate stats: ${
						this.iceCandidatesGathered
					} candidates, Types: [${Array.from(this.iceTypes).join(", ")}]`
				);

				// Show success notification
				this.showConnectionSuccessNotification();
			} else if (state === "failed" || state === "disconnected") {
				console.error(`❌ WebRTC connection ${state}`);
				console.log(
					`🧊 ICE stats at failure: ${
						this.iceCandidatesGathered
					} candidates, Types: [${Array.from(this.iceTypes).join(", ")}]`
				);
				this.handleConnectionFailure();
			} else if (state === "connecting") {
				console.log(
					`⏳ WebRTC connection attempt #${this.reconnectAttempts + 1}`
				);
				this.startConnectionTimeout();
			}
		};

		// Handle data channel (for receiver)
		this.peerConnection.ondatachannel = (event) => {
			console.log("📡 Data channel received");
			this.setupDataChannel(event.channel);
		};

		// Create data channel if initiator
		if (this.isInitiator) {
			this.dataChannel = this.peerConnection.createDataChannel(
				"pong-realtime",
				{
					ordered: false, // Non ordinato per velocità massima
					maxRetransmits: 0, // No retransmit per latenza minima (rimuovo maxPacketLifeTime)
				}
			);
			this.setupDataChannel(this.dataChannel);
			console.log("📡 Data channel created as initiator");
		}
	}

	setupDataChannel(channel) {
		this.dataChannel = channel;

		channel.onopen = () => {
			console.log("🚀 WebRTC Data Channel APERTO! Latenza ultra-bassa attiva.");
			this.clearConnectionTimeout(); // Clear any pending timeout
			this.reconnectAttempts = 0; // Reset reconnect counter
			this.startHealthMonitoring(); // Start monitoring connection health
			this.onWebRTCReady();

			// --- SYNC FIELD DIMENSIONS (HOST ONLY) ---
			if (state.isHost) {
				this.sendGameData({
					type: "field_dimensions",
					length: state.ring.length,
					height: state.ring.height,
				});
				console.log(
					"📏 Field dimensions sent to guest:",
					state.ring.length,
					state.ring.height
				);
			}
		};

		channel.onmessage = (event) => {
			this.handleGameMessage(JSON.parse(event.data));
		};

		channel.onerror = (error) => {
			// Filtra l'errore "User-Initiated Abort" (chiusura volontaria)
			if (
				error &&
				error.error &&
				error.error.name === "OperationError" &&
				error.error.message &&
				error.error.message.includes("User-Initiated Abort")
			) {
				// Non loggare come errore, è normale in chiusura
				console.info("ℹ️ Data Channel chiuso volontariamente.");
			} else {
				console.error("❌ Errore Data Channel:", error);
			}
		};

		channel.onclose = () => {
			console.log("🔌 Data Channel chiuso");
		};
	}

	// Inizializza signaling via WebSocket esistente
	initializeSignaling(room_id) {
		const { token, wss_api } = getVariables();
		const wsUrl = `${wss_api}/pong/ws/webrtc-signaling/${room_id}/?token=${token}`;

		console.log(`📞 Connecting to signaling server: ${wsUrl}`);
		this.signalingSocket = new WebSocket(wsUrl);

		this.signalingSocket.onopen = () => {
			console.log("📞 Signaling WebSocket connesso");

			// Send a ping to establish readiness
			this.sendSignalingMessage({
				type: "peer-ready",
				isInitiator: this.isInitiator,
				timestamp: Date.now(),
			});
		};

		this.signalingSocket.onmessage = async (event) => {
			const message = JSON.parse(event.data);
			await this.handleSignalingMessage(message);
		};

		this.signalingSocket.onerror = (error) => {
			console.error("❌ Errore Signaling:", error);
		};

		this.signalingSocket.onclose = (event) => {
			console.log(
				`📞 Signaling WebSocket chiuso: ${event.code} - ${event.reason}`
			);
			if (
				!event.wasClean &&
				this.reconnectAttempts < this.maxReconnectAttempts
			) {
				console.log("🔄 Attempting to reconnect signaling...");
				setTimeout(() => {
					this.initializeSignaling(room_id);
				}, 2000);
			}
		};
	}

	// Signaling methods
	sendSignalingMessage(message) {
		if (
			this.signalingSocket &&
			this.signalingSocket.readyState === WebSocket.OPEN
		) {
			this.signalingSocket.send(JSON.stringify(message));
			console.log(`📤 Signaling message sent: ${message.type}`);
		} else {
			console.error("❌ Cannot send signaling message - socket not ready");
		}
	}

	async handleSignalingMessage(message) {
		try {
			switch (message.type) {
				case "peer-ready":
					console.log("👋 Peer ready signal received:", message);
					// Both peers are now ready for negotiation
					break;

				case "offer":
					console.log("📨 Offer ricevuto");
					await this.peerConnection.setRemoteDescription(message.offer);
					const answer = await this.peerConnection.createAnswer();
					await this.peerConnection.setLocalDescription(answer);
					this.sendSignalingMessage({
						type: "answer",
						answer: answer,
					});
					break;

				case "answer":
					console.log("📨 Answer ricevuto");
					await this.peerConnection.setRemoteDescription(message.answer);
					break;

				case "ice-candidate":
					console.log("🧊 ICE candidate ricevuto");
					await this.peerConnection.addIceCandidate(
						new RTCIceCandidate(message.candidate)
					);
					break;

				default:
					console.log("📨 Messaggio signaling sconosciuto:", message.type);
			}
		} catch (error) {
			console.error("❌ Errore handling signaling:", error);
		}
	}

	// Connection initialization methods
	async startConnection() {
		try {
			if (this.isInitiator) {
				await this.createOffer();
			}
		} catch (error) {
			console.error("❌ Error starting connection:", error);
			this.handleConnectionFailure();
		}
	}

	async createOffer() {
		try {
			console.log("📤 Creating WebRTC offer...");
			this.startConnectionTimeout();

			// Wait for some ICE candidates to be gathered first
			await this.waitForInitialICECandidates();

			const offer = await this.peerConnection.createOffer({
				offerToReceiveAudio: false,
				offerToReceiveVideo: false,
			});

			await this.peerConnection.setLocalDescription(offer);

			this.sendSignalingMessage({
				type: "offer",
				offer: offer,
			});

			console.log("📤 WebRTC offer sent");
		} catch (error) {
			console.error("❌ Error creating offer:", error);
			this.handleConnectionFailure();
		}
	}

	// Wait for initial ICE candidates to improve connection success rate
	waitForInitialICECandidates(timeout = 3000) {
		return new Promise((resolve) => {
			const startTime = Date.now();

			const checkCandidates = () => {
				const elapsed = Date.now() - startTime;

				// Resolve if we have some candidates or timeout is reached
				if (
					this.iceCandidatesGathered >= 2 ||
					elapsed >= timeout ||
					this.peerConnection.iceGatheringState === "complete"
				) {
					console.log(
						`🧊 ICE candidates ready: ${this.iceCandidatesGathered} candidates after ${elapsed}ms`
					);
					resolve();
				} else {
					setTimeout(checkCandidates, 100);
				}
			};

			checkCandidates();
		});
	}

	// Connection health check
	isConnectionHealthy() {
		return (
			this.peerConnection &&
			this.peerConnection.connectionState === "connected" &&
			this.dataChannel &&
			this.dataChannel.readyState === "open"
		);
	}

	// Connection management methods
	startConnectionTimeout() {
		this.clearConnectionTimeout();
		this.connectionTimeout = setTimeout(() => {
			console.error("⏰ WebRTC connection timeout after 15 seconds");
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
			console.log(
				`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`
			);

			setTimeout(() => {
				this.reconnectWebRTC();
			}, 2000 * this.reconnectAttempts); // Backoff progressivo
		} else {
			console.error("💥 WebRTC connection failed permanently after 3 attempts");
			this.showConnectionError();
		}
	}

	async reconnectWebRTC() {
		try {
			console.log("🔄 Reconnecting WebRTC...");

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
			console.error("❌ Error during reconnection:", error);
			this.handleConnectionFailure();
		}
	}

	showConnectionError() {
		// Solo log in console, nessun popup
		console.error(
			"🔌 Connection Failed: Unable to establish WebRTC connection. This may be due to network restrictions or firewall settings."
		);
	}

	showConnectionSuccessNotification() {
		const notification = document.createElement("div");
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
		const style = document.createElement("style");
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
				notification.style.animation = "slideIn 0.3s ease-out reverse";
				setTimeout(() => notification.remove(), 300);
			}
		}, 3000);
	}

	// GAME LOGIC con WebRTC - SEMPLIFICATO
	sendGameData(data) {
		if (this.dataChannel && this.dataChannel.readyState === "open") {
			const message = JSON.stringify({
				...data,
				id: this.stats.messagesSent++,
			});

			this.dataChannel.send(message);
		}
		return null;
	}

	handleGameMessage(message) {
		this.stats.messagesReceived++;

		// Log ogni 60 messaggi
		if (this.stats.messagesReceived % 60 === 0) {
			console.log(
				`📡 WebRTC messaggi: ${this.stats.messagesReceived} ricevuti`
			);
		}

		switch (message.type) {
			case "paddle_position":
				this.applyPaddlePosition(message.player, message.position);
				break;
			case "ball_state":
				this.applyBallState(message.position, message.velocity);
				break;
			case "score_update":
				this.applyScoreUpdate(message.p1_score, message.p2_score);
				break;
			case "field_dimensions":
				this.applyFieldDimensions(message.length, message.height);
				break;
			case "game_event":
				this.handleGameEvent(message.event, message.data);
				break;
		}
	}

	applyFieldDimensions(length, height) {
		if (!state.isHost) {
			state.ring.length = length;
			state.ring.height = height;
			import("./webrtc/setup.js").then(
				({ updateGameGeometries, updatePlayerBoundaries }) => {
					updateGameGeometries();
					updatePlayerBoundaries();
					console.log("✅ Field dimensions updated from host:", length, height);
				}
			);
		}
	}

	// APPLICAZIONE DATI GIOCO - SEMPLIFICATO
	applyPaddlePosition(player, position) {
		const paddleIndex = player === 1 ? 0 : 1;
		if (state.players[paddleIndex]) {
			// Applica posizione immediatamente - nessuna compensazione
			state.players[paddleIndex].mesh.position.set(
				position[0],
				position[1],
				position[2]
			);
		}
	}

	applyBallState(position, velocity) {
		if (!state.ball || state.isHost) return; // Only receiver applies received ball state

		// DIAGNOSTICS: Print boundaries for debugging
		if (!this.boundariesLogged) {
			console.log("🏟️ Field boundaries:", state.boundaries);
			console.log("🏟️ Ring dimensions:", {
				length: state.ring.length,
				height: state.ring.height,
			});
			this.boundariesLogged = true;
		}

		// Simple validation: check if position is reasonable
		const fieldX = state.boundaries?.x || 60; // Half field width
		const fieldY = state.boundaries?.y || 33; // Half field height
		const maxX = fieldX * 1.2; // Allow 20% overshoot for valid gameplay
		const maxY = fieldY * 1.2;

		const isValidPosition =
			Math.abs(position[0]) < maxX && Math.abs(position[2]) < maxY;

		if (!isValidPosition) {
			console.warn(
				"🚨 Invalid ball position received, ignoring:",
				`(${position[0].toFixed(1)}, ${position[2].toFixed(1)})`,
				`max: (±${maxX.toFixed(1)}, ±${maxY.toFixed(1)})`
			);
			return;
		}

		// Apply position directly - no compensation or prediction
		state.ball.mesh.position.set(...position);

		// Update velocity
		if (state.ball.velocity) {
			state.ball.velocity.set(...velocity);
		}
	}

	applyScoreUpdate(p1_score, p2_score) {
		console.log(`🏆 Score update received: P1=${p1_score}, P2=${p2_score}`);

		state.p1_score = p1_score;
		state.p2_score = p2_score;

		// Aggiorna UI score usando la funzione corretta
		import("./webrtc/src/Score.js")
			.then(({ updateScore }) => {
				if (updateScore) {
					// Chiama updateScore per entrambi i giocatori per sincronizzare l'UI
					updateScore("p1");
					updateScore("p2");
					console.log(
						`✅ Score UI updated successfully: P1=${p1_score}, P2=${p2_score}`
					);
				} else {
					console.warn(`⚠️ updateScore function not available`);
				}
			})
			.catch((error) => {
				console.error(`❌ Error updating score UI:`, error);
			});
	}

	handleGameEvent(event, data) {
		switch (event) {
			case "ball_reset":
				// Reset palla
				if (state.ball && data.position) {
					state.ball.mesh.position.set(...data.position);
					state.ball.velocity.set(...data.velocity);
				}
				break;

			case "game_over":
				console.log("🏁 Game over signal received from host");
				state.isStarted = false;
				state.isPaused = true;

				// Show game over menu for guest
				import("./webrtc/settings.js")
					.then(({ showGameOverMenu }) => {
						if (showGameOverMenu && data.winner) {
							showGameOverMenu(data.winner);
							console.log("🏁 Game over menu shown for guest:", data.winner);
						}
					})
					.catch((error) => {
						console.error("Error showing game over menu:", error);
					});
				break;

			case "rematch":
				console.log("🔄 Rematch signal received from host");
				this.handleRematch(data);
				break;

			case "rematch_request":
				console.log("🔄 Rematch request received from guest");
				if (state.isHost) {
					// Auto-accept rematch request from guest
					this.handleRematchRequest(data);
				}
				break;

			case "ready":
				console.log("🚀 Ready signal received from other player");
				this.handlePlayerReady(data);
				break;

			case "pause":
				console.log("⏸️ Pause signal received from other player");
				this.handlePauseReceived(data);
				break;

			case "resume":
				console.log("▶️ Resume signal received from other player");
				this.handleResumeReceived(data);
				break;

			case "player_left":
				console.log("👋 Player left signal received");
				this.handlePlayerLeft(data);
				break;
		}
	}

	handleRematch(data) {
		console.log("🔄 Processing rematch signal from host");

		// Hide game over menu
		const gameOverMenu = document.getElementById("gameOverMenu");
		if (gameOverMenu) {
			gameOverMenu.style.display = "none";
		}

		// Reset scores and positions
		state.p1_score = 0;
		state.p2_score = 0;

		// Update score UI
		import("./webrtc/src/Score.js")
			.then(({ updateScore }) => {
				updateScore("p1");
				updateScore("p2");
			})
			.catch((error) => {
				console.error("Error updating score UI:", error);
			});

		// Reset player positions
		if (state.players[0] && state.players[0].mesh) {
			state.players[0].mesh.position.set(-((state.ring.length * 2) / 5), 0, 0);
		}
		if (state.players[1] && state.players[1].mesh) {
			state.players[1].mesh.position.set((state.ring.length * 2) / 5, 0, 0);
		}

		// Reset ball position
		if (state.ball && state.ball.mesh) {
			state.ball.mesh.position.set(0, 0, 0);
			if (state.ball.resetSpeed) {
				state.ball.resetSpeed();
			}
		}

		// DON'T restart game immediately - show Ready menu instead
		state.isStarted = false;
		state.isPaused = true;

		// Reset ready states - use the correct property names
		this.localPlayerReady = false;
		this.otherPlayerReady = false;

		// Show Ready menu for guest
		this.showReadyMenu();

		console.log("✅ Game reset successfully on guest side, showing Ready menu");
	}

	handleRematchRequest(data) {
		console.log("🔄 Processing rematch request from guest");

		// Let the restartGame function handle the rematch logic
		import("./webrtc/settings.js")
			.then(({ restartGame }) => {
				restartGame();
			})
			.catch((error) => {
				console.error("Error handling rematch request:", error);
			});
	}

	handlePlayerReady(data) {
		console.log("🚀 Other player is ready:", data);

		// Mark other player as ready
		this.otherPlayerReady = true;

		// Update UI to show other player is ready
		const readyStatus = document.getElementById("readyStatus");
		if (readyStatus) {
			readyStatus.innerHTML =
				'<small><i class="fas fa-check text-success me-2"></i>Other player is ready!</small>';
		}

		// If both players are ready, start the game
		if (this.localPlayerReady && this.otherPlayerReady) {
			console.log("🎮 Both players ready, starting game!");
			setTimeout(() => {
				this.startGameFromReady();
			}, 1000);
		}
	}

	startGameFromReady() {
		// Hide ready menu
		const readyMenu = document.getElementById("readyMenu");
		if (readyMenu) {
			readyMenu.style.display = "none";
		}

		// Start the actual game
		this.startGame();
	}

	disconnect() {
		console.log("🔌 Disconnecting WebRTC connection");

		// Close data channel
		if (this.dataChannel) {
			this.dataChannel.close();
			this.dataChannel = null;
		}

		// Close peer connection
		if (this.peerConnection) {
			this.peerConnection.close();
			this.peerConnection = null;
		}

		// Close signaling socket
		if (this.signalingSocket) {
			this.signalingSocket.close();
			this.signalingSocket = null;
		}

		// Clear timeouts
		this.clearConnectionTimeout();

		// Reset state
		this.localPlayerReady = false;
		this.otherPlayerReady = false;

		console.log("✅ WebRTC connection disconnected");
	}

	// INVIO DATI GIOCO
	sendPaddlePosition(player, position, velocity = 0) {
		return this.sendGameData({
			type: "paddle_position",
			player: player,
			position: position,
			velocity: velocity,
		});
	}

	sendBallState(position, velocity) {
		return this.sendGameData({
			type: "ball_state",
			position: position,
			velocity: velocity,
		});
	}

	sendScoreUpdate(p1_score, p2_score) {
		return this.sendGameData({
			type: "score_update",
			p1_score: p1_score,
			p2_score: p2_score,
		});
	}

	sendGameEvent(event, data = {}) {
		return this.sendGameData({
			type: "game_event",
			event: event,
			data: data,
		});
	}

	// CALLBACK quando WebRTC è pronto
	onWebRTCReady() {
		console.log("🎮 WebRTC pronto! Abilitando pulsante Ready...");

		// Imposta flag WebRTC
		state.isWebRTC = true;
		state.webrtcConnection = this;

		// IMPORTANT: Keep game paused until both players are ready
		state.isStarted = false;
		state.isPaused = true;

		// Chiudi signaling WebSocket (non più necessario)
		if (this.signalingSocket) {
			this.signalingSocket.close();
			this.signalingSocket = null;
		}

		// Enable ready button now that connection is established
		if (window.enableReadyButton) {
			window.enableReadyButton();
		}
	}

	showReadyMenu() {
		// Use the ready menu function from pong.js
		if (window.showReadyMenu) {
			window.showReadyMenu();

			// If WebRTC connection is already established (e.g., during rematch),
			// enable the ready button immediately
			if (this.dataChannel && this.dataChannel.readyState === "open") {
				console.log(
					"🔗 WebRTC already connected, enabling ready button immediately"
				);
				setTimeout(() => {
					if (window.enableReadyButton) {
						window.enableReadyButton();
					}
				}, 100);
			}
		} else {
			console.warn(
				"showReadyMenu function not available yet - will be called later"
			);
			// DO NOT start game automatically! Wait for Ready menu.
		}
	}

	startGame() {
		// Nascondi tutti i menu
		const menu = document.getElementById("menu");
		const readyMenu = document.getElementById("readyMenu");
		if (menu) {
			menu.style.display = "none";
		}
		if (readyMenu) {
			readyMenu.style.display = "none";
		}

		state.isStarted = true;
		state.isPaused = false;
		state.isMultiplayer = true;

		// Disabilita AI
		state.IAisActive = false;

		// Reset ball speed and ensure it's ready to move
		if (state.ball && state.ball.resetSpeed) {
			state.ball.resetSpeed();
		}

		// Aggiorna UI status
		this.updateConnectionStatus("connected");

		// Force update role indicator
		setTimeout(() => {
			if (window.updateRoleIndicator && state.isHost !== undefined) {
				window.updateRoleIndicator(state.isHost);
				console.log(
					"🔄 Role indicator updated on connection:",
					state.isHost ? "Host" : "Guest"
				);
			}
		}, 100);

		// Avvia game loop se non già avviato
		if (!state.animationFrameId) {
			import("./webrtc/gameLogic.js")
				.then(({ animate }) => {
					animate();
				})
				.catch((error) => {
					console.error("❌ Errore avviando animation:", error);
				});
		}
	}

	updateConnectionStatus(status) {
		import("./webrtc/pong.js")
			.then(({ updateMultiplayerStatus }) => {
				const statusMap = {
					connecting: `🔄 Connecting via WebRTC... ${
						this.reconnectAttempts > 0
							? `(Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
							: ""
					}`,
					connected: `✅ WebRTC Connected`,
					disconnected: "⚠️ WebRTC Disconnected",
					failed: "❌ WebRTC Connection Failed",
				};
				const message = statusMap[status] || status;
				updateMultiplayerStatus(status, message);

				// Log dettagliato per debug
				console.log(`📊 Connection Status: ${status} - ${message}`);

				// Keep both connection status and role indicator visible when connected
			})
			.catch((error) => {
				console.warn("Could not update multiplayer status:", error);
			});
	}

	// Health monitoring
	startHealthMonitoring() {
		this.healthCheckInterval = setInterval(() => {
			if (!this.isConnectionHealthy() && state.isWebRTC) {
				console.warn("⚠️ Connection health check failed");
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

		console.log("🗑️ WebRTC cleanup completato");
	}

	// Pause system handlers
	handlePauseReceived(data) {
		console.log("⏸️ Pause received from other player:", data);

		// Set game as paused
		state.isPaused = true;

		// Set who triggered the pause (the other player)
		state.whoTriggeredPause = state.isHost ? "player2" : "player1";

		// Show pause menu (resume button will be hidden)
		if (window.showPauseMenu) {
			window.showPauseMenu();
		}
	}

	handleResumeReceived(data) {
		console.log("▶️ Resume received from other player:", data);

		// Resume the game
		state.isPaused = false;
		state.whoTriggeredPause = null;

		// Hide pause menu
		const pauseMenu = document.getElementById("pauseMenu");
		if (pauseMenu) {
			pauseMenu.style.display = "none";
		}
	}

	handlePlayerLeft(data) {
		console.log("👋 Player left received:", data);

		// Stop the game
		state.isStarted = false;
		state.isPaused = true;

		// Show notification instead of alert
		import("../alert/alert.js")
			.then(({ showAlertForXSeconds }) => {
				showAlertForXSeconds(
					"The other player has left the game.",
					"alert-warning",
					5,
					{ asToast: true }
				);
			})
			.catch((error) => {
				console.error("Error loading alert module:", error);
			});

		// Clean up and go to home
		this.destroy();

		// Navigate to home
		import("./webrtc/settings.js")
			.then(({ cleanupPong }) => {
				cleanupPong();
				window.navigateTo("#home");
			})
			.catch((error) => {
				console.error("Error during cleanup:", error);
				window.navigateTo("#home");
			});
	}
}

// INTEGRAZIONE NEL GAME LOOP
export function webrtcGameLoop() {
	if (!state.isWebRTC || !state.webrtcConnection) return;

	const connection = state.webrtcConnection;

	// Invia posizione paddle quando cambia (ULTRA FREQUENTE)
	if (state.isHost && state.players[0] && state.p1_move_y !== 0) {
		const pos = state.players[0].mesh.position;
		connection.sendPaddlePosition(1, [pos.x, pos.y, pos.z], state.p1_move_y);
	}

	if (!state.isHost && state.players[1] && state.p2_move_y !== 0) {
		const pos = state.players[1].mesh.position;
		connection.sendPaddlePosition(2, [pos.x, pos.y, pos.z], state.p2_move_y);
	}

	// Host invia stato palla (ULTRA FREQUENTE per sincronizzazione perfetta)
	if (state.isHost && state.ball) {
		const pos = state.ball.mesh.position;
		const vel = state.ball.velocity;

		// DIAGNOSTICS: Print boundaries for debugging (Host)
		if (!connection.hostBoundariesLogged) {
			console.log("🏟️ HOST Field boundaries:", state.boundaries);
			console.log("🏟️ HOST Ring dimensions:", {
				length: state.ring.length,
				height: state.ring.height,
			});
			connection.hostBoundariesLogged = true;
		}

		// FIXED: Validate ball position before sending (strict boundaries)
		const fieldX = state.boundaries?.x || 60; // Half field width
		const fieldY = state.boundaries?.y || 33; // Half field height
		const maxX = fieldX * 1.2; // Allow 20% overshoot for valid gameplay
		const maxY = fieldY * 1.2;

		const isValidPosition = Math.abs(pos.x) < maxX && Math.abs(pos.z) < maxY;

		if (isValidPosition) {
			// Invia sempre lo stato della pallina per sincronizzazione perfetta
			connection.sendBallState([pos.x, pos.y, pos.z], [vel.x, vel.y, vel.z]);
		} else {
			console.warn(
				"🚨 HOST: Invalid ball position, not sending:",
				`(${pos.x.toFixed(1)}, ${pos.z.toFixed(1)})`,
				`max: (±${maxX.toFixed(1)}, ±${maxY.toFixed(1)})`
			);
			console.warn(
				"🚨 HOST: Ball velocity:",
				`(${vel.x.toFixed(1)}, ${vel.z.toFixed(1)})`
			);
		}
	}
}

// FUNZIONE PRINCIPALE DI INIZIALIZZAZIONE
export async function initializeWebRTCGame(room_id, isInitiator) {
	console.log(
		`🚀 Inizializzando WebRTC Game - Room: ${room_id}, Initiator: ${isInitiator}`
	);

	// Show ready menu immediately when starting WebRTC multiplayer
	if (window.showReadyMenu) {
		window.showReadyMenu();
	}

	const connection = new PongWebRTC(isInitiator);

	// Salva room ID per riconnessioni
	state.webrtcRoomId = room_id;

	// Inizializza signaling
	connection.initializeSignaling(room_id);

	// Se è l'initiator, crea l'offer dopo aver stabilito il signaling
	if (isInitiator) {
		const waitForSignaling = (attempts = 0) => {
			if (attempts > 10) {
				console.error("❌ Failed to establish signaling after 10 attempts");
				return;
			}

			if (
				connection.signalingSocket &&
				connection.signalingSocket.readyState === WebSocket.OPEN
			) {
				console.log(
					"📞 Signaling ready, waiting for ICE gathering before starting connection..."
				);

				// Wait a bit more for ICE gathering to begin
				setTimeout(() => {
					console.log("🚀 Starting WebRTC offer creation...");
					connection.startConnection();
				}, 2000); // Increased delay for better ICE candidate gathering
			} else {
				console.log(
					`⏳ Waiting for signaling socket to open... (attempt ${attempts + 1})`
				);
				if (connection.signalingSocket) {
					connection.signalingSocket.addEventListener(
						"open",
						() => {
							console.log(
								"📞 Signaling opened, waiting before starting connection..."
							);
							setTimeout(() => {
								console.log("🚀 Starting WebRTC offer creation...");
								connection.startConnection();
							}, 2000); // Give time for both peers to be ready
						},
						{ once: true }
					);
				} else {
					// Retry after delay if signaling socket not initialized yet
					setTimeout(() => waitForSignaling(attempts + 1), 1000);
				}
			}
		};

		// Start the process after a longer initial delay
		setTimeout(() => waitForSignaling(), 1500);
	}

	return connection;
}

export { PongWebRTC };

// DEBUG FUNCTIONS - Can be called from browser console
export function getWebRTCDebugInfo() {
	if (!state.webrtcConnection) {
		return { error: "No WebRTC connection active" };
	}

	const connection = state.webrtcConnection;
	return {
		isInitiator: connection.isInitiator,
		connectionState: connection.peerConnection?.connectionState,
		iceConnectionState: connection.peerConnection?.iceConnectionState,
		iceGatheringState: connection.peerConnection?.iceGatheringState,
		dataChannelState: connection.dataChannel?.readyState,
		iceCandidatesGathered: connection.iceCandidatesGathered,
		iceTypes: Array.from(connection.iceTypes),
		reconnectAttempts: connection.reconnectAttempts,
		localPlayerReady: connection.localPlayerReady,
		otherPlayerReady: connection.otherPlayerReady,
		gameState: {
			isWebRTC: state.isWebRTC,
			isHost: state.isHost,
			isMultiplayer: state.isMultiplayer,
			webrtcRoomId: state.webrtcRoomId,
		},
	};
}

// Make debug function available globally
window.getWebRTCDebugInfo = getWebRTCDebugInfo;
