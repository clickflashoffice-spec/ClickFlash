import * as si from 'systeminformation';
import { Logger } from '../utils/logger';
import { DatabaseManager } from '../database/db';
import { ThermalService } from '../services/thermalService';

export interface FleetMetrics {
    cpu: {
        load: number;
        temp: number | null;
    };
    memory: {
        used: number;
        total: number;
        percent: number;
    };
    disk: {
        used: number;
        total: number;
        percent: number;
    };
    queueDepth: {
        photos: number;
        db: number;
    };
    sales: {
        todayRevenue: number;
        todayOrders: number;
        pendingOrders: number;
    };
    uptime: number;
}

export class FleetService {
    private logger: Logger;
    private db: DatabaseManager;
    private thermalService: ThermalService;
    private photoProcessor: any;
    private dbWriteQueue: any;
    private interval: NodeJS.Timeout | null = null;
    private masterId: string | null = null;
    private hubUrl: string;
    private lastHeartbeatSuccessful: boolean = true;

    constructor(
        logger: Logger,
        db: DatabaseManager,
        thermalService: ThermalService,
        photoProcessor: any,
        dbWriteQueue: any,
        hubUrl: string
    ) {
        this.logger = logger;
        this.db = db;
        this.thermalService = thermalService;
        this.photoProcessor = photoProcessor;
        this.dbWriteQueue = dbWriteQueue;
        this.hubUrl = hubUrl;
    }

    /**
     * Starts the periodic heartbeat reporter
     * @param intervalMs Default 60 seconds
     */
    public async start(intervalMs: number = 60000) {
        if (this.interval) return;

        try {
            // Get unique station ID (UUID)
            const system = await si.uuid();
            this.masterId = system.os || system.hardware || 'unknown-master';

            this.logger.info(`[FleetService] Starting heartbeat for Master ID: ${this.masterId} -> ${this.hubUrl}`);

            // Initial heartbeat
            await this.sendHeartbeat();

            this.interval = setInterval(() => this.sendHeartbeat(), intervalMs);
        } catch (error: any) {
            this.logger.error('[FleetService] Failed to initialize fleet monitoring', { error: error.message });
        }
    }

    public stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }

    private async sendHeartbeat() {
        if (!this.hubUrl || this.hubUrl === 'http://localhost:8080') {
            // Skip if no Hub URL configured or pointing to loopback (default)
            return;
        }

        try {
            const metrics = await this.collectMetrics();
            const stationName = this.db.get<{ value: string }>("SELECT value FROM settings WHERE key = 'station_name'")?.value || 'Master Station';
            const version = process.env.npm_package_version || '4.2.0';

            const payload = {
                masterId: this.masterId,
                name: stationName,
                version: version,
                metrics,
                status: metrics.cpu.temp && metrics.cpu.temp > 85 ? 'Degraded' : 'Online',
                sales: metrics.sales // Explicitly include sales at top level for easier parsing if needed, or just rely on metrics.sales
            };

            const response = await fetch(`${this.hubUrl}/api/masters/heartbeat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                if (!this.lastHeartbeatSuccessful) {
                    this.logger.info('[FleetService] Connection to Management Hub restored.', { salesIncluded: true });
                    this.lastHeartbeatSuccessful = true;
                }
            } else {
                throw new Error(`Hub returned status ${response.status}`);
            }
        } catch (error: any) {
            if (this.lastHeartbeatSuccessful) {
                this.logger.warn('[FleetService] Hub heartbeat failed (likely offline/unreachable)', {
                    error: error.message,
                    url: `${this.hubUrl}/api/masters/heartbeat`
                });
                this.lastHeartbeatSuccessful = false;
            }
        }
    }

    private async collectMetrics(): Promise<FleetMetrics> {
        const [cpuLoad, mem, fsSize, thermal] = await Promise.all([
            si.currentLoad(),
            si.mem(),
            si.fsSize(),
            this.thermalService.getStatus()
        ]);

        const rootFs = fsSize.find(f => f.mount === '/' || f.mount === 'C:') || fsSize[0];

        // Gather Sales Metrics
        const today = new Date().toISOString().split('T')[0];
        const revenueResult = this.db.get<{ revenue: number }>('SELECT SUM(total) as revenue FROM orders WHERE date = ? AND status = ?', [today, 'Completed']);
        const orderCountResult = this.db.get<{ count: number }>('SELECT COUNT(*) as count FROM orders WHERE date = ? AND status = ?', [today, 'Completed']);
        const pendingCountResult = this.db.get<{ count: number }>("SELECT COUNT(*) as count FROM orders WHERE status = 'Pending'");

        const salesMetrics = {
            todayRevenue: revenueResult?.revenue || 0,
            todayOrders: orderCountResult?.count || 0,
            pendingOrders: pendingCountResult?.count || 0
        };

        return {
            cpu: {
                load: Math.round(cpuLoad.currentLoad),
                temp: thermal.temp
            },
            memory: {
                used: Math.round(mem.active / 1024 / 1024),
                total: Math.round(mem.total / 1024 / 1024),
                percent: Math.round((mem.active / mem.total) * 100)
            },
            disk: {
                used: rootFs ? Math.round(rootFs.used / 1024 / 1024 / 1024) : 0,
                total: rootFs ? Math.round(rootFs.size / 1024 / 1024 / 1024) : 0,
                percent: rootFs ? Math.round(rootFs.use) : 0
            },
            queueDepth: {
                photos: this.photoProcessor?.getQueueLength?.() || 0,
                db: this.dbWriteQueue?.getQueueLength?.() || 0
            },
            uptime: Math.round(process.uptime()),
            sales: salesMetrics
        };
    }
}
