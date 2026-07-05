import si from "systeminformation";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { logger } from '../utils/logger';

const ENV_PATH = path.join(__dirname, "../.env");

async function getMachineId(): Promise<string> {
    try {
        const [system, uuid, baseboard] = await Promise.all([
            si.system(),
            si.uuid(),
            si.baseboard(),
        ]);

        const components = [
            system.uuid,
            uuid.hardware,
            baseboard.serial,
            system.serial,
        ].filter(
            (v) =>
                v &&
                v !== "-" &&
                v !== "None" &&
                v.toLowerCase() !== "to be filled by o.e.m." &&
                v.trim().length > 0
        );

        if (components.length === 0) {
            components.push(uuid.os);
        }

        const rawId = components.join("|");
        return crypto.createHash("sha256").update(rawId).digest("hex");
    } catch (e) {
        logger.error("Error generating machine ID:", e);
        return "fallback-" + crypto.randomBytes(4).toString("hex");
    }
}

async function runProvisioning() {
    logger.info("--- ClickFlash Hardware Provisioning ---");
    
    const machineId = await getMachineId();
    logger.info(`- Generated Machine ID: ${machineId}`);

    let envContent = "";
    if (fs.existsSync(ENV_PATH)) {
        envContent = fs.readFileSync(ENV_PATH, "utf8");
    }

    const envConfig = dotenv.parse(envContent);
    
    if (envConfig.MACHINE_ID && envConfig.MACHINE_ID !== "station_test_local_01") {
        logger.info(`[Warning] MACHINE_ID already set to: ${envConfig.MACHINE_ID}`);
        logger.info("To re-provision, manually clear MACHINE_ID from .env");
    } else {
        const lines = envContent.split("\n");
        let machineIdFound = false;
        
        const updatedLines = lines.map(line => {
            if (line.startsWith("MACHINE_ID=")) {
                machineIdFound = true;
                return `MACHINE_ID=${machineId}`;
            }
            return line;
        });

        if (!machineIdFound) {
            updatedLines.push(`MACHINE_ID=${machineId}`);
        }

        fs.writeFileSync(ENV_PATH, updatedLines.join("\n"));
        logger.info(`- MACHINE_ID locked in .env`);
    }

    // Update settings table if DB exists
    const DB_PATH = path.join(__dirname, "../data/master.db");
    if (fs.existsSync(DB_PATH)) {
        try {
            const Database = require("better-sqlite3-multiple-ciphers");
            const db = new Database(DB_PATH);
            
            const existing = db.prepare("SELECT * FROM settings WHERE key = 'MACHINE_ID'").get();
            const now = new Date().toISOString();
            
            if (existing) {
                db.prepare("UPDATE settings SET value = ?, updated_at = ? WHERE key = 'MACHINE_ID'").run(machineId, now);
            } else {
                db.prepare("INSERT INTO settings (key, value, created_at, updated_at) VALUES ('MACHINE_ID', ?, ?, ?)").run(machineId, now, now);
            }
            logger.info("- MACHINE_ID synchronized with settings database.");
            db.close();
        } catch (e) {
            logger.info(`[Note] Could not update database directly (likely service is running). 
      Server will sync on next startup.`);
        }
    }

    logger.info("--- Provisioning Complete ---");
}

runProvisioning().catch(err => {
    logger.error("Provisioning Failed:", err);
    process.exit(1);
});
