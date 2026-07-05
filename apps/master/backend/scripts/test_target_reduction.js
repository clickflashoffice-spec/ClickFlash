import { logger } from "@/utils/logger";
const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

// Configuration
const DB_FILE = path.join(__dirname, '../data/database.sqlite');
const db = new Database(DB_FILE);

async function testTargetReduction() {
    logger.info('--- Phase 54: Photographer Target Tracking Test ---');

    try {
        // 1. Find a test photographer (or pick first one)
        const photographer = db.prepare("SELECT id, name, dailyPhotoTarget FROM users WHERE role = 'Photographer' LIMIT 1").get();
        if (!photographer) {
            logger.error('No photographer found in database. Please create one with dailyPhotoTarget > 0 first.');
            return;
        }

        const pId = photographer.id;
        const today = new Date().toISOString().split('T')[0];
        logger.info(`Testing with photographer: ${photographer.name} (${pId}), Default Target: ${photographer.dailyPhotoTarget}`);

        // 2. Ensure an objective exists for today (or get current state)
        let objective = db.prepare('SELECT id, target FROM daily_objectives WHERE photographer_id = ? AND date = ?').get([pId, today]);

        if (!objective) {
            logger.info('No objective found for today. Creating one based on default target...');
            const id = crypto.randomUUID();
            const target = photographer.dailyPhotoTarget || 50; // Mock default if 0
            db.prepare(`
                INSERT INTO daily_objectives (id, photographer_id, date, target, status, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run([id, pId, today, target, 'Pending', new Date().toISOString(), new Date().toISOString()]);
            objective = { id, target };
        }

        const initialTarget = objective.target;
        logger.info(`Initial target for today: ${initialTarget}`);

        // 3. Simulate the logic from collectionRoutes.ts hook
        logger.info('Simulating photo creation hook...');

        // --- LOGIC REPLICATION FROM collectionRoutes.ts ---
        const objInHook = db.prepare('SELECT id, target FROM daily_objectives WHERE photographer_id = ? AND date = ?').get([pId, today]);
        if (objInHook) {
            const newTarget = Math.max(0, objInHook.target - 1);
            db.prepare('UPDATE daily_objectives SET target = ?, updated_at = ? WHERE id = ?').run([newTarget, new Date().toISOString(), objInHook.id]);
            logger.info(`[ReplicatedHook] Decremented target to: ${newTarget}`);
        }
        // --------------------------------------------------

        // 4. Verify results
        const updatedObjective = db.prepare('SELECT target FROM daily_objectives WHERE id = ?').get([objective.id]);
        logger.info(`Final target in database: ${updatedObjective.target}`);

        if (updatedObjective.target === initialTarget - 1) {
            logger.info('\n✅ SUCCESS: Target successfully decremented by 1.');
        } else {
            logger.error('\n❌ FAILURE: Target was not decremented correctly.');
        }

    } catch (err) {
        logger.error('Test failed with error:', err.message);
    } finally {
        db.close();
    }
}

testTargetReduction();
