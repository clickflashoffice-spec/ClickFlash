const express = require('express');
const router = express.Router();
const { getDatabase } = require('../db');

// GET /api/yield/stats
router.get('/stats', (req, res) => {
    try {
        const db = getDatabase();
        // Return latest yield stats aggregated by date
        const stats = db.prepare(`
            SELECT 
                date,
                SUM(total_orders) as total_orders,
                SUM(paid_orders) as paid_orders,
                AVG(avg_order_value) as avg_order_value
            FROM system_yield_stats
            GROUP BY date
            ORDER BY date DESC
            LIMIT 30
        `).all();
        res.json(stats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/yield/realtime
// Simulation of live yield delta (Master pushes here)
router.get('/realtime', (req, res) => {
    try {
        const db = getDatabase();
        const latest = db.prepare(`
            SELECT * FROM system_yield_stats 
            ORDER BY created_at DESC LIMIT 1
        `).get();
        res.json(latest || { total_orders: 0, paid_orders: 0, avg_order_value: 0 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
