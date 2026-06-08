const crypto = require("crypto");
const Logger = require("../logger");
const { getDatabase } = require("../db");

class RecordService {
  constructor() {
    this._db = null;
    this.logger = new Logger("recordService");
  }

  get db() {
    if (!this._db) {
      this._db = getDatabase();
    }
    return this._db;
  }

  /**
   * Replay Engine (Phase 30: Intent Sync)
   * Atomically apply a batch of operations from a Master Station.
   */
  async applyOperations(deskId, operations) {
    const processedIds = [];

    // Sort by sequence number to ensure linear application
    const sortedOps = [...operations].sort(
      (a, b) => (a.sequence_number || 0) - (b.sequence_number || 0),
    );

    for (const op of sortedOps) {
      try {
        // 1. Idempotency Check
        const lastSync = this.db
          .prepare("SELECT counter FROM sync_sequences WHERE site_id = ?")
          .get(deskId);

        if (lastSync && op.sequence_number <= lastSync.counter) {
          this.logger.info(
            `Skipping duplicate/older operation ${op.id} (Seq: ${op.sequence_number}, Last: ${lastSync.counter})`,
          );
          processedIds.push(op.id);
          continue;
        }

        // 2. Transliterate and Apply
        const recordId = op.record_id;
        const payload =
          typeof op.payload === "string" ? JSON.parse(op.payload) : op.payload;

        // Cleanup payload
        delete payload.desk_id;
        payload.desk_id = deskId;

        this.db.transaction(() => {
          if (op.type === "INSERT") {
            const keys = Object.keys(payload);
            const cols = keys.join(", ");
            const vals = keys.map((k) => `@${k}`).join(", ");
            this.db
              .prepare(
                `INSERT OR REPLACE INTO ${op.table_name} (${cols}) VALUES (${vals})`,
              )
              .run(payload);
          } else if (op.type === "UPDATE") {
            const keys = Object.keys(payload).filter((k) => k !== "id");
            const setClause = keys.map((k) => `${k} = @${k}`).join(", ");
            this.db
              .prepare(
                `UPDATE ${op.table_name} SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = @id`,
              )
              .run({ ...payload, id: recordId });
          } else if (op.type === "DELETE") {
            this.db
              .prepare(`DELETE FROM ${op.table_name} WHERE id = ?`)
              .run(recordId);
          }

          // 3. Update Sync Sequence
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
            .run(crypto.randomUUID(), deskId, op.id, op.sequence_number);

          // 4. Log the operation
          this.db
            .prepare(
              `
                        INSERT OR IGNORE INTO operation_logs (id, type, table_name, record_id, payload, timestamp, sequence_number, desk_id)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    `,
            )
            .run(
              op.id,
              op.type,
              op.table_name,
              recordId,
              JSON.stringify(payload),
              op.timestamp,
              op.sequence_number,
              deskId,
            );
        })();

        processedIds.push(op.id);
      } catch (err) {
        this.logger.error(
          `Failed to replay operation ${op.id} for ${deskId}: ${err.message}`,
          err,
        );
        break; // Stop on failure to maintain sequence
      }
    }

    return processedIds;
  }

  /**
   * Pull remote operations for bi-directional sync.
   */
  async getRemoteOperations(requesterDeskId, sinceHubIndex) {
    const sql = `
            SELECT hub_index, id, type, table_name, record_id, payload, timestamp, sequence_number, desk_id
            FROM operation_logs
            WHERE desk_id != ? AND hub_index > ?
            ORDER BY hub_index ASC
            LIMIT 100
        `;
    const ops = this.db.prepare(sql).all(requesterDeskId, sinceHubIndex);

    return ops.map((op) => ({
      ...op,
      payload:
        typeof op.payload === "string" ? JSON.parse(op.payload) : op.payload,
    }));
  }
}

module.exports = new RecordService();
