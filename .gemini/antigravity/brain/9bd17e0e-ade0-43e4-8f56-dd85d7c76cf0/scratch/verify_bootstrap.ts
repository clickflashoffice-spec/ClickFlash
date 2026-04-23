import fs from 'fs';
import path from 'path';
import { BootstrapService } from '../apps/master/backend/services/provisioning/BootstrapService';
import { Logger } from '../apps/master/backend/shared/logger';
import { DatabaseManager } from '../apps/master/backend/shared/db';

async function testBootstrap() {
    const testDataDir = path.join(__dirname, 'test_pb_data');
    if (!fs.existsSync(testDataDir)) fs.mkdirSync(testDataDir, { recursive: true });

    const dbFile = path.join(testDataDir, 'master.db');
    if (fs.existsSync(dbFile)) fs.unlinkSync(dbFile);

    const logger = new Logger(testDataDir, 'DEBUG');
    const db = new DatabaseManager(dbFile);
    db.connect(path.join(__dirname, '../apps/master/backend/shared/migrations'));

    // 1. Create bootstrap.json
    const bootstrapData = {
        locationName: "Test Resort",
        adminEmail: "test@resort.com",
        adminPassword: "testDEFAULT_PASSWORD_PLACEHOLDER"
    };
    fs.writeFileSync(path.join(testDataDir, 'bootstrap.json'), JSON.stringify(bootstrapData));

    // 2. Mock process.env.DATA_DIR for constants (requires a bit of hacking since it's hardcoded)
    process.env.DATA_DIR = testDataDir;

    console.log("Starting Bootstrap Test...");
    const service = new BootstrapService(db, logger);
    await service.runIfRequired();

    // 3. Verify DB state
    const setupStatus = db.get<{ value: string }>("SELECT value FROM settings WHERE id = 'setup_completed'");
    console.log("Setup Completed:", setupStatus?.value);

    const locationName = db.get<{ value: string }>("SELECT value FROM settings WHERE id = 'location_name'");
    console.log("Location Name:", locationName?.value);

    const admin = db.get<{ email: string }>("SELECT email FROM users WHERE role = 'Admin'");
    console.log("Admin Email:", admin?.email);

    if (setupStatus?.value === 'true' && locationName?.value === 'Test Resort' && admin?.email === 'test@resort.com') {
        console.log("TEST PASSED: ZTP executed successfully.");
    } else {
        console.error("TEST FAILED: Verification mismatch.");
    }

    // Cleanup
    // fs.rmSync(testDataDir, { recursive: true, force: true });
}

testBootstrap().catch(console.error);
