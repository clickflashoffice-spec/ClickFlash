import { Logger } from '../utils/logger';
import { DatabaseManager } from '../database/db';
import { ResortAnalyticsService } from "./ResortAnalyticsService";

interface SyncTarget {
    url: string;
    token: string;
    deskId: string;
}

export class DiagnosticSyncService {
    private timer: NodeJS.Timeout | null = null;
    private isSyncing = false;

    constructor(
        private db: DatabaseManager,
        private logger: Logger,
        private resortAnalytics: ResortAnalyticsService
    ) {}

    public start(intervalMs: number = 1000 * 60 * 5) { // Default every 5 minutes
        if (this.timer) return;
        
        this.logger.info(`[DiagnosticSync] Starting scheduler (Interval: ${intervalMs}ms)`);
        this.timer = setInterval(() => this.runSync(), intervalMs);
        
        // Initial run after short delay
        setTimeout(() => this.runSync(), 5000);
    }

    public stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    private async getSyncTarget(): Promise<SyncTarget | null> {
        try {
            const urlRow = this.db.get<{ value: string }>("SELECT value FROM settings WHERE key = 'cloud_url'");
            const tokenRow = this.db.get<{ value: string }>("SELECT value FROM settings WHERE key = 'cloud_token'");
            const deskIdRow = this.db.get<{ value: string }>("SELECT value FROM settings WHERE key = 'desk_id'");

            const url = urlRow?.value || process.env.CLOUD_API_URL;
            const token = tokenRow?.value || process.env.CLOUD_TOKEN;
            const deskId = deskIdRow?.value || process.env.DESK_ID || 'MASTER_01';

            if (!url || !token) {
                this.logger.debug("[DiagnosticSync] Sync skipped: Cloud credentials not configured");
                return null;
            }

            return { url, token, deskId };
        } catch (e) {
            return null;
        }
    }

    public async runSync() {
        if (this.isSyncing) return;
        
        const target = await this.getSyncTarget();
        if (!target) return;

        this.isSyncing = true;
        this.logger.info("[DiagnosticSync] Beginning synchronization cycle...");

        try {
            await Promise.all([
                this.syncYield(target),
                this.syncCRM(target),
                this.syncTriage(target)
            ]);
            this.logger.info("[DiagnosticSync] Cycle completed successfully");
        } catch (error) {
            this.logger.error("[DiagnosticSync] Sync cycle failed", { error: error instanceof Error ? error.message : String(error) });
        } finally {
            this.isSyncing = false;
        }
    }

    private async syncYield(target: SyncTarget) {
        try {
            const report = await this.resortAnalytics.getDailyReport();
            const date = new Date().toISOString().split('T')[0];
            
            // Calculate yield metrics from the daily report
            const payload = {
                stats: [{
                    date,
                    total_orders: report.operational.viewing_sessions, // Viewing sessions as a proxy for engagement
                    paid_orders: report.photographers.reduce((acc, p) => acc + (p.meetings_made || 0), 0),
                    avg_order_value: report.photographers.reduce((acc, p) => acc + (p.income_simple + p.income_multiple), 0) / 
                                     Math.max(1, report.photographers.reduce((acc, p) => acc + (p.meetings_made || 0), 0))
                }]
            };

            const res = await fetch(`${target.url}/api/sync/cloud/sync/yield`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${target.token}`
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            this.logger.debug("[DiagnosticSync] Yield data synced");
        } catch (e) {
            this.logger.error("[DiagnosticSync] Yield sync failed", { error: e instanceof Error ? e.message : String(e) });
        }
    }

    private async syncCRM(target: SyncTarget) {
        try {
            // Check if prospects table exists first
            const hasProspects = this.db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='prospects'");
            if (!hasProspects) return;

            const leads = this.db.query("SELECT * FROM prospects WHERE sync_status = 'pending' LIMIT 50");
            if (leads.length === 0) return;

            const res = await fetch(`${target.url}/api/cloud/sync/crm`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${target.token}`
                },
                body: JSON.stringify({ leads })
            });

            if (res.ok) {
                // Mark as synced
                const ids = leads.map(l => l.id);
                const chunkSize = 500;
                for (let i = 0; i < ids.length; i += chunkSize) {
                    const chunk = ids.slice(i, i + chunkSize);
                    this.db.run(`UPDATE prospects SET sync_status = 'synced' WHERE id IN (${chunk.map(() => '?').join(',')})`, chunk);
                }
                this.logger.debug(`[DiagnosticSync] Synced ${leads.length} CRM leads`);
            }
        } catch (e) {
            this.logger.error("[DiagnosticSync] CRM sync failed", { error: e instanceof Error ? e.message : String(e) });
        }
    }

    private async syncTriage(target: SyncTarget) {
        try {
            const si = require('systeminformation');
            const temp = await si.cpuTemperature();
            const mem = await si.mem();
            
            const payload = {
                timestamp: new Date().toISOString(),
                metrics: {
                    cpu_temp: temp.main || 0,
                    disk_io: "Normal",
                    latency: 0, // Could measure ping to hub
                    memory_pressure: (mem.active / mem.total) * 100
                }
            };

            const res = await fetch(`${target.url}/api/sync/cloud/sync/triage`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${target.token}`
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            this.logger.debug("[DiagnosticSync] Triage metrics synced");
        } catch (e) {
            this.logger.error("[DiagnosticSync] Triage sync failed", { error: e instanceof Error ? e.message : String(e) });
        }
    }
}
