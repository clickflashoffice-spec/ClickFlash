import { logger } from '../utils/logger';
import { TIMEOUTS } from '../constants/timing.ts';

/**
 * WebSocketService Class for Touch Kiosk
 * 
 * Native WebSocket client that connects to the Master Portal's WebSocket server.
 * Enables real-time communication for album updates, order notifications, and presence.
 * 
 * Features:
 * - Native WebSocket connection to Master Portal
 * - Automatic reconnection with exponential backoff
 * - Connection status tracking
 * - Heartbeat/PING-PONG mechanism
 * - Real-time notifications (new albums, orders, etc.)
 * 
 * Architecture:
 * - Connects to Master's WebSocket server (ws://{masterIp}:3001)
 * - Registers as kiosk client with kioskId
 * - Receives broadcasts from Master
 * - Automatic reconnection on disconnect
 * 
 * @class WebSocketService
 */

type ClientInfo = { type: 'master' } | { type: 'kiosk', kioskId: string, ordersFolderPath?: string };

class WebSocketService {
    private ws: WebSocket | null = null;
    private onMessageCallback: ((data: unknown) => void) | null = null;
    private onStatusChangeCallback: ((status: 'Connected' | 'Disconnected') => void) | null = null;
    private onKioskStatusUpdateCallback: ((status: { id: string; name: string; status: 'Connected' | 'Disconnected' }) => void) | null = null;
    private onRefreshCallback: (() => void) | null = null;

    public status: 'Connected' | 'Disconnected' = 'Disconnected';
    private clientInfo: ClientInfo | null = null;
    private wsUrl: string = '';

    private reconnectAttempts = 0;
    private readonly MAX_RECONNECT_ATTEMPTS = 100; // Keep trying for a long time
    private pendingMessages: unknown[] = [];
    private readonly MAX_QUEUE_SIZE = 50;
    private reconnectTimeout: number | null = null;
    private isIntentionallyDisconnected = false;

    private heartbeatInterval: number | null = null;
    private lastConnectionTime: Date | null = null;

    constructor() { }

    /**
     * Connect to the Master Portal's WebSocket server
     * 
     * @param {ClientInfo} clientInfo - Client information (type: 'kiosk' with kioskId)
     * @param {(data: unknown) => void} onMessage - Callback for incoming messages
     * @param {(status: 'Connected' | 'Disconnected') => void} onStatusChange - Callback for connection status changes
     * @param {(status: { id: string; name: string; status: 'Connected' | 'Disconnected' }) => void} [onKioskStatusUpdate] - Optional callback for kiosk status updates
     * @param {() => void} [onRefresh] - Optional callback for refresh events
     * @param {string} wsUrl - WebSocket URL (e.g., 'ws://192.168.1.100:3001')
     */
    public connect(
        clientInfo: ClientInfo,
        onMessage: (data: unknown) => void,
        onStatusChange: (status: 'Connected' | 'Disconnected') => void,
        onKioskStatusUpdate?: (status: { id: string; name: string; status: 'Connected' | 'Disconnected' }) => void,
        onRefresh?: () => void,
        wsUrl?: string
    ): void {
        this.clientInfo = clientInfo;
        this.onMessageCallback = onMessage;
        this.onStatusChangeCallback = onStatusChange;
        this.onKioskStatusUpdateCallback = onKioskStatusUpdate || null;
        this.onRefreshCallback = onRefresh || null;
        this.isIntentionallyDisconnected = false;
        this.reconnectAttempts = 0;

        // WebSocket URL is required for Touch Kiosk
        if (!wsUrl) {
            logger.error('[WebSocketService] WebSocket URL is required for Touch Kiosk');
            this.setStatus('Disconnected');
            return;
        }

        this.wsUrl = wsUrl;
        this.initiateConnection();
    }

