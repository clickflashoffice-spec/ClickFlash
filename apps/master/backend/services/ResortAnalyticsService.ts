import { Logger } from '../utils/logger';
import { DatabaseManager } from '../database/db';
import { v4 as uuidv4 } from "uuid";

export interface ResortKPIs {
  date: string;
  total_guests: number;
  departures: number;
  viewing_sessions: number;
  daily_rent: number;
  daily_labor: number;
}

export interface PhotographerBI {
  photographer_id: number;
  name: string;
  meetings_taken: number;
  meetings_made: number;
  categories: Record<string, number>;
  income_simple: number;
  income_multiple: number;
  themes: Record<string, number>;
}

export class ResortAnalyticsService {
  constructor(
    private db: DatabaseManager,
    private logger: Logger,
  ) {}

  /**
   * Increments the viewing session counter (Touch or Master view event).
   */
  public incrementViewingSession(dateStr?: string) {
    const date = dateStr || new Date().toISOString().split("T")[0];
    try {
      this.db.run(
        `INSERT INTO daily_resort_stats (date, viewing_sessions) 
                 VALUES (?, 1)
                 ON CONFLICT(date) DO UPDATE SET 
                 viewing_sessions = viewing_sessions + 1,
                 updated_at = CURRENT_TIMESTAMP`,
        [date],
      );
    } catch (e: any) {
      this.logger.error(
        `[ResortAnalytics] Failed to increment session: ${e.message}`,
      );
    }
  }

  /**
   * Updates guests and departure metrics (from manual EOD entry).
   */
  public async updateOperationalStats(
    date: string,
    guests: number,
    departures: number,
  ) {
    try {
      this.db.run(
        `INSERT INTO daily_resort_stats (date, total_guests, departures) 
                 VALUES (?, ?, ?)
                 ON CONFLICT(date) DO UPDATE SET 
                 total_guests = EXCLUDED.total_guests,
                 departures = EXCLUDED.departures,
                 sync_status = 'pending',
                 updated_at = CURRENT_TIMESTAMP`,
        [date, guests, departures],
      );
    } catch (e: any) {
      this.logger.error(
        `[ResortAnalytics] Failed to update operational stats: ${e.message}`,
      );
    }
  }

  /**
   * Aggregates local metrics for sync to Hub.
   */
  public async getDailyReport(dateStr?: string) {
    const date = dateStr || new Date().toISOString().split("T")[0];

    // 1. Get Operational Stats
    const stats = this.db.get<ResortKPIs>(
      "SELECT * FROM daily_resort_stats WHERE date = ?",
      [date],
    );

    // 2. Aggregate Photographer Performance
    // We calculate this on-the-fly from orders and photos for accuracy
    const photographers = this.db.query(
      `SELECT id, name FROM users WHERE role = 'Photographer' OR role = 'photographer'`,
    );

    const performance: PhotographerBI[] = [];

    for (const p of photographers) {
      // Simple vs Multiple Income
      const incomeRes = this.db.get<{ simple: number; multiple: number }>(
        `SELECT 
                    SUM(CASE WHEN json_array_length(items) <= 1 THEN total ELSE 0 END) as simple,
                    SUM(CASE WHEN json_array_length(items) > 1 THEN total ELSE 0 END) as multiple
                 FROM orders 
                 WHERE photographerId = ? AND date(created_at) = ? AND status = 'Completed'`,
        [p.id, date],
      );

      // Theme Breakdown (Based on Photo Categories in this day's albums)
      const themesRes = this.db.query(
        `SELECT category, COUNT(*) as count 
                 FROM photos 
                 WHERE photographerId = ? AND date(created_at) = ?
                 GROUP BY category`,
        [p.id, date],
      );

      const themes: Record<string, number> = {};
      themesRes.forEach((row: any) => {
        if (row.category) themes[row.category] = row.count;
      });

      // Meeting Metrics from photographer_performance table (Manual entry + some auto)
      const perfRow = this.db.get<{
        meetings_taken: number;
        meetings_made: number;
        categories: string;
        total_session_seconds: number;
        session_count: number;
      }>(
        "SELECT meetings_taken, meetings_made, categories, total_session_seconds, session_count FROM photographer_performance WHERE photographer_id = ? AND date = ?",
        [p.id, date],
      );

      const avg_session_duration =
        perfRow?.session_count && perfRow.session_count > 0
          ? Math.round(perfRow.total_session_seconds / perfRow.session_count)
          : 0;

      performance.push({
        photographer_id: p.id,
        name: p.name,
        meetings_taken: perfRow?.meetings_taken || 0,
        meetings_made: perfRow?.meetings_made || 0,
        categories: perfRow?.categories ? JSON.parse(perfRow.categories) : {},
        income_simple: incomeRes?.simple || 0,
        income_multiple: incomeRes?.multiple || 0,
        themes,
        avg_session_duration,
      } as any);
    }

    return {
      date,
      operational: stats || {
        total_guests: 0,
        departures: 0,
        viewing_sessions: 0,
        daily_rent: 0,
        daily_labor: 0,
      },
      photographers: performance,
    };
  }

