const { getDatabase } = require('../db');

class AnalyticsService {
    constructor() {
        // Lazy initialization - get DB when needed, not at construct time
        this._db = null;
    }

    get db() {
        if (!this._db) {
            this._db = getDatabase();
        }
        return this._db;
    }

    /**
     * Get high-level dashboard statistics
     * @param {string} startDate - ISO Date string
     * @param {string} endDate - ISO Date string
     */
    getDashboardStats(startDate, endDate) {
        try {
            const sql = `
                SELECT 
                    COUNT(id) as totalOrders,
                    COALESCE(SUM(total), 0) as totalRevenue,
                    COALESCE(AVG(total), 0) as averageOrderValue
                FROM orders
                WHERE date >= ? AND date <= ? AND status != 'Cancelled'
            `;

            const stats = this.db.prepare(sql).get(startDate, endDate);
            return stats || { totalOrders: 0, totalRevenue: 0, averageOrderValue: 0 };
        } catch (error) {
            console.error('AnalyticsService.getDashboardStats error:', error);
            return { totalOrders: 0, totalRevenue: 0, averageOrderValue: 0 };
        }
    }

    /**
     * Get revenue trend over time
     */
    getRevenueTrend(startDate, endDate) {
        try {
            const sql = `
                SELECT 
                    date,
                    COUNT(id) as orders,
                    SUM(total) as revenue
                FROM orders
                WHERE date >= ? AND date <= ? AND status != 'Cancelled'
                GROUP BY date
                ORDER BY date ASC
            `;
            return this.db.prepare(sql).all(startDate, endDate) || [];
        } catch (error) {
            console.error('AnalyticsService.getRevenueTrend error:', error);
            return [];
        }
    }

    /**
     * Get top performing albums by revenue
     */
    getTopAlbums(startDate, endDate, limit = 5) {
        try {
            // First check if orders table has items column with JSON
            const hasItemsColumn = this.db.prepare(`PRAGMA table_info(orders)`).all()
                .some(col => col.name === 'items');
            
            if (!hasItemsColumn) {
                // Fallback: return albums by view count only
                return this.db.prepare(`
                    SELECT 
                        title,
                        coverPhotoUrl,
                        0 as orderCount,
                        0 as revenue,
                        view_count as views
                    FROM albums
                    ORDER BY view_count DESC
                    LIMIT ?
                `).all(limit) || [];
            }

            // Try to get albums with order data via JSON extraction
            const sql = `
                SELECT 
                    a.title,
                    a.coverPhotoUrl,
                    COUNT(o.id) as orderCount,
                    SUM(o.total) as revenue,
                    a.view_count as views
                FROM orders o, json_each(o.items) as item
                JOIN albums a ON json_extract(item.value, '$.albumId') = a.id
                WHERE o.date >= ? AND o.date <= ? AND o.status != 'Cancelled'
                GROUP BY a.id
                ORDER BY revenue DESC
                LIMIT ?
            `;

            return this.db.prepare(sql).all(startDate, endDate, limit) || [];
        } catch (error) {
            console.error('AnalyticsService.getTopAlbums error:', error);
            // Return empty array instead of crashing
            return [];
        }
    }

    /**
     * Get top photographers by revenue
     */
    getTopPhotographers(startDate, endDate) {
        try {
            const sql = `
                SELECT 
                    u.name,
                    u.avatarUrl,
                    COUNT(o.id) as orderCount,
                    SUM(o.total) as revenue
                FROM orders o
                JOIN users u ON o.photographerId = u.id
                WHERE o.date >= ? AND o.date <= ? AND o.status != 'Cancelled'
                GROUP BY u.id
                ORDER BY revenue DESC
            `;
            return this.db.prepare(sql).all(startDate, endDate) || [];
        } catch (error) {
            console.error('AnalyticsService.getTopPhotographers error:', error);
            return [];
        }
    }

