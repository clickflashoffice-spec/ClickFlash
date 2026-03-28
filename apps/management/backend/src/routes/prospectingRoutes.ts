const express = require('express');
const router = express.Router();
const { getDatabase } = require('../db');

// GET /api/prospecting/leads
router.get('/leads', (req, res) => {
    try {
        const db = getDatabase();
        const leads = db.prepare('SELECT * FROM crm_leads ORDER BY updated_at DESC').all();
        res.json(leads);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/prospecting/leads
router.post('/leads', (req, res) => {
    try {
        const db = getDatabase();
        const { id, resort, contact, role, status, priority, notes } = req.body;
        const result = db.prepare(`
            INSERT INTO crm_leads (id, resort, contact, role, status, priority, notes, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(id) DO UPDATE SET
                resort = EXCLUDED.resort,
                contact = EXCLUDED.contact,
                role = EXCLUDED.role,
                status = EXCLUDED.status,
                priority = EXCLUDED.priority,
                notes = EXCLUDED.notes,
                updated_at = CURRENT_TIMESTAMP
        `).run(id, resort, contact, role, status, priority, notes);
        res.json({ success: true, id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
