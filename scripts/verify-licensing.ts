import path from 'path';
import fs from 'fs';
import { generateEd25519KeyPair, generateEd25519License, verifyEd25519License } from '@clickflash/licensing';
import { DatabaseManager } from '../apps/master/backend/database/db';
import { LicenseService } from '../apps/master/backend/services/license-service';
import { Logger } from '../apps/master/backend/utils/logger';
import si from 'systeminformation';

async function run() {
    console.log("=== ClickFlash Licensing Flow Verification ===");
    const testDbPath = path.join(__dirname, 'test.db');
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);

    const dbManager = new DatabaseManager(testDbPath);
    dbManager.connect();
    
    // Create settings table
    dbManager.exec(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`);

    const logger = new Logger('Test');
    console.log("\n[1] Hardware Fingerprinting...");
    const uuidInfo = await si.uuid();
    const machineId = uuidInfo.os || uuidInfo.hardware || "UNKNOWN_MACHINE";
    console.log(`Hardware Machine ID: ${machineId}`);
    const testKeys = generateEd25519KeyPair();
    const licenseService = new LicenseService(dbManager, logger, 'http://localhost:8080', {
        publicKeyB64: testKeys.publicKey,
        getMachineId: async () => machineId,
    });

    console.log("\n[2] Generating License (Layer 1)...");
    const license = generateEd25519License({
        plan: 'pro',
        maxMasters: 5,
        expiresDays: 365,
        machineId: machineId // Bind to this machine
    }, testKeys.privateKey);

    console.log("\n[3] Simulating Installer Validation (Layer 3)...");
    const installerValidation = verifyEd25519License(license.key, testKeys.publicKey, { expectedMachineId: machineId });
    if (installerValidation.valid) {
        console.log("✅ Installer validation passed.");
    } else {
        console.error("❌ Installer validation failed:", installerValidation.error);
        process.exit(1);
    }

    console.log("\n[4] Simulating Master Portal Applying License...");
    const applySuccess = await licenseService.setLicenseKey(license.key);
    if (applySuccess) {
        console.log("✅ Master successfully persisted license via LicenseService.");
    } else {
        console.error("❌ Master failed to apply license.");
        process.exit(1);
    }

    console.log("\n[5] Verifying Local License Status...");
    const status = await licenseService.getLocalLicenseStatus();
    if (status.isValid && status.status === 'active') {
        console.log("✅ License is ACTIVE and valid in Master OS.");
    } else {
        console.error("❌ License status is invalid:", status);
        process.exit(1);
    }

    console.log("\n=== All Local Licensing Layers Passed Successfully! ===");
    dbManager.close();
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
}

run().catch(console.error);
