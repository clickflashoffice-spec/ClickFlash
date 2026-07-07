/**
 * ClickFlash Management Hub — Fleet Coordination Service
 * Handles master registration, heartbeats, shared config, and peer discovery.
 */

import { createToken } from "../jwt.js";
import DatabaseManager from "../db.js";

export interface RegistrationPayload {
  name: string;
  location: string;
  country: string;
  timezone: string;
  currency: string;
  hardware_fingerprint: string;
  version: string;
}

export interface RegistrationResult {
  success: boolean;
  deskId?: string;
  jwtToken?: string;
  peers?: Array<{
    desk_id: string;
    name: string;
    location: string;
    status: string;
    last_seen: string;
  }>;
  sharedConfig?: {
    products: unknown[];
    session_types: unknown[];
    pricing_tiers: unknown[];
    global_settings: Record<string, string>;
  };
  r2Prefix?: string;
  syncEndpoint?: string;
  galleryEndpoint?: string;
  error?: string;
}

export interface HeartbeatPayload {
  timestamp: string;
  version: string;
  uptime: number;
  memory: Record<string, any>;
  system: Record<string, any>;
  metrics: Record<string, any>;
}

export class FleetService {
  private db: DatabaseManager;
  private jwtSecret: string;

  constructor(db: DatabaseManager, jwtSecret: string) {
    this.db = db;
    this.jwtSecret = jwtSecret;
  }