    /**
     * Increment view count for an album
     */
    incrementAlbumView(albumId) {
        try {
            // Check if view_count column exists
            const columns = this.db.prepare(`PRAGMA table_info(albums)`).all();
            const hasViewCount = columns.some(col => col.name === 'view_count');
            
            if (!hasViewCount) {
                // Add the column if it doesn't exist
                this.db.prepare(`ALTER TABLE albums ADD COLUMN view_count INTEGER DEFAULT 0`).run();
            }
            
            const sql = `UPDATE albums SET view_count = COALESCE(view_count, 0) + 1 WHERE id = ?`;
            return this.db.prepare(sql).run(albumId);
        } catch (error) {
            console.error('AnalyticsService.incrementAlbumView error:', error);
            return { changes: 0 };
        }
    }

    }

    /**
     * Get comprehensive daily intelligence data
     * @param {string} startDate - ISO Date string
     * @param {string} endDate - ISO Date string
     * @param {string} deskId - Optional specific desk ID filter
     */
    getDailyIntelligence(startDate, endDate, deskId = null) {
        try {
            const params = [startDate, endDate];
            let deskFilter = '';
            if (deskId && deskId !== 'Global') {
                deskFilter = ' AND desk_id = ?';
                params.push(deskId);
            }

            // 1. Revenue & Order Trends
            const revenueSql = `
                SELECT 
                    date,
                    desk_id,
                    COUNT(id) as orders,
                    SUM(total) as revenue
                FROM orders
                WHERE date >= ? AND date <= ? AND status != 'Cancelled'
                ${deskFilter}
                GROUP BY date, desk_id
                ORDER BY date ASC
            `;
            const trends = this.db.prepare(revenueSql).all(...params);

            // 2. Photographer Performance Leaderboard
            const photographerSql = `
                SELECT 
                    p.photographer_id,
                    u.name,
                    u.avatarUrl,
                    SUM(p.income_simple + p.income_multiple) as total_revenue,
                    SUM(p.meetings_made) as total_sales,
                    AVG(p.avg_session_duration) as avg_duration
                FROM photographer_performance p
                JOIN users u ON p.photographer_id = u.id
                WHERE p.date >= ? AND p.date <= ?
                ${deskFilter}
                GROUP BY p.photographer_id
                ORDER BY total_revenue DESC
            `;
            const photographers = this.db.prepare(photographerSql).all(...params);

            // 3. Station (Desk) Breakdown
            const stationSql = `
                SELECT 
                    desk_id,
                    SUM(viewing_sessions) as total_sessions,
                    SUM(total_revenue) as total_revenue,
                    SUM(printing_jobs) as total_prints,
                    SUM(pending_uploads) as pending_sync
                FROM daily_resort_stats
                WHERE date >= ? AND date <= ?
                ${deskFilter}
                GROUP BY desk_id
            `;
            const stations = this.db.prepare(stationSql).all(...params);

            // 4. Product/Category Breakdown (from orders.items)
            // Note: This requires JSON parsing in-memory for SQLite complexities
            const orders = this.db.prepare(`
                SELECT items FROM orders 
                WHERE date >= ? AND date <= ? AND status != 'Cancelled'
                ${deskFilter}
            `).all(...params);

            const productBreakdown = {};
            orders.forEach(order => {
                try {
                    const items = JSON.parse(order.items || '[]');
                    items.forEach(item => {
                        const name = item.name || 'Unknown Item';
                        productBreakdown[name] = (productBreakdown[name] || 0) + 1;
                    });
                } catch (e) { /* ignore parse errors */ }
            });

            return {
                trends,
                photographers,
                stations,
                productBreakdown: Object.entries(productBreakdown).map(([name, count]) => ({ name, count }))
            };
        } catch (error) {
            console.error('AnalyticsService.getDailyIntelligence error:', error);
            throw error;
        }
    }
}

module.exports = new AnalyticsService();
