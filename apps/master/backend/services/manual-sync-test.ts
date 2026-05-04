import { DatabaseManager } from "../shared/db";
import { CloudSyncService } from "./cloudSyncService";
import { Logger } from "../shared/logger";
import { ResourceMonitor } from "../shared/ResourceMonitor";
import path from "path";

const DATA_DIR = "E:\\ClickFlash\\apps\\master\\pb_data";
const DB_FILE = path.join(DATA_DIR, "master.db");

async function manualSync() {
    console.log("--- Manual Sync Test Start ---");
    const dbManager = new DatabaseManager(DB_FILE);
    dbManager.connect();

    const logger = new Logger(DATA_DIR);
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

    console.log("Triggering Order Sync...");
    try {
        await (cloudSyncService as any).syncOrdersToGallery();
        console.log("Order Sync Complete (Check Hub for results)");
    } catch (err) {
        console.error("Order Sync Failed:", err);
    }

    process.exit(0);
}

manualSync().catch(err => {
    console.error("Manual Sync Test Failed:", err);
    process.exit(1);
});
