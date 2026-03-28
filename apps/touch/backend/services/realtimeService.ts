import { v4 as uuidv4 } from 'uuid';
import { Response } from 'express';
// Assuming logger is typed from shared/logger, or generic
import { Logger } from '../shared/logger';

interface Client {
    id: string;
    res: Response;
    ip?: string;
}

interface BroadcastData {
    collection?: string;
    action?: string;
    record?: any;
    type?: string;
    timestamp?: number;
    [key: string]: any;
}

export class RealtimeService {
    private logger: Logger | any; // Use any if logger type isn't fully imported or compatible yet, but prefer typed
    private clients: Map<string, Client>;

    constructor(logger: Logger | any) {
        this.logger = logger;
        this.clients = new Map();

        // Heartbeat to keep connections alive
        setInterval(() => {
            this.broadcast({ type: 'HEARTBEAT', timestamp: Date.now() });
        }, 30000);
    }

    /*
     * Handle new SSE connection
     */
    public handleConnection(req: any, res: Response): void {
        const clientId = uuidv4();

        // SSE Headers
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': req.headers.origin || '*'
        });

        const client: Client = {
            id: clientId,
            res,
            ip: req.socket.remoteAddress
        };

        this.clients.set(clientId, client);

        if (this.logger && this.logger.info) this.logger.info(`SSE Client connected: ${clientId}`);

        // Send initial connection message
        // Use proper SSE format: "data: ... \n\n"
        res.write(`data: ${JSON.stringify('connected')}\n\n`);

        req.on('close', () => {
            if (this.logger && this.logger.info) this.logger.info(`SSE Client disconnected: ${clientId}`);
            this.clients.delete(clientId);
        });
    }

    /*
     * Broadcast event to all clients
     * data: { collection: string, action: 'create'|'update'|'delete', record: object }
     */
    public broadcast(data: BroadcastData): void {
        const message = `data: ${JSON.stringify(data)}\n\n`;

        this.clients.forEach(client => {
            try {
                client.res.write(message);
            } catch (e: any) {
                if (this.logger && this.logger.error) this.logger.error(`Failed to send SSE to client ${client.id}`, { error: e.message });
                this.clients.delete(client.id);
            }
        });
    }
}

export default RealtimeService;
