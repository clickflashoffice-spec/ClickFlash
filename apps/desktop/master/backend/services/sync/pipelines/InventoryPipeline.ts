import { SyncPipeline, SyncContext, PipelineResult } from '../SyncPipeline';
import { executeWithRetry } from '../../../utils/networkUtils';

const fetchFn = (...args: any[]) => ((globalThis as any).fetch)(...args);

export class InventoryPipeline implements SyncPipeline {
  name = 'inventory';

  async execute(context: SyncContext): Promise<PipelineResult> {
    const entries = context.dbManager.query<any>(`
      SELECT * FROM inventory 
      WHERE sync_status = 'pending' 
      ORDER BY updated_at ASC 
      LIMIT 50
    `);

    if (entries.length === 0) return { name: this.name, success: true };

    context.logger.info(
      `[CloudSync] Syncing ${entries.length} inventory entries to Cloud Hub (Desk: ${context.deskId})...`,
    );

    try {
      const operations = entries.map((entry) => ({
        id: entry.sync_id || `${context.deskId}_inventory_${entry.id}`,
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
        const headers = await context.getHeaders();
        const r = await fetchFn(`${context.cloudApiUrl}/api/cloud/sync/operations`, {
          method: "POST",
          headers,
          body: JSON.stringify({ desk_id: context.deskId, operations }),
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
          context.dbManager.transaction(() => {
            const stmt = context.dbManager.prepare(
              `UPDATE inventory SET sync_status = 'synced' WHERE sync_id = ? OR id = ?`,
            );
            for (const syncId of processedIds) {
              const originalId = syncId.includes("_inventory_")
                ? syncId.split("_inventory_")[1]
                : syncId;
              stmt.run(syncId, originalId);
            }
          });
          context.logger.info(
            `[CloudSync] Successfully synced ${processedIds.length} inventory records.`,
          );
        }
        return { name: this.name, success: true };
      } else {
        throw new Error(`Sync failed: ${res.status}`);
      }
    } catch (e: any) {
      context.logger.error(`[CloudSync] Inventory Sync Error: ${e.message || String(e)}`);
      throw e;
    }
  }
}
