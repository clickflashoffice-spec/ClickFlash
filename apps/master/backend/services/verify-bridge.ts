import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { DatabaseManager } from "../shared/db";
import { CloudSyncService } from "./cloudSyncService";
import { Logger } from "../shared/logger";
import { ResourceMonitor } from "../shared/ResourceMonitor";
// HardwareService imported via CloudSyncService

// Load environment variables
dotenv.config();

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "pb_data");
const DB_FILE = process.env.DATABASE_PATH || path.join(DATA_DIR, "master.db");

async function verifyBridge() {
    console.log("🚀 Starting Cloud Bridge Verification...");

    if (!fs.existsSync(DB_FILE)) {
        console.error(`❌ Database not found at ${DB_FILE}`);
        process.exit(1);
    }

    const logger = new Logger(DATA_DIR);
    const dbManager = new DatabaseManager(DB_FILE);
    dbManager.connect();

    const resourceMonitor = new ResourceMonitor(logger);
    
    const cloudSyncService = new CloudSyncService(
        dbManager,
        logger,
        { setCloudConfig: () => {} } as any, // Dummy email service
        resourceMonitor
    );

    console.log("--- Connection Info ---");
    console.log(`Hub URL: ${process.env.CLOUD_API_URL}`);
    console.log(`Desk ID: ${process.env.DESK_ID || "MASTER_01"}`);
    console.log(`Email:   ${process.env.CLOUD_EMAIL}`);

    try {
        // 1. Authentication
        console.log("\n1️⃣  Testing Authentication...");
        await (cloudSyncService as any).authenticate();
        const stats = cloudSyncService.getStats();
        if (stats.cloudConnection === "online") {
            console.log("✅ Authenticated successfully.");
        } else {
            console.error("❌ Authentication failed. Check credentials and Cloud Hub status.");
            process.exit(1);
        }

        // 2. Heartbeat push
        console.log("\n2️⃣  Testing Heartbeat...");
        await cloudSyncService.sendHeartbeat();
        console.log("✅ Heartbeat sent.");

        // 3. Remote Settings Pull
        console.log("\n3️⃣  Testing Remote Settings Pull...");
        await cloudSyncService.syncRemoteSettings();
        console.log("✅ Settings sync completed.");

        // 4. Order Sync (Simulated)
        console.log("\n4️⃣  Testing Order Sync...");
        // Create a dummy order to sync if none exist for testing
        const testOrderId = `test_order_${Date.now()}`;
        dbManager.run(`
            INSERT INTO orders (id, status, total, date, created_at, photographerId, cloud_sync_status)
            VALUES (?, 'paid', 50.00, ?, CURRENT_TIMESTAMP, 'test_photographer', 'pending')
        `, [testOrderId, new Date().toISOString().split('T')[0]]);

        console.log(`Created test order ${testOrderId}. Triggering sync...`);
        await cloudSyncService.syncOrdersToGallery();
        
        // Check if status updated
        const order = dbManager.get<{ cloud_sync_status: string }>("SELECT cloud_sync_status FROM orders WHERE id = ?", [testOrderId]);
        if (order?.cloud_sync_status === 'synced') {
            console.log("✅ Order synced successfully.");
        } else {
            console.log(`⚠️ Order sync status: ${order?.cloud_sync_status || 'unknown'}. Check logs if 'pending'.`);
        }

        console.log("\n✨ Cloud Bridge Verification COMPLETE.");
    } catch (error) {
        console.error("\n❌ Verification FAILED:", error);
        process.exit(1);
    } finally {
        dbManager.close();
        process.exit(0);
    }
}

verifyBridge().catch(err => {
    console.error("Fatal error during verification:", err);
    process.exit(1);
});
