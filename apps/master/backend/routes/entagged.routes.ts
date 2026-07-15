import { Router, Request, Response } from "express";
import { Logger } from "../utils/logger";
import DatabaseManager from "../database/db";
import { v4 as uuidv4 } from "uuid";

export default function createEntaggedRouter(context: { dbManager: DatabaseManager; logger: Logger }) {
    const router = Router();
    const { dbManager, logger } = context;

    // 1. Receive scan events from Entagged app or external barcode scanners over local network
    router.post("/scan", async (req: Request, res: Response) => {
        try {
            const { barcode, deviceId } = req.body;
            
            if (!barcode) {
                return res.status(400).json({ success: false, error: "Barcode is required" });
            }

            logger.info(`[Entagged] Received scan event: ${barcode} from ${deviceId || "unknown"}`);

            // Broadcast the barcode via websocket so the frontend (Studio app) can show it
            // or we could save it to a local state to tag the next incoming photo.
            // For now, we'll store it in an ephemeral state or event log in the DB
            
            try {
                // Ensure table exists (if we want to log hardware events)
                // dbManager.run(`INSERT INTO hardware_events (type, data, created_at) VALUES ('barcode', ?, ?)`, [barcode, new Date().toISOString()]);
            } catch (e) {
                // table might not exist, ignore for now
            }

            return res.json({ success: true, message: "Scan received" });
        } catch (error) {
            logger.error(`[Entagged] Error processing scan: ${(error as Error).message}`);
            return res.status(500).json({ success: false, error: "Internal server error" });
        }
    });

    // 2. Serve the roster for the Entagged app to download (Names, IDs, Barcodes)
    router.get("/roster", async (_req: Request, res: Response) => {
        try {
            const roster = dbManager.query("SELECT * FROM rosters ORDER BY name ASC");
            return res.json({ success: true, roster });
        } catch (error) {
            logger.error(`[Entagged] Error fetching roster: ${(error as Error).message}`);
            return res.status(500).json({ success: false, error: "Internal server error" });
        }
    });

    // 3. Sync roster (JSON payload)
    router.post("/roster/sync", async (req: Request, res: Response) => {
        try {
            const { roster } = req.body; // Expecting array of objects { name, barcode, rfidUid, roomNumber, metadata }

            if (!Array.isArray(roster)) {
                return res.status(400).json({ success: false, error: "Invalid payload. 'roster' must be an array." });
            }

            let inserted = 0;
            let updated = 0;

            dbManager.transaction(() => {
                for (const item of roster) {
                    // require at least a name and some identifier
                    if (!item.name || (!item.barcode && !item.rfidUid)) continue;
                    
                    // We'll match primarily on barcode, fallback to rfidUid
                    let existing = null;
                    if (item.barcode) {
                        existing = dbManager.get<{ id: string }>("SELECT id FROM rosters WHERE barcode = ?", [item.barcode]);
                    }
                    if (!existing && item.rfidUid) {
                        existing = dbManager.get<{ id: string }>("SELECT id FROM rosters WHERE rfidUid = ?", [item.rfidUid]);
                    }
                    
                    if (existing) {
                        dbManager.run(
                            "UPDATE rosters SET name = ?, rfidUid = ?, roomNumber = ?, barcode = ?, metadata = ?, updated_at = ? WHERE id = ?",
                            [
                                item.name,
                                item.rfidUid || null,
                                item.roomNumber || null,
                                item.barcode || null,
                                item.metadata ? JSON.stringify(item.metadata) : null,
                                new Date().toISOString(),
                                existing.id
                            ]
                        );
                        updated++;
                    } else {
                        dbManager.run(
                            "INSERT INTO rosters (id, name, rfidUid, roomNumber, barcode, metadata) VALUES (?, ?, ?, ?, ?, ?)",
                            [
                                item.id || uuidv4(),
                                item.name,
                                item.rfidUid || null,
                                item.roomNumber || null,
                                item.barcode || null,
                                item.metadata ? JSON.stringify(item.metadata) : null
                            ]
                        );
                        inserted++;
                    }
                }
            });

            logger.info(`[Entagged] Roster sync complete. Inserted: ${inserted}, Updated: ${updated}`);
            return res.json({ success: true, inserted, updated });
        } catch (error) {
            logger.error(`[Entagged] Error syncing roster: ${(error as Error).message}`);
            return res.status(500).json({ success: false, error: "Internal server error" });
        }
    });

    return router;
}
