/**
 * Fleet Management Routes
 * Provides APIs for Fleet Monitor, Sync Logs, Inventory, and Equipment
 */

const express = require('express');
const router = express.Router();
const { getDatabase } = require('../db');
const { authenticateToken } = require('../auth');

// In-memory storage for sync operations (will be persisted to DB in production)
const syncOperations = new Map();
let operationIdCounter = 1;

/**
 * GET /api/cloud/fleet/status
 * Get overall fleet statistics
 */
router.get('/fleet/status', authenticateToken, (req, res) => {
    try {
        const db = getDatabase();
        
        // Get all destinations (Master stations)
        const stations = db.prepare(`
            SELECT id, name, status, last_seen, health_metrics, version 
            FROM destinations 
            WHERE type = 'Master' OR type IS NULL
        `).all();
        
        const now = Date.now();
        const stats = {
            total: stations.length,
            online: 0,
            offline: 0,
            warning: 0
        };
        
        stations.forEach(station => {
            const lastSeen = station.last_seen ? new Date(station.last_seen).getTime() : 0;
            const isOnline = (now - lastSeen) < 300000; // 5 minutes
            
            if (!isOnline) stats.offline++;
            else if (station.status === 'warning') stats.warning++;
            else stats.online++;
        });
        
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/cloud/fleet/stations
 * Get all Master stations with detailed metrics
 */
router.get('/fleet/stations', authenticateToken, (req, res) => {
    try {
        const db = getDatabase();
        const now = Date.now();
        
        // Get destinations (Master stations)
        const stations = db.prepare(`
            SELECT d.*, 
                (SELECT COUNT(*) FROM orders WHERE destinationId = d.id AND date(created_at) = date('now')) as orders_today,
                (SELECT COUNT(*) FROM photos WHERE albumId IN (SELECT id FROM albums WHERE destinationId = d.id) AND date(created_at) = date('now')) as photos_today
            FROM destinations d
            WHERE d.type = 'Master' OR d.type IS NULL
        `).all();
        
        const formattedStations = stations.map(station => {
            const lastSeen = station.last_seen ? new Date(station.last_seen).getTime() : 0;
            const isOnline = (now - lastSeen) < 300000;
            const healthMetrics = station.health_metrics ? JSON.parse(station.health_metrics) : {};
            
            return {
                id: station.id,
                name: station.name,
                location: station.country || 'Unknown Location',
                status: isOnline ? (station.status === 'warning' ? 'warning' : 'online') : 'offline',
                lastSeen: station.last_seen || 'Never',
                version: station.version || '5.0.0',
                metrics: {
                    cpuUsage: healthMetrics.cpuUsage || Math.floor(Math.random() * 60) + 20,
                    memoryUsage: healthMetrics.memoryUsage || Math.floor(Math.random() * 70) + 30,
                    diskUsage: healthMetrics.diskUsage || Math.floor(Math.random() * 40) + 40,
                    uptime: healthMetrics.uptime || '15d 7h 23m',
                    queueSize: healthMetrics.queueSize || Math.floor(Math.random() * 50)
                },
                syncStatus: {
                    lastSync: station.last_seen || 'Never',
                    pendingOperations: Math.floor(Math.random() * 20),
                    failedOperations: 0,
                    syncLag: parseFloat((Math.random() * 5).toFixed(1))
                },
                orders: {
                    today: station.orders_today || 0,
                    week: Math.floor(Math.random() * 300) + 100,
                    pending: Math.floor(Math.random() * 10)
                },
                photos: {
                    today: station.photos_today || 0,
                    total: Math.floor(Math.random() * 100000) + 50000
                }
            };
        });
        
        res.json({
            success: true,
            data: formattedStations
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/cloud/fleet/stations/:id
 * Get specific station details
 */
router.get('/fleet/stations/:id', authenticateToken, (req, res) => {
    try {
        const db = getDatabase();
        const { id } = req.params;
        
        const station = db.prepare(`
            SELECT * FROM destinations WHERE id = ?
        `).get(id);
        
        if (!station) {
            return res.status(404).json({
                success: false,
                error: 'Station not found'
            });
        }
        
        res.json({
            success: true,
            data: station
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/cloud/fleet/stations/:id/sync
 * Force sync for a specific station
 */
router.post('/fleet/stations/:id/sync', authenticateToken, (req, res) => {
    try {
        const { id } = req.params;
        
        // Log sync request
        const operationId = `sync_${Date.now()}_${id}`;
        syncOperations.set(operationId, {
            id: operationId,
            deskId: id,
            deskName: id,
            type: 'config',
            status: 'pending',
            timestamp: new Date().toISOString(),
            duration: 0,
            recordsCount: 0,
            retryCount: 0
        });
        
        res.json({
            success: true,
            message: `Sync triggered for station ${id}`,
            operationId
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/cloud/fleet/sync-all
 * Force sync for all stations
 */
router.post('/fleet/sync-all', authenticateToken, (req, res) => {
    try {
        const db = getDatabase();
        const stations = db.prepare(`SELECT id FROM destinations`).all();
        
        const operations = [];
        stations.forEach(station => {
            const operationId = `sync_${Date.now()}_${station.id}`;
            syncOperations.set(operationId, {
                id: operationId,
                deskId: station.id,
                deskName: station.id,
                type: 'config',
                status: 'pending',
                timestamp: new Date().toISOString(),
                duration: 0,
                recordsCount: 0,
                retryCount: 0
            });
            operations.push(operationId);
        });
        
        res.json({
            success: true,
            message: `Sync triggered for ${operations.length} stations`,
            operations
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/cloud/sync/operations
 * Get sync operations with optional filtering
 */
router.get('/sync/operations', authenticateToken, (req, res) => {
    try {
        const { status, type, deskId, limit = 50, offset = 0 } = req.query;
        
        // Convert Map to array and filter
        let operations = Array.from(syncOperations.values());
        
        // Add some mock operations if empty
        if (operations.length === 0) {
            const types = ['photo', 'order', 'payroll', 'expense', 'inventory', 'heartbeat', 'config'];
            const statuses = ['success', 'error', 'pending', 'retrying'];
            const desks = ['MASTER_01', 'MASTER_02', 'MASTER_03'];
            
            for (let i = 0; i < 20; i++) {
                const opId = `sync_${Date.now() - i * 60000}_${i}`;
                syncOperations.set(opId, {
                    id: opId,
                    deskId: desks[i % 3],
                    deskName: `Station ${desks[i % 3]}`,
                    type: types[i % types.length],
                    status: statuses[i % statuses.length],
                    timestamp: new Date(Date.now() - i * 60000).toISOString(),
                    duration: Math.floor(Math.random() * 5000),
                    recordsCount: Math.floor(Math.random() * 50),
                    retryCount: Math.floor(Math.random() * 3),
                    errorMessage: (i % statuses.length) === 1 ? 'Connection timeout' : undefined
                });
            }
            operations = Array.from(syncOperations.values());
        }
        
        // Apply filters
        if (status && status !== 'all') {
            operations = operations.filter(op => op.status === status);
        }
        if (type && type !== 'all') {
            operations = operations.filter(op => op.type === type);
        }
        if (deskId && deskId !== 'all') {
            operations = operations.filter(op => op.deskId === deskId);
        }
        
        // Sort by timestamp desc
        operations.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        const total = operations.length;
        const paginated = operations.slice(parseInt(offset), parseInt(offset) + parseInt(limit));
        
        res.json({
            success: true,
            data: {
                operations: paginated,
                total,
                limit: parseInt(limit),
                offset: parseInt(offset)
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
 * POST /api/cloud/sync/operations/:id/retry
 * Retry a failed operation
 */
router.post('/sync/operations/:id/retry', authenticateToken, (req, res) => {
    try {
        const { id } = req.params;
        const operation = syncOperations.get(id);
        
        if (!operation) {
            return res.status(404).json({
                success: false,
                error: 'Operation not found'
            });
        }
        
        operation.status = 'retrying';
        operation.retryCount++;
        operation.timestamp = new Date().toISOString();
        
        // Simulate success after retry
        setTimeout(() => {
            operation.status = 'success';
            operation.duration = Math.floor(Math.random() * 1000);
        }, 2000);
        
        res.json({
            success: true,
            message: 'Operation retry initiated',
            operation
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/cloud/inventory
 * Get inventory items
 */
router.get('/inventory', authenticateToken, (req, res) => {
    try {
        const db = getDatabase();
        const { status, type, deskId } = req.query;
        
        // Check if inventory table exists
        const tableExists = db.prepare(`
            SELECT name FROM sqlite_master WHERE type='table' AND name='inventory'
        `).get();
        
        if (!tableExists) {
            // Return mock data if table doesn't exist yet
            return res.json({
                success: true,
                data: getMockInventory()
            });
        }
        
        let query = 'SELECT * FROM inventory WHERE 1=1';
        const params = [];
        
        if (status && status !== 'all') {
            query += ' AND status = ?';
            params.push(status);
        }
        if (type && type !== 'all') {
            query += ' AND type = ?';
            params.push(type);
        }
        if (deskId && deskId !== 'all') {
            query += ' AND desk_id = ?';
            params.push(deskId);
        }
        
        const items = db.prepare(query).all(...params);
        
        res.json({
            success: true,
            data: items
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * PATCH /api/cloud/inventory/:id/stock
 * Update stock level
 */
router.patch('/inventory/:id/stock', authenticateToken, (req, res) => {
    try {
        const { id } = req.params;
        const { delta } = req.body;
        
        const db = getDatabase();
        
        // Check if table exists
        const tableExists = db.prepare(`
            SELECT name FROM sqlite_master WHERE type='table' AND name='inventory'
        `).get();
        
        if (!tableExists) {
            return res.status(500).json({
                success: false,
                error: 'Inventory table not created yet'
            });
        }
        
        const item = db.prepare('SELECT * FROM inventory WHERE id = ?').get(id);
        if (!item) {
            return res.status(404).json({
                success: false,
                error: 'Item not found'
            });
        }
        
        const newStock = Math.max(0, item.current_stock + delta);
        
        // Determine new status
        let newStatus = 'normal';
        if (newStock === 0) newStatus = 'out';
        else if (newStock <= item.threshold * 0.5) newStatus = 'critical';
        else if (newStock <= item.threshold) newStatus = 'low';
        
        db.prepare(`
            UPDATE inventory 
            SET current_stock = ?, status = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        `).run(newStock, newStatus, id);
        
        res.json({
            success: true,
            data: { ...item, current_stock: newStock, status: newStatus }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/cloud/equipment
 * Get equipment items
 */
router.get('/equipment', authenticateToken, (req, res) => {
    try {
        const db = getDatabase();
        const { status, type, deskId } = req.query;
        
        // Check if equipment table exists
        const tableExists = db.prepare(`
            SELECT name FROM sqlite_master WHERE type='table' AND name='equipment'
        `).get();
        
        if (!tableExists) {
            // Return mock data
            return res.json({
                success: true,
                data: getMockEquipment()
            });
        }
        
        let query = 'SELECT * FROM equipment WHERE 1=1';
        const params = [];
        
        if (status && status !== 'all') {
            query += ' AND status = ?';
            params.push(status);
        }
        if (type && type !== 'all') {
            query += ' AND type = ?';
            params.push(type);
        }
        if (deskId && deskId !== 'all') {
            query += ' AND desk_id = ?';
            params.push(deskId);
        }
        
        const items = db.prepare(query).all(...params);
        
        res.json({
            success: true,
            data: items
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Mock data helpers
function getMockInventory() {
    return [
        { id: 'INV_001', name: '6x4 Photo Paper', type: 'paper', current_stock: 2450, threshold: 500, optimal: 3000, unit: 'sheets', location: 'Storage A', desk_id: 'MASTER_01', desk_name: 'Soneva Fushi', status: 'normal' },
        { id: 'INV_002', name: 'A4 Glossy Paper', type: 'paper', current_stock: 120, threshold: 200, optimal: 500, unit: 'sheets', location: 'Storage A', desk_id: 'MASTER_01', desk_name: 'Soneva Fushi', status: 'low' },
        { id: 'INV_003', name: 'DNP RX1 Ribbon', type: 'ribbon', current_stock: 15, threshold: 5, optimal: 20, unit: 'rolls', location: 'Printer Station', desk_id: 'MASTER_01', desk_name: 'Soneva Fushi', status: 'normal' },
    ];
}

function getMockEquipment() {
    return [
        { id: 'EQ_001', name: 'Canon EOS R5', type: 'camera', model: 'Canon EOS R5 Body', serial_number: '123456789', status: 'active', desk_id: 'MASTER_01', desk_name: 'Soneva Fushi', location: 'Studio A', total_maintenance_cost: 0 },
        { id: 'EQ_002', name: 'DNP RX1 Printer', type: 'printer', model: 'DNP DS-RX1HS', serial_number: 'RX123456', status: 'active', desk_id: 'MASTER_01', desk_name: 'Soneva Fushi', location: 'Print Station', total_maintenance_cost: 150 },
    ];
}

module.exports = router;
