import { WebSocket } from 'ws';
import { Logger } from '../utils/logger';
import DatabaseManager from '../database/db';
import { TABLE_MAP, JSON_COLUMNS, ALLOWED_COLUMNS } from '../config/constants';
import { z } from 'zod';
import crypto from 'crypto';

interface VectorClock {
  [clientId: string]: number;
}

interface SyncPayload {
    type: 'HEARTBEAT' | 'MUTATION' | 'SYNC_REQUEST' | string;
    clientId: string;
    timestamp: number;
    data?: any;
    entity?: string;
    action?: string;
    vectorClock?: VectorClock;
}

interface ConnectedClient {
    ws: WebSocket;
    lastHeartbeat: number;
    clientId: string;
    ip: string;
}

const mutationPayloadSchema = z.object({
    entity: z.string().min(1, 'Entity is required'),
    action: z.enum(['create', 'update', 'delete', 'update_many', 'upsert']),
    data: z.record(z.string(), z.any()).refine((val) => typeof val === 'object' && val !== null, {
        message: 'Data must be an object',
    }),
    clientId: z.string().optional(),
    vectorClock: z.record(z.string(), z.number()).optional(),
});

function hashPayload(payload: any): string {
    const canonical = JSON.stringify(payload, Object.keys(payload).sort());
    return crypto.createHash('sha256').update(canonical).digest('hex');
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
                try {
                    const ack = await this.handleMutation(payload, client.clientId);
                    if (client.ws.readyState === WebSocket.OPEN) {
                        client.ws.send(JSON.stringify({
                            type: 'MUTATION_ACK',
                            id: payload.data?.id,
                            status: ack.status,
                            timestamp: Date.now()
                        }));
                    }
                } catch (error: any) {
                    this.logger.error(`[SyncManager] Mutation failed for ${client.clientId}`, { error: error.message });
                    if (client.ws.readyState === WebSocket.OPEN) {
                        client.ws.send(JSON.stringify({
                            type: 'MUTATION_ACK',
                            id: payload.data?.id,
                            status: 'ERROR',
                            error: error.message,
                            timestamp: Date.now()
                        }));
                    }
                }
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

        const table = TABLE_MAP[entity as keyof typeof TABLE_MAP];
        if (!table || !ALLOWED_COLUMNS[table]) return;

        try {
            const records = this.db.query(`SELECT * FROM ${table} WHERE updated_at > ?`, [new Date(timestamp).toISOString()]);

            const jsonCols = JSON_COLUMNS[table] || [];
            const parsedRecords = records.map(r => {
                const parsed = { ...r };
                jsonCols.forEach(c => {
                    if (parsed[c] && typeof parsed[c] === 'string') {
                        try { parsed[c] = JSON.parse(parsed[c]); } catch (e: any) {
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

  private compareVectorClocks(a: VectorClock, b: VectorClock): 'before' | 'after' | 'concurrent' {
    let aNewer = false;
    let bNewer = false;

    const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const key of allKeys) {
      const aVal = a[key] || 0;
      const bVal = b[key] || 0;
      if (aVal > bVal) aNewer = true;
      if (bVal > aVal) bNewer = true;
    }

    if (aNewer && !bNewer) return 'after';
    if (bNewer && !aNewer) return 'before';
    return 'concurrent';
  }

  private mergeVectorClocks(a: VectorClock, b: VectorClock): VectorClock {
    const result: VectorClock = { ...a };
    for (const key of Object.keys(b)) {
      result[key] = Math.max(result[key] || 0, b[key]);
    }
    return result;
  }

  public async handleMutation(payload: SyncPayload, clientId: string): Promise<{ status: string }> {
        const { entity, action, data, vectorClock } = payload;

        if (!entity || !action || !data || !data.id) {
            this.logger.warn(`[SyncManager] Invalid mutation payload from ${clientId}`);
            return { status: 'REJECTED' };
        }

        // Zod validation
        const validation = mutationPayloadSchema.safeParse({ entity, action, data, clientId, vectorClock });
        if (!validation.success) {
            this.logger.warn(`[SyncManager] Validation failed for mutation from ${clientId}`, {
                errors: (validation.error as any).errors?.map((e: any) => e.message)
            });
            return { status: 'INVALID' };
        }

        const table = TABLE_MAP[entity as keyof typeof TABLE_MAP];
        if (!table || !ALLOWED_COLUMNS[table]) {
            this.logger.error(`[SyncManager] Security: Rejected unknown table "${entity}"`);
            return { status: 'REJECTED' };
        }

        // Idempotency check
        const mutationId = data.id as string;
        const payloadHash = hashPayload(data);
        try {
            const acked = this.db.get<{ id: string }>(
                `SELECT id FROM mutation_ack_log WHERE client_id = ? AND mutation_id = ? AND payload_hash = ?`,
                [clientId, mutationId, payloadHash]
            );
            if (acked) {
                this.logger.info(`[SyncManager] Mutation ${mutationId} already applied for ${clientId}, returning ACK`);
                return { status: 'ALREADY_APPLIED' };
            }
        } catch (e: any) {
            // Table may not exist yet on very old DBs without migration 069
            if (!e.message?.includes('no such table')) {
                this.logger.warn(`[SyncManager] Idempotency check failed`, { error: e.message });
            }
        }

        this.logger.info(`[SyncManager] Applying mutation: ${entity}.${action} (ID: ${data.id})`);

        try {
            const rowData = { ...data };
            const jsonCols = JSON_COLUMNS[table] || [];
            jsonCols.forEach(c => {
                if (rowData[c] && typeof rowData[c] === 'object') {
                    rowData[c] = JSON.stringify(rowData[c]);
                }
            });

            const now = new Date().toISOString();
            rowData.updated_at = now;

            if (entity === 'orders' && !rowData.albumId && rowData.items) {
                try {
                    const items = typeof rowData.items === 'string' ? JSON.parse(rowData.items) : rowData.items;
                    if (Array.isArray(items) && items.length > 0 && items[0].albumId) {
                        rowData.albumId = items[0].albumId;
                    }
                } catch (e: any) {
                    this.logger.warn(`[SyncManager] Failed to extract albumId from order items: ${e instanceof Error ? e.message : String(e)}`);
                }
            }

            this.db.transaction(() => {
                const existing = this.db.get<{ id: string, updated_at: string, vector_clock: string }>(`SELECT id, updated_at, vector_clock FROM ${table} WHERE id = ?`, [data.id]);

                if (action === 'delete') {
                    this.db.run(`DELETE FROM ${table} WHERE id = ?`, [data.id]);
                } else if (existing) {
                    let existingVC: VectorClock = {};
                    try {
                        if (existing.vector_clock) {
                            existingVC = typeof existing.vector_clock === 'string' 
                                ? JSON.parse(existing.vector_clock) 
                                : existing.vector_clock;
                        }
                    } catch (e: any) {
                        existingVC = {};
                    }

                    const incVC: VectorClock = { ...(vectorClock || {}) };
                    incVC[clientId] = (incVC[clientId] || 0) + 1;

                    const comparison = this.compareVectorClocks(incVC, existingVC);

                    if (comparison === 'after' || comparison === 'concurrent') {
                        const mergedVC = this.mergeVectorClocks(existingVC, incVC);
                        rowData.vector_clock = JSON.stringify(mergedVC);

                        const keys = Object.keys(rowData).filter(k => k !== 'id' && ALLOWED_COLUMNS[table].includes(k));
                        const setClause = keys.map(k => `${k} = ?`).join(', ');
                        const values = keys.map(k => rowData[k]);
                        values.push(data.id);
                        this.db.run(`UPDATE ${table} SET ${setClause} WHERE id = ?`, values);
                    } else {
                        this.logger.warn(`[SyncManager] Conflict: Mutation for ${entity}.${data.id} is older than local record (vector clock). Ignoring.`);
                    }
                } else {
                    const incVC: VectorClock = { ...(vectorClock || {}) };
                    incVC[clientId] = (incVC[clientId] || 0) + 1;
                    rowData.vector_clock = JSON.stringify(incVC);

                    const keys = Object.keys(rowData).filter(k => ALLOWED_COLUMNS[table].includes(k));
                    const cols = keys.join(', ');
                    const placeholders = keys.map(() => '?').join(', ');
                    const values = keys.map(k => rowData[k]);
                    this.db.run(`INSERT INTO ${table} (${cols}) VALUES (${placeholders})`, values);
                }
            });

            // Persist ack for idempotency
            try {
                this.db.run(
                    `INSERT INTO mutation_ack_log (id, client_id, mutation_id, payload_hash, applied_at)
                     VALUES (?, ?, ?, ?, datetime('now'))
                     ON CONFLICT(client_id, mutation_id) DO UPDATE SET
                       payload_hash = excluded.payload_hash,
                       applied_at = datetime('now')`,
                    [`${clientId}:${mutationId}`, clientId, mutationId, payloadHash]
                );
            } catch (e: any) {
                if (!e.message?.includes('no such table')) {
                    this.logger.warn(`[SyncManager] Failed to record mutation ack`, { error: e.message });
                }
            }

            this.broadcastUpdate(payload, clientId);
            return { status: 'APPLIED' };

        } catch (error: any) {
            this.logger.error(`[SyncManager] Mutation error:`, { error: error.message || String(error), entity, id: data.id });
            throw error;
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
