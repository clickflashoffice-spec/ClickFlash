import { getPendingScans, markAsSynced } from '../db/database';
import { logger } from "@clickflash/logger";

interface SyncConfig {
  deskId: string;
  masterLanIp: string | null;
  masterLanPort: number | null;
  cloudApiUrl: string;
  jwtToken: string;
}

/**
 * ClickFlash Staff Sync Engine
 * Handles offline queue with LAN preference and LTE fallback.
 */
export class SyncEngine {
  private isSyncing = false;
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private config: SyncConfig | null = null;

  setConfig(config: SyncConfig) {
    this.config = config;
  }

  start(intervalMs = 5000) {
    if (this.syncInterval) return;
    this.syncInterval = setInterval(() => this.syncNow(), intervalMs);
  }

  stop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  async syncNow() {
    if (this.isSyncing || !this.config) return;
    
    const pendingScans = getPendingScans();
    if (pendingScans.length === 0) return;

    this.isSyncing = true;
    
    try {
      // 1. Try LAN (Master) first
      if (this.config.masterLanIp && this.config.masterLanPort) {
        const lanUrl = `http://${this.config.masterLanIp}:${this.config.masterLanPort}/api/sync`;
        const lanSuccess = await this.pushToRemote(lanUrl, pendingScans, 'lan');
        if (lanSuccess) {
          this.isSyncing = false;
          return;
        }
      }

      // 2. Fallback to Cloud (LTE or other WiFi)
      const cloudUrl = `${this.config.cloudApiUrl}/api/sync/${this.config.deskId}`;
      await this.pushToRemote(cloudUrl, pendingScans, 'cloud');
      
    } catch (error) {
      logger.warn("Sync failed:", { args: [error] });
    } finally {
      this.isSyncing = false;
    }
  }

  private async pushToRemote(url: string, scans: any[], route: 'lan' | 'cloud'): Promise<boolean> {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config?.jwtToken}`
        },
        body: JSON.stringify({ scans })
      });

      if (res.ok) {
        // Mark all as synced
        for (const scan of scans) {
          markAsSynced(scan.id, route);
        }
        return true;
      }
      return false;
    } catch (e) {
      // Network error
      return false;
    }
  }
}

export const syncEngine = new SyncEngine();
