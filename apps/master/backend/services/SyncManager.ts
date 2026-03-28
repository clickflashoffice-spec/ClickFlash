import { WebSocket } from 'ws';
import { Logger } from '../shared/logger';
import DatabaseManager from '../shared/db';
import { TABLE_MAP, JSON_COLUMNS, ALLOWED_COLUMNS } from '../config/constants';

interface SyncPayload {
    type: 'HEARTBEAT' | 'MUTATION' | 'SYNC_REQUEST' | string;
    clientId: string;
    timestamp: number;
    data?: any;
    entity?: string;
    action?: string;
}

interface ConnectedClient {
    ws: WebSocket;
    lastHeartbeat: number;
    clientId: string;
    ip: string;
}

export class SyncManager {
    private clients: Map<string, ConnectedClient> = new Map();
    private logger: Logger;
    private db: DatabaseManager;
    private heartbeatInterval: NodeJS.Timeout | null = null;
    private readonly HEARTBEAT_TIMEOUT = 30000; // 30 seconds

    constructor(logger: Logger, db: DatabaseManager) {
        this.logger = logger;
        this.db = db;
        this.startHeartbeatMonitor();
    }

    public handleConnection(ws: WebSocket, req: any) {
        const clientId = this.extractClientId(req);
        const ip = req.socket.remoteAddress || 'unknown';

        this.logger.info(`[SyncManager] Client connected: ${clientId} (${ip})`);

        const client: ConnectedClient = {
            ws,
            lastHeartbeat: Date.now(),
            clientId,
            ip
        };

        this.clients.set(clientId, client);

        ws.on('message', async (message: string) => {
            try {
                const payload = JSON.parse(message.toString()) as SyncPayload;
                await this.processMessage(payload, client);
            } catch (error) {
                this.logger.error(`[SyncManager] Malformed message from ${clientId}`, { error });
            }
        });

        ws.on('close', () => {
            this.logger.info(`[SyncManager] Client disconnected: ${clientId}`);
            this.clients.delete(clientId);
        });

        ws.on('error', (err) => {
            this.logger.error(`[SyncManager] Error with client ${clientId}:`, err);
        });
    }

    private extractClientId(req: any): string {
        const urlParams = new URLSearchParams(req.url.split('?')[1]);
        return urlParams.get('clientId') || `kiosk-${Math.random().toString(36).substr(2, 9)}`;
    }

    private async processMessage(payload: SyncPayload, client: ConnectedClient) {
        client.lastHeartbeat = Date.now();

        switch (payload.type) {
            case 'HEARTBEAT':
                this.acknowledgeHeartbeat(client);
                break;

            case 'MUTATION':
                await this.handleMutation(payload, client.clientId);
                client.ws.send(JSON.stringify({
                    type: 'MUTATION_ACK',
                    id: payload.data?.id,
                    status: 'APPLIED',
                    timestamp: Date.now()
                }));
                break;

            case 'SYNC_REQUEST':
                await this.handleSyncRequest(payload, client);
                break;

            case 'PING':
                if (client.ws.readyState === WebSocket.OPEN) {
                    client.ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
                }
                break;

            default:
                // Other message types (REGISTER_CLIENT, etc.) are handled by the main websocket.ts loop
                // but we might want to acknowledge them if they come through here.
                break;
        }
    }

    private acknowledgeHeartbeat(client: ConnectedClient) {
        if (client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(JSON.stringify({ type: 'HEARTBEAT_ACK', timestamp: Date.now() }));
        }
    }

    private async handleSyncRequest(payload: SyncPayload, client: ConnectedClient) {
        const { entity, timestamp } = payload;
        if (!entity || !timestamp) return;

        const table = TABLE_MAP[entity as keyof typeof TABLE_MAP] || entity;
        if (!ALLOWED_COLUMNS[table]) return;

        try {
            // Fetch records updated after the client's last sync
            const records = this.db.query(`SELECT * FROM ${table} WHERE updated_at > ?`, [new Date(timestamp).toISOString()]);

            // Parse JSON columns
            const jsonCols = JSON_COLUMNS[table] || [];
            const parsedRecords = records.map(r => {
                const parsed = { ...r };
                jsonCols.forEach(c => {
                    if (parsed[c] && typeof parsed[c] === 'string') {
                        try { parsed[c] = JSON.parse(parsed[c]); } catch (e) {
                            this.logger?.warn(`[SyncManager] Failed to parse JSON column ${c}`, { error: e instanceof Error ? e.message : String(e) });
                        }
                    }
                });
                return parsed;
            });

            client.ws.send(JSON.stringify({
                type: 'SYNC_RESPONSE',
                entity,
                items: parsedRecords,
                timestamp: Date.now()
            }));

        } catch (error: any) {
            this.logger.error(`[SyncManager] Sync request failed for ${entity}:`, { error: error.message || String(error) });
        }
    }

