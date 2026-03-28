import crypto from "node:crypto";
import DatabaseManager from "../db.js";
import Logger from "../logger.js";
import AuditLogger from "../auditLogger.js";
import { TABLE_MAP, JSON_COLUMNS, ALLOWED_COLUMNS } from "../config.js";
import { validateRequest } from "../validation.js";
import { hashPassword } from "../auth.js";
import EmailRelayService from "./emailRelayService.js";

export class RecordService {
  private db: DatabaseManager;
  private emailService: EmailRelayService;

  constructor(db: DatabaseManager, emailService: EmailRelayService) {
    this.db = db;
    this.emailService = emailService;
  }

  async listRecords(
    collection: string,
    query: URLSearchParams,
    deskId?: string,
  ): Promise<any> {
    const table = TABLE_MAP[collection] || collection;
    const filterParam = query.get("filter");
    const sortParam = query.get("sort");
    const pageParam = query.get("page");
    const perPageParam = query.get("perPage");

    const page = pageParam ? Math.max(1, parseInt(pageParam, 10)) : 1;
    const perPage = perPageParam
      ? Math.min(500, Math.max(1, parseInt(perPageParam, 10)))
      : 50;

    let sql = `SELECT * FROM ${table}`;
    let params: any[] = [];
    let countSql = `SELECT COUNT(*) as total FROM ${table}`;
    let countParams: any[] = [];

    // Mandatory desk_id isolation (Rule 01, Law 04)
    if (deskId && ALLOWED_COLUMNS[table]?.includes("desk_id")) {
      sql += ` WHERE desk_id = ?`;
      countSql += ` WHERE desk_id = ?`;
      params.push(deskId);
      countParams.push(deskId);
    }

    if (filterParam) {
      const filters = filterParam.split("&&").map((f) => f.trim());
      filters.forEach((f) => {
        const match = f.match(/([a-zA-Z0-9_]+)\s*=\s*["']?([^"']+)["']?/);
        if (match) {
          const key = match[1];
          const val = match[2];
          // Skip desk_id from filter as it's enforced server-side
          if (ALLOWED_COLUMNS[table]?.includes(key) && key !== "desk_id") {
            sql += (params.length === 0 ? " WHERE " : " AND ") + `${key} = ?`;
            countSql +=
              (countParams.length === 0 ? " WHERE " : " AND ") + `${key} = ?`;
            params.push(val);
            countParams.push(val);
          }
        }
      });
    }

    if (sortParam) {
      const desc = sortParam.startsWith("-");
      const key = sortParam.replace(/^[+-]/, "");
      if (ALLOWED_COLUMNS[table]?.includes(key)) {
        sql += ` ORDER BY ${key} ${desc ? "DESC" : "ASC"}`;
      }
    }

    let totalItems: number | null = null;
    if (perPage !== null) {
      const countResult = await this.db.query(countSql, countParams);
      totalItems = (countResult[0] as any)?.total || 0;
      const offset = (page - 1) * perPage;
      sql += ` LIMIT ? OFFSET ?`;
      params.push(perPage, offset);
    }

    const rows = await this.db.query(sql, params);
    const jsonCols = JSON_COLUMNS[table] || [];
    const parsedRows = rows.map((row) => {
      const parsedRow = { ...row };
      jsonCols.forEach((c) => {
        if (parsedRow[c] && typeof parsedRow[c] === "string") {
          try {
            parsedRow[c] = JSON.parse(parsedRow[c]);
          } catch (e) {}
        }
      });
      return parsedRow;
    });

    if (perPage !== null && totalItems !== null) {
      return {
        items: parsedRows,
        page,
        perPage,
        totalItems,
        totalPages: Math.ceil(totalItems / perPage),
      };
    } else {
      return { items: parsedRows };
    }
  }

