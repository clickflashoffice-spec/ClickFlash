import { Logger } from '../utils/logger';
import DatabaseManager from '../database/db';
import * as path from "path";
import * as fs from "fs";
import FormData from "form-data";
import { HardwareService } from '../services/SystemHardwareService';
import { ArchiveService } from "./ArchiveService";
import { ResourceMonitor } from '../services/ResourceMonitor';
import { tunnelManager } from "./TunnelManager";
import { ResortAnalyticsService } from "./ResortAnalyticsService";
import { AuditService } from './auditService';
import { TABLE_MAP, ALLOWED_COLUMNS } from "../config/constants";
import { executeWithRetry } from '../utils/networkUtils';
import { timeService } from '../services/timeService';
import { PipelineResult, SyncContext } from './sync/SyncPipeline';
import { PhotosPipeline } from "./sync/pipelines/PhotosPipeline";
import { Order } from "../types/shared";
import crypto from "crypto";
import { LicenseService } from "./license-service";
interface SyncConfig {
  enabled: boolean;
  retentionDays: number;
  price: string;
}

interface RemoteOperation {
  id: string;
  table_name?: string;
  table?: string;
  record_id?: string;
  payload?: string | Record<string, unknown>;
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  desk_id?: string;
  sequence_number?: number;
  hub_index?: number;
  retry_count?: number;
}

interface EmailService {
  setCloudConfig: (url: string, token: string) => void;
}

interface OutgoingOperation {
  id: string;
  type: string;
  table?: string;
  table_name?: string;
  record_id?: string;
  payload?: unknown;
  timestamp?: string;
  sequence_number?: number;
}

interface OperationLogRow {
  id: string;
  type: string;
  table_name: string;
  record_id: string;
  payload: string | Record<string, unknown>;
  timestamp: string;
  sequence_number: number;
}

function isErrorWithMessage(err: unknown): err is { message: string } {
  return typeof err === 'object' && err !== null && 'message' in err;
}

function getErrorMessage(err: unknown): string {
  if (isErrorWithMessage(err)) {
    return err.message;
  }
  return String(err);
}

// Use global fetch (Node 18+)
const fetchFn = (...args: any[]) => ((globalThis as any).fetch)(...args);

