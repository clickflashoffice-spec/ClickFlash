import { Server } from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import DatabaseManager from '../shared/db';
import { Logger } from '../shared/logger';
import { SyncManager } from './SyncManager';

interface WebSocketContext {
    logger: Logger;
    dbManager: DatabaseManager;
    syncManager: SyncManager;
    [key: string]: any;
}

interface KioskClientInfo {
    type: 'kiosk' | 'client' | string;
    kioskId: string;
    name?: string;
    [key: string]: any;
}

// Extend WebSocket interface to add custom properties
interface CustomWebSocket extends WebSocket {
    isAlive: boolean;
    clientInfo?: KioskClientInfo;
}

/**
 * WriteBuffer: Batches high-volume writes before flushing to DB
 */
class WriteBuffer<T> {
    private buffer: T[] = [];
    private name: string;
    private maxBatchSize: number;
    private flushIntervalMs: number;
    private flushFn: (items: T[]) => Promise<void> | void;
    private timer: NodeJS.Timeout | null = null;
    private logger: Logger;

    constructor(
        name: string,
        maxBatchSize: number,
        flushIntervalMs: number,
        flushFn: (items: T[]) => Promise<void> | void,
        logger: Logger
    ) {
        this.name = name;
        this.maxBatchSize = maxBatchSize;
        this.flushIntervalMs = flushIntervalMs;
        this.flushFn = flushFn;
        this.logger = logger;
    }

    public add(item: T) {
        this.buffer.push(item);
        if (this.buffer.length >= this.maxBatchSize) {
            this.flush();
        } else if (!this.timer) {
            this.timer = setTimeout(() => this.flush(), this.flushIntervalMs);
        }
    }

    private async flush() {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }

        if (this.buffer.length === 0) return;

        const batch = [...this.buffer];
        this.buffer = [];

        try {
            await this.flushFn(batch);
        } catch (err: any) {
            this.logger.error(`[WriteBuffer] Failed to flush ${this.name}`, { error: err.message });
        }
    }
}

