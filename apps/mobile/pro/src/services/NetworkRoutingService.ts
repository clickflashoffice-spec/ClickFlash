import { discoveryService } from './discoveryService';
import { meshSyncService } from './MeshSyncService';
import { offlineQueueService } from './OfflineQueueService';
import { appState } from '../store';
import { logger } from "@/utils/logger";
import { RustCore } from '../../modules/clickflash-rust-core';

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

    appState.network.status = this.getStatusSnapshot();
    appState.network.relayQueueStatus = meshSyncService.getRelayQueueStatus();
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
   * Flushes items stored in OfflineQueueService over the active connection using Rust Core.
   */
  public async flushOfflineQueue(): Promise<{ processed: number; failed: number }> {
    if (this.isFlushingQueue) return { processed: 0, failed: 0 };
    this.isFlushingQueue = true;

    try {
      const items = await offlineQueueService.getQueue();
      if (items.length === 0) {
        this.isFlushingQueue = false;
        return { processed: 0, failed: 0 };
      }

      logger.info(`[NetworkRoutingService] Flushing ${items.length} items from offline queue via Rust Core...`);

      // Determine the target URL prefix
      let targetPrefix = this.cloudBaseUrl;
      if ((this.currentTier === 'ONLINE_HYBRID' || this.currentTier === 'ONLINE_MASTER_ONLY') && this.masterIp) {
        targetPrefix = `http://${this.masterIp}:${this.masterPort}`;
      } else if (this.currentTier === 'OFFLINE_MESH') {
         // Mesh relay is handled separately for photos, but for events we wait.
         logger.info(`[NetworkRoutingService] Events wait in queue during OFFLINE_MESH tier.`);
         return { processed: 0, failed: 0 };
      }

      // Delegate to high-performance Rust core
      const resultMsg = await RustCore.syncPendingEvents({
        dbPath: 'offline_queue.db',
        targetUrlPrefix: targetPrefix
      });

      logger.info(`[NetworkRoutingService] Rust Core sync result: ${resultMsg}`);
      
      // We don't have exact processed/failed counts parsed from the string here natively,
      // but we update the pending count.
      this.pendingOfflineCount = await offlineQueueService.getQueueSize();
      
    } catch (err) {
      logger.error(`[NetworkRoutingService] Failed to flush offline queue via Rust Core:`, err);
    } finally {
      this.isFlushingQueue = false;
      appState.network.status = this.getStatusSnapshot();
      appState.network.relayQueueStatus = meshSyncService.getRelayQueueStatus();
    }

    // Return dummy numbers as rust core handled it natively
    return { processed: 0, failed: 0 };
  }
}

export const networkRoutingService = NetworkRoutingService.getInstance();