// Constants
const MIN_SYNC_INTERVAL = 1000 * 60 * 1; // 1 Minute
const MAX_SYNC_INTERVAL = 1000 * 60 * 30; // 30 Minutes
const BACKOFF_FACTOR = 1.5;
const RETENTION_CHECK_INTERVAL = 1000 * 60 * 60 * 24; // Once a day
const CHUNK_SIZE = 1024 * 1024 * 1; // 1MB chunks for stability
const MAX_OPERATION_RETRIES = 5;
const DLQ_STATUS = 'dead_letter';
const JITTER_FACTOR = 0.3;
const MAX_CONSECUTIVE_FAILURES = 10;
const CIRCUIT_BREAKER_TIMEOUT = 5 * 60 * 1000; // 5 minutes

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export class CloudSyncService {
  private logger: Logger;
  private dbManager: DatabaseManager;
  private emailService: { setCloudConfig: (url: string, token: string) => void };
  private resourceMonitor: ResourceMonitor | null = null;
  private isSyncing = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private retentionTimer: ReturnType<typeof setInterval> | null = null;
  private dlqTimer: ReturnType<typeof setInterval> | null = null;
  private offlineQueueTimer: ReturnType<typeof setInterval> | null = null;
  private enabled = false;
  private isPaused = false;
  private resortAnalytics: ResortAnalyticsService | null = null;
  private consecutiveFailures = 0;
  private currentInterval = MIN_SYNC_INTERVAL;
  private auditService: AuditService;
  private circuitState: CircuitState = 'CLOSED';
  private circuitOpenedAt: number | null = null;

  // Per-pipeline failure tracking for granular circuit breaking
  private failuresByPipeline = new Map<string, number>();
  private readonly PIPELINE_FAILURE_THRESHOLD = 5;
  private readonly PIPELINE_CIRCUIT_TIMEOUT = 2 * 60 * 1000; // 2 minutes

  // Config
  // SECURITY: All cloud credentials can be set via environment variables (Bootstrap)
  // or through the Settings database (Easy Config).
  // Database values take precedence to allow UI-driven configuration.

  private get cloudApiUrl(): string {
    // 1. Try DB
    try {
      const row = this.dbManager.get<{ value: string }>(
        "SELECT value FROM settings WHERE key = 'cloud_url'",
      );
      if (row && row.value) return row.value;
    } catch (e) {}

    // 2. Try Env
    const url = process.env.CLOUD_API_URL;
    if (!url) {
      this.logger.error("[CloudSync] CLOUD_API_URL not configured");
      throw new Error("CLOUD_API_URL not configured");
    }
    return url;
  }

  private get cloudFailoverUrl(): string | undefined {
    try {
      const row = this.dbManager.get<{ value: string }>(
        "SELECT value FROM settings WHERE key = 'cloud_failover_url'",
      );
      if (row && row.value) return row.value;
    } catch (e) {}
    return process.env.CLOUD_FAILOVER_URL || process.env.CLOUD_API_FAILOVER_URL;
  }

  /**
   * Helper to perform HTTP requests with automatic multi-region failover.
   * If the primary HQ URL fails (network error, DNS failure, timeout, or HTTP 5xx/503),
   * it automatically retries against the configured secondary/failover URL.
   */
  public async fetchWithFailover(urlOrPath: string, init?: RequestInit): Promise<Response> {
    const primaryUrl = urlOrPath.startsWith("http") ? urlOrPath : `${this.cloudApiUrl}${urlOrPath}`;
    let res: Response | undefined;
    let err: any;

    try {
      res = await fetchFn(primaryUrl, init);
      if (res && res.status < 500) {
        if (!this._isConnected) {
          this._isConnected = true;
          this.logger.info("[CloudSync] Connection restored (Primary Hub)");
          this.flushOfflineQueue().catch(e => this.logger.error(`[CloudSync] Background flush after reconnect failed`, e));
        }
        return res;
      }
    } catch (e) {
      err = e;
    }

    const failoverBase = this.cloudFailoverUrl;
    if (failoverBase) {
      const endpointPath = urlOrPath.startsWith("http")
        ? urlOrPath.replace(this.cloudApiUrl, "")
        : urlOrPath;
      const failoverUrl = `${failoverBase}${endpointPath}`;
      this.logger.warn(`[CloudSync] Primary hub request failed (${primaryUrl}, status: ${res?.status || err?.message || 'unknown'}). Attempting failover to: ${failoverUrl}`);
      try {
        const failoverRes = await fetchFn(failoverUrl, init);
        if (failoverRes && failoverRes.status < 500) {
          if (!this._isConnected) {
            this._isConnected = true;
            this.logger.info("[CloudSync] Connection restored (Failover Hub)");
            this.flushOfflineQueue().catch(e => this.logger.error(`[CloudSync] Background flush after reconnect failed`, e));
          }
          return failoverRes;
        }
        if (failoverRes) {
          err = new Error(`Failover hub returned status ${failoverRes.status}: ${failoverRes.statusText}`);
        }
      } catch (failoverErr) {
        this.logger.error(`[CloudSync] Failover hub request also failed: ${failoverUrl}`, failoverErr);
        err = failoverErr;
      }
    }

    // Both endpoints failed. Detect if it's a network error (TypeError is thrown by fetch on network failure)
    const isNetworkError = err instanceof TypeError || (err && err.message && err.message.toLowerCase().includes('fetch'));
    if (isNetworkError && this._isConnected) {
      this._isConnected = false;
      this.logger.warn("[CloudSync] Connection lost (Network Error). Offline queueing enabled.");
    }

    if (err) throw err;
    if (res && res.status >= 500) {
      throw new Error(`Cloud hub returned status ${res.status}: ${res.statusText || 'Server Error'}`);
    }
    return res!;
  }

  private get cloudGalleryUrl(): string {
    return (
      process.env.CLOUD_GALLERY_URL ||
      "https://gallery-backend.clickflash-office.workers.dev"
    );
  }

  private get cloudEmail(): string {
    // 1. Try DB
    try {
      const row = this.dbManager.get<{ value: string }>(
        "SELECT value FROM settings WHERE key = 'cloud_email'",
      );
      if (row && row.value) return row.value;
    } catch (e) {}

    // 2. Try Env
    const email = process.env.CLOUD_EMAIL;
    if (!email) {
      this.logger.error("[CloudSync] CLOUD_EMAIL not configured");
      throw new Error("CLOUD_EMAIL not configured");
    }
    return email;
  }

  private get cloudPassword(): string {
    // 1. Try DB
    try {
      const row = this.dbManager.get<{ value: string }>(
        "SELECT value FROM settings WHERE key = 'cloud_password'",
      );
      if (row && row.value) return row.value;
    } catch (e) {}

    // 2. Try Env
    const password = process.env.CLOUD_PASSWORD;
    if (!password) {
      this.logger.error("[CloudSync] CLOUD_PASSWORD not configured");
      throw new Error("CLOUD_PASSWORD not configured");
    }
    return password;
  }

  private get deskId(): string {
    // 1. Try DB
    try {
      const row = this.dbManager.get<{ value: string }>(
        "SELECT value FROM settings WHERE key = 'desk_id'",
      );
      if (row && row.value) return row.value;
    } catch (e) {}

    // 2. Try Env
    return process.env.DESK_ID || "MASTER_01";
  }

  private config: SyncConfig = {
    enabled: true,
    retentionDays: 7,
    price: "15.00",
  };

  private token: string | null = null;
  private uploadDir: string;

  constructor(
    dbManager: DatabaseManager,
    logger: Logger,
    emailService: EmailService,
    resourceMonitor: ResourceMonitor | null = null,
    resortAnalytics: ResortAnalyticsService | null = null,
  ) {
    this.dbManager = dbManager;
    this.logger = logger;
    this.emailService = emailService;
    this.resourceMonitor = resourceMonitor;
    this.resortAnalytics = resortAnalytics;

    // Initialize audit service
    this.auditService = new (AuditService as any)(dbManager, logger, {} as any, { DATA_DIR: process.env.DATA_DIR || "./pb_data" });

    // Default Upload Dir calculation based on env or relative path
    const dataDir = process.env.DATA_DIR || path.join(process.cwd(), "pb_data");
    this.uploadDir = path.join(dataDir, "uploads");

    // Auto-enable if creds exist (Bootstrap or DB)
    try {
      this.enabled = !!(
        this.cloudEmail &&
        this.cloudPassword &&
        this.cloudApiUrl
      );
    } catch (e: any) {
      this.logger.debug(`[CloudSync] Enrollment Check Failed: ${getErrorMessage(e)}`);
      this.enabled = false;
    }

    this.loadConfig();
  }

  public loadConfig() {
    let loaded: Partial<SyncConfig & { retentionMinutes: number }> | null =
      null;
    let source = "";

    // Try 1: Load from settings table (where frontend saves via /api/network-settings)
    try {
      const row = this.dbManager.get<{ value: string }>(
        "SELECT value FROM settings WHERE key = 'moneytrash_settings'",
      );
      if (row && row.value) {
        loaded = JSON.parse(row.value);
        source = "settings:moneytrash_settings";
      }
    } catch (e) {
      this.logger.debug("[CloudSync] No moneytrash_settings in settings table");
    }

    // Try 2: Load from gallery_settings table (legacy location)
    if (!loaded) {
      try {
        const row = this.dbManager.get<{ setting_value: string }>(
          "SELECT setting_value FROM gallery_settings WHERE setting_key = 'money_trash_config'",
        );
        if (row && row.setting_value) {
          const settingValue = row.setting_value;
          if (typeof settingValue === "string") {
            try {
              loaded = JSON.parse(settingValue);
            } catch (e) {
              this.logger.warn("[CloudSync] Failed to parse config JSON", {
                error: e instanceof Error ? e.message : String(e),
              });
            }
          } else if (typeof settingValue === "object") {
            loaded = settingValue;
          }
          source = "gallery_settings:money_trash_config";
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        if (message.includes("no such table: gallery_settings")) {
          this.logger.debug("[CloudSync] gallery_settings table not found");
        } else {
          this.logger.warn(
            `[CloudSync] Failed to load from gallery_settings: ${message} `,
          );
        }
      }
    }

    // Apply loaded config
    if (loaded) {
      // Validate and sanitize retentionDays
      let retentionDays = 7; // default
      if (
        typeof loaded.retentionDays === "number" &&
        !isNaN(loaded.retentionDays)
      ) {
        retentionDays = Math.max(
          1,
          Math.min(365, Math.round(loaded.retentionDays)),
        );
      } else if (
        typeof loaded.retentionMinutes === "number" &&
        !isNaN(loaded.retentionMinutes)
      ) {
        // Convert minutes to days for legacy configs
        retentionDays = Math.max(
          1,
          Math.min(365, Math.round(loaded.retentionMinutes / 1440)),
        );
      }

      this.config = {
        enabled: Boolean(loaded.enabled),
        retentionDays: retentionDays,
        price: typeof loaded.price === "string" ? loaded.price : "15.00",
      };
      this.logger.info(
        `[CloudSync] Loaded Config from ${source}: ${JSON.stringify(this.config)} `,
      );
    } else {
      this.logger.debug(
        "[CloudSync] Using default config - no saved settings found",
      );
    }
  }

  /**
   * Phase 45: Pull global settings from Hub and apply to local SQLite.
   * Hub returns settings as { id, value } pairs — we map 'id' → 'key' for local storage.
   * Hash-based change detection: only writes to DB when Hub reports changed: true.
   */
  public async syncRemoteSettings(): Promise<void> {
    if (!this.enabled) return;
    try {
      await this.authenticate();
      if (!this.token) return;
      const token = this.token;

      // Read last known hash from settings table
      let lastHash = "";
      try {
        const row = this.dbManager.get<{ value: string }>(
          "SELECT value FROM settings WHERE key = 'remote_settings_hash'",
        );
        if (row?.value) lastHash = row.value;
      } catch (e: any) {
        this.logger.debug(`[CloudSync] remote_settings_hash not found: ${getErrorMessage(e)}`);
      }

      const res = await this.fetchWithFailover(
        `${this.cloudApiUrl}/api/cloud/sync/settings?hash=${encodeURIComponent(lastHash)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) return;

      const data = (await res.json()) as {
        changed: boolean;
        hash: string;
        settings?: Array<{ id: string; value: string }>;
      };

      if (!data.changed) return; // No changes — skip DB writes

      this.logger.info(
        "[CloudSync] Remote settings changed — applying to local DB",
        {
          hash: data.hash,
          count: data.settings?.length ?? 0,
        },
      );

      // Apply each setting to local SQLite (INSERT OR REPLACE)
      for (const setting of data.settings ?? []) {
        try {
          this.dbManager.run(
            `INSERT INTO settings (key, value) VALUES (?, ?)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
            [setting.id, setting.value],
          );
        } catch (e: any) {
          this.logger.warn("[CloudSync] Failed to apply remote setting", {
            key: setting.id,
            error: e.message,
          });
        }
      }

      // Store the new hash so we skip next poll if unchanged
      this.dbManager.run(
        `INSERT INTO settings (key, value) VALUES ('remote_settings_hash', ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        [data.hash],
      );

      this.logger.info("[CloudSync] Remote settings applied successfully", {
        hash: data.hash,
      });
    } catch (e: any) {
      // Silently swallow — Hub may be unreachable during offline operation (Law 01)
    }
  }

  start() {
    this.loadConfig(); // Reload on start
    if (!this.enabled || !this.config.enabled) {
      this.logger.info(
        "[CloudSync] Service disabled (Creds missing or Config disabled).",
      );
      return;
    }

    this.logger.info(
      `[CloudSync] Service started.Target: ${this.cloudApiUrl} (Desk: ${this.deskId})`,
    );

    // P2-Audit Fix: Hydrate queue state before starting sync
    this.hydrateQueueState();

    // Initial Cycle
    this.scheduleNextSync(1000); // Start in 1 second

    // Periodic Retention Batch (Photos)
    this.runRetentionBatch(); // Run once on start
    this.retentionTimer = setInterval(
      () => this.runRetentionBatch(),
      RETENTION_CHECK_INTERVAL,
    );

    // Periodic DLQ Automated Replay (every 30 minutes)
    this.dlqTimer = setInterval(
      () => this.replayDeadLetterQueue(),
      30 * 60 * 1000,
    );

    // Phase 3: Offline Queue Flush (every 30 seconds)
    this.offlineQueueTimer = setInterval(
      () => this.flushOfflineQueue(),
      30 * 1000,
    );
  }

  private hydrateQueueState(): void {
    try {
      const pendingOps = this.dbManager.query(`
        SELECT COUNT(*) as count FROM operation_logs WHERE status = 'pending'
      `);
      const pendingCount = pendingOps[0]?.count || 0;

      const failedOps = this.dbManager.query(`
        SELECT COUNT(*) as count FROM operation_logs WHERE status = 'failed'
      `);
      const failedCount = failedOps[0]?.count || 0;

      const dlqOps = this.dbManager.query(`
        SELECT COUNT(*) as count FROM operation_logs WHERE status = ?
      `, [DLQ_STATUS]);
      const dlqCount = dlqOps[0]?.count || 0;

      this.logger.info(
        `[CloudSync] Boot hydration: ${pendingCount} pending, ${failedCount} failed, ${dlqCount} dead_letter operations`,
      );

      const resetResult = this.dbManager.run(`
        UPDATE operation_logs
        SET status = 'pending', retry_count = 0
        WHERE status = 'failed'
        AND updated_at < datetime('now', '-1 hour')
      `);
      if (resetResult.changes > 0) {
        this.logger.info(
          `[CloudSync] Reset ${resetResult.changes} stuck operations to pending`,
        );
      }
    } catch (err: any) {
      this.logger.warn('[CloudSync] Queue hydration failed:', { error: err?.message ?? String(err) });
    }
  }

  private scheduleNextSync(ms?: number) {
    if (this.timer) clearTimeout(this.timer);
    if (this.isPaused) return;

    let delay = ms ?? this.currentInterval;
    
    if (!ms && this.currentInterval > MIN_SYNC_INTERVAL) {
      const jitter = delay * JITTER_FACTOR * (Math.random() - 0.5);
      delay = Math.max(MIN_SYNC_INTERVAL, Math.min(MAX_SYNC_INTERVAL, delay + jitter));
    }

    this.timer = setTimeout(() => this.sync(), delay);
    this.logger.debug(`[CloudSync] Next sync scheduled in ${Math.round(delay / 1000)}s`);
  }

  stop() {
    if (this.timer) clearTimeout(this.timer as any);
    if (this.retentionTimer) clearInterval(this.retentionTimer);
    if (this.dlqTimer) clearInterval(this.dlqTimer);
    if (this.offlineQueueTimer) clearInterval(this.offlineQueueTimer);
    this.logger.info("[CloudSync] Service stopped.");
  }

  private async getHeaders() {
    const machineId = await HardwareService.getMachineId();
    const version = process.env.npm_package_version || "4.1.0";
    return {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
      "User-Agent": `ClickFlashMaster/${version} (${machineId})`,
      "X-Desk-ID": this.deskId,
    };
  }

  private async authenticate() {
    if (this.token) return; // Already auth

    try {
      const machineId = await HardwareService.getMachineId();
      const res = await executeWithRetry(async () => {
        return await this.fetchWithFailover("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: this.cloudEmail,
            password: this.cloudPassword,
            machine_id: machineId,
          }),
        });
      }, { maxRetries: 3 });

      if (res.ok) {
        // --- NTP Drift Correction (Law 01/Law 02) ---
        timeService.updateDrift(res.headers.get("Date"));

        const data = (await res.json()) as { token: string };
        this.token = data.token;
        this._isConnected = true;
        this.logger.info(
          `[CloudSync] Authenticated successfully with Cloud Hub.`,
        );

        // Propagate cloud credentials to EmailService for Relay
        if (this.emailService && this.cloudApiUrl) {
          this.emailService.setCloudConfig(this.cloudApiUrl, this.token);
        }
      } else if (res.status === 423) {
        const errorData = (await res.json()) as { error: string };
        this.logger.error(
          `[CloudSync] Hardware Lock Error: ${errorData.error}`,
        );
        this.token = null;
        this._isConnected = false;
        this.isPaused = true; // Stop sync if locked
      } else {
        this.logger.error(`[CloudSync] Auth Failed: ${res.statusText}`);
        this.token = null;
        this._isConnected = false;
      }
    } catch (e: any) {
      this.logger.error(`[CloudSync] Auth Error: ${getErrorMessage(e)}`);
      this.token = null;
      this._isConnected = false;
    }
  }

  private generateIdempotencyKey(pipeline: string, seq: number): string {
    const raw = `${this.deskId}:${pipeline}:${seq}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  private recordPipelineResult(name: string, success: boolean, _error?: string): void {
    if (success) {
      this.failuresByPipeline.delete(name);
      try {
        this.dbManager.run(
          `INSERT INTO sync_pipeline_health (pipeline_name, consecutive_failures, last_success_at, circuit_state, updated_at)
           VALUES (?, 0, datetime('now'), 'CLOSED', datetime('now'))
           ON CONFLICT(pipeline_name) DO UPDATE SET
             consecutive_failures = 0,
             last_success_at = datetime('now'),
             circuit_state = 'CLOSED',
             updated_at = datetime('now')`,
          [name]
        );
      } catch (e: any) {
        if (!e.message?.includes('no such table')) {
          this.logger.warn(`[CloudSync] Failed to update pipeline health`, { pipeline: name, error: e.message });
        }
      }
    } else {
      const current = (this.failuresByPipeline.get(name) || 0) + 1;
      this.failuresByPipeline.set(name, current);
      try {
        this.dbManager.run(
          `INSERT INTO sync_pipeline_health (pipeline_name, consecutive_failures, last_failure_at, circuit_state, updated_at)
           VALUES (?, ?, datetime('now'), CASE WHEN ? >= ? THEN 'OPEN' ELSE 'CLOSED' END, datetime('now'))
           ON CONFLICT(pipeline_name) DO UPDATE SET
             consecutive_failures = excluded.consecutive_failures,
             last_failure_at = datetime('now'),
             circuit_state = CASE WHEN excluded.consecutive_failures >= ? THEN 'OPEN' ELSE sync_pipeline_health.circuit_state END,
             updated_at = datetime('now')`,
          [name, current, current, this.PIPELINE_FAILURE_THRESHOLD, this.PIPELINE_FAILURE_THRESHOLD]
        );
      } catch (e: any) {
        if (!e.message?.includes('no such table')) {
          this.logger.warn(`[CloudSync] Failed to update pipeline health`, { pipeline: name, error: e.message });
        }
      }
    }
  }

  private isPipelineOpen(name: string): boolean {
    const failures = this.failuresByPipeline.get(name) || 0;
    if (failures >= this.PIPELINE_FAILURE_THRESHOLD) {
      // Check if timeout has passed since last failure
      try {
        const row = this.dbManager.get<{ last_failure_at: string; circuit_state: string }>(
          `SELECT last_failure_at, circuit_state FROM sync_pipeline_health WHERE pipeline_name = ?`,
          [name]
        );
        if (row && row.circuit_state === 'OPEN' && row.last_failure_at) {
          const elapsed = Date.now() - new Date(row.last_failure_at).getTime();
          if (elapsed >= this.PIPELINE_CIRCUIT_TIMEOUT) {
            this.failuresByPipeline.set(name, Math.floor(this.PIPELINE_FAILURE_THRESHOLD / 2));
            return false;
          }
        }
      } catch (e: any) {
        // ignore
      }
      return true;
    }
    return false;
  }

  private createSyncContext(): SyncContext {
    return {
      dbManager: this.dbManager,
      logger: this.logger,
      cloudApiUrl: this.cloudApiUrl,
      deskId: this.deskId,
      token: this.token,
      setToken: (t: string | null) => { this.token = t; },
      getHeaders: async () => this.getHeaders(),
    } as unknown as SyncContext;
  }

  public async sync() {
    if (this.isPaused) return;
    if (this.isSyncing) return;

    // Global Circuit Breaker
    if (this.circuitState === 'OPEN') {
      const timeSinceOpen = Date.now() - (this.circuitOpenedAt || 0);
      if (timeSinceOpen < CIRCUIT_BREAKER_TIMEOUT) {
        this.logger.debug(`[CloudSync] Circuit breaker OPEN - skipping sync (${Math.round((CIRCUIT_BREAKER_TIMEOUT - timeSinceOpen) / 1000)}s remaining)`);
        this.scheduleNextSync(CIRCUIT_BREAKER_TIMEOUT - timeSinceOpen);
        return;
      } else {
        this.logger.info('[CloudSync] Circuit breaker transitioning to HALF_OPEN');
        this.circuitState = 'HALF_OPEN';
      }
    }

    this.isSyncing = true;
    const results: PipelineResult[] = [];

    const runPipeline = async (name: string, fn: () => Promise<any>): Promise<void> => {
      if (this.isPipelineOpen(name)) {
        this.logger.debug(`[CloudSync] Pipeline ${name} circuit OPEN, skipping`);
        results.push({ name, success: false, error: 'Pipeline circuit OPEN' });
        return;
      }
      try {
        await fn();
        results.push({ name, success: true });
      } catch (e: any) {
        results.push({ name, success: false, error: getErrorMessage(e) });
      }
    };

    try {
      await this.authenticate();
      if (!this.token) return;

      await Promise.allSettled([
        runPipeline('operation_logs', () => this.syncOperationLogs()),
        runPipeline('ledger', () => this.syncLedgerEntries()),
        runPipeline('expenses', () => this.syncExpenses()),
        runPipeline('inventory', () => this.syncInventory()),
        runPipeline('orders_to_gallery', () => this.syncOrdersToGallery()),
        runPipeline('photos_to_cloud', () => new PhotosPipeline().execute(this.createSyncContext())), 
        runPipeline('heartbeat', () => this.sendHeartbeat()),
        runPipeline('yield_intelligence', () => this.syncYieldIntelligence()),
        runPipeline('prospecting_crm', () => this.syncProspectingCRM()),
        runPipeline('fleet_triage', () => this.sendFleetTriage()),
        runPipeline('remote_operations', () => this.pullRemoteOperations()),
        runPipeline('global_settings', () => this.pullGlobalSettings()),
        runPipeline('paid_orders', () => this.pollPaidOrders()),
        runPipeline('retention_queue', () => this.processRetentionQueue()),
        runPipeline('retention_stats', () => this.syncRetentionStats()),
        runPipeline('daily_analytics', () => this.syncDailyAnalytics()),
        runPipeline('resort_bi', () => this.syncResortBI()),
        runPipeline('archive', () => ArchiveService.checkAndArchiveSyncCandidates(this.dbManager, this.logger)),
      ]);

      const failedPipelines = results.filter(r => !r.success);
      const allSucceeded = failedPipelines.length === 0;

      // Record per-pipeline results
      for (const r of results) {
        this.recordPipelineResult(r.name, r.success, r.error);
      }

      if (allSucceeded) {
        this._lastSuccessfulSync = new Date();
        this.consecutiveFailures = 0;
        this.currentInterval = MIN_SYNC_INTERVAL;
        if (this.circuitState !== 'CLOSED') {
          this.logger.info(`[CloudSync] Circuit breaker CLOSED - all pipelines recovered`);
          this.circuitState = 'CLOSED';
          this.circuitOpenedAt = null;
        }
      } else {
        this.consecutiveFailures++;
        this.currentInterval = Math.min(
          MAX_SYNC_INTERVAL,
          this.currentInterval * BACKOFF_FACTOR,
        );
        this.logger.warn(`[CloudSync] ${failedPipelines.length} pipeline(s) failed`, {
          pipelines: failedPipelines.map(p => p.name),
        });

        if (this.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          this.logger.warn(`[CloudSync] Circuit breaker OPEN - ${this.consecutiveFailures} consecutive failures`);
          this.circuitState = 'OPEN';
          this.circuitOpenedAt = Date.now();
          this.scheduleNextSync(CIRCUIT_BREAKER_TIMEOUT);
          return;
        }
      }
    } catch (e: any) {
      this.logger.error(`[CloudSync] Sync Cycle Error: ${getErrorMessage(e)} `);
      this.consecutiveFailures++;
      this.currentInterval = Math.min(
        MAX_SYNC_INTERVAL,
        this.currentInterval * BACKOFF_FACTOR,
      );

      if (this.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        this.logger.warn(`[CloudSync] Circuit breaker OPEN - ${this.consecutiveFailures} consecutive failures`);
        this.circuitState = 'OPEN';
        this.circuitOpenedAt = Date.now();
        this.scheduleNextSync(CIRCUIT_BREAKER_TIMEOUT);
        return;
      }
    } finally {
      this.isSyncing = false;
      if (this.circuitState !== 'OPEN') {
        this.scheduleNextSync();
      }
    }
  }

  private async syncOperationLogs() {
    const ops = this.dbManager.query<OperationLogRow>(`
            SELECT * FROM operation_logs 
            WHERE status = 'pending' 
            ORDER BY sequence_number ASC 
            LIMIT 50
        `);

    if (ops.length === 0) return;

    this.logger.info(
      `[CloudSync] Syncing ${ops.length} user intents to Cloud Hub (Desk: ${this.deskId})...`,
    );

    // Idempotency: generate a key for this batch
    const firstSeq = ops[0]?.sequence_number ?? Date.now();
    const idempotencyKey = this.generateIdempotencyKey('operation_logs', firstSeq);

    try {
      // Store idempotency key locally before sending
      try {
        this.dbManager.run(
          `INSERT INTO sync_idempotency_keys (idempotency_key, desk_id, pipeline_name, created_at)
           VALUES (?, ?, ?, datetime('now'))`,
          [idempotencyKey, this.deskId, 'operation_logs']
        );
      } catch (e: any) {
        if (!e.message?.includes('no such table')) {
          this.logger.warn(`[CloudSync] Failed to store idempotency key`, { error: e.message });
        }
      }

      const res = await executeWithRetry(async () => {
        const headers = await this.getHeaders();
        return await this.fetchWithFailover(
          "/api/cloud/sync/operations",
          {
            method: "POST",
            headers: {
              ...headers,
              'X-Idempotency-Key': idempotencyKey,
            },
            body: JSON.stringify({
              desk_id: this.deskId,
              operations: ops.map((op: OperationLogRow): OutgoingOperation => ({
                id: op.id,
                type: op.type,
                table: op.table_name,
                record_id: op.record_id,
                payload:
                  typeof op.payload === "string"
                    ? JSON.parse(op.payload)
                    : op.payload,
                timestamp: op.timestamp,
                sequence_number: op.sequence_number,
              })),
            }),
          },
        );
      }, { maxRetries: 3 });

      if (res.ok) {
        // --- NTP Drift Correction ---
        timeService.updateDrift(res.headers.get("Date"));

        const json = (await res.json()) as {
          success: true;
          processed: string[];
        };
        const processedIds = json.processed || [];

        if (processedIds.length > 0) {
          this.dbManager.transaction(() => {
            const stmt = this.dbManager.prepare(
              `UPDATE operation_logs SET status = 'synced', last_error = NULL WHERE id = ?`,
            );
            for (const id of processedIds) {
              stmt.run(id);
            }
          });
          this.logger.info(
            `[CloudSync] Successfully synced ${processedIds.length} operations to Hub.`,
          );
        }
        
        const failedIds = ops.map((op: OperationLogRow) => op.id).filter((id: string) => !processedIds.includes(id));
        if (failedIds.length > 0) {
           this.handleFailedOperations(failedIds, "Remote Hub rejected record");
        }

      } else if (res.status === 208) {
        // Hub already processed this batch
        this.logger.info(`[CloudSync] Hub reports batch already processed (208)`);
        this.dbManager.transaction(() => {
          const stmt = this.dbManager.prepare(
            `UPDATE operation_logs SET status = 'synced', last_error = NULL WHERE id = ?`,
          );
          for (const op of ops) {
            stmt.run(op.id);
          }
        });
      } else {
        const txt = await res.text();
        this.logger.error(`[CloudSync] Operations Sync Failed: ${txt}`);
        this.handleFailedOperations(ops.map((op: OperationLogRow) => op.id), `HTTP ${res.status}: ${txt}`);
        throw new Error(`Sync failed: ${res.status}`);
      }
    } catch (e: any) {
      this.logger.error(`[CloudSync] Operations Sync Error: ${getErrorMessage(e)}`);
      throw e;
    }
  }

  private handleFailedOperations(ids: string[], error: string) {
    if (!ids || ids.length === 0) return;
    try {
        this.dbManager.transaction(() => {
          const stmt = this.dbManager.prepare(`
            UPDATE operation_logs 
            SET retry_count = retry_count + 1, 
                last_error = ?,
                status = CASE WHEN retry_count + 1 >= ? THEN ? ELSE 'pending' END
            WHERE id = ?
          `);
          for (const id of ids) {
            stmt.run(error, MAX_OPERATION_RETRIES, DLQ_STATUS, id);
          }
        });
        this.logger.warn(`[CloudSync] Logged failure for ${ids.length} operations.`, { error });
    } catch (e: any) {
        this.logger.error(`[CloudSync] Fatal error updating DLQ: ${getErrorMessage(e)}`);
    }
  }

  /**
   * Sync photographer ledger entries (payroll data) to Cloud Hub.
   * Pushes pending commission/salary/bonus/deduction entries for consolidation.
   */
  public async syncLedgerEntries() {
    // Fetch pending ledger entries
    const entries = this.dbManager.query(`
            SELECT * FROM photographer_ledger 
            WHERE sync_status = 'pending' 
            ORDER BY created_at ASC 
            LIMIT 50
        `);

    if (entries.length === 0) return;

    this.logger.info(
      `[CloudSync] Syncing ${entries.length} ledger entries to Cloud Hub (Desk: ${this.deskId})...`,
    );

    try {
      // Convert ledger entries to operation format for the Hub
      const operations = entries.map((entry) => ({
        id: entry.sync_id || `${this.deskId}_ledger_${entry.id}`,
        type: "INSERT",
        table: "photographer_ledger",
        record_id: entry.id,
        payload: {
          id: entry.id,
          photographer_id: entry.photographer_id,
          order_id: entry.order_id,
          type: entry.type,
          amount: entry.amount,
          description: entry.description,
          date: entry.date,
          original_id: entry.id,
          created_at: entry.created_at,
        },
        timestamp: Date.now(),
        sequence_number: Date.now(), // Use timestamp as sequence for ledger
      }));

      const res = await executeWithRetry(async () => {
        const r = await this.fetchWithFailover(`${this.cloudApiUrl}/api/cloud/sync/ledger`, {
          method: "POST",
          headers: await this.getHeaders(),
          body: JSON.stringify({ desk_id: this.deskId, operations }),
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r;
      }, { maxRetries: 3 });

      if (res.ok) {
        this.dbManager.transaction(() => {
          const stmt = this.dbManager.prepare(
            `UPDATE photographer_ledger SET sync_status = 'synced' WHERE id = ?`,
          );
          for (const entry of entries) {
            stmt.run(entry.id);
          }
        });
        this.logger.info(
          `[CloudSync] Successfully synced ${entries.length} ledger entries to Hub.`,
        );
      }
    } catch (e: any) {
      this.logger.error(`[CloudSync] Ledger Sync Error: ${getErrorMessage(e)}`);
    }
  }

  /**
   * Phase 70: Sync daily photographer performance metrics to Management Hub.
   * Aggregates from local SQLite (photos + orders) and pushes to cloud
   * POST /api/analytics/daily-audit — triggers AI audit description generation on the Hub.
   * Runs daily (on every sync cycle, but the Hub uses ON CONFLICT to deduplicate).
   */
  public async syncDailyAnalytics(
    dateStr?: string,
  ): Promise<{ pushed: number; date: string }> {
    const date = dateStr || new Date().toISOString().split("T")[0];

    try {
      await this.authenticate();
      if (!this.token) return { pushed: 0, date };

      // Aggregate per-photographer metrics from local DB for the given date
      const photographerStats = this.dbManager.query(
        `SELECT
           u.id            AS photographer_id,
           u.name          AS photographer_name,
           COUNT(DISTINCT p.id)  AS imported_photos,
           COALESCE(
             (
               SELECT COUNT(DISTINCT JSON_EXTRACT(item.value, '$.photoId'))
               FROM orders o, JSON_EACH(o.items) as item
               WHERE o.photographerId = u.id
                 AND o.status = 'Completed'
                 AND date(o.created_at) = ?
             ), 0
           ) AS sold_photos,
           COUNT(CASE WHEN p.quality_flags IS NOT NULL AND p.quality_flags != '[]' AND p.quality_flags != '' THEN 1 END) AS bad_quality_photos,
           COUNT(DISTINCT o2.id) AS total_customers,
           COALESCE(SUM(CASE WHEN o2.status = 'Completed' THEN o2.total ELSE 0 END), 0) AS sales_revenue
         FROM users u
         LEFT JOIN photos p ON p.photographerId = u.id AND date(p.created_at) = ?
         LEFT JOIN orders o2 ON o2.photographerId = u.id AND date(o2.created_at) = ?
         WHERE u.role = 'photographer'
         GROUP BY u.id
         HAVING imported_photos > 0 OR total_customers > 0`,
        [date, date, date],
      ) as Array<{
        photographer_id: string;
        photographer_name: string;
        imported_photos: number;
        sold_photos: number;
        bad_quality_photos: number;
        total_customers: number;
        sales_revenue: number;
      }>;

      if (photographerStats.length === 0) {
        this.logger.info(`[CloudSync] No analytics data for ${date} to push.`);
        return { pushed: 0, date };
      }

      const audits = photographerStats.map((row) => ({
        photographer_id: row.photographer_id,
        photographer_name: row.photographer_name,
        date,
        imported_photos: row.imported_photos,
        sold_photos: row.sold_photos,
        bad_quality_photos: row.bad_quality_photos,
        total_customers: row.total_customers,
        sales_revenue: row.sales_revenue,
      }));

      const res = await this.fetchWithFailover(
        `${this.cloudApiUrl}/api/analytics/daily-audit`,
        {
          method: "POST",
          headers: await this.getHeaders(),
          body: JSON.stringify({ audits }),
        },
      );

      if (res.ok) {
        const json = (await res.json()) as {
          success: boolean;
          processed: number;
        };
        this.logger.info(
          `[CloudSync] Phase 70: Pushed ${json.processed ?? audits.length} photographer audit(s) for ${date} to Hub.`,
        );
        return { pushed: json.processed ?? audits.length, date } as any;
      } else {
        const txt = await res.text();
        this.logger.error(
          `[CloudSync] Analytics Sync Failed (${date}): ${txt}`,
        );
        return { pushed: 0, date };
      }
    } catch (e: any) {
      this.logger.error(`[CloudSync] Analytics Sync Error: ${getErrorMessage(e)}`);
      return { pushed: 0, date };
    }
  }

  /**
   * Sync expenses to Cloud Hub.
   * Pushes pending expense entries for consolidated business reporting.
   */
  public async syncExpenses() {
    const expenses = this.dbManager.query(`
            SELECT * FROM expenses 
            WHERE sync_status = 'pending' 
            ORDER BY created_at ASC 
            LIMIT 50
        `);

    if (expenses.length === 0) return;

    this.logger.info(
      `[CloudSync] Syncing ${expenses.length} expense entries to Cloud Hub (Desk: ${this.deskId})...`,
    );

    try {
      const res = await executeWithRetry(async () => {
        const r = await this.fetchWithFailover(`${this.cloudApiUrl}/api/cloud/sync/expenses`, {
          method: "POST",
          headers: await this.getHeaders(),
          body: JSON.stringify({ desk_id: this.deskId, expenses }),
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r;
      }, { maxRetries: 2 });

      if (res.ok) {
        this.dbManager.transaction(() => {
          const stmt = this.dbManager.prepare(
            "UPDATE expenses SET sync_status = 'synced' WHERE id = ?",
          );
          for (const exp of expenses) {
            stmt.run(exp.id);
          }
        });
      }
    } catch (e: any) {
      this.logger.error(`[CloudSync] Expense Sync Error: ${getErrorMessage(e)}`);
    }
  }

  /**
   * Sync inventory to Cloud Hub.
   * Pushes inventory levels for consolidated stock management.
   */
  public async syncInventory() {
    const entries = this.dbManager.query(`
            SELECT * FROM inventory 
            WHERE sync_status = 'pending' 
            ORDER BY updated_at ASC 
            LIMIT 50
        `);

    if (entries.length === 0) return;

    this.logger.info(
      `[CloudSync] Syncing ${entries.length} inventory entries to Cloud Hub (Desk: ${this.deskId})...`,
    );

    try {
      const operations = entries.map((entry) => ({
        id: entry.sync_id || `${this.deskId}_inventory_${entry.id}`,
        type: "INSERT",
        table: "inventory",
        record_id: entry.id,
        payload: {
          id: entry.id,
          name: entry.name,
          type: entry.type,
          current_count: entry.current_count,
          low_stock_threshold: entry.low_stock_threshold,
          original_id: entry.id,
          created_at: entry.created_at,
        },
        timestamp: Date.now(),
        sequence_number: Date.now(),
      }));

      const res = await executeWithRetry(async () => {
        const r = await this.fetchWithFailover(`${this.cloudApiUrl}/api/cloud/sync/operations`, {
          method: "POST",
          headers: await this.getHeaders(),
          body: JSON.stringify({ desk_id: this.deskId, operations }),
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r;
      }, { maxRetries: 3 });

      if (res.ok) {
        const json = (await res.json()) as {
          success: true;
          processed: string[];
        };
        const processedIds = json.processed || [];

        if (processedIds.length > 0) {
          this.dbManager.transaction(() => {
            const stmt = this.dbManager.prepare(
              `UPDATE inventory SET sync_status = 'synced' WHERE sync_id = ? OR id = ?`,
            );
            for (const syncId of processedIds) {
              const originalId = syncId.includes("_inventory_")
                ? syncId.split("_inventory_")[1]
                : syncId;
              stmt.run(syncId, originalId);
            }
          });
          this.logger.info(
            `[CloudSync] Successfully synced ${processedIds.length} inventory entries to Hub.`,
          );
        }
      } else {
        const txt = await res.text();
        this.logger.error(`[CloudSync] Inventory Sync Failed: ${txt}`);
      }
    } catch (e: any) {
      this.logger.error(`[CloudSync] Inventory Sync Error: ${getErrorMessage(e)}`);
    }
  }

  /**
   * Send fleet heartbeat to Cloud Hub.
   * Reports health metrics for Fleet Monitor.
   */
  public async sendHeartbeat() {
    try {
      // Gather health metrics
      const today = new Date().toISOString().split("T")[0];
      const ordersToday =
        this.dbManager.get<{ count: number }>(
          `SELECT COUNT(*) as count FROM orders WHERE date = ?`,
          [today],
        )?.count || 0;

      const photosToday =
        this.dbManager.get<{ count: number }>(
          `SELECT COUNT(*) as count FROM photos WHERE date(created_at) = ?`,
          [today],
        )?.count || 0;

      const pendingOps =
        this.dbManager.get<{ count: number }>(
          `SELECT COUNT(*) as count FROM operation_logs WHERE status = 'pending'`,
        )?.count || 0;

      // Online License Verification
      const licenseService = new LicenseService(this.dbManager, this.logger, this.cloudApiUrl);
      const isLicenseValid = await licenseService.verifyWithHub(this.deskId);
      
      if (!isLicenseValid) {
         this.logger.warn("[CloudSync] License verification failed. Kiosk features may be restricted.");
         // We still send the heartbeat to ensure hub knows we're online,
         // but we could set an offline flag if needed.
      }

      const health = await HardwareService.getHealthStatus();

      const heartbeat = {
        desk_id: this.deskId,
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || "1.0.0",
        uptime: process.uptime(),
        memory:
          this.resourceMonitor?.getStatus().memory || process.memoryUsage(),
        system: {
          hardware: health
            ? {
                cpu: health.cpuUsage,
                disk: health.diskPercent,
                memory_percent: health.memoryPercent,
              }
            : null,
          resource_monitor: this.resourceMonitor?.getStatus() || null,
        },
        metrics: {
          orders_today: ordersToday,
          photos_today: photosToday,
          pending_sync: pendingOps,
          sync_status: this.isPaused
            ? "paused"
            : this.isSyncing
              ? "syncing"
              : "idle",
          tunnel_url:
            typeof tunnelManager !== "undefined"
              ? tunnelManager.getUrl()
              : null,
        },
      };

      const res = await this.fetchWithFailover(`${this.cloudApiUrl}/api/cloud/heartbeat`, {
        method: "POST",
        headers: await this.getHeaders(),
        body: JSON.stringify(heartbeat),
      });

      if (res.ok) {
        this.logger.debug(`[CloudSync] Heartbeat sent successfully`);

        // Phase 45: Handle remote commands from Hub
        const resData = (await res.json()) as {
          success: boolean;
          commands?: string[];
        };
        if (resData.commands && Array.isArray(resData.commands)) {
          for (const cmd of resData.commands) {
            this.logger.info(`[CloudSync] Received command from Hub: ${cmd}`);
            if (cmd === "START_TUNNEL") {
              tunnelManager.start().catch((err: unknown) => {
                this.logger.error(
                  `[TunnelManager] Failed to start tunnel: ${getErrorMessage(err)}`,
                );
              });
            } else if (cmd === "STOP_TUNNEL") {
              tunnelManager.stop();
            }
          }
        }
      } else {
        const txt = await res.text();
        this.logger.warn(
          `[CloudSync] Heartbeat failed: ${res.status} - ${txt}`,
        );
        this.queueOfflineRequest(`${this.cloudApiUrl}/api/cloud/heartbeat`, {
          method: "POST",
          headers: await this.getHeaders(),
          body: JSON.stringify(heartbeat),
        });
      }
    } catch (e: any) {
      this.logger.error(`[CloudSync] Heartbeat Error: ${getErrorMessage(e)}`);
      try {
        const heartbeatStr = JSON.stringify({
          desk_id: this.deskId,
          timestamp: new Date().toISOString(),
          // basic offline payload
        });
        this.queueOfflineRequest(`${this.cloudApiUrl}/api/cloud/heartbeat`, {
          method: "POST",
          body: heartbeatStr,
        });
      } catch (err) {}
    }
  }

  /**
   * Phase 3: Queue failed API calls for offline resiliency
   */
  private queueOfflineRequest(url: string, init: any) {
    try {
      const method = init?.method || "GET";
      const headers = init?.headers ? JSON.stringify(init.headers) : null;
      const body = init?.body ? String(init.body) : null;
      
      this.dbManager.run(
        `INSERT INTO api_request_queue (id, url, method, headers, body, sync_status) VALUES (?, ?, ?, ?, ?, 'pending')`,
        [crypto.randomUUID(), url, method, headers, body]
      );
      this.logger.debug(`[CloudSync] Queued failed API call to ${url} for offline retry`);
    } catch (e: any) {
      this.logger.error(`[CloudSync] Failed to queue offline request: ${getErrorMessage(e)}`);
    }
  }

  /**
   * Phase 3: Flush the pending offline API queue
   */
  private async flushOfflineQueue() {
    if (!this._isConnected) return; // Wait for internet

    try {
      const pending = this.dbManager.query(`
        SELECT * FROM api_request_queue 
        WHERE sync_status = 'pending' 
        ORDER BY created_at ASC 
        LIMIT 20
      `);

      if (pending.length === 0) return;

      this.logger.info(`[CloudSync] Flushing ${pending.length} pending offline API requests...`);

      for (const req of pending) {
        if (!this._isConnected) {
          this.logger.debug(`[CloudSync] Halting offline queue flush due to lost connection.`);
          break;
        }

        try {
          const init: any = { method: req.method };
          if (req.headers) init.headers = JSON.parse(req.headers);
          if (req.body) init.body = req.body;

          const res = await this.fetchWithFailover(req.url, init);
          
          if (res.ok) {
            this.dbManager.run(`UPDATE api_request_queue SET sync_status = 'synced', last_error = NULL WHERE id = ?`, [req.id]);
            this.logger.debug(`[CloudSync] Successfully flushed queued request to ${req.url}`);
          } else {
            const txt = await res.text();
            this.dbManager.run(
              `UPDATE api_request_queue SET retry_count = retry_count + 1, last_error = ? WHERE id = ?`,
              [txt, req.id]
            );
          }
        } catch (e: any) {
           this.dbManager.run(
             `UPDATE api_request_queue SET retry_count = retry_count + 1, last_error = ? WHERE id = ?`,
             [getErrorMessage(e), req.id]
           );
        }
      }
    } catch (e: any) {
      this.logger.error(`[CloudSync] Offline queue flush error: ${getErrorMessage(e)}`);
    }
  }

  /**
   * Pull remote operations from Hub (Bi-directional Sync)
   */
  private async pullRemoteOperations() {
    try {
      // 1. Get last processed HUB_INDEX
      const lastHubSeq = this.dbManager.get<{ counter: number }>(
        "SELECT counter FROM sync_sequences WHERE id = 'HUB_GLOBAL'",
      );
      const sinceHubIndex = lastHubSeq?.counter || 0;

      this.logger.debug(
        `[CloudSync] Polling remote operations since Hub Index ${sinceHubIndex}...`,
      );

      const res = await executeWithRetry(async () => {
        const r = await this.fetchWithFailover(
          `${this.cloudApiUrl}/api/cloud/sync/operations?since_hub_index=${sinceHubIndex}`,
          {
            headers: await this.getHeaders(),
          },
        );
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r;
      }, { maxRetries: 3 });

      const data = (await res.json()) as { success: true; operations: RemoteOperation[] };
      const remoteOps = data.operations || [];

      if (remoteOps.length > 0) {
        this.logger.info(
          `[CloudSync] Received ${remoteOps.length} remote operations from other desks.`,
        );
        await this.applyRemoteOperations(remoteOps);
      }
    } catch (e: any) {
      this.logger.error(`[CloudSync] Pull Operations Error: ${getErrorMessage(e)}`);
    }
  }

  // ── Phase 51: Hub → Master Global Settings Propagation ──────────────
  private async pullGlobalSettings() {
    try {
      // Get last settings hash to avoid re-downloading unchanged settings
      const lastHash = this.dbManager.get<{ value: string }>(
        "SELECT value FROM settings WHERE id = 'hub_settings_hash'",
      );
      const currentHash = lastHash?.value || "";

      const res = await this.fetchWithFailover(
        `${this.cloudApiUrl}/api/cloud/sync/settings?hash=${encodeURIComponent(currentHash)}`,
        {
          headers: await this.getHeaders(),
        },
      );

      if (!res.ok) return;

      const data = (await res.json()) as {
        changed: boolean;
        hash: string;
        settings?: Array<{ id: string; value: string }>;
      };

      // If hash matches, nothing changed
      if (!data.changed || !data.settings || data.settings.length === 0) {
        return;
      }

      this.logger.info(
        `[CloudSync] Received ${data.settings.length} global settings from Hub.`,
      );

      // Upsert settings locally
      const upsertStmt = this.dbManager
        .getDb()
        .prepare(
          "INSERT INTO settings (id, value) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET value = excluded.value",
        );

      const tx = this.dbManager.getDb().transaction(() => {
        for (const setting of data.settings!) {
          upsertStmt.run(setting.id, setting.value);
        }
        // Store the new hash
        upsertStmt.run("hub_settings_hash", data.hash);
      });
      tx();

      this.logger.info(
        `[CloudSync] Applied ${data.settings.length} global settings (hash: ${data.hash.substring(0, 8)}...).`,
      );
    } catch (e: any) {
      const msg = getErrorMessage(e);
      if (!msg.includes("404")) {
        this.logger.warn(`[CloudSync] Pull Settings: ${msg}`);
      }
    }
  }

  private async applyRemoteOperations(operations: RemoteOperation[]) {
    let lastInBatchIdx = 0;

    for (const op of operations) {
      try {
        // RCA: Multi-Master Conflict Resolution (Simplified for Phase 30)
        // SECURITY: Validate table name against allowlist to prevent SQL injection
        const rawTable = op.table_name || op.table;
        const table = TABLE_MAP[rawTable as keyof typeof TABLE_MAP];
        if (!table || !ALLOWED_COLUMNS[table]) {
          this.logger.error(
            `[CloudSync] SECURITY: Rejected unknown table "${rawTable}" from remote operation ${op.id}`,
          );
          continue;
        }
        const recordId = op.record_id;
        const payload =
          typeof op.payload === "string" ? JSON.parse(op.payload) : op.payload;

        const siteId = op.desk_id;
        
        // Industrial Hardening: Prevent Infinite Loop / Self-Sync
        if (siteId === this.deskId) {
          this.logger.debug(`[CloudSync] Deduplicated self-operation ${op.id} from local desk_id`);
          lastInBatchIdx = op.hub_index ?? 0;
          continue;
        }

        const localSiteSeq = this.dbManager.get<{ counter: number }>(
          "SELECT counter FROM sync_sequences WHERE site_id = ?",
          [siteId],
        );

        if (localSiteSeq && (op.sequence_number ?? 0) <= localSiteSeq.counter) {
          this.logger.debug(
            `[CloudSync] Skipping already seen operation ${op.id} from ${siteId} (Seq: ${op.sequence_number})`,
          );
          lastInBatchIdx = op.hub_index ?? 0;
          continue;
        }

        this.dbManager.transaction(() => {
          // Industrial Conflict Resolution: Check if local record is newer
          const existing = this.dbManager.get<{ updated_at: string }>(
            `SELECT updated_at FROM ${table} WHERE id = ?`,
            [recordId]
          );

          if (existing && op.payload && typeof op.payload === 'object') {
            const remoteUpdatedAt = (op.payload as any).updated_at;
            if (remoteUpdatedAt && new Date(existing.updated_at) > new Date(remoteUpdatedAt)) {
              this.logger.warn(`[CloudSync] Conflict: Local record for ${table}.${recordId} is newer than remote. Protecting local integrity.`);
              return;
            }
          }
          // SECURITY: Only allow columns that exist in the allowlist
          const allowedCols = ALLOWED_COLUMNS[table] || [];
          if (op.type === "INSERT") {
            const keys = Object.keys(payload).filter((k) => allowedCols.includes(k));
            if (keys.length === 0) return;
            const placeholders = keys.map(() => "?").join(", ");
            this.dbManager.run(
              `INSERT OR REPLACE INTO ${table} (${keys.join(", ")}) VALUES (${placeholders})`,
              keys.map((k) => payload[k]),
            );
          } else if (op.type === "UPDATE") {
            const keys = Object.keys(payload).filter((k) => k !== "id" && allowedCols.includes(k));
            if (keys.length === 0) return;
            const setClause = keys.map((k) => `${k} = ?`).join(", ");
            this.dbManager.run(
              `UPDATE ${table} SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
              [...keys.map((k) => payload[k]), recordId],
            );
          } else if (op.type === "DELETE") {
            this.dbManager.run(`DELETE FROM ${table} WHERE id = ?`, [recordId]);
          }

          this.dbManager.run(
            `
                        INSERT INTO sync_sequences (id, site_id, last_processed_id, counter, updated_at)
                        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
                        ON CONFLICT(site_id) DO UPDATE SET 
                            last_processed_id = EXCLUDED.last_processed_id,
                            counter = EXCLUDED.counter,
                            updated_at = EXCLUDED.updated_at
                    `,
            [`desk_${siteId}`, siteId, op.id, op.sequence_number],
          );
        });

        lastInBatchIdx = op.hub_index ?? 0;
      } catch (err: any) {
        const errMsg = getErrorMessage(err);
        this.logger.error(
          `[CloudSync] Failed to apply remote operation ${op.id}: ${errMsg}`,
        );
        
        const retryCount = (op.retry_count || 0) + 1;
        if (retryCount >= MAX_OPERATION_RETRIES) {
          this.logger.error(
            `[CloudSync] Operation ${op.id} exceeded max retries (${MAX_OPERATION_RETRIES}). Moving to dead_letter queue.`,
          );
          this.dbManager.run(
            `UPDATE operation_logs SET status = ?, error_log = ?, retry_count = ? WHERE id = ?`,
            [DLQ_STATUS, errMsg, retryCount, op.id],
          );
        } else {
          this.dbManager.run(
            `UPDATE operation_logs SET status = 'failed', error_log = ?, retry_count = ? WHERE id = ?`,
            [errMsg, retryCount, op.id],
          );
        }
        
        continue;
      }
    }

    if (lastInBatchIdx > 0) {
      this.dbManager.run(
        `
                INSERT INTO sync_sequences (id, site_id, counter, updated_at)
                VALUES ('HUB_GLOBAL', 'HUB', ?, CURRENT_TIMESTAMP)
                ON CONFLICT(id) DO UPDATE SET 
                    counter = EXCLUDED.counter,
                    updated_at = EXCLUDED.updated_at
            `,
        [lastInBatchIdx],
      );
    }
  }

  public async runRetentionBatch() {
    if (this.isPaused) return;
    this.logger.info(
      `[CloudSync] Running Retention Batch(Days: ${this.config.retentionDays})`,
    );

    try {
      const days = this.config.retentionDays;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      const cutoffIso = cutoffDate.toISOString();

      const query = `
                SELECT p.id, p.albumId 
                FROM photos p
                WHERE p.created_at < ?
    AND p.sync_status != 'synced'
                AND p.id NOT IN(SELECT asset_id FROM fulfillment_queue)
                AND p.id NOT IN(SELECT asset_id FROM retention_queue)
                LIMIT 100
    `;

      const candidates = this.dbManager.query<{ id: string; albumId: string }>(
        query,
        [cutoffIso],
      );

      if (candidates.length > 0) {
        this.logger.info(
          `[CloudSync] Found ${candidates.length} unsold assets for retention.`,
        );

        const stmt = this.dbManager.prepare(
          `INSERT INTO retention_queue(album_id, asset_id, status) VALUES(?, ?, 'pending')`,
        );

        this.dbManager.transaction(() => {
          for (const cand of candidates) {
            stmt.run(cand.albumId, cand.id);
          }
        });
      }
    } catch (e: any) {
      this.logger.error(`[CloudSync] Retention Batch Error: ${getErrorMessage(e)} `);
    }
  }

  private _isConnected = false;
  private _lastSuccessfulSync: Date | null = null;

  public getStats() {
    try {
      const retentionCount =
        this.dbManager.get<{ count: number }>(
          "SELECT COUNT(*) as count FROM retention_queue WHERE status = 'pending'",
        )?.count || 0;
      const fulfillmentCount =
        this.dbManager.get<{ count: number }>(
          "SELECT COUNT(*) as count FROM fulfillment_queue WHERE status = 'pending'",
        )?.count || 0;
      const queueDepth =
        this.dbManager.get<{ count: number }>(
          "SELECT COUNT(*) as count FROM operation_logs WHERE status = 'pending'",
        )?.count || 0;
      const dlqCount =
        this.dbManager.get<{ count: number }>(
          `SELECT COUNT(*) as count FROM operation_logs WHERE status = '${DLQ_STATUS}'`,
        )?.count || 0;

      return {
        enabled: this.config.enabled,
        status: this.isPaused ? "paused" : this.isSyncing ? "syncing" : "idle",
        circuitBreaker: {
          state: this.circuitState,
          consecutiveFailures: this.consecutiveFailures,
          threshold: MAX_CONSECUTIVE_FAILURES,
          openedAt: this.circuitOpenedAt ? new Date(this.circuitOpenedAt).toISOString() : null,
        },
        cloudConnection: this._isConnected ? "online" : "offline",
        lastSuccessfulSync: this._lastSuccessfulSync
          ? this._lastSuccessfulSync.toISOString()
          : null,
        retentionDays: this.config.retentionDays,
        price: this.config.price,
        consecutiveFailures: this.consecutiveFailures,
        nextSyncSeconds: Math.round(this.currentInterval / 1000),
        queues: {
          retention: retentionCount,
          fulfillment: fulfillmentCount,
          operations: queueDepth,
          dlq: dlqCount,
        },
        metrics: {
          'sync.queue_depth': queueDepth,
          'sync.dlq_count': dlqCount,
        },
        lastSync: new Date().toISOString(),
      };
    } catch (e) {
      return { error: "Failed to fetch stats" };
    }
  }

  /**
   * Get payroll/ledger sync statistics
   */
  public getLedgerStats() {
    try {
      const pendingCount =
        this.dbManager.get<{ count: number }>(
          "SELECT COUNT(*) as count FROM photographer_ledger WHERE sync_status = 'pending'",
        )?.count || 0;

      const syncedCount =
        this.dbManager.get<{ count: number }>(
          "SELECT COUNT(*) as count FROM photographer_ledger WHERE sync_status = 'synced'",
        )?.count || 0;

      const recentPending = this.dbManager.query(`
                SELECT id, photographer_id, type, amount, date, created_at 
                FROM photographer_ledger 
                WHERE sync_status = 'pending' 
                ORDER BY created_at DESC 
                LIMIT 10
            `);

      return {
        pending: pendingCount,
        synced: syncedCount,
        total: pendingCount + syncedCount,
        recentPending: recentPending || [],
      };
    } catch (e: any) {
      this.logger.error(`[CloudSync] Failed to get ledger stats: ${getErrorMessage(e)}`);
      return { error: "Failed to fetch ledger stats" };
    }
  }

  /**
   * Get expenses sync statistics
   */
  public getExpensesStats() {
    try {
      const pendingCount =
        this.dbManager.get<{ count: number }>(
          "SELECT COUNT(*) as count FROM expenses WHERE sync_status = 'pending'",
        )?.count || 0;

      const syncedCount =
        this.dbManager.get<{ count: number }>(
          "SELECT COUNT(*) as count FROM expenses WHERE sync_status = 'synced'",
        )?.count || 0;

      const recentPending = this.dbManager.query(`
                SELECT id, description, amount, category, date, created_at 
                FROM expenses 
                WHERE sync_status = 'pending' 
                ORDER BY created_at DESC 
                LIMIT 10
            `);

      return {
        pending: pendingCount,
        synced: syncedCount,
        total: pendingCount + syncedCount,
        recentPending: recentPending || [],
      };
    } catch (e: any) {
      this.logger.error(
        `[CloudSync] Failed to get expenses stats: ${getErrorMessage(e)}`,
      );
      return { error: "Failed to fetch expenses stats" };
    }
  }

  /**
   * Get inventory sync statistics
   */
  public getInventoryStats() {
    try {
      const pendingCount =
        this.dbManager.get<{ count: number }>(
          "SELECT COUNT(*) as count FROM inventory WHERE sync_status = 'pending'",
        )?.count || 0;

      const syncedCount =
        this.dbManager.get<{ count: number }>(
          "SELECT COUNT(*) as count FROM inventory WHERE sync_status = 'synced'",
        )?.count || 0;

      const lowStock = this.dbManager.query(`
                SELECT id, name, type, current_count, low_stock_threshold 
                FROM inventory 
                WHERE current_count <= low_stock_threshold
                ORDER BY current_count ASC 
                LIMIT 10
            `);

      return {
        pending: pendingCount,
        synced: syncedCount,
        total: pendingCount + syncedCount,
        lowStock: lowStock || [],
      };
    } catch (e: any) {
      this.logger.error(
        `[CloudSync] Failed to get inventory stats: ${getErrorMessage(e)}`,
      );
      return { error: "Failed to fetch inventory stats" };
    }
  }

  public pause() {
    this.isPaused = true;
    this.logger.info("[CloudSync] Service Paused.");
  }

  public resume() {
    this.isPaused = false;
    this.logger.info("[CloudSync] Service Resumed.");
    this.sync();
  }

  public purgeQueue() {
    this.dbManager.run("DELETE FROM retention_queue WHERE status = 'pending'");
    this.logger.info("[CloudSync] Queue Purged.");
  }

  public replayDeadLetterQueue(ids?: string[]): { replayed: number; errors: string[] } {
    const errors: string[] = [];
    let replayed = 0;

    try {
      if (!this._isConnected && !ids) {
        this.logger.debug("[CloudSync] Skipping automated DLQ replay while offline.");
        return { replayed: 0, errors };
      }

      let query = `UPDATE operation_logs SET status = 'pending', retry_count = 0, error_log = NULL WHERE status = ?`;
      const params: any[] = [DLQ_STATUS];

      if (ids && ids.length > 0) {
        const placeholders = ids.map(() => '?').join(',');
        query += ` AND id IN (${placeholders})`;
        params.push(...ids);
      } else {
        // For automated replay, limit to 50 items at a time
        query = `UPDATE operation_logs SET status = 'pending', retry_count = 0, error_log = NULL WHERE id IN (SELECT id FROM operation_logs WHERE status = ? LIMIT 50)`;
      }

      const res = this.dbManager.run(query, params);
      replayed += res.changes || 0;

      // Also replay retention_queue DLQ items
      let reqQuery = `UPDATE retention_queue SET status = 'pending', retry_count = 0, error_log = NULL WHERE status = ?`;
      const reqParams: any[] = [DLQ_STATUS];
      if (ids && ids.length > 0) {
        const placeholders = ids.map(() => '?').join(',');
        reqQuery += ` AND id IN (${placeholders})`;
        reqParams.push(...ids);
      } else {
        reqQuery = `UPDATE retention_queue SET status = 'pending', retry_count = 0, error_log = NULL WHERE id IN (SELECT id FROM retention_queue WHERE status = ? LIMIT 50)`;
      }
      const reqRes = this.dbManager.run(reqQuery, reqParams);
      replayed += reqRes.changes || 0;

      if (replayed > 0) {
        this.logger.info(`[CloudSync] DLQ Replay: Re-queued ${replayed} dead_letter operations for retry.`);
        if (this._isConnected) {
          this.scheduleNextSync(100);
        }
      }
    } catch (err: any) {
      const msg = `Failed to replay DLQ: ${err?.message || String(err)}`;
      this.logger.error(`[CloudSync] ${msg}`);
      errors.push(msg);
    }

    return { replayed, errors };
  }

  public getDeadLetterQueue(limit = 100, offset = 0): { items: any[]; total: number } {
    try {
      const totalOps = this.dbManager.query(`SELECT COUNT(*) as count FROM operation_logs WHERE status = ?`, [DLQ_STATUS])[0]?.count || 0;
      const totalReq = this.dbManager.query(`SELECT COUNT(*) as count FROM retention_queue WHERE status = ?`, [DLQ_STATUS])[0]?.count || 0;
      
      const ops = this.dbManager.query(`SELECT id, 'operation_log' as type, table_name, action, record_id, created_at, updated_at, error_log, retry_count FROM operation_logs WHERE status = ? ORDER BY updated_at DESC LIMIT ? OFFSET ?`, [DLQ_STATUS, limit, offset]);
      
      const reqs = this.dbManager.query(`SELECT id, 'retention_asset' as type, album_id as table_name, 'UPLOAD' as action, asset_id as record_id, created_at, updated_at, error_log, retry_count FROM retention_queue WHERE status = ? ORDER BY updated_at DESC LIMIT ? OFFSET ?`, [DLQ_STATUS, limit, offset]);
      
      return {
        items: [...ops, ...reqs].slice(0, limit),
        total: totalOps + totalReq,
      };
    } catch (err: any) {
      this.logger.error(`[CloudSync] Failed to get DLQ: ${err?.message || String(err)}`);
      return { items: [], total: 0 };
    }
  }

  public deleteDeadLetterQueueItems(ids: string[]): { deleted: number } {
    if (!ids || ids.length === 0) return { deleted: 0 };
    let deleted = 0;
    try {
      const placeholders = ids.map(() => '?').join(',');
      const resOps = this.dbManager.run(`DELETE FROM operation_logs WHERE status = ? AND id IN (${placeholders})`, [DLQ_STATUS, ...ids]);
      deleted += resOps.changes || 0;
      
      const resReq = this.dbManager.run(`DELETE FROM retention_queue WHERE status = ? AND id IN (${placeholders})`, [DLQ_STATUS, ...ids]);
      deleted += resReq.changes || 0;
      
      if (deleted > 0) {
        this.logger.info(`[CloudSync] Deleted ${deleted} DLQ items permanently.`);
      }
    } catch (err: any) {
      this.logger.error(`[CloudSync] Failed to delete DLQ items: ${err?.message || String(err)}`);
    }
    return { deleted };
  }

  public getCandidates() {
    try {
      const days = this.config.retentionDays;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      const cutoffIso = cutoffDate.toISOString();

      const query = `
                SELECT p.id, p.name, p.url, p.albumId, a.title as albumTitle, p.created_at
                FROM photos p
                LEFT JOIN albums a ON p.albumId = a.id
                WHERE p.created_at < ?
    AND p.sync_status != 'synced'
                AND p.id NOT IN(SELECT asset_id FROM fulfillment_queue)
                AND p.id NOT IN(SELECT asset_id FROM retention_queue)
                LIMIT 50
    `;

      return this.dbManager.query(query, [cutoffIso]);
    } catch (e) {
      this.logger.error(`[CloudSync] Failed to get candidates: ${e} `);
      return [];
    }
  }

  public processCandidate(
    photoId: string,
    action: "exclude" | "upload" | "delete",
  ) {
    this.logger.info(`[CloudSync] Manual Action: ${action} on ${photoId} `);

    if (action === "upload") {
      const photo = this.dbManager.get<{ albumId: string }>(
        "SELECT albumId FROM photos WHERE id = ?",
        [photoId],
      );
      if (photo) {
        this.dbManager.run(
          `INSERT INTO retention_queue(album_id, asset_id, status) VALUES(?, ?, 'pending')`,
          [photo.albumId, photoId],
        );
      }
    } else if (action === "exclude") {
      this.dbManager.run(
        `UPDATE photos SET sync_status = 'excluded' WHERE id = ? `,
        [photoId],
      );
    } else if (action === "delete") {
      this.dbManager.run(
        `UPDATE photos SET sync_status = 'excluded' WHERE id = ? `,
        [photoId],
      );
    }
  }

  /**
   * Processes the retention_queue by uploading pending assets to the Cloud Hub.
   * This is the engine that drives high-volume photo synchronization.
   */
  private async processRetentionQueue() {
    if (!this.token) return;

    // Fetch batch of pending items
    const pending = this.dbManager.query(`
        SELECT rq.id as queue_id, rq.asset_id, rq.album_id, p.url
        FROM retention_queue rq
        JOIN photos p ON rq.asset_id = p.id
        WHERE rq.status = 'pending'
        LIMIT 25 -- Small batch for stability
    `);

    if (pending.length === 0) return;

    this.logger.info(
      `[CloudSync] Processing ${pending.length} retention assets (Queue Burst)...`,
    );

    for (const item of pending) {
      try {
        await this.uploadRetentionAsset(item.asset_id, item.url, item.album_id);

        this.dbManager.transaction(() => {
          // Mark as synced in queue
          this.dbManager.run(
            `UPDATE retention_queue SET status = 'synced', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [item.queue_id],
          );
          // Mark as synced in photos table
          this.dbManager.run(
            `UPDATE photos SET sync_status = 'synced', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [item.asset_id],
          );
        });
      } catch (e: any) {
        this.logger.error(
          `[CloudSync] Failed to process retention asset ${item.asset_id}: ${getErrorMessage(e)}`,
        );
        this.dbManager.run(
          `UPDATE retention_queue SET status = 'failed', error_log = ?, retry_count = retry_count + 1 WHERE id = ?`,
          [e.message, item.queue_id],
        );
      }
    }
  }

  private async syncRetentionStats() {
    if (!this.token) return;

    try {
      const stats = this.getStats();

      // Check if stats has queues (it might be an error object)
      if (!("queues" in stats) || !stats.queues) {
        return;
      }

      const payload = {
        desk_id: this.deskId,
        retention_queue_size: stats.queues.retention,
        retention_potential_value: (
          stats.queues.retention * Number(this.config.price)
        ).toFixed(2),
        retention_status: stats.status,
        last_updated: new Date().toISOString(),
      };

      // Upsert stats for this desk
      // We use the unified Hub 'settings' or 'stats' endpoint
      const res = await this.fetchWithFailover(`${this.cloudApiUrl}/api/cloud/sync/batch`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          table: "system_stats",
          items: [payload],
        }),
      });

      if (res.ok) {
        this.logger.info(
          `[CloudSync] Synced retention stats: ${payload.retention_queue_size} items, €${payload.retention_potential_value}`,
        );
      }
    } catch (e: any) {
      // Don't log error if collection doesn't exist yet (404), maybe just debug
      if (e.message && e.message.includes("404")) {
        this.logger.debug(
          `[CloudSync] System Stats collection not found on cloud.`,
        );
      } else {
        this.logger.error(
          `[CloudSync] Retention Stats Sync Error: ${getErrorMessage(e)}`,
        );
      }
    }
  }

  private async pollPaidOrders() {
    const url = `${this.cloudApiUrl}/api/cloud/poll-orders`;

    const res = await this.fetchWithFailover(url, {
      headers: { Authorization: `Bearer ${this.token}` },
    });

    if (!res.ok) return;

    const data = (await res.json()) as any;
    const orders = data.items || [];

    if (orders.length > 0) {
      this.logger.info(
        `[CloudSync] Polled ${orders.length} paid orders. Enqueueing for background fulfillment.`,
      );
      for (const order of orders) {
        // Instead of blocking with fulfillOrder, we enqueue the fulfillment task
        // fulfillOrder will now be responsibility of a background worker or a more decoupled trigger
        await this.enqueueOrderForFulfillment(order);
      }
    }
  }

  private async enqueueOrderForFulfillment(order: Order) {
    this.dbManager.transaction(() => {
      // Update local order status if we have it, or create it
      this.dbManager.run(
        `INSERT OR IGNORE INTO orders (id, items, status, orderNumber) VALUES (?, ?, ?, ?)`,
        [order.id, JSON.stringify(order.items), "paid", order.orderNumber],
      );

      // Enqueue assets for fulfillment_queue
      const items = order.items || [];
      for (const assetId of items) {
        this.dbManager.run(
          `
                    INSERT OR IGNORE INTO fulfillment_queue (order_id, asset_id, status, priority, created_at, updated_at)
                    VALUES (?, ?, 'pending', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                `,
          [order.id, assetId],
        );
      }
    });

    // Mark as processing on Hub immediately
    await this.updateOrderStatus(order.id, "processing");
  }

  /**
   * Sync local Master orders to Gallery/Cloud Hub.
   * Pushes orders created at this Master station to the cloud.
   */
  public async syncOrdersToGallery() {
    
    try {
      // Find orders that haven't been synced yet or failed previously
      const pendingOrders = this.dbManager.query(`
                SELECT o.*, a.title as albumTitle 
                FROM orders o
                LEFT JOIN albums a ON o.albumId = a.id
                WHERE o.status = 'paid' AND (o.cloud_sync_status IS NULL OR o.cloud_sync_status = 'pending' OR o.cloud_sync_status = 'failed')
                LIMIT 10
            `);

      if (pendingOrders.length === 0) return;

      this.logger.info(
        `[CloudSync] Syncing ${pendingOrders.length} orders to Gallery/Hub...`,
      );

      for (const order of pendingOrders) {
        const correlationId = `cf_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        const orderStartTime = Date.now();
        
        try {
          // Generate correlation ID for this order's lifecycle
          const orderData = {
            correlationId,
            id: order.id,
            orderNumber: order.orderNumber || order.id,
            date: order.date,
            status: order.status,
            clientName: order.clientName,
            email: order.email,
            albumId: order.albumId,
            albumTitle: order.albumTitle,
            totalAmount: order.total || order.totalAmount || 0,
            items: order.items,
            photographerId: order.photographerId,
            original_id: order.id,
            access_pin: order.access_pin,
            magic_link_token: order.magic_link_token,
          };

          // Log audit: ORDER_SYNC_STARTED
          (this.auditService as any).logOrderSyncEvent({
            event: 'ORDER_SYNCED',
            correlationId,
            orderId: order.id,
            albumId: order.albumId,
            customerEmail: order.email,
            photoCount: order.items ? JSON.parse(order.items).length : 0,
            totalAmount: order.total || order.totalAmount || 0,
          });

          const res = await this.fetchWithFailover(
            `${this.cloudApiUrl}/api/cloud/sync/order`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${this.token}`,
                "Content-Type": "application/json",
                "X-Correlation-ID": correlationId,
              },
              body: JSON.stringify({
                desk_id: this.deskId,
                order: orderData,
              }),
            },
          );

          if (res.ok) {
            const data = (await res.json()) as any;

            // Mark as synced locally and save generated credentials from the hub
            this.dbManager.run(
              `UPDATE orders SET 
                 cloud_sync_status = 'synced', 
                 cloud_sync_error = NULL, 
                 access_pin = COALESCE(access_pin, ?),
                 sync_status = 'synced' 
               WHERE id = ?`,
              [data.accessPin || null, order.id],
            );
            
            const duration = Date.now() - orderStartTime;
            
            // Log audit: ORDER_SYNCED success
            (this.auditService as any).logOrderSyncEvent({
              event: 'ORDER_SYNCED',
              correlationId,
              orderId: order.id,
              albumId: order.albumId,
              customerEmail: order.email,
              photoCount: order.items ? JSON.parse(order.items).length : 0,
              totalAmount: order.total || order.totalAmount || 0,
              galleryOrderId: data.galleryOrderId || data.orderId,
              duration,
            });
            
            this.logger.info(
              `[CloudSync] Order ${order.id} synced to Hub successfully. [${correlationId}] (${duration}ms)`,
            );
          } else {
            const txt = await res.text();
            const duration = Date.now() - orderStartTime;
            
            // Log audit: ORDER_SYNC_FAILED
            (this.auditService as any).logOrderSyncEvent({
              event: 'ORDER_FAILED',
              correlationId,
              orderId: order.id,
              albumId: order.albumId,
              customerEmail: order.email,
              error: txt,
              duration,
            });
            
            this.logger.error(
              `[CloudSync] Failed to sync order ${order.id}: ${txt} [${correlationId}]`,
            );
            this.dbManager.run(
              `UPDATE orders SET cloud_sync_status = 'pending', sync_status = 'pending', cloud_sync_error = ? WHERE id = ?`,
              [txt, order.id],
            );
          }
        } catch (e: any) {
          const duration = Date.now() - orderStartTime;
          
          // Log audit: ORDER_SYNC_FAILED
          (this.auditService as any).logOrderSyncEvent({
            event: 'ORDER_FAILED',
            correlationId,
            orderId: order.id,
            albumId: order.albumId,
            error: e.message,
            duration,
          });
          
          this.logger.error(
            `[CloudSync] Error syncing order ${order.id}: ${getErrorMessage(e)} [${correlationId}]`,
          );
          this.dbManager.run(
            `UPDATE orders SET cloud_sync_status = 'pending', sync_status = 'pending', cloud_sync_error = ? WHERE id = ?`,
            [getErrorMessage(e), order.id],
          );
        }
      }
    } catch (e: any) {
      this.logger.error(`[CloudSync] syncOrdersToGallery error: ${getErrorMessage(e)}`);
    }
  }

  public async uploadHighRes(
    orderId: string,
    assetId: string,
    relativeUrl: string,
    albumId?: string,
  ) {
    // Always use chunked upload for reliability with the Cloud Hub
    return this.uploadFileChunked(orderId, assetId, relativeUrl, albumId);
  }

  private async uploadFileChunked(
    orderId: string,
    assetId: string,
    relativeUrl: string,
    albumId?: string,
  ) {
    const filePath = path.join(this.uploadDir, relativeUrl);
    if (!fs.existsSync(filePath)) {
      throw new Error(`File missing: ${relativeUrl}`);
    }

    const stats = fs.statSync(filePath);
    const totalSize = stats.size;
    const totalChunks = Math.ceil(totalSize / CHUNK_SIZE);
    const originalName = path.basename(relativeUrl);
    // Resolve albumId for R2 namespacing — derive from path if not provided
    const resolvedAlbumId =
      albumId || path.dirname(relativeUrl).split(path.sep)[0] || "unscoped";

    this.logger.info(
      `[CloudSync] Starting chunked upload for ${assetId} → ${this.deskId}/${resolvedAlbumId}/${originalName} (${totalChunks} chunks)`,
    );

    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, totalSize);

      // Create a read stream for the specific chunk
      const chunkStream = fs.createReadStream(filePath, {
        start,
        end: end - 1,
      });

      const form = new FormData();
      form.append("photoId", assetId);
      form.append("orderId", orderId);
      form.append("deskId", this.deskId); // R2 namespace — prevents cross-master key collision
      form.append("albumId", resolvedAlbumId);
      form.append("chunkIndex", i.toString());
      form.append("totalChunks", totalChunks.toString());
      form.append("originalName", originalName);
      form.append("file", chunkStream);

      // Retry logic for individual chunks
      let chunkSuccess = false;
      let chunkRetries = 0;
      const maxChunkRetries = 3;

      while (!chunkSuccess && chunkRetries < maxChunkRetries) {
        try {
          const res = await this.fetchWithFailover(
            `${this.cloudApiUrl}/api/cloud/upload-photo/chunk`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${this.token}`,
                ...form.getHeaders(),
              },
              body: form as any,
            },
          );

          if (!res.ok) {
            const txt = await res.text();
            throw new Error(`Chunk ${i}/${totalChunks} failed: ${txt}`);
          }

          chunkSuccess = true;
          this.logger.debug(
            `[CloudSync] Chunk ${i + 1}/${totalChunks} uploaded for ${assetId}`,
          );
        } catch (err: any) {
          const errMsg = getErrorMessage(err);
          chunkRetries++;
          this.logger.warn(
            `[CloudSync] Chunk ${i + 1}/${totalChunks} upload attempt ${chunkRetries} failed: ${errMsg}`,
          );
          if (chunkRetries >= maxChunkRetries) {
            throw new Error(
              `Max retries reached for chunk ${i + 1}/${totalChunks}: ${errMsg}`,
            );
          }
          // Exponential backoff for chunk retries (e.g., 2s, 4s, 8s)
          await new Promise((resolve) =>
            setTimeout(resolve, Math.pow(2, chunkRetries) * 1000),
          );
          
          // Re-create stream for retry if it was consumed
          // Note: readStream might need to be recreated if not a Buffer
        }
      }
    }

    this.logger.info(`[CloudSync] Chunked upload completed for ${assetId}`);
  }

  public async uploadRetentionAsset(
    assetId: string,
    relativeUrl: string,
    albumId: string,
  ) {
    try {
      const baseName = path.basename(relativeUrl, path.extname(relativeUrl));
      const relDir = path.dirname(relativeUrl);

      const candidates = [
        path.join(this.uploadDir, relDir, `${baseName}_preview_wm.webp`),
        path.join(this.uploadDir, relDir, `${baseName}_tiny.webp`),
        path.join(this.uploadDir, relativeUrl),
      ];

      const filePath = candidates.find((p) => fs.existsSync(p));
      if (!filePath) {
        throw new Error(`No suitable preview found for ${relativeUrl}`);
      }

      const form = new FormData();
      // Use correct field names for Gallery backend compatibility
      form.append("albumId", albumId);
      form.append("photoId", assetId);
      form.append("desk_id", this.deskId);
      form.append("file", fs.createReadStream(filePath));

      const res = await this.fetchWithFailover(
        `${this.cloudGalleryUrl}/api/cloud/upload-photo`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.token}`,
            ...form.getHeaders(),
          },
          body: form as any,
        },
      );

      if (!res.ok) {
        const txt = await res.text();
        // Only ignore if it's a duplicate (already uploaded)
        if (!txt.includes("already exists") && !txt.includes("duplicate")) {
          throw new Error(`Cloud Upload Failed: ${txt}`);
        }
        this.logger.info(
          `[CloudSync] Asset ${assetId} already exists in cloud (duplicate)`,
        );
      } else {
        this.logger.info(`[CloudSync] Retention Asset Uploaded: ${assetId}`);
      }
    } catch (e: any) {
      this.logger.error(`[CloudSync] Retention Error: ${getErrorMessage(e)}`);
      throw e;
    }
  }

  private async updateOrderStatus(orderId: string, status: string) {
    try {
      const res = await this.fetchWithFailover(
        `${this.cloudApiUrl}/api/cloud/update-order/${orderId}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${this.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ fulfillment_status: status }),
        },
      );

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Failed to update order status: ${txt}`);
      }

      this.logger.info(
        `[CloudSync] Order ${orderId} status updated to: ${status}`,
      );
    } catch (e: any) {
      this.logger.error(
        `[CloudSync] Failed to update order status: ${getErrorMessage(e)}`,
      );
      throw e;
    }
  }

  public async uploadOrderBundle(orderId: string, zipPath: string) {
    // Always use chunked upload for reliability with the Cloud Hub
    const relativeZipPath = path.relative(this.uploadDir, zipPath);
    return this.uploadFileChunked(
      orderId,
      `bundle_${orderId}`,
      relativeZipPath,
    );
  }

  /**
   * Phase 75: Sync resort-level BI metrics to Management Hub.
   * Aggregates financial, operational, and photographer KPIs for the dynamic dashboard.
   */
  public async syncResortBI(dateStr?: string): Promise<void> {
    if (!this.resortAnalytics) return;
    const date = dateStr || new Date().toISOString().split("T")[0];

    try {
      await this.authenticate();
      if (!this.token) return;

      const payload = await this.resortAnalytics.getDailyReport(date);

      const res = await this.fetchWithFailover(
        `${this.cloudApiUrl}/api/analytics/resort-ingest`,
        {
          method: "POST",
          headers: await this.getHeaders(),
          body: JSON.stringify(payload),
        },
      );

      if (res.ok) {
        this.logger.info(
          `[CloudSync] Phase 75: Pushed Resort BI for ${date} to Hub.`,
        );

        // Mark as synced locally
        this.dbManager.run(
          "UPDATE daily_resort_stats SET sync_status = 'synced' WHERE date = ?",
          [date],
        );
        this.dbManager.run(
          "UPDATE photographer_performance SET sync_status = 'synced' WHERE date = ?",
          [date],
        );
      } else {
        const txt = await res.text();
        this.logger.error(`[CloudSync] Resort BI Sync Failed: ${txt}`);
      }
    } catch (e: any) {
      this.logger.error(`[CloudSync] Resort BI Sync Error: ${getErrorMessage(e)}`);
    }
  }
  /**
   * Phase 80: Sync Yield Intelligence metrics (conversion rate, upsell success).
   */
  public async syncYieldIntelligence(): Promise<void> {
    try {
      const stats = this.dbManager.query(`
        SELECT 
          date(created_at) as date,
          COUNT(*) as total_orders,
          SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid_orders,
          AVG(total) as avg_order_value
        FROM orders
        WHERE date(created_at) = date('now')
        GROUP BY date(created_at)
      `);

      if (stats.length === 0) return;

      await executeWithRetry(async () => {
        const r = await this.fetchWithFailover(`${this.cloudApiUrl}/api/cloud/sync/yield`, {
          method: "POST",
          headers: await this.getHeaders(),
          body: JSON.stringify({ desk_id: this.deskId, stats }),
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r;
      }, { maxRetries: 2 });

      this.logger.info(`[CloudSync] Yield intelligence synced successfully.`);
    } catch (e: any) {
      this.logger.error(`[CloudSync] Yield Sync Error: ${getErrorMessage(e)}`);
    }
  }

  /**
   * Phase 85: Sync Prospecting CRM leads and interactions.
   */
  public async syncProspectingCRM(): Promise<void> {
    try {
      const leads = this.dbManager.query(`
        SELECT * FROM crm_leads WHERE sync_status = 'pending' LIMIT 50
      `);

      if (leads.length === 0) return;

      const res = await executeWithRetry(async () => {
        const r = await this.fetchWithFailover(`${this.cloudApiUrl}/api/cloud/sync/crm`, {
          method: "POST",
          headers: await this.getHeaders(),
          body: JSON.stringify({ desk_id: this.deskId, leads }),
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r;
      }, { maxRetries: 3 });

      if (res.ok) {
        this.dbManager.transaction(() => {
          const stmt = this.dbManager.prepare("UPDATE crm_leads SET sync_status = 'synced' WHERE id = ?");
          for (const lead of leads) {
            stmt.run(lead.id);
          }
        });
        this.logger.info(`[CloudSync] CRM leads synced successfully (${leads.length}).`);
      }
    } catch (e: any) {
      this.logger.error(`[CloudSync] CRM Sync Error: ${getErrorMessage(e)}`);
    }
  }

  /**
   * Phase 90: Deep Fleet Triage Health Reporting.
   */
  public async sendFleetTriage(): Promise<void> {
    try {
      const health = await HardwareService.getHealthStatus();
      if (!health) return;

      const payload = {
        desk_id: this.deskId,
        timestamp: new Date().toISOString(),
        metrics: {
          cpu_temp: health.cpuTemp,
          disk_io: health.diskIO,
          latency: health.networkLatency,
          memory_pressure: health.memoryPercent
        }
      };

      await this.fetchWithFailover(`${this.cloudApiUrl}/api/cloud/sync/triage`, {
        method: "POST",
        headers: await this.getHeaders(),
        body: JSON.stringify(payload)
      });
    } catch (e: any) {
      this.logger.error(`[CloudSync] Fleet Triage Error: ${getErrorMessage(e)}`);
    }
  }
}

