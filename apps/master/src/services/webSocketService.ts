import { logger } from '../utils/logger';

type ClientInfo = { type: 'master' } | { type: 'kiosk', kioskId: string };

/** WebSocket message types */
/** WebSocket message types */
export interface WSPayload {
    type: string;
    payload?: unknown;
}

/** Listener callback type */
type MessageListener = (data: unknown) => void;

class WebSocketService {
    private ws: WebSocket | null = null;
    private onMessageCallback: ((data: unknown) => void) | null = null;
    private onStatusChangeCallback: ((status: 'Connected' | 'Disconnected') => void) | null = null;
    private onKioskStatusUpdateCallback: ((status: { id: string; name: string; status: 'Connected' | 'Disconnected' }) => void) | null = null;
    private onRefreshCallback: (() => void) | null = null;

    public status: 'Connected' | 'Disconnected' = 'Disconnected';
    private clientInfo: ClientInfo | null = null;
    private worker: Worker | null = null;

    private reconnectAttempts = 0;
    // private readonly MAX_RECONNECT_ATTEMPTS = 100; // Keep trying for a long time
    private readonly SUPPRESS_ERRORS_AFTER_ATTEMPTS = 5; // Suppress error logs after 5 attempts
    private reconnectTimeout: number | null = null;
    private isIntentionallyDisconnected = false;
    private pendingMessages: unknown[] = [];
    private readonly MAX_QUEUE_SIZE = 50;

    private coalescedQueue: Map<string, unknown[]> = new Map();
    private coalesceTimeout: number | null = null;
    private readonly COALESCE_DELAY_MS = 500;

    private heartbeatInterval: number | null = null;
    private lastConnectionTime: Date | null = null;
    private wsUrl: string = 'ws://localhost:8090/ws';

    constructor() {
        this.setupNetworkListeners();
        this.initWorker();
    }

    private initWorker() {
        if (typeof Worker !== 'undefined') {
            this.worker = new Worker(new URL('../workers/socketWorker.ts', import.meta.url), {
                type: 'module'
            });

            this.worker.onmessage = (event) => {
                const { type, payload, error } = event.data;
                if (type === 'MESSAGE_PARSED') {
                    this.handleMessage(payload);
                } else if (type === 'ERROR') {
                    logger.error('[WebSocketService] Worker error:', error);
                }
            };
        }
    }

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

        // Use provided URL or default to localhost
        // For Master Portal, default to localhost:3001
        // For Touch Kiosks, URL should be provided based on Master IP
        if (wsUrl) {
            this.wsUrl = wsUrl;
        }

