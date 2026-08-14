import { Router } from "express";
import rateLimit from "express-rate-limit";
import { DatabaseManager } from "../database/db";
import { Logger } from "../utils/logger";
import os from "os";
import path from "path";
import fs from "fs";

const autoRegisterLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // limit each IP to 10 requests per windowMs
    message: "Too many auto-registration requests from this IP, please try again later"
});

export default function createAutoRegisterRouter(
    dbManager: DatabaseManager,
    logger: Logger
): Router {
    const router = Router();

    router.post("/auto-register", autoRegisterLimiter as any, async (req, res, next) => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader || authHeader !== `Bearer ${process.env.SERVICE_SECRET}`) {
                logger.warn(`Unauthorized auto-registration attempt from ${req.ip}`);
                res.status(401).json({ error: "Unauthorized: Invalid or missing ecosystem token" });
                return;
            }

            const { kioskId, hostname, ip } = req.body;

            if (!kioskId || !ip) {
                res.status(400).json({ error: "Missing required fields: kioskId, ip" });
                return;
            }

            logger.info(`Auto-registration request from Touch kiosk: ${hostname} (${ip})`);

            // Auto-generate local paths
            const basePath = path.join(os.homedir(), "Pictures", "ClickFlash", "Kiosks", kioskId);
            const uploadFolderPath = path.join(basePath, "uploads");
            const ordersFolderPath = path.join(basePath, "orders");

            [uploadFolderPath, ordersFolderPath].forEach(dir => {
                if (!fs.existsSync(dir)) {
                    try {
                        fs.mkdirSync(dir, { recursive: true });
                        logger.info(`Auto-created directory for kiosk ${kioskId}: ${dir}`);
                    } catch (e) {
                        logger.warn(`Failed to create kiosk dir: ${dir}`, { error: (e as Error).message });
                    }
                }
            });

            const db = dbManager.getDb();
            
            // Check if kiosk already exists
            const existingKiosk = db.prepare("SELECT * FROM kiosks WHERE id = ?").get(kioskId);

            if (!existingKiosk) {
                logger.info(`Registering new Touch kiosk: ${kioskId}`);
                const insertStmt = db.prepare(`
                    INSERT INTO kiosks (id, name, status, ipAddress, uploadFolderPath, ordersFolderPath, lastSeen, createdAt)
                    VALUES (?, ?, 'online', ?, ?, ?, datetime('now'), datetime('now'))
                `);
                insertStmt.run(kioskId, hostname || `Touch-${kioskId.substring(0, 4)}`, ip, uploadFolderPath, ordersFolderPath);
            } else {
                logger.info(`Updating existing Touch kiosk: ${kioskId}`);
                const updateStmt = db.prepare(`
                    UPDATE kiosks 
                    SET status = 'online', ipAddress = ?, uploadFolderPath = COALESCE(uploadFolderPath, ?), ordersFolderPath = COALESCE(ordersFolderPath, ?), lastSeen = datetime('now') 
                    WHERE id = ?
                `);
                updateStmt.run(ip, uploadFolderPath, ordersFolderPath, kioskId);
            }

            res.json({
                success: true,
                paired: true,
                masterPort: parseInt(process.env.PORT || '8090', 10),
                wsPort: parseInt(process.env.PORT || '8090', 10),
                paths: { uploadFolderPath, ordersFolderPath },
                message: "Kiosk auto-registered successfully"
            });
        } catch (error) {
            logger.error("Error during kiosk auto-registration:", {
                error: (error as Error).message,
                stack: (error as Error).stack
            });
            next(error);
        }
    });

    return router;
}
