import { Router, Request, Response } from "express";
import fs from "fs";
import path from "path";
// @ts-ignore
import multer from "multer";
import { UPLOAD_DIR } from "../config/constants";
import { authMiddleware } from "../middleware/auth";

const requireRole = (roles: string[]) => {
    return (req: Request, res: Response, next: any) => {
        if (!req.user || !roles.includes((req.user as any).role)) {
            return res.status(403).json({ success: false, error: "Insufficient permissions" });
        }
        next();
    };
};

export default function settingsRoutes(context: any): Router {
    const router = Router();
    const { dbManager, logger } = context;

    const profilesDir = path.join(UPLOAD_DIR, 'profiles');
    if (!fs.existsSync(profilesDir)) {
        fs.mkdirSync(profilesDir, { recursive: true });
    }

    const storage = multer.diskStorage({
        destination: (_req: any, _file: any, cb: any) => {
            cb(null, profilesDir);
        },
        filename: (_req: any, file: any, cb: any) => {
            // Sanitize filename to prevent directory traversal
            const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '');
            cb(null, `${Date.now()}_${safeName}`);
        }
    });

    const upload = multer({ 
        storage,
        limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
        fileFilter: (_req: any, file: any, cb: any) => {
            const ext = path.extname(file.originalname).toLowerCase();
            if (ext !== '.icc' && ext !== '.icm') {
                return cb(new Error("Only .icc and .icm files are allowed"));
            }
            cb(null, true);
        }
    });

    // Get current ICC profile setting
    router.get("/icc-profile", authMiddleware as any, (_req: Request, res: Response) => {
        try {
            const setting = dbManager.get("SELECT value, updated_at FROM settings WHERE key = 'iccProfilePath'");
            if (setting && setting.value) {
                res.json({ success: true, profile: path.basename(setting.value), updatedAt: setting.updated_at });
            } else {
                res.json({ success: true, profile: null });
            }
        } catch (error) {
            logger.error("[Settings] Failed to get ICC profile", error);
            res.status(500).json({ success: false, error: "Internal Server Error" });
        }
    });

    // Upload new ICC profile
    router.post("/icc-profile", authMiddleware as any, requireRole(['admin', 'manager']), upload.single('profile'), (req: Request, res: Response) => {
        try {
            if (!req.file) {
                return res.status(400).json({ success: false, error: "No file uploaded" });
            }

            const iccProfilePath = req.file.path;
            const now = new Date().toISOString();

            // Check if key exists
            const existing = dbManager.get("SELECT id FROM settings WHERE key = 'iccProfilePath'");
            if (existing) {
                dbManager.run("UPDATE settings SET value = ?, updated_at = ? WHERE key = 'iccProfilePath'", [iccProfilePath, now]);
            } else {
                dbManager.run("INSERT INTO settings (key, value, created_at, updated_at) VALUES (?, ?, ?, ?)", ['iccProfilePath', iccProfilePath, now, now]);
            }

            logger.info(`[Settings] ICC profile updated: ${iccProfilePath}`);
            res.json({ success: true, message: "ICC profile uploaded successfully", profile: path.basename(iccProfilePath) });
        } catch (error: any) {
            logger.error("[Settings] Failed to upload ICC profile", error);
            res.status(500).json({ success: false, error: error.message || "Internal Server Error" });
        }
    });

    // Clear ICC profile
    router.delete("/icc-profile", authMiddleware as any, requireRole(['admin', 'manager']), (_req: Request, res: Response) => {
        try {
            const setting = dbManager.get("SELECT value FROM settings WHERE key = 'iccProfilePath'");
            if (setting && setting.value) {
                if (fs.existsSync(setting.value)) {
                    fs.unlinkSync(setting.value);
                }
                dbManager.run("DELETE FROM settings WHERE key = 'iccProfilePath'");
            }
            logger.info("[Settings] ICC profile cleared");
            res.json({ success: true, message: "ICC profile cleared" });
        } catch (error) {
            logger.error("[Settings] Failed to clear ICC profile", error);
            res.status(500).json({ success: false, error: "Internal Server Error" });
        }
    });

    // Get all system settings
    router.get("/", authMiddleware as any, (_req: Request, res: Response) => {
        try {
            const rows = dbManager.all("SELECT key, value FROM settings");
            const settings = rows.reduce((acc: Record<string, any>, row: any) => {
                try {
                    acc[row.key] = JSON.parse(row.value);
                } catch {
                    acc[row.key] = row.value;
                }
                return acc;
            }, {});
            res.json({ success: true, settings });
        } catch (error) {
            logger.error("[Settings] Failed to get system settings", error);
            res.status(500).json({ success: false, error: "Internal Server Error" });
        }
    });

    // Update system settings (merge)
    router.post("/", authMiddleware as any, requireRole(['admin', 'manager']), (req: Request, res: Response) => {
        try {
            const { settings } = req.body;
            if (!settings || typeof settings !== 'object') {
                return res.status(400).json({ success: false, error: "Invalid settings payload" });
            }

            const now = new Date().toISOString();
            dbManager.run("BEGIN TRANSACTION");

            for (const [key, value] of Object.entries(settings)) {
                const strValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
                const existing = dbManager.get("SELECT id FROM settings WHERE key = ?", [key]);
                
                if (existing) {
                    dbManager.run("UPDATE settings SET value = ?, updated_at = ? WHERE key = ?", [strValue, now, key]);
                } else {
                    dbManager.run("INSERT INTO settings (key, value, created_at, updated_at) VALUES (?, ?, ?, ?)", [key, strValue, now, now]);
                }
            }

            dbManager.run("COMMIT");
            logger.info("[Settings] System settings updated successfully");
            res.json({ success: true, message: "Settings saved successfully" });
        } catch (error) {
            dbManager.run("ROLLBACK");
            logger.error("[Settings] Failed to save system settings", error);
            res.status(500).json({ success: false, error: "Internal Server Error" });
        }
    });

    return router;
}