        this.initiateConnection();
    }

    private initiateConnection() {
        if (this.ws) {
            this.ws.close();
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

                // Register client
                if (this.clientInfo) {
                    this.sendMessage({
                        type: 'REGISTER_CLIENT',
                        payload: this.clientInfo
                    });
                }

                // Drain pending messages
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
                if (this.worker) {
                    this.worker.postMessage({
                        type: 'PARSE_MESSAGE',
                        data: event.data
                    });
                } else {
                    try {
                        const data = JSON.parse(event.data);
                        this.handleMessage(data);
                    } catch (e) {
                        logger.error('[WebSocketService] Failed to parse message', e);
                    }
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
                // Only log errors in dev mode or for first few attempts (WebSocket is optional)
                if (import.meta.env.DEV || this.reconnectAttempts < this.SUPPRESS_ERRORS_AFTER_ATTEMPTS) {
                    logger.error('[WebSocketService] WebSocket Error', error);
                }
                // onError usually precedes onClose, so we handle reconnection in onClose
            };

        } catch (e) {
            logger.error('[WebSocketService] Connection failed', e);
            this.scheduleReconnect();
        }
    }

    private scheduleReconnect() {
        if (this.reconnectTimeout) return;

        const baseDelay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 30000); // Max 30s
        const jitter = Math.floor(Math.random() * 800); // Prevent thundering herd across kiosks
        const delay = baseDelay + jitter;

        // Only log reconnection attempts in dev mode or for first few attempts
        if (import.meta.env.DEV || this.reconnectAttempts < this.SUPPRESS_ERRORS_AFTER_ATTEMPTS) {
            logger.info(`[WebSocketService] Scheduling jittered reconnect in ${delay}ms (Attempt ${this.reconnectAttempts + 1})`);
        } else if (this.reconnectAttempts === this.SUPPRESS_ERRORS_AFTER_ATTEMPTS) {
            // Log once when we start suppressing
            logger.info('[WebSocketService] WebSocket server not available (optional feature). Continuing without real-time updates.');
        }

        this.reconnectTimeout = window.setTimeout(() => {
            this.reconnectTimeout = null;
            this.reconnectAttempts++;
            this.initiateConnection();
        }, delay);
    }

    /**
     * Force immediate reconnection (useful on network recovery or URL change)
     */
    public forceReconnect(wsUrl?: string): void {
        if (wsUrl) {
            this.wsUrl = wsUrl;
        }
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
        this.reconnectAttempts = 0;
        logger.info('[WebSocketService] Forcing immediate WebSocket reconnection', { url: this.wsUrl });
        this.initiateConnection();
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
                // If we haven't received a pong in 60s, assume dead
                if (this.lastConnectionTime && (new Date().getTime() - this.lastConnectionTime.getTime()) > 60000) {
                    logger.warn('[WebSocketService] Heartbeat timeout (no PONG), reconnecting...');
                    this.ws.close(); // This will trigger onclose -> scheduleReconnect
                    return;
                }
                this.ws.send(JSON.stringify({ type: 'PING' }));
            }
        }, 15000); // 15s ping (more aggressive)
    }

    private stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    private setupNetworkListeners() {
        window.addEventListener('online', () => {
            logger.info('[WebSocketService] Network is ONLINE. Attempting immediate reconnect.');
            this.reconnectAttempts = 0; // Reset backoff
            if (this.reconnectTimeout) {
                clearTimeout(this.reconnectTimeout);
                this.reconnectTimeout = null;
            }
            if (this.status !== 'Connected') {
                this.initiateConnection();
            }
        });

        window.addEventListener('offline', () => {
            logger.info('[WebSocketService] Network is OFFLINE.');
            this.setStatus('Disconnected');
        });
    }

    private listeners: Map<string, Set<MessageListener>> = new Map();

    public subscribe(eventType: string, callback: MessageListener) {
        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, new Set());
        }
        this.listeners.get(eventType)?.add(callback);
    }

    public unsubscribe(eventType: string, callback: MessageListener) {
        if (this.listeners.has(eventType)) {
            this.listeners.get(eventType)?.delete(callback);
        }
    }

    private handleMessage(data: WSPayload) {
        if (!data || !data.type) return;

        // Dispatch to generic listeners
        if (this.listeners.has(data.type)) {
            this.listeners.get(data.type)?.forEach(callback => {
                try {
                    callback(data.payload);
                } catch (e) {
                    logger.error(`[WebSocketService] Listener error for ${data.type}`, e);
                }
            });
        }

        if (data.type === 'PONG') {
            // Alive
            this.lastConnectionTime = new Date();
            return;
        }

        if (data.type === 'KIOSK_STATUS_UPDATE') {
            if (this.onKioskStatusUpdateCallback) {
                this.onKioskStatusUpdateCallback(data.payload as { id: string; name: string; status: 'Connected' | 'Disconnected' });
            }
        } else if (['ALBUM_UPDATED', 'PHOTO_UPDATED', 'ORDER_UPDATED', 'USER_UPDATED', 'NEW_ORDER_NOTIFICATION'].includes(data.type)) {
            // Coalesce rapid updates to prevent React render storms on 4-core hardware
            this.coalesceUpdates(data.type, data.payload);
        } else {
            if (this.onMessageCallback) {
                this.onMessageCallback(data);
            }
        }
    }

    /**
     * Coalesce rapid updates from kiosks into batched notifications every 500ms
     */
    public coalesceUpdates(eventType: string, payload: unknown) {
        if (!this.coalescedQueue.has(eventType)) {
            this.coalescedQueue.set(eventType, []);
        }
        if (payload !== undefined) {
            this.coalescedQueue.get(eventType)?.push(payload);
        }

        if (!this.coalesceTimeout) {
            this.coalesceTimeout = window.setTimeout(() => {
                this.flushCoalescedUpdates();
            }, this.COALESCE_DELAY_MS);
        }
    }

    private flushCoalescedUpdates() {
        this.coalesceTimeout = null;
        if (this.coalescedQueue.size === 0) return;

        const batchedEvents: Record<string, unknown[]> = {};
        this.coalescedQueue.forEach((items, eventType) => {
            batchedEvents[eventType] = items;
        });
        this.coalescedQueue.clear();

        logger.debug('[WebSocketService] Flushing coalesced updates:', Object.keys(batchedEvents));

        if (this.onRefreshCallback) {
            this.onRefreshCallback();
        }

        if (this.onMessageCallback) {
            this.onMessageCallback({
                type: 'BATCH_UPDATED',
                payload: batchedEvents
            });
        }
    }

    /**
     * Strip heavy Base64 image payloads or massive arrays before transmitting over WebSocket
     */
    public stripHeavyPayloads(payload: unknown): unknown {
        if (!payload || typeof payload !== 'object') return payload;
        if (Array.isArray(payload)) {
            return payload.map(item => this.stripHeavyPayloads(item));
        }
        const clean: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(payload as Record<string, unknown>)) {
            if (typeof val === 'string' && val.startsWith('data:image/') && val.length > 5000) {
                clean[key] = '[STRIPPED_BASE64_IMAGE]';
            } else if (typeof val === 'object' && val !== null) {
                clean[key] = this.stripHeavyPayloads(val);
            } else {
                clean[key] = val;
            }
        }
        return clean;
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
        if (this.coalesceTimeout) {
            clearTimeout(this.coalesceTimeout);
            this.coalesceTimeout = null;
        }
        this.coalescedQueue.clear();
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.setStatus('Disconnected');
        this.listeners.clear();
    }

    public sendMessage(message: unknown) {
        const cleanMessage = this.stripHeavyPayloads(message);
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(cleanMessage));
        } else {
            if (this.pendingMessages.length < this.MAX_QUEUE_SIZE) {
                this.pendingMessages.push(cleanMessage);
            } else {
                logger.warn('[WebSocketService] Message queue full, dropping message');
            }
        }
    }

    // --- Service Worker Bridge for Offline Data ---

    private sendServiceWorkerMessage<T = unknown>(type: string, payload?: unknown): Promise<T> {
        return new Promise((resolve, reject) => {
            if (!navigator.serviceWorker || !navigator.serviceWorker.controller) {
                // If no SW controller, check if we are in dev mode (Vite typically doesn't use SW in dev)
                if (import.meta.env.DEV) {
                    logger.warn('[WebSocketService] Service Worker not available (Dev Mode), returning empty/success stub');
                    return resolve((type.startsWith('GET') ? [] : true) as T);
                }
                return reject(new Error('Service worker controller not available'));
            }

            const messageChannel = new MessageChannel();
            messageChannel.port1.onmessage = (event) => {
                if (event.data.error) {
                    reject(new Error(event.data.error));
                } else {
                    resolve(event.data.payload || event.data);
                }
            };

            navigator.serviceWorker.controller.postMessage(
                { type, payload },
                [messageChannel.port2]
            );
        });
    }

    public async getInitialAlbums(): Promise<import('../types').Album[]> {
        return this.sendServiceWorkerMessage('GET_KIOSK_ALBUMS');
    }

    public async getLastAlbumUpdateTime(): Promise<string | null> {
        return this.sendServiceWorkerMessage('GET_LAST_ALBUM_UPDATE');
    }

    public async saveOfflineOrder(order: import('../types').Order): Promise<void> {
        return this.sendServiceWorkerMessage('SAVE_OFFLINE_ORDER', order);
    }

    public async getOfflineOrders(): Promise<import('../types').Order[]> {
        const orders = await this.sendServiceWorkerMessage('GET_OFFLINE_ORDERS');
        return Array.isArray(orders) ? orders : [];
    }

    public async clearOfflineOrders(): Promise<void> {
        return this.sendServiceWorkerMessage('CLEAR_OFFLINE_ORDERS');
    }

    public async removeOfflineOrders(ids: string[]): Promise<void> {
        return this.sendServiceWorkerMessage('REMOVE_OFFLINE_ORDERS', ids);
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
