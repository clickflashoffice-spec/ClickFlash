import { SyncPipeline, SyncContext, PipelineResult } from '../SyncPipeline';
import { executeWithRetry } from '../../../utils/networkUtils';

const fetchFn = (...args: any[]) => ((globalThis as any).fetch)(...args);

export class LedgerPipeline implements SyncPipeline {
  name = 'ledger';

  async execute(context: SyncContext): Promise<PipelineResult> {
    const entries = context.dbManager.query<any>(`
      SELECT * FROM photographer_ledger 
      WHERE sync_status = 'pending' 
      ORDER BY created_at ASC 
      LIMIT 50
    `);

    if (entries.length === 0) return { name: this.name, success: true };

    context.logger.info(
      `[CloudSync] Syncing ${entries.length} ledger entries to Cloud Hub (Desk: ${context.deskId})...`,
    );

    try {
      const operations = entries.map((entry) => ({
        id: entry.sync_id || `${context.deskId}_ledger_${entry.id}`,
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
        sequence_number: Date.now(),
      }));

      const res = await executeWithRetry(async () => {
        const headers = await context.getHeaders();
        const r = await fetchFn(`${context.cloudApiUrl}/api/cloud/sync/ledger`, {
          method: "POST",
          headers,
          body: JSON.stringify({ desk_id: context.deskId, operations }),
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r;
      }, { maxRetries: 3 });

      if (res.ok) {
        context.dbManager.transaction(() => {
          const stmt = context.dbManager.prepare(
            `UPDATE photographer_ledger SET sync_status = 'synced' WHERE id = ?`,
          );
          for (const entry of entries) {
            stmt.run(entry.id);
          }
        });
        context.logger.info(
          `[CloudSync] Successfully synced ${entries.length} ledger entries to Hub.`,
        );
        return { name: this.name, success: true };
      } else {
        throw new Error(`Sync failed: ${res.status}`);
      }
    } catch (e: any) {
      context.logger.error(`[CloudSync] Ledger Sync Error: ${e.message || String(e)}`);
      throw e;
    }
  }
}
