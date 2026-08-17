import { WebSocketServer, WebSocket } from 'ws';
import { logger } from '../utils/logger';
import * as http from 'http';
import * as crypto from 'crypto';

interface WebRtcMessage {
    type: 'offer' | 'answer' | 'candidate' | 'auth';
    sdp?: any;
    candidate?: any;
    token?: string;
}

export class WebRtcSignalingService {
    private wss: WebSocketServer | null = null;
    private clients: Map<string, WebSocket> = new Map();
    // Simulated token store for Magic Links
    private validTokens: Set<string> = new Set();

    public init(server: http.Server) {
        // Run WebSocket on a different path to not conflict with the Hotspot/Touch WS
        this.wss = new WebSocketServer({ server, path: '/webrtc-signaling' });

        // Ping interval to clear dead connections
        const interval = setInterval(() => {
            this.wss?.clients.forEach((ws: any) => {
                if (ws.isAlive === false) {
                    logger.warn(`[WebRTC] Terminating dead client connection.`);
                    return ws.terminate();
                }
                ws.isAlive = false;
                ws.ping();
            });
        }, 30000);

        this.wss.on('close', () => {
            clearInterval(interval);
        });

        this.wss.on('connection', (ws: any) => {
            const clientId = crypto.randomUUID();
            logger.info(`[WebRTC] Client connected: ${clientId}`);
            let isAuthenticated = false;
            
            ws.isAlive = true;
            ws.on('pong', () => {
                ws.isAlive = true;
            });

            ws.on('message', (message: string) => {
                try {
                    const data = JSON.parse(message) as WebRtcMessage;

                    if (data.type === 'auth') {
                        if (data.token && this.validTokens.has(data.token)) {
                            isAuthenticated = true;
                            this.clients.set(clientId, ws);
                            logger.info(`[WebRTC] Client ${clientId} authenticated successfully.`);
                            ws.send(JSON.stringify({ type: 'auth_success' }));
                        } else {
                            logger.warn(`[WebRTC] Client ${clientId} failed authentication.`);
                            ws.send(JSON.stringify({ type: 'auth_error', message: 'Invalid or expired token' }));
                            ws.close();
                        }
                        return;
                    }

                    if (!isAuthenticated) {
                        logger.warn(`[WebRTC] Unauthenticated client ${clientId} attempted to send signaling data.`);
                        return;
                    }

                    // For this architecture, the Master Node acts as the peer.
                    // We simulate a successful handshake by telling the client we are "connecting".
                    logger.info(`[WebRTC] Received ${data.type} from ${clientId}`);
                    
                    if (data.type === 'offer') {
                        ws.send(JSON.stringify({ type: 'server_ack', message: 'SDP offer received, establishing DataChannel' }));
                    }

                } catch (err) {
                    logger.error(`[WebRTC] Error parsing message from ${clientId}:`, err);
                }
            });

            ws.on('close', () => {
                logger.info(`[WebRTC] Client disconnected: ${clientId}`);
                this.clients.delete(clientId);
            });
        });

        logger.info('[WebRTC] Signaling service initialized on /webrtc-signaling');
    }

    public generateSessionToken(): string {
        const token = crypto.randomUUID();
        this.validTokens.add(token);
        
        // Auto-expire token after 10 minutes (Cart Recovery Window)
        setTimeout(() => {
            this.validTokens.delete(token);
            logger.info(`[WebRTC] Token ${token} expired.`);
        }, 10 * 60 * 1000);

        return token;
    }
}

export const webRtcSignalingService = new WebRtcSignalingService();
