const express = require('express');
const router = express.Router();
const { getDatabase } = require('../db');

// GET /api/hr/actions
router.get('/actions', (req, res) => {
    try {
        const db = getDatabase();
        const actions = db.prepare('SELECT * FROM hr_staff_actions ORDER BY date DESC').all();
        res.json(actions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/hr/actions
router.post('/actions', (req, res) => {
    try {
        const db = getDatabase();
        const { id, name, type, status, date, notes } = req.body;
        const result = db.prepare(`
            INSERT INTO hr_staff_actions (id, name, type, status, date, notes, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(id) DO UPDATE SET
                name = EXCLUDED.name,
                type = EXCLUDED.type,
                status = EXCLUDED.status,
                date = EXCLUDED.date,
                notes = EXCLUDED.notes,
                updated_at = CURRENT_TIMESTAMP
        `).run(id, name, type, status, date, notes);
        res.json({ success: true, id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