    public async handleMutation(payload: SyncPayload, clientId: string) {
        const { entity, action, data } = payload;

        if (!entity || !action || !data || !data.id) {
            this.logger.warn(`[SyncManager] Invalid mutation payload from ${clientId}`);
            return;
        }

        const table = TABLE_MAP[entity as keyof typeof TABLE_MAP] || entity;
        if (!ALLOWED_COLUMNS[table]) {
            this.logger.error(`[SyncManager] Security: Unauthorized table sync attempt: ${table}`);
            return;
        }

        this.logger.info(`[SyncManager] Applying mutation: ${entity}.${action} (ID: ${data.id})`);

        try {
            // 1. Prepare data (sanitize and handle JSON)
            const rowData = { ...data };
            const jsonCols = JSON_COLUMNS[table] || [];
            jsonCols.forEach(c => {
                if (rowData[c] && typeof rowData[c] === 'object') {
                    rowData[c] = JSON.stringify(rowData[c]);
                }
            });

            const now = new Date().toISOString();
            rowData.updated_at = now;

            // Phase 32: Extract albumId from order items if not present
            if (entity === 'orders' && !rowData.albumId && rowData.items) {
                try {
                    const items = typeof rowData.items === 'string' ? JSON.parse(rowData.items) : rowData.items;
                    if (Array.isArray(items) && items.length > 0 && items[0].albumId) {
                        rowData.albumId = items[0].albumId;
                    }
                } catch (e) {
                    this.logger.warn(`[SyncManager] Failed to extract albumId from order items: ${e instanceof Error ? e.message : String(e)}`);
                }
            }

            // 2. Perform DB operation (Conflict Resolution: Last Write Wins)
            this.db.transaction(() => {
                const existing = this.db.get<{ id: string, updated_at: string }>(`SELECT id, updated_at FROM ${table} WHERE id = ?`, [data.id]);

                if (action === 'delete') {
                    this.db.run(`DELETE FROM ${table} WHERE id = ?`, [data.id]);
                } else if (existing) {
                    // LWW: Only update if the incoming data is newer (or same timestamp - we trust the client's intent)
                    const incomingTime = new Date(rowData.updated_at || now).getTime();
                    const existingTime = new Date(existing.updated_at).getTime();

                    if (incomingTime >= existingTime) {
                        // Update
                        const keys = Object.keys(rowData).filter(k => k !== 'id' && ALLOWED_COLUMNS[table].includes(k));
                        const setClause = keys.map(k => `${k} = ?`).join(', ');
                        const values = keys.map(k => rowData[k]);
                        values.push(data.id);
                        this.db.run(`UPDATE ${table} SET ${setClause} WHERE id = ?`, values);
                    } else {
                        this.logger.warn(`[SyncManager] Conflict: Mutation for ${entity}.${data.id} is older than local record. Ignoring.`);
                        throw new Error('CONFLICT: Incoming data is stale');
                    }
                } else {
                    // Create
                    const keys = Object.keys(rowData).filter(k => ALLOWED_COLUMNS[table].includes(k));
                    const cols = keys.join(', ');
                    const placeholders = keys.map(() => '?').join(', ');
                    const values = keys.map(k => rowData[k]);
                    this.db.run(`INSERT INTO ${table} (${cols}) VALUES (${placeholders})`, values);
                }
            });

            // 3. Broadcast to other clients
            this.broadcastUpdate(payload, clientId);

            // ACK is now handled by the caller (processMessage or HTTP route)

        } catch (error: any) {
            this.logger.error(`[SyncManager] Mutation error:`, { error: error.message || String(error), entity, id: data.id });
            throw error; // Re-throw to let caller handle error reporting
        }
    }

    private broadcastUpdate(payload: SyncPayload, sourceClientId: string) {
        const message = JSON.stringify({
            type: 'STATE_UPDATE',
            entity: payload.entity,
            action: payload.action,
            data: payload.data,
            source: sourceClientId,
            timestamp: Date.now()
        });

        this.clients.forEach((client) => {
            if (client.clientId !== sourceClientId && client.ws.readyState === WebSocket.OPEN) {
                client.ws.send(message);
            }
        });
    }

    /**
     * Specifically broadcasts order status changes to all clients (Kiosks).
     */
    public broadcastOrderStatus(orderId: string, status: string, data: any = {}) {
        const payload: SyncPayload = {
            type: 'STATE_UPDATE',
            clientId: 'MASTER',
            timestamp: Date.now(),
            entity: 'orders',
            action: 'update',
            data: { id: orderId, status, ...data }
        };

        this.broadcastUpdate(payload, 'MASTER');
    }

    private startHeartbeatMonitor() {
        this.heartbeatInterval = setInterval(() => {
            const now = Date.now();
            this.clients.forEach((client, id) => {
                if (now - client.lastHeartbeat > this.HEARTBEAT_TIMEOUT) {
                    this.logger.warn(`[SyncManager] Client timed out: ${id}`);
                    client.ws.terminate();
                    this.clients.delete(id);
                }
            });
        }, 10000);
    }

    public stop() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
        this.clients.forEach(client => client.ws.close());
        this.clients.clear();
    }
}