  /**
   * Register a new master in the fleet.
   * Checks desk_id uniqueness, inserts into destinations, returns config + JWT.
   */
  async handleRegistration(
    deskId: string,
    payload: RegistrationPayload,
  ): Promise<RegistrationResult> {
    // 1. Check for desk_id collision
    const existing = await this.db.get(
      "SELECT id FROM destinations WHERE id = ? LIMIT 1",
      [deskId],
    );
    if (existing) {
      return {
        success: false,
        error: `Desk ID '${deskId}' is already registered in the fleet.`,
      };
    }

    const now = new Date().toISOString();

    // 2. Insert into destinations table (multi-tenant isolation via desk_id)
    await this.db.run(
      `
        INSERT INTO destinations (
          id, name, site_code, type, status, last_seen, version, health_metrics, created_at, updated_at
        ) VALUES (?, ?, ?, 'Master', 'Online', ?, ?, ?, ?, ?)
      `,
      [
        deskId,
        payload.name,
        deskId, // site_code defaults to desk_id
        now,
        payload.version,
        JSON.stringify({ hardware_fingerprint: payload.hardware_fingerprint }),
        now,
        now,
      ],
    );

    // 3. Insert into fleet_heartbeats table
    await this.db.run(
      `
        INSERT INTO fleet_heartbeats (desk_id, last_seen, metrics, version, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [deskId, now, JSON.stringify({}), payload.version, now, now],
    );

    // 4. Generate JWT
    const jwtToken = await this.generateJwtToken(deskId);

    // 5. Fetch shared config
    const sharedConfig = await this.getSharedConfig(deskId);

    // 6. Fetch peers
    const peers = await this.getPeers(deskId);

    return {
      success: true,
      deskId,
      jwtToken,
      peers,
      sharedConfig,
      r2Prefix: `studios/${deskId}/`,
      syncEndpoint: `/api/sync/${deskId}`,
      galleryEndpoint: `/api/gallery/${deskId}`,
    };
  }

  /**
   * Process a heartbeat from a master station.
   * Updates fleet_heartbeats and returns any pending commands.
   */
  async handleHeartbeat(
    deskId: string,
    payload: HeartbeatPayload,
  ): Promise<any[]> {
    const now = new Date().toISOString();

    // Update destinations (canonical fleet registry)
    await this.db.run(
      `
        INSERT INTO destinations (id, name, site_code, type, status, last_seen, version, health_metrics, updated_at)
        VALUES (?, ?, ?, 'Master', 'Online', ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          last_seen = EXCLUDED.last_seen,
          status = EXCLUDED.status,
          version = EXCLUDED.version,
          health_metrics = EXCLUDED.health_metrics,
          updated_at = EXCLUDED.updated_at
      `,
      [
        deskId,
        deskId,
        deskId,
        now,
        payload.version,
        JSON.stringify({
          uptime: payload.uptime,
          memory: payload.memory,
          system: payload.system,
          metrics: payload.metrics,
        }),
        now,
      ],
    );

    // Update fleet_heartbeats (dedicated heartbeat table)
    await this.db.run(
      `
        INSERT INTO fleet_heartbeats (desk_id, last_seen, metrics, version, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(desk_id) DO UPDATE SET
          last_seen = EXCLUDED.last_seen,
          metrics = EXCLUDED.metrics,
          version = EXCLUDED.version,
          updated_at = EXCLUDED.updated_at
      `,
      [
        deskId,
        now,
        JSON.stringify(payload.metrics),
        payload.version,
        now,
      ],
    );

    // Return pending commands (if any) from a command queue table
    const pendingCommands = await this.db.query(
      `
        SELECT id, command_type, payload, created_at
        FROM master_command_queue
        WHERE desk_id = ? AND status = 'pending'
        ORDER BY created_at ASC
        LIMIT 10
      `,
      [deskId],
    );

    // Mark fetched commands as 'delivered'
    if (pendingCommands.length > 0) {
      const ids = pendingCommands.map((c: any) => c.id);
      const placeholders = ids.map(() => "?").join(", ");
      await this.db.run(
        `UPDATE master_command_queue SET status = 'delivered', updated_at = ? WHERE id IN (${placeholders})`,
        [now, ...ids],
      );
    }

    return pendingCommands.map((cmd: any) => ({
      id: cmd.id,
      type: cmd.command_type,
      payload: typeof cmd.payload === "string" ? JSON.parse(cmd.payload) : cmd.payload,
      created_at: cmd.created_at,
    }));
  }

  /**
   * Get shared configuration for a new master.
   * Pulls global settings + per-desk overrides.
   */
  async getSharedConfig(deskId: string): Promise<{
    products: unknown[];
    session_types: unknown[];
    pricing_tiers: unknown[];
    global_settings: Record<string, string>;
  }> {
    // Global products (not desk-scoped)
    const products = await this.db.query(
      `SELECT * FROM products WHERE status = 'active' ORDER BY name ASC`,
    );

    // Session types
    const sessionTypes = await this.db.query(
      `SELECT * FROM session_types ORDER BY name ASC`,
    );

    // Pricing tiers (global)
    const pricingTiers = await this.db.query(
      `SELECT * FROM seasonal_rates WHERE is_active = 1 ORDER BY priority DESC`,
    );

    // Global settings
    const settingsRows = await this.db.query(
      `SELECT key, value FROM settings WHERE key LIKE 'global.%'`,
    );
    const globalSettings: Record<string, string> = {};
    for (const row of settingsRows) {
      globalSettings[row.key] =
        typeof row.value === "string" ? row.value : JSON.stringify(row.value);
    }

    // Per-desk overrides (if any)
    const overrideRows = await this.db.query(
      `SELECT key, value FROM settings WHERE key LIKE ?`,
      [`desk.${deskId}.%`],
    );
    for (const row of overrideRows) {
      const shortKey = row.key.replace(`desk.${deskId}.`, "");
      globalSettings[shortKey] =
        typeof row.value === "string" ? row.value : JSON.stringify(row.value);
    }

    return {
      products,
      session_types: sessionTypes,
      pricing_tiers: pricingTiers,
      global_settings: globalSettings,
    };
  }

  /**
   * Get peer masters in the fleet (excluding the requester).
   */
  async getPeers(deskId: string): Promise<
    Array<{
      desk_id: string;
      name: string;
      location: string;
      status: string;
      last_seen: string;
    }>
  > {
    const rows = await this.db.query(
      `
        SELECT
          d.id AS desk_id,
          d.name,
          d.site_code AS location,
          d.status,
          d.last_seen
        FROM destinations d
        WHERE d.type = 'Master' AND d.id != ?
        ORDER BY d.last_seen DESC
      `,
      [deskId],
    );

    return rows.map((row: any) => ({
      desk_id: row.desk_id,
      name: row.name || row.desk_id,
      location: row.location || "Unknown",
      status: row.status?.toLowerCase() || "offline",
      last_seen: row.last_seen || "",
    }));
  }

  /**
   * Generate an HS256-signed JWT with desk_id claim.
   * Uses jose for Cloudflare Workers compatibility.
   */
  async generateJwtToken(deskId: string): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const jti = crypto.randomUUID();

    const payload = {
      desk_id: deskId,
      role: "desk",
      jti,
      iss: "clickflash-hub",
      aud: "clickflash-master",
    };

    return await createToken(payload, this.jwtSecret, "1y");
  }

  /**
   * Get full fleet status for dashboard.
   */
  async getFleetStatus(): Promise<any[]> {
    const sql = `
      SELECT
        d.id,
        d.name,
        d.site_code,
        d.type,
        d.status,
        d.last_seen,
        d.version,
        d.health_metrics,
        fh.metrics AS heartbeat_metrics,
        (SELECT COUNT(*) FROM orders WHERE desk_id = d.id) AS total_orders,
        (SELECT COUNT(*) FROM albums WHERE desk_id = d.id) AS total_albums,
        (SELECT COUNT(*) FROM photos WHERE desk_id = d.id) AS total_photos
      FROM destinations d
      LEFT JOIN fleet_heartbeats fh ON fh.desk_id = d.id
      WHERE d.type = 'Master'
      ORDER BY d.last_seen DESC
    `;
    const fleet = await this.db.query(sql);

    return fleet.map((f: any) => {
      const hm =
        typeof f.health_metrics === "string"
          ? JSON.parse(f.health_metrics)
          : f.health_metrics || {};
      const hbMetrics =
        typeof f.heartbeat_metrics === "string"
          ? JSON.parse(f.heartbeat_metrics)
          : f.heartbeat_metrics || {};

      const formatUptime = (seconds: number) => {
        if (!seconds) return "0h";
        const d = Math.floor(seconds / (3600 * 24));
        const h = Math.floor((seconds % (3600 * 24)) / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return `${d > 0 ? d + "d " : ""}${h}h ${m}m`;
      };

      return {
        id: f.id,
        name: f.name,
        location: f.site_code || "Unknown",
        status: f.status?.toLowerCase() || "offline",
        lastSeen: f.last_seen,
        version: f.version || "5.0.0",
        metrics: {
          cpuUsage: hm.system?.cpu || 0,
          memoryUsage: hm.memory?.percent || 0,
          diskUsage: hm.system?.disk || 0,
          uptime: formatUptime(hm.uptime),
          queueSize: hbMetrics.pending_sync || 0,
        },
        syncStatus: {
          lastSync: f.last_seen,
          pendingOperations: hbMetrics.pending_sync || 0,
          failedOperations: hbMetrics.failed_sync || 0,
          syncLag: f.last_seen
            ? Math.round((Date.now() - new Date(f.last_seen).getTime()) / 60000)
            : 0,
        },
        orders: {
          today: hbMetrics.orders_today || 0,
          total: f.total_orders || 0,
        },
        photos: {
          today: hbMetrics.photos_today || 0,
          total: f.total_photos || 0,
        },
        albums: {
          total: f.total_albums || 0,
        },
      };
    });
  }
}

export default FleetService;
