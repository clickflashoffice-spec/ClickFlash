import { discoveryService } from './discoveryService';
import { meshSyncService } from './MeshSyncService';
import { offlineQueueService } from './OfflineQueueService';
import { logger } from "@/utils/logger";

export type ConnectionTier = 
  | 'ONLINE_HYBRID'      // Both LAN Master PC and Cloud Edge reachable
  | 'ONLINE_MASTER_ONLY' // Only LAN Master PC reachable (isolated Wi-Fi / beach kiosk)
  | 'ONLINE_CLOUD_ONLY'  // Only Cloud Edge reachable (4G/5G mobile roaming)
  | 'OFFLINE_MESH'       // Neither direct reachable, but P2P mesh relay peers discovered
  | 'OFFLINE';           // Complete isolation, writes queue to local disk

export interface NetworkStatusSnapshot {
  tier: ConnectionTier;
  masterIp: string | null;
  masterLatencyMs: number | null;
  cloudLatencyMs: number | null;
  meshPeersCount: number;
  pendingOfflineCount: number;
  lastChecked: number;
}

export type NetworkStatusListener = (status: NetworkStatusSnapshot) => void;

export class NetworkRoutingService {
  private static instance: NetworkRoutingService;
  private masterIp: string | null = null;
  private masterPort: number = 8090;
  private cloudBaseUrl: string = 'https://clickflash-api.yourdomain.workers.dev';
  
  private masterLatencyMs: number | null = null;
  private cloudLatencyMs: number | null = null;
  private currentTier: ConnectionTier = 'OFFLINE';
  private pingIntervalId: ReturnType<typeof setInterval> | null = null;
  private listeners: Set<NetworkStatusListener> = new Set();
  private isFlushingQueue: boolean = false;
  private pendingOfflineCount: number = 0;

  private constructor() {
    this.startPingLoop();
  }

  public static getInstance(): NetworkRoutingService {
    if (!NetworkRoutingService.instance) {
      NetworkRoutingService.instance = new NetworkRoutingService();
    }
    return NetworkRoutingService.instance;
  }

  public subscribe(listener: NetworkStatusListener): () => void {
    this.listeners.add(listener);
    listener(this.getStatusSnapshot());
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const status = this.getStatusSnapshot();
    this.listeners.forEach(listener => listener(status));
  }

  public getStatusSnapshot(): NetworkStatusSnapshot {
    return {
      tier: this.currentTier,
      masterIp: this.masterIp,
      masterLatencyMs: this.masterLatencyMs,
      cloudLatencyMs: this.cloudLatencyMs,
      meshPeersCount: meshSyncService.getDiscoveredPeers().length,
      pendingOfflineCount: this.pendingOfflineCount,
      lastChecked: Date.now()
    };
  }

  /**
   * Start periodic health checks of Master PC and Cloud Edge.
   */
  public startPingLoop(intervalMs: number = 8000): void {
    if (this.pingIntervalId) clearInterval(this.pingIntervalId);
    
    // Immediate check on startup
    setTimeout(() => this.checkHealth(), 500);

    this.pingIntervalId = setInterval(() => {
      this.checkHealth();
    }, intervalMs);
  }

  public async checkHealth(): Promise<NetworkStatusSnapshot> {
    const previousTier = this.currentTier;

    // 1. Discover Master IP if unknown
    if (!this.masterIp) {
      this.masterIp = await discoveryService.discoverMasterPC();
    }

    // 2. Ping Cloud Edge
    this.cloudLatencyMs = await this.pingUrl(`${this.cloudBaseUrl}/api/health`, 3000);

    // 3. Ping Master PC
    if (this.masterIp) {
      this.masterLatencyMs = await this.pingUrl(`http://${this.masterIp}:${this.masterPort}/api/health`, 2000);
      if (this.masterLatencyMs === null) {
        // If master health failed, attempt quick rediscover once
        this.masterIp = await discoveryService.discoverMasterPC();
        if (this.masterIp) {
          this.masterLatencyMs = await this.pingUrl(`http://${this.masterIp}:${this.masterPort}/api/health`, 2000);
        }
      }
    } else {
      this.masterLatencyMs = null;
    }

    // 4. Check Mesh Peers
    const meshPeers = meshSyncService.getDiscoveredPeers();

    // 5. Determine active tier
    const isCloudOnline = this.cloudLatencyMs !== null;
    const isMasterOnline = this.masterLatencyMs !== null;

    if (isCloudOnline && isMasterOnline) {
      this.currentTier = 'ONLINE_HYBRID';
    } else if (isMasterOnline) {
      this.currentTier = 'ONLINE_MASTER_ONLY';
    } else if (isCloudOnline) {
      this.currentTier = 'ONLINE_CLOUD_ONLY';
    } else if (meshPeers.length > 0) {
      this.currentTier = 'OFFLINE_MESH';
    } else {
      this.currentTier = 'OFFLINE';
    }

    // 6. If we transitioned from offline/mesh to online, flush offline queue
    const wasOffline = previousTier === 'OFFLINE' || previousTier === 'OFFLINE_MESH';
    const isNowOnline = this.currentTier === 'ONLINE_HYBRID' || this.currentTier === 'ONLINE_MASTER_ONLY' || this.currentTier === 'ONLINE_CLOUD_ONLY';
    
    if (wasOffline && isNowOnline) {
      logger.info(`[NetworkRoutingService] Transitioned to ${this.currentTier}. Flushing offline queue...`);
      this.flushOfflineQueue();
    }

    this.pendingOfflineCount = await offlineQueueService.getQueueSize();

    this.notifyListeners();
    return this.getStatusSnapshot();
  }

