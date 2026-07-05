import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { DatabaseManager } from '../database/db';
import { CloudSyncService } from "./cloudSyncService";
import { logger } from '../utils/logger';
import { ResourceMonitor } from '../services/ResourceMonitor';

// HardwareService imported via CloudSyncService

// Load environment variables
dotenv.config();

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "pb_data");
const DB_FILE = process.env.DATABASE_PATH || path.join(DATA_DIR, "master.db");

async function verifyBridge() {
    logger.info("🚀 Starting Cloud Bridge Verification...");

    if (!fs.existsSync(DB_FILE)) {
        logger.error(`❌ Database not found at ${DB_FILE}`);
        process.exit(1);
    }


    const dbManager = new DatabaseManager(DB_FILE);
    dbManager.connect();

    const resourceMonitor = new ResourceMonitor(logger);
    
    const cloudSyncService = new CloudSyncService(
        dbManager,
        logger,
        { setCloudConfig: () => {} } as any, // Dummy email service
        resourceMonitor
    );

    logger.info("--- Connection Info ---");
    logger.info(`Hub URL: ${process.env.CLOUD_API_URL}`);
    logger.info(`Desk ID: ${process.env.DESK_ID || "MASTER_01"}`);
    logger.info(`Email:   ${process.env.CLOUD_EMAIL}`);

    try {
        // 1. Authentication
        logger.info("\n1️⃣  Testing Authentication...");
        await (cloudSyncService as any).authenticate();
        const stats = cloudSyncService.getStats();
        if (stats.cloudConnection === "online") {
            logger.info("✅ Authenticated successfully.");
        } else {
            logger.error("❌ Authentication failed. Check credentials and Cloud Hub status.");
            process.exit(1);
        }

        // 2. Heartbeat push
        logger.info("\n2️⃣  Testing Heartbeat...");
        await cloudSyncService.sendHeartbeat();
        logger.info("✅ Heartbeat sent.");

        // 3. Remote Settings Pull
        logger.info("\n3️⃣  Testing Remote Settings Pull...");
        await cloudSyncService.syncRemoteSettings();
        logger.info("✅ Settings sync completed.");

        // 4. Order Sync (Simulated)
        logger.info("\n4️⃣  Testing Order Sync...");
        // Create a dummy order to sync if none exist for testing
        const testOrderId = `test_order_${Date.now()}`;
        dbManager.run(`
            INSERT INTO orders (id, status, total, date, created_at, photographerId, cloud_sync_status)
            VALUES (?, 'paid', 50.00, ?, CURRENT_TIMESTAMP, 'test_photographer', 'pending')
        `, [testOrderId, new Date().toISOString().split('T')[0]]);

        logger.info(`Created test order ${testOrderId}. Triggering sync...`);
        await cloudSyncService.syncOrdersToGallery();
        
        // Check if status updated
        const order = dbManager.get<{ cloud_sync_status: string }>("SELECT cloud_sync_status FROM orders WHERE id = ?", [testOrderId]);
        if (order?.cloud_sync_status === 'synced') {
            logger.info("✅ Order synced successfully.");
        } else {
            logger.info(`⚠️ Order sync status: ${order?.cloud_sync_status || 'unknown'}. Check logs if 'pending'.`);
        }

        logger.info("\n✨ Cloud Bridge Verification COMPLETE.");
    } catch (error) {
        logger.error("\n❌ Verification FAILED:", error);
        process.exit(1);
    } finally {
        dbManager.close();
        process.exit(0);
    }
}

verifyBridge().catch(err => {
    logger.error("Fatal error during verification:", err);
    process.exit(1);
});
