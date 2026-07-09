import { Router } from "express";
import rateLimit from "express-rate-limit";
import { DatabaseManager } from "../database/db";
import { Logger } from "../utils/logger";

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
            const { kioskId, hostname, ip } = req.body;

            if (!kioskId || !ip) {
                res.status(400).json({ error: "Missing required fields: kioskId, ip" });
                return;
            }

            logger.info(`Auto-registration request from Touch kiosk: ${hostname} (${ip})`);

            const db = dbManager.getDb();
            
            // Check if kiosk already exists
            const existingKiosk = db.prepare("SELECT * FROM kiosks WHERE id = ?").get(kioskId);

            if (!existingKiosk) {
                logger.info(`Registering new Touch kiosk: ${kioskId}`);
                const insertStmt = db.prepare(`
                    INSERT INTO kiosks (id, name, status, ipAddress, lastSeen, createdAt)
                    VALUES (?, ?, 'online', ?, datetime('now'), datetime('now'))
                `);
                insertStmt.run(kioskId, hostname || `Touch-${kioskId.substring(0, 4)}`, ip);
            } else {
                logger.info(`Updating existing Touch kiosk: ${kioskId}`);
                const updateStmt = db.prepare(`
                    UPDATE kiosks 
                    SET status = 'online', ipAddress = ?, lastSeen = datetime('now') 
                    WHERE id = ?
                `);
                updateStmt.run(ip, kioskId);
            }

            res.json({
                success: true,
                paired: true,
                masterPort: parseInt(process.env.PORT || '8090', 10),
                wsPort: parseInt(process.env.PORT || '8090', 10),
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
