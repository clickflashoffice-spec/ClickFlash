import express, { Request, Response, Router } from "express";
import formidable from "formidable";
import crypto from "crypto";
import fs from "fs";
import { IMPORT_DIR } from "../config/constants";
import { logger } from "../utils/logger";
import { sendInvalidInputError, sendInternalError } from "../utils/errorHandler";
import { PhotoProcessor } from "../services/photoProcessor";
import DatabaseManager from "../database/db";

interface BridgeContext {
    logger: typeof logger;
    dbManager: DatabaseManager;
    photoProcessor: PhotoProcessor;
    realtimeService?: any;
    syncManager?: any;
}

export default function bridgeRoutes(context: BridgeContext): Router {
    const router = express.Router();
    const { dbManager, photoProcessor, syncManager } = context;

    // Fast-path PSK Authentication Middleware
    const requireBridgeAuth = (req: Request, res: Response, next: express.NextFunction) => {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ error: "UNAUTHORIZED", message: "Missing or invalid authorization header" });
        }

        const token = authHeader.substring(7);
        const settingsRow = dbManager.get<{ value: string }>("SELECT value FROM settings WHERE key = 'bridge_psk'");
        
        // If PSK is not set in DB yet, fallback to a default or require setup
        const expectedToken = settingsRow?.value || process.env.BRIDGE_PSK || "default_bridge_token_123";

        if (token !== expectedToken) {
            return res.status(403).json({ error: "FORBIDDEN", message: "Invalid bridge token" });
        }

        next();
    };

    /**
     * @route GET /api/bridge/status
     * @description Heartbeat for Mobile (Android/iOS) apps to verify connectivity and PSK.
     */
    router.get("/status", requireBridgeAuth, (_req: Request, res: Response) => {
        res.json({ 
            status: "online", 
            message: "Master Bridge Receiver Ready",
            timestamp: new Date().toISOString()
        });
    });

    /**
     * @route POST /api/bridge/approve-cash
     * @description Endpoint for Mobile Staff app to confirm/approve cash payment for a gallery order.
     */
    router.post("/approve-cash", requireBridgeAuth, async (req: Request, res: Response) => {
        try {
            const { orderId } = req.body;
            if (!orderId) {
                sendInvalidInputError(res, "Missing orderId");
                return;
            }

            const order = dbManager.get<any>("SELECT * FROM gallery_orders WHERE id = ?", [orderId]);
            if (!order) {
                res.status(404).json({ error: "ORDER_NOT_FOUND", message: "Order not found" });
                return;
            }

            if (order.status !== "awaiting_cash" && order.status !== "pending") {
                res.status(400).json({ error: "INVALID_STATE", message: `Order status is ${order.status}, expected awaiting_cash or pending` });
                return;
            }

            // Update order status to paid
            dbManager.run("UPDATE gallery_orders SET status = 'paid' WHERE id = ?", [orderId]);

            const tokenRecord = dbManager.get<any>("SELECT albumId FROM gallery_tokens WHERE id = ?", [order.tokenId]);

            logger.info(`[BridgeApproveCash] Order ${orderId} marked as paid via Cash confirmation by staff`);

            // Broadcast status update to Kiosks & Customer Gallery
            if (context.realtimeService && typeof context.realtimeService.broadcastOrderUpdate === "function") {
                context.realtimeService.broadcastOrderUpdate({ id: orderId, status: "paid", albumId: tokenRecord?.albumId });
            }
            if (syncManager && typeof syncManager.broadcastUpdate === "function") {
                syncManager.broadcastUpdate({
                    type: "STATE_UPDATE",
                    clientId: "MASTER",
                    timestamp: Date.now(),
                    entity: "orders",
                    action: "cash_approved",
                    data: { id: orderId, status: "paid", albumId: tokenRecord?.albumId }
                }, "MASTER");
            }

            res.json({ success: true, orderId, status: "paid" });
        } catch (err: any) {
            logger.error("[BridgeApproveCash] Error approving cash payment", { error: err.message });
            sendInternalError(res, `Cash approval failed: ${err.message}`);
        }
    });

    /**
     * @route POST /api/bridge/upload
     * @description Ultra-fast REST endpoint for tethered/wireless Mobile (Android/iOS) uploads.
     */
    router.post("/upload", requireBridgeAuth, (req: Request, res: Response) => {
        // Ensure the import directory exists for temporary staging
        if (!fs.existsSync(IMPORT_DIR)) {
            fs.mkdirSync(IMPORT_DIR, { recursive: true });
        }

        const form = formidable({
            uploadDir: IMPORT_DIR,
            keepExtensions: true,
            maxFileSize: 100 * 1024 * 1024, // Allow up to 100MB for raw/large JPGs
        });

        form.parse(req, async (err, fields, files) => {
            if (err) {
                logger.error("[BridgeUpload] Form parse error", { error: err.message });
                sendInternalError(res, `Upload failed: ${err.message}`);
                return;
            }

            try {
                const fileArr = files.photo;
                const file = Array.isArray(fileArr) ? fileArr[0] : fileArr;

                if (!file) {
                    sendInvalidInputError(res, "No photo file provided in 'photo' field");
                    return;
                }

                // Optional fields
                const albumId = Array.isArray(fields.albumId) ? fields.albumId[0] : fields.albumId;
                const photographerId = Array.isArray(fields.photographerId) ? fields.photographerId[0] : fields.photographerId;
                
                const photoId = crypto.randomUUID();
                const filePath = (file as any).filepath;

                // Fast duplication check via hash
                const fileBuffer = await fs.promises.readFile(filePath);
                const fileHash = crypto.createHash("sha256").update(fileBuffer).digest("hex");

                const existingPhoto = dbManager.get(
                    "SELECT id, album_id FROM photos WHERE file_hash = ?",
                    [fileHash]
                );

                if (existingPhoto) {
                    logger.warn(`[BridgeUpload] Duplicate photo received. Hash: ${fileHash.substring(0, 8)}...`);
                    // Clean up duplicate temp file
                    await fs.promises.unlink(filePath).catch(() => {});
                    return res.status(409).json({ 
                        error: "DUPLICATE_PHOTO", 
                        message: "Photo already exists",
                        photoId: existingPhoto.id
                    });
                }

                // If album ID provided, ensure it exists; if not, you could create it or throw error
                if (albumId) {
                    const albumExists = dbManager.get("SELECT 1 FROM albums WHERE id = ?", [albumId]);
                    if (!albumExists) {
                        logger.warn(`[BridgeUpload] Album ${albumId} not found, creating placeholder...`);
                        dbManager.run(
                            "INSERT INTO albums (id, title, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
                            [albumId, `Bridge Session ${new Date().toLocaleDateString()}`, "active", new Date().toISOString(), new Date().toISOString()]
                        );
                    }
                }

                logger.info(`[BridgeUpload] Starting processing for photo ${photoId} (Album: ${albumId || 'none'})`);

                // Delegate to PhotoProcessor (handles DB insertion, thumbnails, AI indexing, and WebSockets)
                const finalAlbumId = albumId || "bridge_default_album";
                const photoData = await photoProcessor.processPhoto(
                    file as any,
                    finalAlbumId,
                    photoId
                );

                // Optionally attach photographerId if provided
                if (photographerId) {
                    dbManager.run("UPDATE photos SET photographerId = ? WHERE id = ?", [photographerId, photoId]);
                }

                // AI Auto-Culling (Async)
                const { AICullingService } = require('../services/aiCullingService');
                const aiCulling = new AICullingService(dbManager);
                aiCulling.analyzePhoto(photoId, photoData.storagePath).catch((e: any) => logger.error(`[BridgeUpload] AI Culling failed for ${photoId}:`, e));

                res.status(201).json({
                    success: true,
                    photo: photoData
                });

            } catch (procErr: any) {
                logger.error("[BridgeUpload] Processing error", procErr);
                sendInternalError(res, `Processing failed: ${procErr.message}`);
            }
        });
    });

    return router;
}