  /**
   * Records a meeting outcome for a photographer.
   */
  public logMeetingOutcome(
    photographerId: number,
    type: "taken" | "made" | "noshow" | "late" | "rescheduled",
    dateStr?: string,
  ) {
    const date = dateStr || new Date().toISOString().split("T")[0];
    const id = uuidv4();

    try {
      // Find or create row
      const row = this.db.get(
        "SELECT categories FROM photographer_performance WHERE photographer_id = ? AND date = ?",
        [photographerId, date],
      );
      const categories = row?.categories ? JSON.parse(row.categories) : {};

      if (type === "taken") {
        this.db.run(
          `INSERT INTO photographer_performance (id, photographer_id, date, meetings_taken) 
                     VALUES (?, ?, ?, 1)
                     ON CONFLICT(photographer_id, date) DO UPDATE SET 
                     meetings_taken = meetings_taken + 1, sync_status = 'pending'`,
          [id, photographerId, date],
        );
      } else if (type === "made") {
        this.db.run(
          `INSERT INTO photographer_performance (id, photographer_id, date, meetings_made) 
                     VALUES (?, ?, ?, 1)
                     ON CONFLICT(photographer_id, date) DO UPDATE SET 
                     meetings_made = meetings_made + 1, sync_status = 'pending'`,
          [id, photographerId, date],
        );
      } else {
        // Update specific category count
        categories[type] = (categories[type] || 0) + 1;
        this.db.run(
          `INSERT INTO photographer_performance (id, photographer_id, date, categories) 
                     VALUES (?, ?, ?, ?)
                     ON CONFLICT(photographer_id, date) DO UPDATE SET 
                     categories = EXCLUDED.categories, sync_status = 'pending'`,
          [id, photographerId, date, JSON.stringify(categories)],
        );
      }
    } catch (e: any) {
      this.logger.error(
        `[ResortAnalytics] Failed to log meeting: ${e.message}`,
      );
    }
  }

  /**
   * Logs a session duration (customer interaction time).
   */
  public logSessionDuration(
    photographerId: number,
    seconds: number,
    dateStr?: string,
  ) {
    const date = dateStr || new Date().toISOString().split("T")[0];
    const id = uuidv4();

    try {
      this.db.run(
        `INSERT INTO photographer_performance (id, photographer_id, date, total_session_seconds, session_count) 
                 VALUES (?, ?, ?, ?, 1)
                 ON CONFLICT(photographer_id, date) DO UPDATE SET 
                 total_session_seconds = total_session_seconds + EXCLUDED.total_session_seconds,
                 session_count = session_count + 1,
                 sync_status = 'pending'`,
        [id, photographerId, date, seconds],
      );
    } catch (e: any) {
      this.logger.error(
        `[ResortAnalytics] Failed to log session duration: ${e.message}`,
      );
    }
  }

