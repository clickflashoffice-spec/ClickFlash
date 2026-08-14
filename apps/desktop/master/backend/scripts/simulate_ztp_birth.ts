import fs from 'fs';
import path from 'path';
import { BootstrapService } from '../services/provisioning/BootstrapService';
import DatabaseManager from '../database/db';
import { Logger } from '../utils/logger';
import { logger } from '../utils/logger';

// Mock global fetch for ZTP verification
(global as any).fetch = async (url: string, init: any) => {
    logger.info(`[Mock Fetch] ${init.method} ${url}`);
    if (url.includes('/api/auth/register-desk')) {
        const body = JSON.parse(init.body);
        logger.info(`[Mock Fetch] Payload:`, {
            desk_id: body.desk_id,
            machine_id: body.machine_id,
            provisioningSecret: body.provisioningSecret ? '***PRESENT***' : '***MISSING***'
        });
        
        return {
            ok: true,
            status: 200,
            json: async () => ({
                success: true,
                desk_id: body.desk_id,
                token: 'mock-jwt-token',
                provisioning_status: 'completed'
            })
        };
    }
    
    // Cloudflare API mock
    if (url.includes('api.cloudflare.com')) {
        return {
            ok: true,
            status: 200,
            json: async () => ({ success: true, result: { id: 'mock-rule-id' } })
        };
    }

    return { ok: true, json: async () => ({ success: true }) };
};

async function simulateZtpBirth() {
    const dataDir = path.join(process.cwd(), 'pb_data');
    const logger = new Logger(dataDir);
    const db = new DatabaseManager(path.join(dataDir, 'master.db'));
    db.connect(path.join(process.cwd(), 'backend/database/migrations'));
    db.runMigrations(path.join(process.cwd(), 'backend/migrations'));
    
    logger.info('\n--- Industrial ZTP Simulation: Resort Birth ---');
    logger.info('Target: Zero-Touch Provisioning (Hardened Phase 5)');
    
    // 1. Ensure clean state
    db.run("DELETE FROM settings WHERE id = 'setup_completed'");
    db.run("DELETE FROM settings WHERE id = 'desk_id'");
    db.run("DELETE FROM settings WHERE id = 'machine_id'");
    
    const bootstrapService = new BootstrapService(db, logger);
    const bootstrapPath = bootstrapService.getBootstrapPath();
    
    logger.info(`Checking bootstrap file at: ${bootstrapPath}`);
    
    if (!fs.existsSync(bootstrapPath)) {
        logger.error('ERROR: bootstrap.json not found. Run "seed-bootstrap" first.');
        process.exit(1);
    }

    // Capture registration payload by spying on global fetch if needed, 
    // but here we will just let it run and check logs.
    // NOTE: In a real test we'd use MSW or similar, but for this simulation 
    // we are verifying the STAGE MACHINE transition.

    logger.info('Initiating runIfRequired()...');
    
    try {
        await bootstrapService.runIfRequired();
        
        // 2. Verify results in DB
        const setupCompleted = db.get<{ value: string }>("SELECT value FROM settings WHERE id = 'setup_completed'");
        const machineId = db.get<{ value: string }>("SELECT value FROM settings WHERE id = 'machine_id'");
        const deskId = db.get<{ value: string }>("SELECT value FROM settings WHERE id = 'desk_id'");

        logger.info('\n--- Verification ---');
        logger.info(`Setup Completed: ${setupCompleted?.value}`);
        logger.info(`Machine ID (Hardware Bound): ${machineId?.value}`);
        logger.info(`Desk ID: ${deskId?.value}`);

        if (setupCompleted?.value === 'true' && machineId?.value) {
            logger.info('\nSUCCESS: ZTP Birth Simulation passed industrial verification.');
        } else {
            logger.info('\nFAILURE: ZTP state machine did not complete or machine_id missing.');
        }
    } catch (err) {
        logger.error('ZTP Simulation Failed:', err);
    }
}

simulateZtpBirth();
