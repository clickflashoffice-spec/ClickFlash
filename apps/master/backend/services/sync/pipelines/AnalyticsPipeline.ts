import { SyncPipeline, SyncContext, PipelineResult } from '../SyncPipeline';

const fetchFn = (globalThis as any).fetch;

export class AnalyticsPipeline implements SyncPipeline {
  name = 'daily_analytics';

  async execute(context: SyncContext): Promise<PipelineResult> {
    const date = new Date().toISOString().split("T")[0];

    try {
      const photographerStats = context.dbManager.query(
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
        context.logger.info(`[CloudSync] No analytics data for ${date} to push.`);
        return { name: this.name, success: true };
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

      const headers = await context.getHeaders();
      const res = await fetchFn(
        `${context.cloudApiUrl}/api/analytics/daily-audit`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ audits }),
        },
      );

      if (res.ok) {
        const json = (await res.json()) as {
          success: boolean;
          processed: number;
        };
        context.logger.info(
          `[CloudSync] Phase 70: Pushed ${json.processed ?? audits.length} photographer audit(s) for ${date} to Hub.`,
        );
        return { name: this.name, success: true };
      } else {
        const txt = await res.text();
        context.logger.error(
          `[CloudSync] Analytics Sync Failed (${date}): ${txt}`,
        );
        throw new Error(`Sync failed: ${res.status}`);
      }
    } catch (e: any) {
      context.logger.error(`[CloudSync] Analytics Sync Error: ${e.message || String(e)}`);
      throw e;
    }
  }
}
