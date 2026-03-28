// backend/services/realtimeService.ts
// Realtime Service (SSE)

import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { Logger } from "../shared/logger";
import { NetworkMonitor } from "./NetworkMonitor";

interface SSEClient {
  id: string;
  res: Response;
  ip: string;
}

interface BroadcastData {
  type?: string;
  collection?: string;
  action?: string;
  record?: any;
  payload?: any;
  timestamp?: number;
}

export default class RealtimeService {
  private logger: Logger;
  private networkMonitor: NetworkMonitor | null;
  private clients: Map<string, SSEClient>;

  constructor(logger: Logger, networkMonitor?: NetworkMonitor) {
    this.logger = logger;
    this.networkMonitor = networkMonitor || null;
    this.clients = new Map();

    // Heartbeat to keep connections alive
    setInterval(() => {
      this.broadcast({ type: "HEARTBEAT", timestamp: Date.now() });
    }, 30000);
  }

  /*
   * Handle new SSE connection
   */
  public handleConnection(req: Request, res: Response): void {
    const clientId = uuidv4();

    // SSE Headers
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": req.headers.origin || "*",
    });

    const client: SSEClient = {
      id: clientId,
      res,
      ip: req.socket.remoteAddress || "unknown",
    };

    this.clients.set(clientId, client);

    if (this.logger) this.logger.info(`SSE Client connected: ${clientId}`);

    // Send initial connection message
    // Use proper SSE format: "data: ... \n\n"
    res.write(`data: ${JSON.stringify("connected")}\n\n`);

    req.on("close", () => {
      if (this.logger) this.logger.info(`SSE Client disconnected: ${clientId}`);
      this.clients.delete(clientId);
    });
  }

  /*
   * Broadcast event to all clients
   * data: { collection: string, action: 'create'|'update'|'delete', record: object }
   */
  public broadcast(data: BroadcastData): void {
    const message = `data: ${JSON.stringify(data)}\n\n`;

    this.clients.forEach((client) => {
      try {
        client.res.write(message);
      } catch (e: any) {
        this.logger.error(`Failed to send SSE to client ${client.id}`, {
          error: e.message,
        });
        this.clients.delete(client.id);
      }
    });
  }

  /**
   * Aggregates and broadcasts system metrics
   */
  public broadcastMetrics(): void {
    if (!this.networkMonitor) return;

    try {
      const networkStats = this.networkMonitor.getStats();
      const systemStats = NetworkMonitor.getSystemSnapshot();

      this.broadcast({
        type: "SYSTEM_METRICS",
        payload: {
          network: networkStats,
          system: systemStats,
          activeClients: this.clients.size,
          timestamp: Date.now(),
        },
      });
    } catch (error: any) {
      this.logger.error("Failed to broadcast metrics", {
        error: error.message,
      });
    }
  }
}
