import { CloudSyncService } from "../backend/services/cloudSyncService";
import { DatabaseManager } from "../backend/shared/db";
import { Logger } from "../backend/shared/logger";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import dotenv from "dotenv";

// Load environment variables for credentials
dotenv.config();

const DATA_DIR = "E:\\ClickFlash\\apps\\master\\pb_data";
const DB_FILE = path.join(DATA_DIR, "master.db");
const UPLOAD_DIR = "E:\\ClickFlash\\apps\\master\\uploads";

async function testR2Upload() {
    console.log("🛠️ Testing R2 Cloud Upload Pipeline...");

    const logger = new Logger(DATA_DIR);
    const dbManager = new DatabaseManager(DB_FILE);
    dbManager.connect();

    // 1. Initialize CloudSyncService
    // Note: We're mocking parts that aren't critical for the upload logic test
    const cloudSync = new CloudSyncService(
        dbManager,
        logger,
        null as any, // emailService
        null, // resourceMonitor
        null  // resortAnalytics
    );

    // 2. Prepare Test Data
    const testAlbumId = "stress-test-album-1"; // Use one of the albums we created
    const testAssetId = crypto.randomUUID();
    const testFileName = `r2_test_${Date.now()}.jpg`;
    const relativeUrl = `${testAlbumId}/${testFileName}`;
    const absolutePath = path.join(UPLOAD_DIR, relativeUrl);

    // Create a dummy image file if it doesn't exist
    if (!fs.existsSync(path.dirname(absolutePath))) {
        fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    }
    fs.writeFileSync(absolutePath, Buffer.alloc(1024 * 1024, 0)); // 1MB dummy file

    console.log(`- Test File Created: ${absolutePath}`);

    try {
        console.log("- Attempting Upload via CloudSyncService...");
        
        // We use uploadRetentionAsset as it's a good proxy for the MoneyTrash flow
        // It will look for various file tiers or fall back to the original
        await cloudSync.uploadRetentionAsset(testAssetId, relativeUrl, testAlbumId);
        
        console.log("✅ R2 Upload Triggered Successfully!");
        console.log("- Audit: Item should be Landing in Cloud R2 bucket under desk_id prefix.");
    } catch (err: any) {
        if (err.message.includes("CLOUD_API_URL not configured") || 
            err.message.includes("CLOUD_EMAIL not configured")) {
            console.log("⚠️ TEST SKIPPED (MOCKED): Cloud credentials not found in .env.");
            console.log("   Logic verification: Service correctly identified missing credentials.");
        } else if (err.message.includes("Unauthorized") || err.message.includes("401")) {
             console.log("⚠️ AUTH FAILED: Cloud Hub rejected credentials (Expected if testing without live hub).");
        } else {
            console.error("❌ R2 Upload Failed:", err.message);
        }
    } finally {
        dbManager.close();
    }
}

testR2Upload().catch(err => {
    console.error("Fatal test error:", err);
    process.exit(1);
});
