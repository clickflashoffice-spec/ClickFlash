import { Bonjour } from 'bonjour-service';
import { logger } from '@/utils/logger';

export interface CRDTLogEntry {
  id: string;
  entityType: 'photo' | 'order' | 'session' | 'station';
  entityId: string;
  mutationType: 'create' | 'update' | 'delete';
  data: Record<string, any>;
  timestamp: number;
  nodeId: string;
}

export interface SyncMessage {
  type: 'REGISTER' | 'HEARTBEAT' | 'PHOTO_INGESTED' | 'ORDER_STATE_CHANGED' | 'RECONCILE_REQUEST' | 'RECONCILE_RESPONSE' | 'BROADCAST_EVENT';
  senderId: string;
  timestamp: number;
  payload: any;
}

export class TouchSyncClient {
  private static instance: TouchSyncClient;
  private ws: WebSocket | null = null;
  private bonjour: any = null;
  private kioskId: string;
  private masterUrl: string = 'ws://127.0.0.1:8092';
  private offlineQueue: CRDTLogEntry[] = [];
  private lastReconciledTimestamp: number = 0;
  private isConnecting: boolean = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private listeners: Map<string, Array<(...args: any[]) => void>> = new Map();

  private constructor() {
    this.kioskId = `kiosk-${Math.random().toString(36).substring(2, 9)}`;
  }

  public static getInstance(): TouchSyncClient {
    if (!TouchSyncClient.instance) {
      TouchSyncClient.instance = new TouchSyncClient();
    }
    return TouchSyncClient.instance;
  }

  public init(): void {
    logger.info(`[TouchSyncClient] Initializing kiosk instance: ${this.kioskId}`);
    this.discoverMasterViaBonjour();
    this.connect();
  }

  public on(event: string, callback: (...args: any[]) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(callback);
  }

  private emit(event: string, ...args: any[]): void {
    const callbacks = this.listeners.get(event) || [];
    for (const cb of callbacks) {
      try {
        cb(...args);
      } catch (err: any) {
        logger.error(`[TouchSyncClient] Event listener error for ${event}: ${err.message}`);
      }
    }
  }

  /**
   * Start discovery and connect to Master broker
   */
  public async start(customMasterUrl?: string): Promise<void> {
    if (customMasterUrl) {
      this.masterUrl = customMasterUrl;
    } else {
      this.discoverMasterViaBonjour();
    }
    this.connect();
  }

  private discoverMasterViaBonjour(): void {
    try {
      this.bonjour = new Bonjour();
      const browser = this.bonjour.find({ type: 'clickflash-sync' });

      browser.on('up', (service: any) => {
        logger.info(`[TouchSyncClient] Discovered Master on ${service.host}:${service.port}`);
        if (service.host && service.port) {
          const host = service.host === 'localhost' ? '127.0.0.1' : service.host;
          this.masterUrl = `ws://${host}:${service.port}`;
          if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            this.connect();
          }
        }
      });

      browser.on('error', (err: any) => {
        logger.warn(`[TouchSyncClient] Bonjour discovery error: ${err.message}`);
      });
    } catch (err: any) {
      logger.warn(`[TouchSyncClient] Bonjour discovery initialization failed: ${err.message}`);
    }
  }

  public connect(): void {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) return;
    this.isConnecting = true;

    try {
      logger.info(`[TouchSyncClient] Connecting to Master broker at ${this.masterUrl}`);
      this.ws = new WebSocket(this.masterUrl);

      this.ws.onopen = () => {
        this.isConnecting = false;
        logger.info('[TouchSyncClient] Connected to Master sync broker');
        this.emit('status', 'connected');

        // Register station
        this.send({
          type: 'REGISTER',
          senderId: this.kioskId,
          timestamp: Date.now(),
          payload: { name: `Touch-Station-${this.kioskId.slice(-4)}` }
        });

        this.startHeartbeat();
        this.flushOfflineQueue();
        this.requestReconcile();
      };

      this.ws.onmessage = (event) => {
        try {
          const msg: SyncMessage = JSON.parse(event.data.toString());
          this.handleIncomingMessage(msg);
        } catch (err: any) {
          logger.error(`[TouchSyncClient] Parse error: ${err.message}`);
        }
      };

      this.ws.onclose = () => {
        this.isConnecting = false;
        this.stopHeartbeat();
        logger.warn('[TouchSyncClient] Disconnected from Master broker');
        this.emit('status', 'disconnected');
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        this.isConnecting = false;
        logger.error(`[TouchSyncClient] WebSocket error: ${err}`);
      };
    } catch (err: any) {
      this.isConnecting = false;
      logger.error(`[TouchSyncClient] Connection attempt failed: ${err.message}`);
      this.scheduleReconnect();
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.send({
        type: 'HEARTBEAT',
        senderId: this.kioskId,
        timestamp: Date.now(),
        payload: { status: 'online' }
      });
    }, 15000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 5000);
  }

  private handleIncomingMessage(msg: SyncMessage): void {
    switch (msg.type) {
      case 'RECONCILE_RESPONSE': {
        const { deltaLogs, serverTimestamp } = msg.payload;
        if (Array.isArray(deltaLogs)) {
          for (const delta of deltaLogs) {
            this.emit('mutation:remote', delta);
          }
        }
        if (serverTimestamp) {
          this.lastReconciledTimestamp = Math.max(this.lastReconciledTimestamp, serverTimestamp);
        }
        break;
      }
      case 'BROADCAST_EVENT':
      case 'PHOTO_INGESTED':
      case 'ORDER_STATE_CHANGED': {
        this.emit(msg.type.toLowerCase(), msg.payload);
        break;
      }
    }
  }

  public recordMutation(entry: Omit<CRDTLogEntry, 'nodeId' | 'timestamp'>): void {
    const fullEntry: CRDTLogEntry = {
      ...entry,
      nodeId: this.kioskId,
      timestamp: Date.now()
    };

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.send({
        type: 'ORDER_STATE_CHANGED',
        senderId: this.kioskId,
        timestamp: Date.now(),
        payload: { logEntry: fullEntry }
      });
    } else {
      this.offlineQueue.push(fullEntry);
      logger.info(`[TouchSyncClient] Offline: Queued mutation ${fullEntry.id} (${this.offlineQueue.length} pending)`);
    }
  }

  public requestReconcile(): void {
    this.send({
      type: 'RECONCILE_REQUEST',
      senderId: this.kioskId,
      timestamp: Date.now(),
      payload: {
        logs: this.offlineQueue,
        lastReconciledTimestamp: this.lastReconciledTimestamp
      }
    });
  }

  private flushOfflineQueue(): void {
    if (this.offlineQueue.length === 0) return;
    logger.info(`[TouchSyncClient] Flushing ${this.offlineQueue.length} queued offline mutations to Master`);
    this.requestReconcile();
    this.offlineQueue = [];
  }

  private send(msg: SyncMessage): boolean {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
      return true;
    }
    return false;
  }

  public getOfflineQueueLength(): number {
    return this.offlineQueue.length;
  }

  public stop(): void {
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.bonjour) {
      this.bonjour.destroy();
      this.bonjour = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const touchSyncClient = TouchSyncClient.getInstance();