  async processRecordCreation(
    method: string,
    table: string,
    data: any,
    deskId?: string,
  ): Promise<any> {
    // Enforce deskId injection for new records (Rule 01)
    if (deskId && ALLOWED_COLUMNS[table]?.includes("desk_id")) {
      data.desk_id = deskId;
    }

    const isUpdate =
      method === "PATCH" ||
      (data.id &&
        (await this.db.get(`SELECT 1 FROM ${table} WHERE id = ? LIMIT 1`, [
          data.id,
        ])));

    // If updating, verify the record belongs to the requester's desk_id
    if (isUpdate && deskId && ALLOWED_COLUMNS[table]?.includes("desk_id")) {
      const existing = await this.db.get(
        `SELECT desk_id FROM ${table} WHERE id = ?`,
        [data.id],
      );
      if (existing && existing.desk_id !== deskId) {
        throw {
          status: 403,
          message:
            "Forbidden: Unauthorized access to record across site boundaries",
        };
      }
    }

    const validation = validateRequest(data, table, !!isUpdate);

    if (!validation.success) {
      throw {
        status: 400,
        message: "Validation failed",
        details: (validation as any).error,
      };
    }

    const validData = validation.data;
    if (!validData.id && table !== "users") {
      validData.id = crypto.randomUUID();
    }

    if (table === "users" && validData.password) {
      validData.password = await hashPassword(validData.password);
    }

    const jsonCols = JSON_COLUMNS[table] || [];
    const rowData = { ...validData };
    jsonCols.forEach((c) => {
      if (
        rowData[c] !== undefined &&
        rowData[c] !== null &&
        typeof rowData[c] !== "string"
      ) {
        rowData[c] = JSON.stringify(rowData[c]);
      }
    });

    const keys = Object.keys(rowData);
    if (isUpdate) {
      const id = rowData.id;
      delete rowData.id;
      const updateKeys = Object.keys(rowData);
      const setClause = updateKeys.map((k) => `${k} = ?`).join(", ");
      await this.db.run(
        `UPDATE ${table} SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [...Object.values(rowData), id],
      );
      rowData.id = id;
    } else {
      const placeholders = keys.map(() => "?").join(", ");
      await this.db.run(
        `INSERT INTO ${table} (${keys.join(", ")}) VALUES (${placeholders})`,
        Object.values(rowData),
      );

      // --- Phase 81: Automated Notifications ---
      if (table === "bookings" && validData.clientEmail) {
        this.emailService
          .sendBookingConfirmationEmail(validData)
          .catch((e) =>
            new Logger("RecordService").error(
              `Failed to send booking confirmation to ${validData.clientEmail}: ${e.message}`,
            ),
          );
      }
    }

    return validData;
  }

  async deleteRecord(
    collection: string,
    id: string,
    deskId?: string,
  ): Promise<boolean> {
    const table = TABLE_MAP[collection] || collection;

    // Verify ownership before deletion
    if (deskId && ALLOWED_COLUMNS[table]?.includes("desk_id")) {
      const existing = await this.db.get(
        `SELECT desk_id FROM ${table} WHERE id = ?`,
        [id],
      );
      if (existing && existing.desk_id !== deskId) {
        throw {
          status: 403,
          message: "Forbidden: Cannot delete records belonging to another site",
        };
      }
    }

    await this.db.run(`DELETE FROM ${table} WHERE id = ?`, [id]);
    return true;
  }

  /**
   * Replay Engine (Phase 30: Intent Sync)
   * Atomically apply a batch of operations from a Master Station.
   */
  async applyOperations(deskId: string, operations: any[]): Promise<string[]> {
    const processedIds: string[] = [];
    const logger = new Logger("RecordService:applyOperations");

    // Sort by sequence number to ensure linear application
    const sortedOps = [...operations].sort(
      (a, b) => (a.sequence_number || 0) - (b.sequence_number || 0),
    );

    for (const op of sortedOps) {
      try {
        // 1. Idempotency Check: Have we already processed this or a newer sequence?
        const sequenceKey = `desk_${deskId}`;
        const lastSync = (await this.db.get(
          `SELECT counter FROM sync_sequences WHERE site_id = ?`,
          [deskId],
        )) as any;

        if (lastSync && op.sequence_number <= lastSync.counter) {
          logger.info(
            `Skipping duplicate/older operation ${op.id} (Seq: ${op.sequence_number}, Last: ${lastSync.counter})`,
          );
          processedIds.push(op.id);
          continue;
        }

        // 2. Transliterate and Apply
        const table = TABLE_MAP[op.table] || op.table;
        const recordId = op.record_id;
        const payload =
          typeof op.payload === "string" ? JSON.parse(op.payload) : op.payload;

        // Strip protected fields from payload
        delete payload.desk_id;
        payload.desk_id = deskId;

        const batchStatements: any[] = [];

        if (op.type === "INSERT") {
          const keys = Object.keys(payload);
          const placeholders = keys.map(() => "?").join(", ");
          batchStatements.push(
            this.db
              .prepare(
                `INSERT OR REPLACE INTO ${table} (${keys.join(", ")}) VALUES (${placeholders})`,
              )
              .bind(...Object.values(payload)),
          );
        } else if (op.type === "UPDATE") {
          const keys = Object.keys(payload);
          const setClause = keys.map((k) => `${k} = ?`).join(", ");
          batchStatements.push(
            this.db
              .prepare(
                `UPDATE ${table} SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
              )
              .bind(...Object.values(payload), recordId),
          );
        } else if (op.type === "DELETE") {
          batchStatements.push(
            this.db.prepare(`DELETE FROM ${table} WHERE id = ?`).bind(recordId),
          );
        }

        // 3. Update Sync Sequence tracking
        batchStatements.push(
          this.db
            .prepare(
              `
                    INSERT INTO sync_sequences (id, site_id, last_processed_id, counter, updated_at)
                    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
                    ON CONFLICT(site_id) DO UPDATE SET 
                        last_processed_id = EXCLUDED.last_processed_id,
                        counter = EXCLUDED.counter,
                        updated_at = EXCLUDED.updated_at
                `,
            )
            .bind(sequenceKey, deskId, op.id, op.sequence_number),
        );

        // 4. Record the operation in Hub's own history
        batchStatements.push(
          this.db
            .prepare(
              `
                    INSERT OR IGNORE INTO operation_logs (id, type, table_name, record_id, payload, timestamp, sequence_number, desk_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `,
            )
            .bind(
              op.id,
              op.type,
              table,
              recordId,
              JSON.stringify(payload),
              op.timestamp,
              op.sequence_number,
              deskId,
            ),
        );