  /**
   * Gets a rolling trend of income and orders.
   */
  public async getRollingTrend(days: number = 30) {
    try {
      return this.db.query(
        `SELECT 
                    date(created_at) as date,
                    SUM(total) as income,
                    COUNT(*) as orders
                 FROM orders 
                 WHERE status = 'Completed' 
                 AND date(created_at) >= date('now', ?)
                 GROUP BY date(created_at)
                 ORDER BY date ASC`,
        [`-${days} days`],
      );
    } catch (e: any) {
      this.logger.error(
        `[ResortAnalytics] Failed to get rolling trend: ${e.message}`,
      );
      return [];
    }
  }

  /**
   * Gets monthly totals for current progress tracking.
   */
  public async getMonthlyTotal(monthStr?: string) {
    const month = monthStr || new Date().toISOString().substring(0, 7); // YYYY-MM
    try {
      const orders = this.db.get<{ total: number; count: number }>(
        `SELECT SUM(total) as total, COUNT(*) as count 
                 FROM orders 
                 WHERE status = 'Completed' AND strftime('%Y-%m', created_at) = ?`,
        [month],
      );

      const stats = this.db.get<{ guests: number; departures: number }>(
        `SELECT SUM(total_guests) as guests, SUM(departures) as departures 
                 FROM daily_resort_stats 
                 WHERE strftime('%Y-%m', date) = ?`,
        [month],
      );

      return {
        month,
        income: orders?.total || 0,
        orders: orders?.count || 0,
        guests: stats?.guests || 0,
        departures: stats?.departures || 0,
      };
    } catch (e: any) {
      this.logger.error(
        `[ResortAnalytics] Failed to get monthly totals: ${e.message}`,
      );
      return null;
    }
  }

  /**
   * Detailed session type comparison (Simple vs Multiple).
   */
  public async getSessionTypeComparison(dateStr?: string) {
    const date = dateStr || new Date().toISOString().split("T")[0];
    try {
      return this.db.get(
        `SELECT 
                    -- Simple sessions (1 item)
                    COUNT(CASE WHEN json_array_length(items) <= 1 THEN 1 END) as count_simple,
                    AVG(CASE WHEN json_array_length(items) <= 1 THEN total END) as avg_income_simple,
                    -- Multiple sessions (>1 item)
                    COUNT(CASE WHEN json_array_length(items) > 1 THEN 1 END) as count_multiple,
                    AVG(CASE WHEN json_array_length(items) > 1 THEN total END) as avg_income_multiple,
                    AVG(CASE WHEN json_array_length(items) > 1 THEN json_array_length(items) END) as avg_photos_multiple
                 FROM orders 
                 WHERE status = 'Completed' AND date(created_at) = ?`,
        [date],
      );
    } catch (e: any) {
      this.logger.error(`[ResortAnalytics] Failed comparison: ${e.message}`);
      return null;
    }
  }

  /**
   * AUTO-CALCULATE: Meetings Made from Orders
   * Each order = 1 successful sales meeting
   */
  public async calculateMeetingsMadeFromOrders(dateStr?: string) {
    const date = dateStr || new Date().toISOString().split("T")[0];
    try {
      const sql = `
        SELECT 
          photographerId,
          COUNT(*) as meetings_made,
          SUM(total) as total_revenue,
          -- Simple vs Multiple classification
          SUM(CASE WHEN json_array_length(items) <= 1 THEN 1 ELSE 0 END) as simple_orders,
          SUM(CASE WHEN json_array_length(items) > 1 THEN 1 ELSE 0 END) as multiple_orders
        FROM orders 
        WHERE date(created_at) = ? 
          AND status = 'Completed'
          AND photographerId IS NOT NULL
        GROUP BY photographerId
      `;

      const results = this.db.query(sql, [date]) as any[];

      for (const row of results) {
        await this.upsertPhotographerPerformance({
          photographer_id: row.photographerId,
          date,
          meetings_made: row.meetings_made,
          income_simple:
            row.meetings_made > 0
              ? row.total_revenue * (row.simple_orders / row.meetings_made)
              : 0,
          income_multiple:
            row.meetings_made > 0
              ? row.total_revenue * (row.multiple_orders / row.meetings_made)
              : 0,
          categories: JSON.stringify({
            simple: row.simple_orders,
            multiple: row.multiple_orders,
          }),
          calculation_source: "auto",
        });
      }
      return results;
    } catch (e: any) {
      this.logger.error(
        `[ResortAnalytics] Failed auto-calc meetings: ${e.message}`,
      );
      return [];
    }
  }