const initWebSocketServer = (server: Server, context: WebSocketContext): WebSocketServer => {
    const { logger, dbManager, syncManager } = context;

    // --- Write Buffer for Heartbeats ---
    // Buffer Heartbeat Updates: Flush every 2s or 50 items
    interface HeartbeatUpdate {
        kioskId: string;
        ip: string;
        version: string;
        timestamp: string;
        status: string;
    }

    const heartbeatBuffer = new WriteBuffer<HeartbeatUpdate>(
        'Heartbeats',
        50,
        2000,
        async (items: HeartbeatUpdate[]) => {
            // Deduplicate by kioskId (keep latest)
            const latestUpdates = new Map<string, HeartbeatUpdate>();
            items.forEach(item => latestUpdates.set(item.kioskId, item));

            const updates = Array.from(latestUpdates.values());

            if (updates.length > 0) {
                // Use strict Transaction wrapper from better-sqlite3
                const updateStmt = dbManager.prepare(`
                    UPDATE kiosks 
                    SET last_seen = ?, ip_address = ?, version = ?, status = ? 
                    WHERE id = ?
                `);

                // Fix: dbManager.transaction() executes immediately and takes a no-arg function
                // We capture 'updates' from the closure scope instead of passing it.
                dbManager.transaction(() => {
                    for (const update of updates) {
                        updateStmt.run(update.timestamp, update.ip, update.version, update.status, update.kioskId);
                    }
                });

                // logger.debug(`[WebSocket] Flushed ${updates.length} unique heartbeats to DB`);
            }
        },
        logger
    );

    const wss = new WebSocketServer({
        server,
        path: '/ws',
        // Verify connecting clients: must be localhost (admin UI) or a registered kiosk.
        verifyClient: ({ req }: { req: any }, cb: (result: boolean, code?: number, msg?: string) => void) => {
            try {
                const ip = (req.socket?.remoteAddress || '').replace('::ffff:', '');
                // Always allow loopback (admin dashboard on same machine)
                if (ip === '127.0.0.1' || ip === '::1') return cb(true);

                const url = new URL(req.url || '', 'http://localhost');
                const kioskId = url.searchParams.get('kioskId');
                if (!kioskId) {
                    logger.warn(`[WebSocket] Rejected upgrade from ${ip} — no kioskId`);
                    return cb(false, 4001, 'Missing kioskId');
                }

                const kiosk = dbManager.get('SELECT id FROM kiosks WHERE id = ?', [kioskId]);
                if (!kiosk) {
                    logger.warn(`[WebSocket] Rejected unknown kiosk ${kioskId} from ${ip}`);
                    return cb(false, 4003, 'Unknown kiosk');
                }

                cb(true);
            } catch (err: any) {
                logger.error('[WebSocket] verifyClient error', { error: err.message });
                cb(false, 4500, 'Internal error');
            }
        },
    });

    // Function to update kiosk status in DB
    const updateKioskStatus = (kioskId: string, ip: string, status: string = 'Connected', extraData: any = {}): void => {
        if (!dbManager) return;
        try {
            const now = new Date().toISOString();

            // 1. Update/Insert Session (Keep Immediate)
            const sessionCheck = dbManager.get('SELECT id FROM kiosk_sessions WHERE kioskId = ?', [kioskId]);
            if (sessionCheck) {
                dbManager.run('UPDATE kiosk_sessions SET last_seen = ? WHERE kioskId = ?', [now, kioskId]);
            } else {
                dbManager.run('INSERT INTO kiosk_sessions (kioskId, startTime, last_seen, status) VALUES (?, ?, ?, ?)',
                    [kioskId, now, now, 'Active']);
            }

            // 2. Buffer the DB Update (don't write immediately)
            heartbeatBuffer.add({
                kioskId: kioskId,
                ip: ip,
                version: (extraData && extraData.version) || '1.0.0',
                timestamp: now,
                status: status
            });

        } catch (err: any) {
            if (logger && logger.error) logger.error('Failed to update kiosk status in DB', { error: err.message, kioskId });
        }
    };

    // Track connection rate per IP for basic flood protection
    const wsConnectionCounts = new Map<string, { count: number; resetAt: number }>();
    const WS_MAX_CONNECTIONS_PER_MIN = 20;

    wss.on('connection', (ws: CustomWebSocket, req: any) => {
        const ip = req.socket.remoteAddress?.replace('::ffff:', '') || 'unknown';

        // Rate limit new connections per IP
        const now = Date.now();
        const entry = wsConnectionCounts.get(ip);
        if (entry && now < entry.resetAt) {
            entry.count++;
            if (entry.count > WS_MAX_CONNECTIONS_PER_MIN) {
                logger.warn(`[WebSocket] Rate limit: too many connections from ${ip}`);
                ws.close(1008, 'Too many connections');
                return;
            }
        } else {
            wsConnectionCounts.set(ip, { count: 1, resetAt: now + 60_000 });
        }

        if (logger && logger.info) logger.info(`WebSocket client connected from ${ip}`);

        // Register with SyncManager for data synchronization
        if (syncManager) {
            syncManager.handleConnection(ws, req);
        }

        ws.isAlive = true;
        ws.on('pong', () => {
            ws.isAlive = true;
            // Update last seen on pong (heartbeat response)
            if (ws.clientInfo && ws.clientInfo.type === 'kiosk') {
                updateKioskStatus(ws.clientInfo.kioskId, ip, 'Connected', ws.clientInfo);
                // Also broadcast status update to frontend
                wss.clients.forEach((client) => {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({
                            type: 'KIOSK_STATUS_UPDATE',
                            payload: { id: ws.clientInfo!.kioskId, name: ws.clientInfo!.name || 'Kiosk', status: 'Connected' }
                        }));
                    }
                });
            }
        });

        ws.on('message', (message: WebSocket.Data) => {
            try {
                // SECURITY: Reject oversized messages (1MB limit)
                const raw = message.toString();
                if (raw.length > 1_048_576) {
                    logger.warn(`[WebSocket] Rejected oversized message (${raw.length} bytes) from ${ip}`);
                    return;
                }

                const data = JSON.parse(raw);

                if (data.type === 'PING') {
                    ws.send(JSON.stringify({ type: 'PONG' }));
                    if (ws.clientInfo && ws.clientInfo.type === 'kiosk') {
                        updateKioskStatus(ws.clientInfo.kioskId, ip, 'Connected', ws.clientInfo);
                    }
                    return;
                }

                if (data.type === 'REGISTER_CLIENT') {
                    if (logger && logger.info) logger.info('Client registered', { payload: data.payload, ip });
                    ws.clientInfo = data.payload;

                    if (ws.clientInfo && ws.clientInfo.type === 'kiosk') {
                        updateKioskStatus(ws.clientInfo.kioskId, ip, 'Connected', ws.clientInfo);

                        // Broadcast new connection
                        wss.clients.forEach((client: WebSocket) => {
                            if (client !== ws && client.readyState === WebSocket.OPEN) {
                                client.send(JSON.stringify({
                                    type: 'KIOSK_STATUS_UPDATE',
                                    payload: { id: ws.clientInfo!.kioskId, name: ws.clientInfo!.name || 'Kiosk', status: 'Connected' }
                                }));
                            }
                        });
                    }
                    return;
                }

                if (data.type === 'ASSISTANCE_REQUEST') {
                    if (logger && logger.info) logger.info('Assistance requested', { payload: data.payload, ip });

                    const kioskId = data.payload?.kioskId || 'UNKNOWN_KIOSK';
                    const message = data.payload?.message || 'Customer needs assistance';
                    const requestId = `${kioskId}-${Date.now()}`;

                    // Persist to DB
                    try {
                        dbManager.run(
                            'INSERT INTO assistance_requests (id, kioskId, message, status) VALUES (?, ?, ?, ?)',
                            [requestId, kioskId, message, 'pending']
                        );
                    } catch (dbErr: any) {
                        logger.error('[WS] Failed to persist assistance request', { error: dbErr.message });
                    }

                    // Broadcast to all connected clients (especially Master Frontend)
                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({
                                type: 'ASSISTANCE_REQUEST',
                                payload: { ...data.payload, id: requestId, timestamp: new Date().toISOString() }
                            }));
                        }
                    });
                    return;
                }

                // Rule 08: Admin Ghosting Logic
                if (data.type === 'GHOST_FRAME' || data.type === 'GHOST_START' || data.type === 'GHOST_STOP') {
                    // Relay to admins (clients that are NOT kiosks)
                    wss.clients.forEach((client: WebSocket) => {
                        const customClient = client as CustomWebSocket;
                        // Improve targeting: Only send to 'admin' or 'master' types, or all non-kiosks
                        if (client !== ws && client.readyState === WebSocket.OPEN) {
                            // Simple relay for now
                            if (customClient.clientInfo?.type !== 'kiosk') {
                                client.send(message.toString());
                            }
                        }
                    });
                    return;
                }

                if (data.type === 'BROADCAST_DATA_REFRESH') {
                    if (logger && logger.info) logger.info('Relaying BROADCAST_DATA_REFRESH', { collection: data.collection, ip });
                    wss.clients.forEach((client) => {
                        if (client !== ws && client.readyState === WebSocket.OPEN) {
                            client.send(message.toString());
                        }
                    });
                    return;
                }

                // SyncManager handles MUTATION and HEARTBEAT types via its own listener attached in handleConnection

            } catch (e: any) {
                if (logger && logger.error) logger.error('WebSocket message error', { error: e.message });
            }
        });

        ws.on('close', () => {
            if (logger && logger.info) logger.info(`WebSocket client disconnected from ${ip}`);
            if (ws.clientInfo && ws.clientInfo.type === 'kiosk') {
                // Update DB to disconnected
                if (dbManager) {
                    try {
                        dbManager.run('UPDATE kiosks SET status = ? WHERE id = ?', ['Disconnected', ws.clientInfo.kioskId]);
                        dbManager.run('DELETE FROM kiosk_sessions WHERE kioskId = ?', [ws.clientInfo.kioskId]);
                    } catch (e: any) {
                        if (logger && logger.error) logger.error('Failed to update kiosk status on disconnect', { error: e.message });
                    }
                }

                // Broadcast disconnection
                wss.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({
                            type: 'KIOSK_STATUS_UPDATE',
                            payload: { id: ws.clientInfo!.kioskId, name: ws.clientInfo!.name || 'Kiosk', status: 'Disconnected' }
                        }));
                    }
                });
            }
        });

        ws.on('error', (err: Error) => {
            if (logger && logger.error) logger.error('WebSocket error', { error: err.message });
        });
    });

    // Heartbeat interval
    const interval = setInterval(() => {
        wss.clients.forEach((client) => {
            const ws = client as CustomWebSocket;
            if (ws.isAlive === false) return ws.terminate();
            ws.isAlive = false;
            ws.ping();
        });
    }, 30000);

    wss.on('close', () => {
        clearInterval(interval);
    });

    return wss;
};

export default initWebSocketServer;
