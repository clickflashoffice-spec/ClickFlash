import DatabaseManager from "../db.js";

export interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
}

export interface RevenuePoint {
  date: string;
  orders: number;
  revenue: number;
}

export interface TopAlbum {
  title: string;
  coverPhotoUrl: string | null;
  orderCount: number;
  revenue: number;
  views: number;
}

export interface TopPhotographer {
  name: string;
  avatarUrl: string | null;
  orderCount: number;
  revenue: number;
}

export class AnalyticsService {
  private db: DatabaseManager;

  constructor(db: DatabaseManager) {
    this.db = db;
  }

  async getDashboardStats(
    startDate: string,
    endDate: string,
    deskId?: string | null,
  ): Promise<DashboardStats> {
    let sql = `
            SELECT
                COUNT(id) as totalOrders,
                COALESCE(SUM(COALESCE(totalAmount, total, 0)), 0) as totalRevenue,
                COALESCE(AVG(COALESCE(totalAmount, total, 0)), 0) as averageOrderValue
            FROM orders
            WHERE date >= ? AND date <= ? AND status != 'Cancelled'
        `;
    const params: any[] = [startDate, endDate];

    if (deskId) {
      sql += ` AND desk_id = ?`;
      params.push(deskId);
    }

    const row = await this.db.get(sql, params);
    return row ?? { totalOrders: 0, totalRevenue: 0, averageOrderValue: 0 };
  }

  async getFinancialAnalytics(
    startDate: string,
    endDate: string,
    deskId?: string | null,
  ): Promise<any> {
    // Gallery orders typically have desk_id IS NULL or 'gallery', 
    // In-person orders have a specific desk_id.
    let sql = `
        SELECT
            COUNT(id) as totalOrders,
            COALESCE(SUM(COALESCE(totalAmount, total, 0)), 0) as totalRevenue,
            COALESCE(AVG(COALESCE(totalAmount, total, 0)), 0) as averageOrderValue,
            COALESCE(SUM(CASE WHEN desk_id IS NULL THEN COALESCE(totalAmount, total, 0) ELSE 0 END), 0) as gallerySales,
            COALESCE(SUM(CASE WHEN desk_id IS NOT NULL THEN COALESCE(totalAmount, total, 0) ELSE 0 END), 0) as inPersonSales
        FROM orders
        WHERE date >= ? AND date <= ? AND status != 'Cancelled'
    `;
    const params: any[] = [startDate, endDate];

    if (deskId) {
      sql += ` AND desk_id = ?`;
      params.push(deskId);
    }

    // Daily breakdown for charts
    let dailySql = `
        SELECT
            SUBSTR(date, 1, 10) as date,
            COUNT(id) as orders,
            COALESCE(SUM(COALESCE(totalAmount, total, 0)), 0) as revenue,
            COALESCE(SUM(CASE WHEN desk_id IS NULL THEN COALESCE(totalAmount, total, 0) ELSE 0 END), 0) as gallerySales,
            COALESCE(SUM(CASE WHEN desk_id IS NOT NULL THEN COALESCE(totalAmount, total, 0) ELSE 0 END), 0) as inPersonSales
        FROM orders
        WHERE date >= ? AND date <= ? AND status != 'Cancelled'
    `;
    const dailyParams: any[] = [startDate, endDate];

    if (deskId) {
      dailySql += ` AND desk_id = ?`;
      dailyParams.push(deskId);
    }

    dailySql += ` GROUP BY SUBSTR(date, 1, 10) ORDER BY SUBSTR(date, 1, 10) ASC`;

    const [summary, dailyTrend] = await Promise.all([
      this.db.get(sql, params),
      this.db.query(dailySql, dailyParams),
    ]);

    return {
        summary: summary ?? { totalOrders: 0, totalRevenue: 0, averageOrderValue: 0, gallerySales: 0, inPersonSales: 0 },
        dailyTrend: dailyTrend || []
    };
  }

  async getRevenueTrend(
    startDate: string,
    endDate: string,
    deskId?: string | null,
  ): Promise<RevenuePoint[]> {
    // Truncate to year-month strings for grouping
    let sql = `
            SELECT
                SUBSTR(date, 1, 7) as date,
                COUNT(id) as orders,
                SUM(COALESCE(totalAmount, total, 0)) as revenue
            FROM orders
            WHERE date >= ? AND date <= ? AND status != 'Cancelled'
        `;
    const params: any[] = [startDate, endDate];

    if (deskId) {
      sql += ` AND desk_id = ?`;
      params.push(deskId);
    }

    sql += ` GROUP BY SUBSTR(date, 1, 7) ORDER BY SUBSTR(date, 1, 7) ASC`;

    return await this.db.query(sql, params);
  }

  async getTopAlbums(
    startDate: string,
    endDate: string,
    deskId?: string | null,
    limit: number = 5,
  ): Promise<TopAlbum[]> {
    let sql = `
            SELECT
                a.title,
                a.coverPhotoUrl,
                COUNT(DISTINCT o.id) as orderCount,
                SUM(COALESCE(o.totalAmount, o.total, 0)) as revenue,
                COALESCE(a.view_count, 0) as views
            FROM orders o
            JOIN albums a ON o.albumId = a.id
            WHERE o.date >= ? AND o.date <= ? AND o.status != 'Cancelled'
        `;
    const params: any[] = [startDate, endDate];

    if (deskId) {
      sql += ` AND o.desk_id = ? AND a.desk_id = ?`;
      params.push(deskId, deskId);
    }

    sql += ` GROUP BY a.id ORDER BY revenue DESC LIMIT ?`;
    params.push(limit);

    return await this.db.query(sql, params);
  }

