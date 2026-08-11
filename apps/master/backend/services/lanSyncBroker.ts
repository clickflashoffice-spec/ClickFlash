import { EventEmitter } from 'events';
import { WebSocketServer, WebSocket } from 'ws';
import { Bonjour } from 'bonjour-service';
import { logger } from '@clickflash/logger';

export interface KioskStationInfo {
  kioskId: string;
  name: string;
  ip: string;
  resortId?: string;
  lastSeen: number;
  status: 'online' | 'offline' | 'busy';
  activeSessionId?: string;
}

export interface SyncMessage {
  type: 'REGISTER' | 'HEARTBEAT' | 'PHOTO_INGESTED' | 'ORDER_STATE_CHANGED' | 'RECONCILE_REQUEST' | 'RECONCILE_RESPONSE' | 'BROADCAST_EVENT' | 'WEBRTC_OFFER' | 'WEBRTC_ANSWER' | 'WEBRTC_ICE';
  senderId: string;
  timestamp: number;
  payload: any;
}

export interface CRDTLogEntry {
  id: string;
  entityType: 'photo' | 'order' | 'session' | 'station';
  entityId: string;
  mutationType: 'create' | 'update' | 'delete';
  data: Record<string, any>;
  timestamp: number;
  nodeId: string;
}

export class LanSyncBroker extends EventEmitter {
  private static instance: LanSyncBroker;
  private wss: WebSocketServer | null = null;
  private bonjour: Bonjour | null = null;
  private connectedClients: Map<string, { ws: WebSocket; info: KioskStationInfo }> = new Map();
  private mutationLog: Map<string, CRDTLogEntry> = new Map();
  private port: number = 8092;
  private isRunning: boolean = false;

  private constructor() {
    super();
  }

  public static getInstance(): LanSyncBroker {
    if (!LanSyncBroker.instance) {
      LanSyncBroker.instance = new LanSyncBroker();
    }
    return LanSyncBroker.instance;
  }

  /**
   * Starts the local LAN WebSocket server and advertises via Bonjour mDNS
   */
  public async start(port: number = 8092): Promise<void> {
    if (this.isRunning) {
      logger.warn('[LanSyncBroker] Broker is already running');
      return;
    }

    this.port = port;
    return new Promise((resolve, reject) => {
      try {
        this.wss = new WebSocketServer({ port: this.port });

        this.wss.on('connection', (ws: WebSocket, req) => {
          const clientIp = req.socket.remoteAddress || 'unknown';
          logger.info(`[LanSyncBroker] New kiosk connection attempt from ${clientIp}`);

          ws.on('message', (data: Buffer | string) => {
            try {
              const message: SyncMessage = JSON.parse(data.toString());
              this.handleIncomingMessage(ws, message, clientIp);
            } catch (err: any) {
              logger.error(`[LanSyncBroker] Failed to parse incoming message: ${err.message}`);
            }
          });

          ws.on('close', () => {
            this.handleClientDisconnect(ws);
          });

          ws.on('error', (err) => {
            logger.error(`[LanSyncBroker] WebSocket client error: ${err.message}`);
          });
        });

        this.wss.on('listening', () => {
          this.isRunning = true;
          logger.info(`[LanSyncBroker] WebSocket sync broker listening on port ${this.port}`);
          this.advertiseBonjour();
          resolve();
        });

        this.wss.on('error', (err) => {
          logger.error(`[LanSyncBroker] WebSocket server error: ${err.message}`);
          reject(err);
        });
      } catch (err: any) {
        logger.error(`[LanSyncBroker] Failed to start broker: ${err.message}`);
        reject(err);
      }
    });
  }

  /**
   * Advertise service via Bonjour/mDNS so kiosks auto-discover Master node
   */
  private advertiseBonjour(): void {
    try {
      this.bonjour = new Bonjour();
      this.bonjour.publish({
        name: 'ClickFlash-Master-Broker',
        type: 'clickflash-sync',
        port: this.port,
        txt: { version: '2.0.0', protocol: 'crdt-v1' }
      });
      logger.info(`[LanSyncBroker] Advertised service _clickflash-sync._tcp on port ${this.port}`);
    } catch (err: any) {
      logger.error(`[LanSyncBroker] Bonjour advertisement failed: ${err.message}`);
    }
  }

