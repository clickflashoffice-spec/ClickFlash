import { SyncPipeline, SyncContext, PipelineResult } from '../SyncPipeline';
import { executeWithRetry } from '../../../utils/networkUtils';

const fetchFn = (...args: any[]) => ((globalThis as any).fetch)(...args);

export class ExpensesPipeline implements SyncPipeline {
  name = 'expenses';

  async execute(context: SyncContext): Promise<PipelineResult> {
    const expenses = context.dbManager.query<any>(`
      SELECT * FROM expenses 
      WHERE sync_status = 'pending' 
      ORDER BY created_at ASC 
      LIMIT 50
    `);

    if (expenses.length === 0) return { name: this.name, success: true };

    context.logger.info(
      `[CloudSync] Syncing ${expenses.length} expense entries to Cloud Hub (Desk: ${context.deskId})...`,
    );

    try {
      const res = await executeWithRetry(async () => {
        const headers = await context.getHeaders();
        const r = await fetchFn(`${context.cloudApiUrl}/api/cloud/sync/expenses`, {
          method: "POST",
          headers,
          body: JSON.stringify({ desk_id: context.deskId, expenses }),
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r;
      }, { maxRetries: 2 });

      if (res.ok) {
        context.dbManager.transaction(() => {
          const stmt = context.dbManager.prepare(
            "UPDATE expenses SET sync_status = 'synced' WHERE id = ?",
          );
          for (const exp of expenses) {
            stmt.run(exp.id);
          }
        });
        return { name: this.name, success: true };
      } else {
        throw new Error(`Sync failed: ${res.status}`);
      }
    } catch (e: any) {
      context.logger.error(`[CloudSync] Expense Sync Error: ${e.message || String(e)}`);
      throw e;
    }
  }
}