  async getTopPhotographers(
    startDate: string,
    endDate: string,
    deskId?: string | null,
  ): Promise<TopPhotographer[]> {
    let sql = `
            SELECT
                u.name,
                u.avatarUrl,
                COUNT(o.id) as orderCount,
                SUM(COALESCE(o.totalAmount, o.total, 0)) as revenue
            FROM orders o
            JOIN users u ON o.photographerId = u.id
            WHERE o.date >= ? AND o.date <= ? AND o.status != 'Cancelled'
        `;
    const params: any[] = [startDate, endDate];

    if (deskId) {
      sql += ` AND o.desk_id = ? AND u.desk_id = ?`;
      params.push(deskId, deskId);
    }

    sql += ` GROUP BY u.id ORDER BY revenue DESC`;

    return await this.db.query(sql, params);
  }

  async incrementAlbumView(albumId: string): Promise<void> {
    await this.db.run(
      `UPDATE albums SET view_count = COALESCE(view_count, 0) + 1 WHERE id = ?`,
      [albumId],
    );
  }

  async getForecastData(deskId?: string | null): Promise<any> {
    const endDate = new Date().toISOString().split("T")[0];
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const stats = await this.getDashboardStats(startDate, endDate, deskId);
    const trend = await this.getRevenueTrend(startDate, endDate, deskId);

    return {
      totalOrders: stats.totalOrders,
      totalRevenue: stats.totalRevenue,
      averageOrderValue: stats.averageOrderValue,
      thirtyDayTrend: trend,
    };
  }

  /**
   * Phase 75: Ingest resort-level BI telemetry from a Master station.
   */
  async ingestResortBI(deskId: string, payload: any): Promise<void> {
    const { date, operational, photographers } = payload;
    if (!date) throw new Error("Missing date in payload");

    const batch: any[] = [];

    // 1. Ingest Daily Resort Stats
    const statsId = `${deskId}_${date}`;
    batch.push(
      this.db
        .prepare(
          `INSERT INTO daily_resort_stats 
         (id, desk_id, date, total_guests, departures, viewing_sessions, daily_rent, daily_labor, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(id) DO UPDATE SET
         total_guests = EXCLUDED.total_guests,
         departures = EXCLUDED.departures,
         viewing_sessions = EXCLUDED.viewing_sessions,
         daily_rent = EXCLUDED.daily_rent,
         daily_labor = EXCLUDED.daily_labor,
         updated_at = CURRENT_TIMESTAMP`,
        )
        .bind(
          statsId,
          deskId,
          date,
          operational.total_guests || 0,
          operational.departures || 0,
          operational.viewing_sessions || 0,
          operational.daily_rent || 0,
          operational.daily_labor || 0,
        ),
    );

    // 2. Ingest Photographer Performance
    if (photographers && Array.isArray(photographers)) {
      for (const p of photographers) {
        const perfId = `${deskId}_${p.photographer_id}_${date}`;
        batch.push(
          this.db
            .prepare(
              `INSERT INTO photographer_performance 
             (id, desk_id, photographer_id, date, meetings_taken, meetings_made, categories, income_simple, income_multiple, photos_made_themes, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
             ON CONFLICT(id) DO UPDATE SET
             meetings_taken = EXCLUDED.meetings_taken,
             meetings_made = EXCLUDED.meetings_made,
             categories = EXCLUDED.categories,
             income_simple = EXCLUDED.income_simple,
             income_multiple = EXCLUDED.income_multiple,
             photos_made_themes = EXCLUDED.photos_made_themes,
             updated_at = CURRENT_TIMESTAMP`,
            )
            .bind(
              perfId,
              deskId,
              p.photographer_id,
              date,
              p.meetings_taken || 0,
              p.meetings_made || 0,
              JSON.stringify(p.categories || {}),
              p.income_simple || 0,
              p.income_multiple || 0,
              JSON.stringify(p.themes || {}),
            ),
        );
      }
    }

    await this.db.batch(batch);
  }

  /**
   * Phase 75: Retrieve consolidated Resort BI data for dashboard.
   */
  async getResortBI(
    startDate: string,
    endDate: string,
    deskId?: string | null,
  ): Promise<any> {
    let statsSql = `SELECT * FROM daily_resort_stats WHERE date >= ? AND date <= ?`;
    let perfSql = `SELECT * FROM photographer_performance WHERE date >= ? AND date <= ?`;
    const params = [startDate, endDate];

    if (deskId) {
      statsSql += ` AND desk_id = ?`;
      perfSql += ` AND desk_id = ?`;
      params.push(deskId);
    }

    const stats = await this.db.query(statsSql, params);
    const performance = await this.db.query(perfSql, params);

    return { stats, performance };
  }
}

export default AnalyticsService;