        // Execute batch for this operation (atomicity)
        await this.db.batch(batchStatements);
        processedIds.push(op.id);

        // --- Phase 62: System-Wide Email Architecture ---
        // Rule: Master Stations NEVER send emails directly. Hub triggers emails upon sync.
        if (op.type === "INSERT" && table === "orders") {
          try {
            if (payload.email && payload.access_pin) {
              const galleryUrl = "https://www.clicketflash.com/gallery";
              // We dispatch asynchronously so it doesn't block the sync processing loop
              this.emailService
                .sendGalleryAccessEmail(
                  payload.email,
                  payload.access_pin,
                  galleryUrl,
                  payload.customer_name || "Customer",
                )
                .catch((e) =>
                  logger.error(
                    `Background email dispatch failed for ${payload.email}: ${e.message}`,
                  ),
                );
            }
          } catch (emailErr: any) {
            logger.error(
              `Failed to initiate email for order ${recordId}: ${emailErr.message}`,
            );
          }
        }
      } catch (err: any) {
        logger.error(
          `Failed to replay operation ${op.id} for ${deskId}: ${err.message}`,
        );
        // Stop processing batch on failure to maintain sequence integrity
        break;
      }
    }

    return processedIds;
  }

  /**
   * Pull remote operations for bi-directional sync.
   * Returns operations from OTHER desks that the requester hasn't seen yet.
   */
  async getRemoteOperations(
    requesterDeskId: string,
    sinceHubIndex: number,
  ): Promise<any[]> {
    // Fetch operations where desk_id is NOT the requester AND hub_index > sinceHubIndex
    const sql = `
            SELECT hub_index, id, type, table_name as "table", record_id, payload, timestamp, sequence_number, desk_id
            FROM operation_logs
            WHERE desk_id != ? AND hub_index > ?
            ORDER BY hub_index ASC
            LIMIT 100
        `;
    const ops = await this.db.query(sql, [requesterDeskId, sinceHubIndex]);

    return ops.map((op) => ({
      ...op,
      payload:
        typeof op.payload === "string" ? JSON.parse(op.payload) : op.payload,
    }));
  }

  /**
   * Update fleet heartbeat from Master station.
   * Updates destinations table with health metrics.
   */
  async updateFleetHeartbeat(deskId: string, heartbeat: any): Promise<void> {
    const { 
      timestamp = new Date().toISOString(), 
      version = 'unknown', 
      uptime = 0, 
      memory = {}, 
      system = {}, 
      metrics = {} 
    } = heartbeat;

    // Update destinations table with heartbeat info
    await this.db.run(
      `
            INSERT INTO destinations (id, name, site_code, type, last_seen, status, health_metrics, version)
            VALUES (?, ?, ?, 'Master', ?, 'Online', ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                last_seen = EXCLUDED.last_seen,
                status = EXCLUDED.status,
                health_metrics = EXCLUDED.health_metrics,
                version = EXCLUDED.version
        `,
      [
        deskId,
        deskId, // name defaults to desk_id
        deskId, // site_code
        timestamp,
        JSON.stringify({ uptime, memory, system, metrics }),
        version,
      ],
    );

    // Store detailed metrics in a separate table for history
    await this.db.run(
      `
            INSERT INTO fleet_heartbeat_history (desk_id, timestamp, orders_today, photos_today, pending_sync, sync_status)
            VALUES (?, ?, ?, ?, ?, ?)
        `,
      [
        deskId,
        timestamp,
        metrics?.orders_today || 0,
        metrics?.photos_today || 0,
        metrics?.pending_sync || 0,
        metrics?.sync_status || "unknown",
      ],
    );
  }

  /**
   * Get fleet status for all connected Master stations.
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
                (SELECT COUNT(*) FROM orders WHERE desk_id = d.id) as total_orders,
                (SELECT COUNT(*) FROM albums WHERE desk_id = d.id) as total_albums,
                (SELECT COUNT(*) FROM photos WHERE desk_id = d.id) as total_photos
            FROM destinations d
            WHERE d.type = 'Master'
            ORDER BY d.last_seen DESC
        `;
    const fleet = await this.db.query(sql);

    return fleet.map((f: any) => {
      const hm =
        typeof f.health_metrics === "string"
          ? JSON.parse(f.health_metrics)
          : f.health_metrics || {};

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
          queueSize: hm.metrics?.pending_sync || 0,
        },
        syncStatus: {
          lastSync: f.last_seen,
          pendingOperations: hm.metrics?.pending_sync || 0,
          failedOperations: 0,
          syncLag: f.last_seen
            ? Math.round((Date.now() - new Date(f.last_seen).getTime()) / 60000)
            : 0,
        },
        orders: {
          today: hm.metrics?.orders_today || 0,
          week: 0, // Need to implement weekly aggregation if critical
          pending: 0,
        },
        photos: {
          today: hm.metrics?.photos_today || 0,
          total: f.total_photos || 0,
        },
      };
    });
  }
}

export default RecordService;
