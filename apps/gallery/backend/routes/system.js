const express = require('express');
const os = require('os');
const { hashPassword } = require('../auth');
const router = express.Router();

/**
 * Health check endpoint
 */
router.get('/health', (req, res) => {
    const dbManager = req.app.get('dbManager');
    try {
        const userCount = dbManager.query('SELECT COUNT(*) as count FROM users')[0]?.count || 0;
        const defaultUserExists = dbManager.get('SELECT * FROM users WHERE email = ?', ['alaeddine@example.com']);
        res.json({
            status: 'online',
            code: 200,
            version: '4.2.0',
            db: 'sqlite',
            security: 'enabled',
            userCount: userCount,
            defaultUserExists: !!defaultUserExists
        });
    } catch (err) {
        res.json({ status: 'online', code: 200, version: '4.2.0', db: 'sqlite', security: 'enabled', error: err.message });
    }
});

/**
 * IP discovery endpoint
 */
router.get('/ip', (req, res) => {
    const logger = req.app.get('logger');
    try {
        const results = [];
        const nets = os.networkInterfaces();

        for (const name of Object.keys(nets)) {
            for (const net of nets[name]) {
                const isIPv4 = net.family === 'IPv4' || net.family === 4;
                if (isIPv4 && !net.internal) {
                    results.push({ name: name, ip: net.address });
                }
            }
        }

        if (results.length === 0) {
            results.push({ name: 'Loopback', ip: '127.0.0.1' });
        }

        res.json({ interfaces: results });
    } catch (error) {
        if (logger) logger.error('IP discovery error', { error: error.message });
        res.json({ interfaces: [{ name: 'Loopback', ip: '127.0.0.1' }] });
    }
});

/**
 * GDPR Erasure
 */
router.post('/system/erase-customer-data', async (req, res) => {
    const { email } = req.body;
    const dbManager = req.app.get('dbManager');
    const logger = req.app.get('logger');

    if (!email) {
        return res.status(400).json({ success: false, error: 'email is required' });
    }

    try {
        const deletedOrders = dbManager.run('DELETE FROM orders WHERE email = ?', [email]);
        const deletedTokens = dbManager.run('DELETE FROM gallery_tokens WHERE customer_email = ?', [email]);
        const deletedBookings = dbManager.run('DELETE FROM bookings WHERE email = ?', [email]);

        const deleted = {
            orders: deletedOrders.changes || 0,
            gallery_tokens: deletedTokens.changes || 0,
            bookings: deletedBookings.changes || 0,
        };

        if (logger) logger.info('GDPR erasure completed', { email, deleted });
        res.json({ success: true, deleted });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

/**
 * Factory Reset (Destructive)
 */
router.post('/reset', async (req, res) => {
    const dbManager = req.app.get('dbManager');
    const logger = req.app.get('logger');
    const auditLogger = req.app.get('auditLogger');

    try {
        const tablesToReset = [
            'photos', 'orders', 'bookings', 'albums', 'packs',
            'products', 'destinations', 'session_types', 'kiosks', 'settings', 'users'
        ];

        let deletedCounts = {};
        for (const table of tablesToReset) {
            const result = dbManager.run(`DELETE FROM ${table}`);
            deletedCounts[table] = result.changes || 0;
        }

        // Recreate default admin
        const DEFAULT_USER = {
            name: 'Alaeddine',
            email: 'alaeddine@example.com',
            password: 'DEFAULT_PASSWORD_PLACEHOLDER',
            role: 'Admin'
        };
        const hashedPassword = await hashPassword(DEFAULT_USER.password);
        dbManager.run(`INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`, 
            [DEFAULT_USER.name, DEFAULT_USER.email, hashedPassword, DEFAULT_USER.role]);

        res.json({ success: true, message: 'Database reset successfully.', deletedCounts });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

module.exports = router;
