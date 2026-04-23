/**
 * System Health & Monitoring Routes
 * Provides real-time system status and master station monitoring
 */

const express = require('express');
const router = express.Router();
const { getDatabase } = require('../db');
const { authenticateToken } = require('../auth');
const os = require('os');

// Master station heartbeat tracking
const masterStations = new Map();
const KIOSK_TIMEOUT_MS = 30000; // 30 seconds

/**
 * GET /api/system/health/all
 * Returns comprehensive system health status
 */
router.get('/health/all', authenticateToken, async (req, res) => {
    try {
        const db = getDatabase();

        // Check database connectivity
        let dbStatus = 'disconnected';
        try {
            db.prepare('SELECT 1').get();
            dbStatus = 'connected';
        } catch (e) {
            dbStatus = 'disconnected';
        }

        // Get system metrics
        const uptime = process.uptime();
        const memoryUsage = process.memoryUsage();
        const loadAvg = os.loadavg();

        // Get active connections (from recent API calls)
        const recentRequests = db.prepare(`
            SELECT COUNT(*) as count FROM audit_log 
            WHERE timestamp > datetime('now', '-5 minutes')
        `).get();

        // Calculate error rate from last hour
        const errorStats = db.prepare(`
            SELECT 
                COUNT(CASE WHEN level = 'ERROR' THEN 1 END) as errors,
                COUNT(*) as total
            FROM audit_log 
            WHERE timestamp > datetime('now', '-1 hour')
        `).get();

        const errorRate = errorStats.total > 0
            ? (errorStats.errors / errorStats.total) * 100
            : 0;

        // Get master stations status
        const now = Date.now();
        const masters = Array.from(masterStations.entries()).map(([id, data]) => ({
            id,
            name: data.name || id,
            status: (now - data.lastHeartbeat) < KIOSK_TIMEOUT_MS ? 'online' : 'offline',
            lastSeen: new Date(data.lastHeartbeat).toISOString(),
            version: data.version || 'unknown',
            destinationId: data.destinationId
        }));

        // Determine overall status
        let overallStatus = 'healthy';
        if (dbStatus !== 'connected' || errorRate > 5) {
            overallStatus = 'critical';
        } else if (errorRate > 1 || masters.some(m => m.status === 'offline')) {
            overallStatus = 'degraded';
        }

        res.json({
            success: true,
            data: {
                status: overallStatus,
                timestamp: new Date().toISOString(),
                services: {
                    database: dbStatus,
                    api: 'operational',
                    websocket: 'connected',
                    storage: memoryUsage.heapUsed / memoryUsage.heapTotal < 0.8 ? 'healthy' : 'low'
                },
                metrics: {
                    uptime: (uptime / 3600).toFixed(2), // hours
                    responseTime: 45, // ms (placeholder)
                    activeConnections: recentRequests.count || 0,
                    errorRate: errorRate.toFixed(2)
                },
                system: {
                    loadAverage: loadAvg.map(l => l.toFixed(2)),
                    memoryUsage: {
                        used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
                        total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
                        unit: 'MB'
                    }
                },
                masters
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/kiosks/status
 * Returns status of all connected kiosks
 */
router.get('/kiosks/status', authenticateToken, async (req, res) => {
    try {
        const db = getDatabase();
        const now = Date.now();

        // Get kiosks from database
        const kiosks = db.prepare(`
            SELECT k.*, d.name as destinationName
            FROM kiosks k
            LEFT JOIN destinations d ON k.destinationId = d.id
            ORDER BY k.lastHeartbeat DESC
        `).all();

        // Add status based on last heartbeat
        const kiosksWithStatus = kiosks.map(kiosk => {
            const lastHeartbeat = new Date(kiosk.lastHeartbeat).getTime();
            const isOnline = (now - lastHeartbeat) < KIOSK_TIMEOUT_MS;

            return {
                id: kiosk.id,
                name: kiosk.name,
                status: isOnline ? 'Online' : 'Offline',
                lastHeartbeat: kiosk.lastHeartbeat,
                destinationId: kiosk.destinationId,
                destinationName: kiosk.destinationName,
                version: kiosk.settings ? JSON.parse(kiosk.settings).version : null
            };
        });

        res.json({
            success: true,
            data: kiosksWithStatus
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/kiosks/heartbeat
 * Kiosk heartbeat endpoint for status updates
 */
router.post('/kiosks/heartbeat', async (req, res) => {
    try {
        const { kioskId, name, version, destinationId, status } = req.body;

        if (!kioskId) {
            return res.status(400).json({
                success: false,
                error: 'kioskId required'
            });
        }

        const db = getDatabase();

        // Update kiosk record
        db.prepare(`
            INSERT INTO kiosks (id, name, status, settings, destinationId, lastHeartbeat, created_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
            ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                status = excluded.status,
                settings = excluded.settings,
                destinationId = excluded.destinationId,
                lastHeartbeat = datetime('now')
        `).run(
            kioskId,
            name || kioskId,
            status || 'Online',
            JSON.stringify({ version, lastStatus: status }),
            destinationId
        );

        // Also update in-memory tracking
        masterStations.set(kioskId, {
            name: name || kioskId,
            version,
            destinationId,
            lastHeartbeat: Date.now()
        });

        res.json({
            success: true,
            message: 'Heartbeat received'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/masters/heartbeat
 * Master Portal heartbeat endpoint with persistence
 */
router.post('/masters/heartbeat', async (req, res) => {
    try {
        const { masterId, name, version, destinationId, metrics, status } = req.body;

        if (!masterId) {
            return res.status(400).json({
                success: false,
                error: 'masterId required'
            });
        }

        const db = require('../db').getDatabase();

        // Persist to database (destinations table often represents the Master Station)
        // If masterId maps to a destination, we update it.
        const targetId = destinationId || masterId;

        db.prepare(`
            INSERT INTO destinations (id, name, country, type, last_seen, status, health_metrics, version, created_at)
            VALUES (?, ?, ?, ?, datetime('now'), ?, ?, ?, datetime('now'))
            ON CONFLICT(id) DO UPDATE SET
                last_seen = datetime('now'),
                status = excluded.status,
                health_metrics = excluded.health_metrics,
                version = excluded.version
        `).run(
            targetId,
            name || targetId,
            'Unknown', // Default country if new
            'Master',  // Type
            status || 'Online',
            JSON.stringify(metrics || {}),
            version || 'unknown'
        );

        // Also update in-memory tracking for fast UI updates
        masterStations.set(masterId, {
            name: name || masterId,
            version: version || 'unknown',
            destinationId: targetId,
            lastHeartbeat: Date.now(),
            metrics
        });

        res.json({
            success: true,
            message: 'Master heartbeat persisted',
            serverTime: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/masters/status
 * Returns status of all registered master stations
 */
router.get('/masters/status', authenticateToken, (req, res) => {
    const now = Date.now();

    const masters = Array.from(masterStations.entries()).map(([id, data]) => ({
        id,
        name: data.name,
        status: (now - data.lastHeartbeat) < KIOSK_TIMEOUT_MS ? 'online' : 'offline',
        lastSeen: new Date(data.lastHeartbeat).toISOString(),
        version: data.version,
        destinationId: data.destinationId,
        metrics: data.metrics || {}
    }));

    res.json({
        success: true,
        data: masters
    });
});

/**
 * Cleanup inactive masters periodically
 */
setInterval(() => {
    const now = Date.now();
    const timeout = 5 * 60 * 1000; // 5 minutes

    for (const [id, data] of masterStations.entries()) {
        if (now - data.lastHeartbeat > timeout) {
            masterStations.delete(id);
        }
    }
}, 60000); // Run every minute

module.exports = router;
