import { Logger } from "../shared/logger";
import DatabaseManager from "../shared/db";
import * as path from "path";
import * as fs from "fs";
import FormData from "form-data";
import { HardwareService } from "../shared/hardwareService";
import { ArchiveService } from "./ArchiveService";
import { ResourceMonitor } from "../shared/ResourceMonitor";
import { tunnelManager } from "./TunnelManager";
import { ResortAnalyticsService } from "./ResortAnalyticsService";
import { TABLE_MAP, ALLOWED_COLUMNS } from "../config/constants";

interface SyncConfig {
  enabled: boolean;
  retentionDays: number;
  price: string;
}

// Use global fetch (Node 18+)
const fetchFn = (globalThis as any).fetch;

// Constants
const MIN_SYNC_INTERVAL = 1000 * 60 * 1; // 1 Minute
const MAX_SYNC_INTERVAL = 1000 * 60 * 30; // 30 Minutes
const BACKOFF_FACTOR = 1.5;
const RETENTION_CHECK_INTERVAL = 1000 * 60 * 60 * 24; // Once a day
const CHUNK_SIZE = 1024 * 1024 * 1; // 1MB chunks for stability

export class CloudSyncService {
  private logger: Logger;
  private dbManager: DatabaseManager;
  private emailService: { setCloudConfig: (url: string, token: string) => void };
  private resourceMonitor: ResourceMonitor | null = null;
  private isSyncing = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private retentionTimer: ReturnType<typeof setInterval> | null = null;
  private enabled = false;
  private isPaused = false;
  private resortAnalytics: ResortAnalyticsService | null = null;
  private consecutiveFailures = 0;
  private currentInterval = MIN_SYNC_INTERVAL;

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
    emailService: any,
    resourceMonitor: ResourceMonitor | null = null,
    resortAnalytics: ResortAnalyticsService | null = null,
  ) {
    this.dbManager = dbManager;
    this.logger = logger;
    this.emailService = emailService;
    this.resourceMonitor = resourceMonitor;
    this.resortAnalytics = resortAnalytics;

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
      this.logger.debug(`[CloudSync] Enrollment Check Failed: ${e.message}`);
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
        this.logger.debug(`[CloudSync] remote_settings_hash not found: ${e.message}`);
      }

      const res = await fetchFn(
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

    // Initial Cycle
    this.scheduleNextSync(1000); // Start in 1 second

    // Periodic Retention Batch (Photos)
    this.runRetentionBatch(); // Run once on start
    this.retentionTimer = setInterval(
      () => this.runRetentionBatch(),
      RETENTION_CHECK_INTERVAL,
    );
  }

  private scheduleNextSync(ms?: number) {
    if (this.timer) clearTimeout(this.timer);
    if (this.isPaused) return;

    const delay = ms ?? this.currentInterval;
    this.timer = setTimeout(() => this.sync(), delay);
    this.logger.debug(`[CloudSync] Next sync scheduled in ${Math.round(delay / 1000)}s`);
  }

  stop() {
    if (this.timer) clearTimeout(this.timer as any);
    if (this.retentionTimer) clearInterval(this.retentionTimer);
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
      const res = await fetchFn(`${this.cloudApiUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: this.cloudEmail,
          password: this.cloudPassword,
          machine_id: machineId,
        }),
      });

      if (res.ok) {
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
      this.logger.error(`[CloudSync] Auth Error: ${e.message}`);
      this.token = null;
      this._isConnected = false;
    }
  }

  public async sync() {
    if (this.isPaused) return;
    if (this.isSyncing) return;
    this.isSyncing = true;
    try {
      await this.authenticate();
      if (!this.token) return;

      // --- Phase 13/32: Parallelized Intent Synchronization ---
      // We run these in parallel so a slow order poll doesn't block intent pushing.
      await Promise.allSettled([
        this.syncOperationLogs(),
        this.syncLedgerEntries(), // Payroll sync
        this.syncExpenses(), // Expenses sync
        this.syncInventory(), // Inventory sync
        this.syncOrdersToGallery(), // Order sync to Gallery
        this.sendHeartbeat(), // Fleet heartbeat & Triage
        this.syncYieldIntelligence(), // Phase 80: Yield metrics
        this.syncProspectingCRM(), // Phase 85: B2B CRM sync
        this.sendFleetTriage(), // Phase 90: Deep health triage
        this.pullRemoteOperations(),
        this.pullGlobalSettings(), // Phase 51: Hub → Master settings propagation
        this.pollPaidOrders(),
        this.processRetentionQueue(), // Phase 61: High-volume retention sync
        this.syncRetentionStats(),
        this.syncDailyAnalytics(), // Phase 70: Photographer audit metrics → Management Hub
        this.syncResortBI(), // Phase 75: Resort BI Dashboard Sync
        ArchiveService.checkAndArchiveSyncCandidates(
          this.dbManager,
          this.logger,
        ),
      ]);

      this._lastSuccessfulSync = new Date();
      this.consecutiveFailures = 0;
      this.currentInterval = MIN_SYNC_INTERVAL;
    } catch (e: any) {
      this.logger.error(`[CloudSync] Sync Cycle Error: ${e.message} `);
      this.consecutiveFailures++;
      this.currentInterval = Math.min(
        MAX_SYNC_INTERVAL,
        this.currentInterval * BACKOFF_FACTOR,
      );
    } finally {
      this.isSyncing = false;
      this.scheduleNextSync();
    }
  }

  private async syncOperationLogs() {
    // Fetch pending operations (ordered by sequence_number for strict linear replay)
    const ops = this.dbManager.query(`
            SELECT * FROM operation_logs 
            WHERE status = 'pending' 
            ORDER BY sequence_number ASC 
            LIMIT 50
        `);

    if (ops.length === 0) return;

    this.logger.info(
      `[CloudSync] Syncing ${ops.length} user intents to Cloud Hub (Desk: ${this.deskId})...`,
    );

    try {
      const res = await fetchFn(
        `${this.cloudApiUrl}/api/cloud/sync/operations`,
        {
          method: "POST",
          headers: await this.getHeaders(),
          body: JSON.stringify({
            desk_id: this.deskId,
            operations: ops.map((op: any) => ({
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

      if (res.ok) {
        const json = (await res.json()) as {
          success: true;
          processed: string[];
        };
        const processedIds = json.processed || [];

        if (processedIds.length > 0) {
          this.dbManager.transaction(() => {
            const stmt = this.dbManager.prepare(
              `UPDATE operation_logs SET status = 'synced' WHERE id = ?`,
            );
            for (const id of processedIds) {
              stmt.run(id);
            }
          });
          this.logger.info(
            `[CloudSync] Successfully synced ${processedIds.length} operations to Hub.`,
          );
        }
      } else {
        const txt = await res.text();
        this.logger.error(`[CloudSync] Operations Sync Failed: ${txt}`);
      }
    } catch (e: any) {
      this.logger.error(`[CloudSync] Operations Sync Error: ${e.message}`);
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

      const res = await fetchFn(
        `${this.cloudApiUrl}/api/cloud/sync/operations`,
        {
          method: "POST",
          headers: await this.getHeaders(),
          body: JSON.stringify({
            desk_id: this.deskId,
            operations,
          }),
        },
      );

      if (res.ok) {
        const json = (await res.json()) as {
          success: true;
          processed: string[];
        };
        const processedIds = json.processed || [];

        if (processedIds.length > 0) {
          // Mark entries as synced
          this.dbManager.transaction(() => {
            const stmt = this.dbManager.prepare(
              `UPDATE photographer_ledger SET sync_status = 'synced' WHERE sync_id = ? OR id = ?`,
            );
            for (const syncId of processedIds) {
              // Extract original ID from sync_id format: deskId_ledger_originalId
              const originalId = syncId.includes("_ledger_")
                ? syncId.split("_ledger_")[1]
                : syncId;
              stmt.run(syncId, originalId);
            }
          });
          this.logger.info(
            `[CloudSync] Successfully synced ${processedIds.length} ledger entries to Hub.`,
          );
        }
      } else {
        const txt = await res.text();
        this.logger.error(`[CloudSync] Ledger Sync Failed: ${txt}`);
      }
    } catch (e: any) {
      this.logger.error(`[CloudSync] Ledger Sync Error: ${e.message}`);
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

      const res = await fetchFn(
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
        return { pushed: json.processed ?? audits.length, date };
      } else {
        const txt = await res.text();
        this.logger.error(
          `[CloudSync] Analytics Sync Failed (${date}): ${txt}`,
        );
        return { pushed: 0, date };
      }
    } catch (e: any) {
      this.logger.error(`[CloudSync] Analytics Sync Error: ${e.message}`);
      return { pushed: 0, date };
    }
  }

  /**
   * Sync expenses to Cloud Hub.
   * Pushes pending expense entries for consolidated business reporting.
   */
  public async syncExpenses() {
    const entries = this.dbManager.query(`
            SELECT * FROM expenses 
            WHERE sync_status = 'pending' 
            ORDER BY created_at ASC 
            LIMIT 50
        `);

    if (entries.length === 0) return;

    this.logger.info(
      `[CloudSync] Syncing ${entries.length} expense entries to Cloud Hub (Desk: ${this.deskId})...`,
    );

    try {
      const operations = entries.map((entry) => ({
        id: entry.sync_id || `${this.deskId}_expense_${entry.id}`,
        type: "INSERT",
        table: "expenses",
        record_id: entry.id,
        payload: {
          id: entry.id,
          description: entry.description,
          amount: entry.amount,
          category: entry.category,
          date: entry.date,
          photographerId: entry.photographerId,
          destinationId: entry.destinationId,
          invoiceUrl: entry.invoiceUrl,
          original_id: entry.id,
          created_at: entry.created_at,
        },
        timestamp: Date.now(),
        sequence_number: Date.now(),
      }));

      const res = await fetchFn(
        `${this.cloudApiUrl}/api/cloud/sync/operations`,
        {
          method: "POST",
          headers: await this.getHeaders(),
          body: JSON.stringify({
            desk_id: this.deskId,
            operations,
          }),
        },
      );

      if (res.ok) {
        const json = (await res.json()) as {
          success: true;
          processed: string[];
        };
        const processedIds = json.processed || [];

        if (processedIds.length > 0) {
          this.dbManager.transaction(() => {
            const stmt = this.dbManager.prepare(
              `UPDATE expenses SET sync_status = 'synced' WHERE sync_id = ? OR id = ?`,
            );
            for (const syncId of processedIds) {
              const originalId = syncId.includes("_expense_")
                ? syncId.split("_expense_")[1]
                : syncId;
              stmt.run(syncId, originalId);
            }
          });
          this.logger.info(
            `[CloudSync] Successfully synced ${processedIds.length} expense entries to Hub.`,
          );
        }
      } else {
        const txt = await res.text();
        this.logger.error(`[CloudSync] Expenses Sync Failed: ${txt}`);
      }
    } catch (e: any) {
      this.logger.error(`[CloudSync] Expenses Sync Error: ${e.message}`);
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

      const res = await fetchFn(
        `${this.cloudApiUrl}/api/cloud/sync/operations`,
        {
          method: "POST",
          headers: await this.getHeaders(),
          body: JSON.stringify({
            desk_id: this.deskId,
            operations,
          }),
        },
      );

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
      this.logger.error(`[CloudSync] Inventory Sync Error: ${e.message}`);
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

      const res = await fetchFn(`${this.cloudApiUrl}/api/cloud/heartbeat`, {
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
              tunnelManager.start().catch((err) => {
                this.logger.error(
                  `[TunnelManager] Failed to start tunnel: ${err.message}`,
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
      }
    } catch (e: any) {
      this.logger.error(`[CloudSync] Heartbeat Error: ${e.message}`);
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

      const res = await fetchFn(
        `${this.cloudApiUrl}/api/cloud/sync/operations?since_hub_index=${sinceHubIndex}`,
        {
          headers: await this.getHeaders(),
        },
      );

      if (!res.ok) return;

      const data = (await res.json()) as { success: true; operations: any[] };
      const remoteOps = data.operations || [];

      if (remoteOps.length > 0) {
        this.logger.info(
          `[CloudSync] Received ${remoteOps.length} remote operations from other desks.`,
        );
        await this.applyRemoteOperations(remoteOps);
      }
    } catch (e: any) {
      this.logger.error(`[CloudSync] Pull Operations Error: ${e.message}`);
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

      const res = await fetchFn(
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
      // Non-critical — don't spam logs if Hub doesn't support this endpoint yet
      if (!e.message?.includes("404")) {
        this.logger.warn(`[CloudSync] Pull Settings: ${e.message}`);
      }
    }
  }

  private async applyRemoteOperations(operations: any[]) {
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

        // Idempotency: Don't replay if we already have this specific op (unlikely due to hub_index filter)
        // OR if our local counter for that site is already higher (Vector Clock principle)
        const siteId = op.desk_id;
        const localSiteSeq = this.dbManager.get<{ counter: number }>(
          "SELECT counter FROM sync_sequences WHERE site_id = ?",
          [siteId],
        );

        if (localSiteSeq && op.sequence_number <= localSiteSeq.counter) {
          this.logger.debug(
            `[CloudSync] Skipping already seen operation ${op.id} from ${siteId}`,
          );
          lastInBatchIdx = op.hub_index;
          continue;
        }

        this.dbManager.transaction(() => {
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

          // Update site-specific sequence tracking
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

        lastInBatchIdx = op.hub_index;
      } catch (err: any) {
        this.logger.error(
          `[CloudSync] Failed to apply remote operation ${op.id}: ${err.message}`,
        );
        // Continue with next op? No, break to ensure sequentiality
        break;
      }
    }

    // Update HUB_GLOBAL sequence
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
      this.logger.error(`[CloudSync] Retention Batch Error: ${e.message} `);
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

      return {
        enabled: this.config.enabled,
        status: this.isPaused ? "paused" : this.isSyncing ? "syncing" : "idle",
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
      this.logger.error(`[CloudSync] Failed to get ledger stats: ${e.message}`);
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
        `[CloudSync] Failed to get expenses stats: ${e.message}`,
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
        `[CloudSync] Failed to get inventory stats: ${e.message}`,
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
          `[CloudSync] Failed to process retention asset ${item.asset_id}: ${e.message}`,
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
      const res = await fetchFn(`${this.cloudApiUrl}/api/cloud/sync/batch`, {
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
          `[CloudSync] Retention Stats Sync Error: ${e.message}`,
        );
      }
    }
  }

  private async pollPaidOrders() {
    const url = `${this.cloudApiUrl}/api/cloud/poll-orders`;

    const res = await fetchFn(url, {
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

  private async enqueueOrderForFulfillment(order: any) {
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
        try {
          const orderData = {
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

          const res = await fetchFn(
            `${this.cloudApiUrl}/api/cloud/sync/order`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${this.token}`,
                "Content-Type": "application/json",
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
            this.logger.info(
              `[CloudSync] Order ${order.id} synced to Hub successfully.`,
            );
          } else {
            const txt = await res.text();
            this.logger.error(
              `[CloudSync] Failed to sync order ${order.id}: ${txt}`,
            );
            this.dbManager.run(
              `UPDATE orders SET cloud_sync_status = 'failed', cloud_sync_error = ? WHERE id = ?`,
              [txt, order.id],
            );
          }
        } catch (e: any) {
          this.logger.error(
            `[CloudSync] Error syncing order ${order.id}: ${e.message}`,
          );
          this.dbManager.run(
            `UPDATE orders SET cloud_sync_status = 'failed', cloud_sync_error = ? WHERE id = ?`,
            [e.message, order.id],
          );
        }
      }
    } catch (e: any) {
      this.logger.error(`[CloudSync] syncOrdersToGallery error: ${e.message}`);
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
          const res = await fetchFn(
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
          chunkRetries++;
          this.logger.warn(
            `[CloudSync] Chunk ${i + 1}/${totalChunks} upload attempt ${chunkRetries} failed: ${err.message}`,
          );
          if (chunkRetries >= maxChunkRetries) {
            throw new Error(
              `Max retries reached for chunk ${i + 1}/${totalChunks}: ${err.message}`,
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

      const res = await fetchFn(
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
      this.logger.error(`[CloudSync] Retention Error: ${e.message}`);
      throw e;
    }
  }

  private async updateOrderStatus(orderId: string, status: string) {
    try {
      const res = await fetchFn(
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
        `[CloudSync] Failed to update order status: ${e.message}`,
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

      const res = await fetchFn(
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
      this.logger.error(`[CloudSync] Resort BI Sync Error: ${e.message}`);
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

      await fetchFn(`${this.cloudApiUrl}/api/cloud/sync/yield`, {
        method: "POST",
        headers: await this.getHeaders(),
        body: JSON.stringify({ desk_id: this.deskId, stats }),
      });
    } catch (e: any) {
      this.logger.error(`[CloudSync] Yield Sync Error: ${e.message}`);
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

      const res = await fetchFn(`${this.cloudApiUrl}/api/cloud/sync/crm`, {
        method: "POST",
        headers: await this.getHeaders(),
        body: JSON.stringify({ desk_id: this.deskId, leads }),
      });

      if (res.ok) {
        this.dbManager.transaction(() => {
          const stmt = this.dbManager.prepare("UPDATE crm_leads SET sync_status = 'synced' WHERE id = ?");
          for (const lead of leads) {
            stmt.run(lead.id);
          }
        });
      }
    } catch (e: any) {
      this.logger.error(`[CloudSync] CRM Sync Error: ${e.message}`);
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

      await fetchFn(`${this.cloudApiUrl}/api/cloud/sync/triage`, {
        method: "POST",
        headers: await this.getHeaders(),
        body: JSON.stringify(payload)
      });
    } catch (e: any) {
      this.logger.error(`[CloudSync] Fleet Triage Error: ${e.message}`);
    }
  }
}
