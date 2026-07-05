import { DatabaseManager } from '../database/db';
import { CloudSyncService } from "./cloudSyncService";
import { logger } from '../utils/logger';
import { ResourceMonitor } from '../services/ResourceMonitor';
import path from "path";


const DATA_DIR = "E:\\ClickFlash\\apps\\master\\pb_data";
const DB_FILE = path.join(DATA_DIR, "master.db");

async function manualSync() {
    logger.info("--- Manual Sync Test Start ---");
    const dbManager = new DatabaseManager(DB_FILE);
    dbManager.connect();


    const resourceMonitor = new ResourceMonitor(logger);
    
    const cloudSyncService = new CloudSyncService(
        dbManager,
        logger,
        { setCloudConfig: () => {} } as any, // Dummy email service
        resourceMonitor
    );

    // Override URLs if necessary to point to Hub on port 8787 (as found in Hub's .env)
    process.env.CLOUD_API_URL = "http://localhost:8787";
    process.env.CLOUD_GALLERY_URL = "http://localhost:5174";

    logger.info("Triggering Order Sync...");
    try {
        await (cloudSyncService as any).syncOrdersToGallery();
        logger.info("Order Sync Complete (Check Hub for results)");
    } catch (err) {
        logger.error("Order Sync Failed:", err);
    }

    process.exit(0);
}

manualSync().catch(err => {
    logger.error("Manual Sync Test Failed:", err);
    process.exit(1);
});