  /**
   * Get detailed meeting times distribution
   * For "Meetings Sold In" pie chart
   */
  public async getMeetingTimeDistribution(dateStr?: string) {
    const date = dateStr || new Date().toISOString().split("T")[0];
    try {
      const sql = `
        SELECT 
          CASE 
            WHEN strftime('%H', created_at) BETWEEN '08' AND '11' THEN 'Morning (8-12)'
            WHEN strftime('%H', created_at) BETWEEN '12' AND '15' THEN 'Afternoon (12-16)'
            WHEN strftime('%H', created_at) BETWEEN '16' AND '19' THEN 'Evening (16-20)'
            ELSE 'Night (20+)'
          END as time_slot,
          COUNT(*) as meeting_count
        FROM orders
        WHERE date(created_at) = ? AND status = 'Completed'
        GROUP BY time_slot
      `;
      return this.db.query(sql, [date]);
    } catch (e: any) {
      this.logger.error(
        `[ResortAnalytics] Failed meeting distribution: ${e.message}`,
      );
      return [];
    }
  }

  /**
   * Get average meeting duration (estimated from order session times)
   */
  public async getAverageMeetingDuration(dateStr?: string) {
    const date = dateStr || new Date().toISOString().split("T")[0];
    try {
      const sql = `
        SELECT 
          photographerId,
          AVG(
            (julianday(updated_at) - julianday(created_at)) * 24 * 60
          ) as avg_duration_minutes
        FROM orders
        WHERE date(created_at) = ? 
          AND status = 'Completed'
          AND created_at != updated_at
        GROUP BY photographerId
      `;
      return this.db.query(sql, [date]);
    } catch (e: any) {
      this.logger.error(`[ResortAnalytics] Failed avg duration: ${e.message}`);
      return [];
    }
  }

  private async upsertPhotographerPerformance(data: {
    photographer_id: number;
    date: string;
    meetings_made: number;
    income_simple: number;
    income_multiple: number;
    categories: string;
    calculation_source: "auto" | "manual" | "hybrid";
  }) {
    const id = `${data.photographer_id}_${data.date}`;
    try {
      this.db.run(
        `
        INSERT INTO photographer_performance (
          id, photographer_id, date, meetings_made, 
          income_simple, income_multiple, categories, calculation_source, sync_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
        ON CONFLICT(photographer_id, date) DO UPDATE SET
          meetings_made = EXCLUDED.meetings_made,
          income_simple = EXCLUDED.income_simple,
          income_multiple = EXCLUDED.income_multiple,
          categories = EXCLUDED.categories,
          calculation_source = EXCLUDED.calculation_source,
          sync_status = 'pending',
          updated_at = CURRENT_TIMESTAMP
      `,
        [
          id,
          data.photographer_id,
          data.date,
          data.meetings_made,
          data.income_simple,
          data.income_multiple,
          data.categories,
          data.calculation_source,
        ],
      );
    } catch (e: any) {
      this.logger.error(
        `[ResortAnalytics] Failed upsert performance: ${e.message}`,
      );
    }
  }
}