  private async pingUrl(url: string, timeoutMs: number): Promise<number | null> {
    const start = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        return Date.now() - start;
      }
      return null;
    } catch {
      clearTimeout(timeoutId);
      return null;
    }
  }

  /**
   * Resolves the best target URL for an API request based on current network tier.
   * @param path The API endpoint path, e.g. '/api/shifts' or '/api/photos/upload'
   * @param preferMaster True for high-bandwidth/local data (photos, shifts); False for global config
   */
  public resolveTargetUrl(path: string, preferMaster: boolean = true): string | null {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;

    // If both available and we prefer master (or cloud is slower/unreachable)
    if (this.currentTier === 'ONLINE_HYBRID') {
      if (preferMaster && this.masterIp) {
        // Route to Master proxy/LAN endpoint
        if (cleanPath === '/api/shifts') return `http://${this.masterIp}:${this.masterPort}/api/shifts/proxy`;
        if (cleanPath === '/api/photographers/enroll-face') return `http://${this.masterIp}:${this.masterPort}/api/photographers/enroll-face/proxy`;
        return `http://${this.masterIp}:${this.masterPort}${cleanPath}`;
      }
      return `${this.cloudBaseUrl}${cleanPath}`;
    }

    if (this.currentTier === 'ONLINE_MASTER_ONLY' && this.masterIp) {
      if (cleanPath === '/api/shifts') return `http://${this.masterIp}:${this.masterPort}/api/shifts/proxy`;
      if (cleanPath === '/api/photographers/enroll-face') return `http://${this.masterIp}:${this.masterPort}/api/photographers/enroll-face/proxy`;
      return `http://${this.masterIp}:${this.masterPort}${cleanPath}`;
    }

    if (this.currentTier === 'ONLINE_CLOUD_ONLY') {
      return `${this.cloudBaseUrl}${cleanPath}`;
    }

    return null;
  }

  /**
   * Flushes items stored in OfflineQueueService over the active connection.
   */
  public async flushOfflineQueue(): Promise<{ processed: number; failed: number }> {
    if (this.isFlushingQueue) return { processed: 0, failed: 0 };
    this.isFlushingQueue = true;

    let processed = 0;
    let failed = 0;

    try {
      const items = await offlineQueueService.getQueue();
      if (items.length === 0) {
        this.isFlushingQueue = false;
        return { processed: 0, failed: 0 };
      }

      logger.info(`[NetworkRoutingService] Flushing ${items.length} items from offline queue...`);

      for (const item of items) {
        const targetUrl = this.resolveTargetUrl(item.endpoint, true);
        if (!targetUrl) {
          if (this.currentTier === 'OFFLINE_MESH' && item.type === 'PHOTO_SYNC') {
             const payloadData = item.payload as any;
             const relayed = await meshSyncService.queueForPeerRelay({
                id: item.id,
                uri: payloadData.uri, 
                filename: payloadData.filename, 
                aiMetadata: payloadData.aiMetadata,
                mediaType: 'photo',
                creationTime: item.timestamp,
                width: 0, height: 0, fileSize: 0
             });
             if (relayed) {
               await offlineQueueService.dequeue(item.id);
               processed++;
               continue;
             }
          }
          logger.info(`[NetworkRoutingService] No route available right now during flush. Pausing.`);
          break;
        }

        try {
          let headers: Record<string, string> = { 'Content-Type': 'application/json' };
          let body: any = item.payload ? JSON.stringify(item.payload) : undefined;

          if (item.type === 'PHOTO_SYNC') {
            const formData = new FormData();
            const payloadData = item.payload as any;
            formData.append('photo', {
                uri: payloadData.uri,
                name: payloadData.filename,
                type: 'image/jpeg',
            } as any);

            if (payloadData.aiMetadata) {
                formData.append('aiMetadata', JSON.stringify(payloadData.aiMetadata));
            }
            body = formData;
            headers = {
                'Accept': 'application/json',
            };
          }

          const res = await fetch(targetUrl, {
            method: item.method,
            headers,
            body
          });

          if (res.ok) {
            await offlineQueueService.dequeue(item.id);
            processed++;
            logger.info(`[NetworkRoutingService] ✔ Flushed offline item ${item.id} (${item.type})`);
          } else {
            await offlineQueueService.incrementRetry(item.id);
            failed++;
          }
        } catch (err) {
          logger.error(`[NetworkRoutingService] Failed to flush item ${item.id}:`, err);
          await offlineQueueService.incrementRetry(item.id);
          failed++;
          break;
        }
      }
    } finally {
      this.isFlushingQueue = false;
      this.notifyListeners();
    }

    return { processed, failed };
  }
}

export const networkRoutingService = NetworkRoutingService.getInstance();
