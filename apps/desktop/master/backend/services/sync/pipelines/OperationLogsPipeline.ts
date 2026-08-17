import { SyncPipeline, SyncContext, PipelineResult } from '../SyncPipeline';
import { executeWithRetry } from '../../../utils/networkUtils';
import { timeService } from '../../timeService';
import crypto from "crypto";

interface OperationLogRow {
  id: string;
  type: string;
  table_name: string;
  record_id: string;
  payload: string | Record<string, unknown>;
  timestamp: string;
  sequence_number: number;
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

const fetchFn = (...args: any[]) => ((globalThis as any).fetch)(...args);

export class OperationLogsPipeline implements SyncPipeline {
  name = 'operation_logs';

  private generateIdempotencyKey(deskId: string, pipeline: string, seq: number): string {
    const raw = `${deskId}:${pipeline}:${seq}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  private handleFailedOperations(context: SyncContext, ids: string[], errorMsg: string) {
    if (ids.length === 0) return;
    context.dbManager.transaction(() => {
      const stmt = context.dbManager.prepare(
        `UPDATE operation_logs SET retry_count = retry_count + 1, last_error = ?, updated_at = datetime('now') WHERE id = ?`,
      );
      const dlqStmt = context.dbManager.prepare(
        `UPDATE operation_logs SET status = 'dead_letter' WHERE id = ? AND retry_count >= ?`,
      );
      for (const id of ids) {
        stmt.run(errorMsg, id);
        dlqStmt.run(id, 5); // MAX_OPERATION_RETRIES
      }
    });
  }

  async execute(context: SyncContext): Promise<PipelineResult> {
    const ops = context.dbManager.query<OperationLogRow>(`
      SELECT * FROM operation_logs 
      WHERE status = 'pending' 
      ORDER BY sequence_number ASC 
      LIMIT 50
    `);

    if (ops.length === 0) return { name: this.name, success: true };

    context.logger.info(
      `[CloudSync] Syncing ${ops.length} user intents to Cloud Hub (Desk: ${context.deskId})...`,
    );

    const firstSeq = ops[0]?.sequence_number ?? Date.now();
    const idempotencyKey = this.generateIdempotencyKey(context.deskId, this.name, firstSeq);

    try {
      try {
        context.dbManager.run(
          `INSERT INTO sync_idempotency_keys (idempotency_key, desk_id, pipeline_name, created_at)
           VALUES (?, ?, ?, datetime('now'))`,
          [idempotencyKey, context.deskId, this.name]
        );
      } catch (e: any) {
        if (!e.message?.includes('no such table')) {
          context.logger.warn(`[CloudSync] Failed to store idempotency key`, { error: e.message });
        }
      }

      const res = await executeWithRetry(async () => {
        const headers = await context.getHeaders();
        return await fetchFn(
          `${context.cloudApiUrl}/api/cloud/sync/operations`,
          {
            method: "POST",
            headers: {
              ...headers,
              'X-Idempotency-Key': idempotencyKey,
            },
            body: JSON.stringify({
              desk_id: context.deskId,
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
        timeService.updateDrift(res.headers.get("Date"));

        const json = (await res.json()) as {
          success: true;
          processed: string[];
        };
        const processedIds = json.processed || [];

        if (processedIds.length > 0) {
          context.dbManager.transaction(() => {
            const stmt = context.dbManager.prepare(
              `UPDATE operation_logs SET status = 'synced', last_error = NULL WHERE id = ?`,
            );
            for (const id of processedIds) {
              stmt.run(id);
            }
          });
          context.logger.info(
            `[CloudSync] Successfully synced ${processedIds.length} operations to Hub.`,
          );
        }
        
        const failedIds = ops.map((op: OperationLogRow) => op.id).filter((id: string) => !processedIds.includes(id));
        if (failedIds.length > 0) {
           this.handleFailedOperations(context, failedIds, "Remote Hub rejected record");
        }
        return { name: this.name, success: true };
      } else if (res.status === 208) {
        context.logger.info(`[CloudSync] Hub reports batch already processed (208)`);
        context.dbManager.transaction(() => {
          const stmt = context.dbManager.prepare(
            `UPDATE operation_logs SET status = 'synced', last_error = NULL WHERE id = ?`,
          );
          for (const op of ops) {
            stmt.run(op.id);
          }
        });
        return { name: this.name, success: true };
      } else {
        const txt = await res.text();
        context.logger.error(`[CloudSync] Operations Sync Failed: ${txt}`);
        this.handleFailedOperations(context, ops.map((op: OperationLogRow) => op.id), `HTTP ${res.status}: ${txt}`);
        throw new Error(`Sync failed: ${res.status}`);
      }
    } catch (e: any) {
      context.logger.error(`[CloudSync] Operations Sync Error: ${e.message || String(e)}`);
      throw e;
    }
  }
}