  /**
   * Handles incoming protocol messages from Touch kiosks
   */
  private handleIncomingMessage(ws: WebSocket, message: SyncMessage, clientIp: string): void {
    const { type, senderId, payload, timestamp } = message;

    switch (type) {
      case 'REGISTER': {
        const stationInfo: KioskStationInfo = {
          kioskId: senderId,
          name: payload.name || `Kiosk-${senderId.slice(0, 6)}`,
          ip: clientIp,
          resortId: payload.resortId,
          lastSeen: Date.now(),
          status: 'online',
          activeSessionId: payload.activeSessionId
        };
        this.connectedClients.set(senderId, { ws, info: stationInfo });
        logger.info(`[LanSyncBroker] Registered kiosk: ${stationInfo.name} (${senderId})`);
        this.emit('station:registered', stationInfo);

        // Send confirmation back
        this.sendMessageToClient(ws, {
          type: 'BROADCAST_EVENT',
          senderId: 'master',
          timestamp: Date.now(),
          payload: { event: 'REGISTER_SUCCESS', serverTimestamp: Date.now() }
        });
        break;
      }

      case 'HEARTBEAT': {
        const client = this.connectedClients.get(senderId);
        if (client) {
          client.info.lastSeen = Date.now();
          client.info.status = payload.status || 'online';
          client.info.activeSessionId = payload.activeSessionId;
        }
        break;
      }

      case 'RECONCILE_REQUEST': {
        const clientLogs: CRDTLogEntry[] = payload.logs || [];
        const clientTimestamp = payload.lastReconciledTimestamp || 0;
        const result = this.reconcileCRDTLogs(senderId, clientLogs, clientTimestamp);

        this.sendMessageToClient(ws, {
          type: 'RECONCILE_RESPONSE',
          senderId: 'master',
          timestamp: Date.now(),
          payload: result
        });
        break;
      }

      case 'ORDER_STATE_CHANGED':
      case 'PHOTO_INGESTED': {
        // Record log and broadcast to other peers
        if (payload.logEntry) {
          this.recordMutation(payload.logEntry);
        }
        this.broadcastMessage(type, payload, senderId);
        this.emit(type.toLowerCase(), { senderId, payload, timestamp });
        break;
      }

      case 'WEBRTC_OFFER':
      case 'WEBRTC_ANSWER':
      case 'WEBRTC_ICE': {
        const registeredSender = this.getClientIdForSocket(ws);
        const targetId = payload?.targetId;
        if (!registeredSender || registeredSender !== senderId || typeof targetId !== 'string') {
          logger.warn('[LanSyncBroker] Rejected unauthenticated or malformed WebRTC signal');
          break;
        }

        const target = this.connectedClients.get(targetId);
        if (!target || target.ws.readyState !== WebSocket.OPEN) {
          this.sendMessageToClient(ws, {
            type: 'BROADCAST_EVENT',
            senderId: 'master',
            timestamp: Date.now(),
            payload: {
              event: 'WEBRTC_PEER_UNAVAILABLE',
              targetId,
              transferId: payload.transferId
            }
          });
          break;
        }

        this.sendMessageToClient(target.ws, {
          ...message,
          senderId: registeredSender,
          timestamp: Date.now()
        });
        break;
      }

      default:
        logger.debug(`[LanSyncBroker] Unhandled message type: ${type}`);
    }
  }

  /**
   * Record a mutation log entry in Master CRDT state
   */
  public recordMutation(entry: CRDTLogEntry): void {
    const existing = this.mutationLog.get(entry.id);
    if (!existing || entry.timestamp > existing.timestamp) {
      this.mutationLog.set(entry.id, entry);
    }
  }

  /**
   * Reconcile client log entries with Master state and return deltas
   */
  public reconcileCRDTLogs(kioskId: string, clientLogs: CRDTLogEntry[], sinceTimestamp: number): {
    appliedCount: number;
    deltaLogs: CRDTLogEntry[];
    serverTimestamp: number;
  } {
    let appliedCount = 0;

    for (const clientLog of clientLogs) {
      const existing = this.mutationLog.get(clientLog.id);
      if (!existing || clientLog.timestamp > existing.timestamp) {
        this.mutationLog.set(clientLog.id, clientLog);
        appliedCount++;
      }
    }

    // Find all master mutations after sinceTimestamp not originated by this kiosk
    const deltaLogs: CRDTLogEntry[] = [];
    for (const log of this.mutationLog.values()) {
      if (log.timestamp > sinceTimestamp && log.nodeId !== kioskId) {
        deltaLogs.push(log);
      }
    }

    return {
      appliedCount,
      deltaLogs,
      serverTimestamp: Date.now()
    };
  }

  /**
   * Broadcast message to all connected kiosks except optional senderId
   */
  public broadcastMessage(type: SyncMessage['type'], payload: any, excludeSenderId?: string): void {
    const msg: SyncMessage = {
      type,
      senderId: 'master',
      timestamp: Date.now(),
      payload
    };

    const serialized = JSON.stringify(msg);
    for (const [kioskId, client] of this.connectedClients.entries()) {
      if (kioskId !== excludeSenderId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(serialized);
      }
    }
  }

  private sendMessageToClient(ws: WebSocket, message: SyncMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private getClientIdForSocket(ws: WebSocket): string | null {
    for (const [kioskId, client] of this.connectedClients.entries()) {
      if (client.ws === ws) return kioskId;
    }
    return null;
  }

  private handleClientDisconnect(ws: WebSocket): void {
    for (const [kioskId, client] of this.connectedClients.entries()) {
      if (client.ws === ws) {
        client.info.status = 'offline';
        logger.info(`[LanSyncBroker] Kiosk disconnected: ${client.info.name} (${kioskId})`);
        this.emit('station:disconnected', client.info);
        this.connectedClients.delete(kioskId);
        break;
      }
    }
  }

  public getConnectedStations(): KioskStationInfo[] {
    return Array.from(this.connectedClients.values()).map(c => c.info);
  }

  public async stop(): Promise<void> {
    if (this.bonjour) {
      this.bonjour.unpublishAll();
      this.bonjour.destroy();
      this.bonjour = null;
    }
    if (this.wss) {
      return new Promise((resolve) => {
        this.wss?.close(() => {
          this.isRunning = false;
          logger.info('[LanSyncBroker] Broker stopped');
          resolve();
        });
      });
    }
    this.isRunning = false;
  }
}

export const lanSyncBroker = LanSyncBroker.getInstance();