    private initiateConnection() {
        if (this.ws) {
            this.ws.close();
        }

        if (!this.wsUrl) {
            logger.error('[WebSocketService] Cannot connect: WebSocket URL not set');
            return;
        }

        logger.info(`[WebSocketService] Connecting to ${this.wsUrl}`, { clientInfo: this.clientInfo });

        try {
            this.ws = new WebSocket(this.wsUrl);

            this.ws.onopen = () => {
                logger.info('[WebSocketService] WebSocket Connected');
                this.setStatus('Connected');
                this.reconnectAttempts = 0;
                this.lastConnectionTime = new Date();
                this.startHeartbeat();

                // Register client with Master
                if (this.clientInfo) {
                    this.sendMessage({
                        type: 'REGISTER_CLIENT',
                        payload: this.clientInfo
                    });
                }

                // Drain pending messages (this.ws is guaranteed open here)
                const activeWs = this.ws;
                if (activeWs) {
                    const pending = this.pendingMessages.splice(0);
                    for (const msg of pending) {
                        activeWs.send(JSON.stringify(msg));
                    }
                    if (pending.length > 0) {
                        logger.info(`[WebSocketService] Drained ${pending.length} queued message(s)`);
                    }
                }
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleMessage(data);
                } catch (e) {
                    logger.error('[WebSocketService] Failed to parse message', e);
                }
            };

            this.ws.onclose = (event) => {
                this.stopHeartbeat();
                if (this.status === 'Connected') {
                    logger.warn(`[WebSocketService] WebSocket Disconnected. Code: ${event.code}, Reason: ${event.reason}`);
                    this.setStatus('Disconnected');
                }

                if (!this.isIntentionallyDisconnected) {
                    this.scheduleReconnect();
                }
            };

            this.ws.onerror = (error) => {
                logger.error('[WebSocketService] WebSocket Error', error);
                // onError usually precedes onClose, so we handle reconnection in onClose
            };

        } catch (e) {
            logger.error('[WebSocketService] Connection failed', e);
            this.scheduleReconnect();
        }
    }

    private scheduleReconnect() {
        if (this.reconnectTimeout) return;
        if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
            logger.warn('[WebSocketService] Max reconnection attempts reached');
            return;
        }

        const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 30000); // Max 30s
        logger.info(`[WebSocketService] Scheduling reconnect in ${delay}ms (Attempt ${this.reconnectAttempts + 1})`);

        this.reconnectTimeout = window.setTimeout(() => {
            this.reconnectTimeout = null;
            this.reconnectAttempts++;
            this.initiateConnection();
        }, delay);
    }

    private setStatus(newStatus: 'Connected' | 'Disconnected') {
        if (this.status !== newStatus) {
            this.status = newStatus;
            if (this.onStatusChangeCallback) {
                this.onStatusChangeCallback(newStatus);
            }
        }
    }

    private startHeartbeat() {
        this.stopHeartbeat();
        this.heartbeatInterval = window.setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({ type: 'PING' }));
            }
        }, 30000); // 30s ping
    }

    private stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    private handleMessage(data: any) {
        if (!data || !data.type) return;

        if (data.type === 'PONG') {
            // Heartbeat response - connection is alive
            return;
        }

        if (data.type === 'KIOSK_STATUS_UPDATE') {
            if (this.onKioskStatusUpdateCallback) {
                this.onKioskStatusUpdateCallback(data.payload);
            }
        } else if (['NEW_ALBUM_FOR_KIOSK', 'ALBUM_UPDATED', 'PHOTO_UPDATED', 'ORDER_UPDATED', 'USER_UPDATED', 'NEW_ORDER_NOTIFICATION'].includes(data.type)) {
            if (this.onRefreshCallback) {
                this.onRefreshCallback();
            }
            if (this.onMessageCallback) {
                this.onMessageCallback(data);
            }
        } else {
            if (this.onMessageCallback) {
                this.onMessageCallback(data);
            }
        }
    }

    public disconnect(intentional = true) {
        this.isIntentionallyDisconnected = intentional;
        if (intentional) {
            this.pendingMessages = [];
        }
        this.stopHeartbeat();
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.setStatus('Disconnected');
    }

    public sendMessage(message: unknown) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            if (this.pendingMessages.length < this.MAX_QUEUE_SIZE) {
                this.pendingMessages.push(message);
            } else {
                logger.warn('[WebSocketService] Message queue full, dropping message');
            }
        }
    }


    public getConnectionStats() {

        return {
            status: this.status,
            lastConnectionTime: this.lastConnectionTime,
            reconnectAttempts: this.reconnectAttempts,
            retryCount: this.reconnectAttempts,
            wsUrl: this.wsUrl,
            queuedMessages: this.pendingMessages.length
        };
    }
}

export const webSocketService = new WebSocketService();
