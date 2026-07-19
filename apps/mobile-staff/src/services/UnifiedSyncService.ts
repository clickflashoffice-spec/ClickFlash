import { 
  getPendingScans, markScanAsSynced, 
  getPendingCheckins, markCheckinAsSynced,
  getPendingPosTransactions, markPosTransactionAsSynced,
  getPendingApprovals, insertPendingApproval, updateApprovalStatus
} from '../../db/database';
import { logger } from '../utils/logger';

interface SyncConfig {
  deskId: string;
  masterLanIp: string | null;
  masterLanPort: number | null;
  cloudApiUrl: string;
  jwtToken: string;
}

export class UnifiedSyncServiceImpl {
  private isSyncing = false;
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private config: SyncConfig | null = null;

  setConfig(config: SyncConfig) {
    this.config = config;
  }

  start(intervalMs = 4000) {
    if (this.syncInterval) return;
    this.syncInterval = setInterval(() => this.syncNow(), intervalMs);
    // Add initial mock pending approvals if queue is empty so QA/dev can test approval flows
    this.seedMockApprovals();
  }

  stop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  private seedMockApprovals() {
    try {
      const existing = getPendingApprovals();
      if (existing.length === 0) {
        insertPendingApproval({
          id: `appr_mock_cash_101`,
          type: 'cash_payment',
          session_id: 'SESS_4821',
          amount: 85.00,
          currency: 'USD',
          details: 'All-Inclusive Digital Album - Guest: Mr. Henderson (Room 304)',
          created_at: new Date(Date.now() - 120000).toISOString()
        });
        insertPendingApproval({
          id: `appr_mock_mod_202`,
          type: 'photo_moderation',
          session_id: 'SESS_9912',
          details: 'Sunset VIP Couple Session - 14 photos pending quality & release check',
          created_at: new Date(Date.now() - 300000).toISOString()
        });
      }
    } catch (e) {}
  }

  async syncNow() {
    if (this.isSyncing) return;
    this.isSyncing = true;

    try {
      const pendingScans = getPendingScans();
      const pendingCheckins = getPendingCheckins();
      const pendingTx = getPendingPosTransactions();

      if (pendingScans.length === 0 && pendingCheckins.length === 0 && pendingTx.length === 0) {
        this.isSyncing = false;
        return;
      }

      const masterBaseUrl = this.config?.masterLanIp 
        ? `http://${this.config.masterLanIp}:${this.config.masterLanPort || 8090}`
        : `http://192.168.1.100:8090`;
      
      const authHeader = `Bearer ${this.config?.jwtToken || 'CLICKFLASH_PSK_SECRET'}`;

      try {
        // Sync Scans and TX to /api/sync/batch (or similar endpoint)
        if (pendingScans.length > 0 || pendingTx.length > 0) {
          const res = await fetch(`${masterBaseUrl}/api/sync/batch`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': authHeader
            },
            body: JSON.stringify({
              scans: pendingScans,
              transactions: pendingTx
            })
          });

          if (res.ok) {
            pendingScans.forEach(s => markScanAsSynced(s.id, 'lan'));
            pendingTx.forEach(t => markPosTransactionAsSynced(t.id));
            logger.info(`[UnifiedSync] Synced ${pendingScans.length} scans, ${pendingTx.length} tx to Master`);
          }
        }

        // Sync Checkins to /api/shifts/proxy
        for (const checkin of pendingCheckins) {
          try {
            const shiftRes = await fetch(`${masterBaseUrl}/api/shifts/proxy`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader
              },
              body: JSON.stringify({
                id: checkin.id,
                photographerId: checkin.staff_id,
                type: checkin.type === 'check_in' ? 'CLOCK_IN' : 'CLOCK_OUT',
                timestamp: checkin.timestamp,
                latitude: checkin.latitude,
                longitude: checkin.longitude,
                biometricVerified: false
              })
            });

            if (shiftRes.ok) {
              markCheckinAsSynced(checkin.id);
            }
          } catch (e) {
            logger.warn(`Failed to sync checkin ${checkin.id}`, { args: [e] });
          }
        }

      } catch (netErr) {
        // Fallback or keep in SQLite queue
        logger.debug('[UnifiedSync] Master unreachable, items queued offline in staff.db');
      }
    } catch (error) {
      logger.warn('[UnifiedSync] Sync error:', { args: [error] });
    } finally {
      this.isSyncing = false;
    }
  }

  public async approveItem(id: string) {
    updateApprovalStatus(id, 'approved');
    logger.info(`[UnifiedSync] Item ${id} approved`);
  }

  public async rejectItem(id: string) {
    updateApprovalStatus(id, 'rejected');
    logger.info(`[UnifiedSync] Item ${id} rejected`);
  }
}

export const UnifiedSyncService = new UnifiedSyncServiceImpl();
export const syncEngine = UnifiedSyncService; // Backwards compatibility export
