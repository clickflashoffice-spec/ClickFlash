// backend/routes/orders.ts
import express, { Request, Response, Router } from "express";
import fs from "fs-extra";
import path from "path";
import { DatabaseManager } from '../database/db';
import { customRoutesSchemas } from '../utils/validation';
import { Logger } from '../utils/logger';
import {
  sendError,
  sendNotFoundError,
  ERROR_CODES,
  sendInvalidInputError,
} from '../utils/errorHandler';
import { FulfillmentService } from "../services/FulfillmentService";
import { isAdminOrManager } from "../middleware/role";
import { SyncManager } from "../services/SyncManager";
import { LedgerService } from "../services/LedgerService";
import { OrderValidationService } from "../services/OrderValidationService";
import AuditLogger from '../utils/auditLogger';

import { strictRateLimiter } from '../middleware/rateLimiter';

interface OrdersContext {
  dbManager: DatabaseManager;
  logger: Logger;
  hardwareService: any;
  fulfillmentService: FulfillmentService;
  fulfillmentSlipService: any;
  syncManager: SyncManager;
  ledgerService: LedgerService;
  auditLogger: AuditLogger;
  orderValidationService?: OrderValidationService;
}

export default function orderRoutes(context: OrdersContext): Router {
  const { dbManager, logger, syncManager, auditLogger } = context;
  const router = express.Router();

  // Rule 15: Scalability - Server-Side Filtering & Pagination
  router.get("/", (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const search = req.query.search as string;
      const status = req.query.status as string;
      const dateFrom = req.query.dateFrom as string;
      const dateTo = req.query.dateTo as string;

      // Build Query
      let query = "SELECT * FROM orders WHERE 1=1";
      const params: any[] = [];

      if (search) {
        query +=
          " AND (clientName LIKE ? OR id LIKE ? OR orderNumber LIKE ? OR email LIKE ?)";
        const term = `%${search}%`;
        params.push(term, term, term, term);
      }

      if (status && status !== "All") {
        query += " AND status = ?";
        params.push(status);
      }

      if (dateFrom) {
        query += " AND created_at >= ?";
        params.push(dateFrom);
      }
      if (dateTo) {
        query += " AND created_at <= ?";
        params.push(dateTo);
      }

      const countQuery = query.replace("SELECT *", "SELECT COUNT(*) as total");
      const totalResult = dbManager.get<{ total: number }>(countQuery, params);
      const total = totalResult ? totalResult.total : 0;

      query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
      params.push(limit, offset);

      const orders = dbManager.query(query, params);

      const parsedOrders = orders.map((o: any) => ({
        ...o,
        items: typeof o.items === "string" ? JSON.parse(o.items) : o.items,
      }));

      res.json({
        data: parsedOrders,
        total: total,
        page: page,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error: any) {
      logger.error("Failed to list orders", error);
      sendError(
        res,
        500,
        "List Orders Error",
        error.message,
        ERROR_CODES.INTERNAL_ERROR,
      );
    }
  });

  /**
   * @route POST /
   * @description Create a new order (Standard/General)
   */
  router.post("/", strictRateLimiter, async (req: Request, res: Response) => {
    try {
      const parsed = customRoutesSchemas.kioskOrder.safeParse(req.body);
      if (!parsed.success) {
        return sendInvalidInputError(res, "Invalid order format", parsed.error.issues);
      }
      
      const {
        clientMutationId,
        clientDeviceId,
        items,
        clientName,
        email,
        total: _total,
        status,
        date,
        destinationId,
        photographerId,
        roomNumber,
        appliedDiscount,
        tipAmount,
      } = parsed.data;

      // Deduplication check
      const existing = dbManager.get<{ id: string }>(
        `SELECT id FROM orders WHERE client_mutation_id = ?`,
        [clientMutationId]
      );

      if (existing) {
        logger.info(`[Orders] Order deduplicated by clientMutationId`, {
          clientMutationId,
          existingId: existing.id,
        });
        return res.status(208).json({
          success: true,
          id: existing.id,
          deduplicated: true,
        });
      }

      const now = new Date().toISOString();
      const id = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

      // Calculate total server-side
      const safeDiscount = Math.max(0, Math.min(100, appliedDiscount || 0));
      const calculatedTotal = (items || []).reduce((sum: number, item: any) => {
        return sum + (Number(item.price) || 0) * (Number(item.quantity) || 1);
      }, 0) * (1 - safeDiscount / 100);

      dbManager.run(
        `INSERT INTO orders (
          id, clientName, email, total, status, items, date,
          destinationId, photographerId, roomNumber, appliedDiscount, tip_amount,
          client_mutation_id, client_device_id, mutation_timestamp, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          clientName || "",
          email || "",
          calculatedTotal,
          status || "Pending",
          JSON.stringify(items || []),
          date || now.split("T")[0],
          destinationId || "",
          photographerId || 0,
          roomNumber || "",
          appliedDiscount || 0,
          tipAmount || 0,
          clientMutationId,
          clientDeviceId || "",
          Date.now(),
          now,
          now,
        ]
      );

      // Broadcast
      if (syncManager) {
        syncManager.broadcastOrderStatus(id, status || "Pending", {
          clientName,
          email,
          total: calculatedTotal,
        });
      }

      logger.info(`[Orders] Order created via POST /api/orders`, { id, clientMutationId });
      res.status(201).json({ success: true, id });
    } catch (error: any) {
      logger.error("[Orders] Order creation failed", { error: error.message });
      sendError(res, 500, "Order Error", error.message, ERROR_CODES.INTERNAL_ERROR);
    }
  });

  /**
   * @route GET /by-credentials
   * @description Direct lookup for Gallery login (Pin/Email)
   */
  router.get("/by-credentials", (req: Request, res: Response) => {
    try {
      const pin = (req.query.pin as string) || (req.query.orderId as string);
      const email = (req.query.email as string)?.toLowerCase().trim();

      if (!pin || !email) {
        return sendError(
          res,
          400,
          "Missing Credentials",
          "PIN and Email are required",
          "MISSING_PARAMS",
        );
      }

      const order = dbManager.get(
        "SELECT * FROM orders WHERE id = ? AND LOWER(TRIM(email)) = ?",
        [pin, email],
      );

      if (!order) {
        return sendNotFoundError(res, "Order");
      }

      res.json({
        success: true,
        data: {
          ...order,
          items:
            typeof (order as any).items === "string"
              ? JSON.parse((order as any).items)
              : (order as any).items,
        },
      });
    } catch (error: any) {
      logger.error("Gallery credential lookup failed", error);
      sendError(
        res,
        500,
        "Lookup Error",
        error.message,
        ERROR_CODES.INTERNAL_ERROR,
      );
    }
  });

  // Law 14 Compliance: Replacing ZIP Browser Download with Push-to-Kiosk
  router.post("/:id/fulfillment/push", strictRateLimiter, async (req: Request, res: Response) => {
    const orderId = req.params.id as string;
    try {
      logger.info(`[Orders] Manual push-to-kiosk requested for ${orderId}`);

      // Law 07: Master initiates all transfers. Pushes to Kiosk orders folder via FulfillmentService.
      await context.fulfillmentService.broadcastStatusToKiosks(orderId);

      res.json({
        success: true,
        message:
          "Order pushed to Kiosk folders successfully. No browser download required (Law 14).",
      });
    } catch (error: any) {
      logger.error("Push to kiosk failed", { error: error.message });
      if (!res.headersSent)
        sendError(
          res,
          500,
          "Push Failed",
          error.message,
          ERROR_CODES.INTERNAL_ERROR,
        );
    }
  });

  // Rule 1.1c: Offline High-Res Printing (with Edits)
  router.post("/:id/print", strictRateLimiter, async (req: Request, res: Response) => {
    const orderId = req.params.id as string;
    const parsed = customRoutesSchemas.ordersPrint.safeParse(req.body);

    if (!parsed.success) return sendInvalidInputError(res, "Missing photoId");
    const { photoId, printerName } = parsed.data;

    try {
      logger.info(
        `[Print] Applying edits to ${photoId} for order ${orderId} before printing...`,
      );
      const processedPath =
        await context.fulfillmentService.processSinglePhoto(photoId);

      if (!fs.existsSync(processedPath)) {
        throw new Error("Processed photo not found on disk");
      }

      const jobId = await context.hardwareService.enqueuePrint(
        processedPath,
        printerName,
      );

      res.json({
        success: true,
        message: "Print job enqueued with latest edits",
        jobId,
        path: processedPath,
      });

      setTimeout(() => {
        context.fulfillmentService.cleanup(processedPath);
      }, 30000);
    } catch (error: any) {
      logger.error("[Print] Failed", { error: error.message });
      if (!res.headersSent)
        sendError(
          res,
          500,
          "Print Failed",
          error.message,
          ERROR_CODES.INTERNAL_ERROR,
        );
    }
  });

  // Rule 02: Serve assets from local order folder (Fix for Preview)
  router.get("/:id/assets", async (req: Request, res: Response) => {
    const orderId = req.params.id as string;
    const targetUrl =
      typeof req.query.url === "string"
        ? req.query.url
        : String(req.query.url || "");

    if (!targetUrl) return sendInvalidInputError(res, "Missing url parameter");

    try {
      const order = dbManager.get<{
        id: string;
        kioskId: string;
        orderNumber: string;
      }>("SELECT id, kioskId, orderNumber FROM orders WHERE id = ?", [orderId]);
      if (!order) return sendNotFoundError(res, "Order not found");

      if (!order.kioskId) {
        return sendNotFoundError(res, "Not a kiosk order");
      }

      const kiosk = dbManager.get<{ ordersFolderPath: string }>(
        "SELECT ordersFolderPath FROM kiosks WHERE id = ?",
        [order.kioskId],
      );
      if (!kiosk || !kiosk.ordersFolderPath) {
        return sendError(
          res,
          500,
          "Config Error",
          "Kiosk orders path not configured",
          ERROR_CODES.INTERNAL_ERROR,
        );
      }

      // Security: Sanitize filename to prevent path traversal
      let filename = path.basename(targetUrl);
      if (filename.includes("?")) filename = filename.split("?")[0];
      // Additional path traversal protection
      filename = filename.replace(/\.{2,}[\/\\]/g, "").replace(/[\/\\]/g, "");
      if (!filename || filename === "." || filename === "..") {
        return sendInvalidInputError(res, "Invalid filename");
      }

      const possiblePaths = [
        path.join(kiosk.ordersFolderPath, filename),
        path.join(
          kiosk.ordersFolderPath,
          `order-${order.orderNumber || orderId}`,
          filename,
        ),
        path.join(kiosk.ordersFolderPath, `${orderId}`, filename),
        path.join(kiosk.ordersFolderPath, String(orderId), String(filename)),
      ];

      let foundPath = null;
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          foundPath = p;
          break;
        }
      }

      if (foundPath) {
        const ext = path.extname(foundPath).toLowerCase();
        const mimeTypes: Record<string, string> = {
          ".jpg": "image/jpeg",
          ".jpeg": "image/jpeg",
          ".png": "image/png",
          ".gif": "image/gif",
          ".webp": "image/webp",
        };
        const contentType = mimeTypes[ext] || "application/octet-stream";

        res.writeHead(200, {
          "Content-Type": contentType,
          "Content-Disposition": "inline",
        });
        fs.createReadStream(foundPath).pipe(res);
      } else {
        logger.warn("Asset not found for order", {
          orderId,
          filename,
          searched: possiblePaths,
        });
        sendNotFoundError(res, "Asset file");
      }
    } catch (error: any) {
      logger.error("Failed to serve asset", error);
      sendError(
        res,
        500,
        "Asset Serve Error",
        error.message,
        ERROR_CODES.INTERNAL_ERROR,
      );
    }
  });

  router.patch(
    "/:id/status",
    isAdminOrManager,
    async (req: Request, res: Response) => {
      const orderId = req.params.id as string;
      const { status } = req.body;

      if (!status) return sendInvalidInputError(res, "Missing status");

      try {
        dbManager.run(
          "UPDATE orders SET status = ?, updated_at = ? WHERE id = ?",
          [status, new Date().toISOString(), orderId],
        );

        // Audit Log Data Access (P1)
        const auditUser = req.session?.user || req.user;
        auditLogger.logDataAccess(
          auditUser?.id || "unknown",
          auditUser?.email || "unknown",
          "UPDATE",
          "orders",
          orderId,
        );

        // 1. WebSocket Broadcast (Instant UI update)
        syncManager.broadcastOrderStatus(orderId, status);

        // 2. File-based Push (Adheres to Law 07 and User Feedback for Multi-Kiosk)
        await context.fulfillmentService.broadcastStatusToKiosks(orderId);

        // 3. Phase 41: Ledger Entry (Commission)
        if (status === "Completed") {
          try {
            const fullOrder = dbManager.get(
              "SELECT * FROM orders WHERE id = ?",
              [orderId],
            );
            if (fullOrder && fullOrder.photographerId) {
              const photographer = dbManager.get(
                "SELECT * FROM users WHERE id = ?",
                [fullOrder.photographerId],
              );
              if (photographer) {
                await context.ledgerService.recordOrderCommission(
                  fullOrder,
                  photographer,
                );
              }
            }

            // Phase 46: Automated Fulfillment (Receipts & Emails)
            // Trigger asynchronous post-validation actions
            context.orderValidationService?.handlePostValidationActions(orderId);
          } catch (ledgerError: any) {
            logger.error(
              `[Ledger] Failed to record commission for order ${orderId}`,
              ledgerError,
            );
            // Non-blocking error - don't fail the status update request
          }
        }

        res.json({
          success: true,
          message: "Order status updated and broadcasted",
        });
      } catch (error: any) {
        logger.error("Failed to update order status", error);
        sendError(
          res,
          500,
          "Update Status Error",
          error.message,
          ERROR_CODES.INTERNAL_ERROR,
        );
      }
    },
  );

  // Phase 29: Branded Production Slips
  router.post("/:id/slip", strictRateLimiter, async (req: Request, res: Response) => {
    const orderId = req.params.id as string;
    try {
      logger.info(`[Orders] Production slip requested for ${orderId}`);
      const slipPath =
        await context.fulfillmentSlipService.generateSlip(orderId);

      if (!fs.existsSync(slipPath)) {
        throw new Error("Generated slip not found");
      }

      // Send back the file and then clean up
      res.download(slipPath, `ProductionSlip_${orderId}.jpg`, async (err) => {
        if (err) logger.error(`[Orders] Failed to stream slip: ${err.message}`);
        await context.fulfillmentSlipService.cleanup(slipPath);
      });
    } catch (error: any) {
      logger.error("[Orders] Slip generation failed", { error: error.message });
      if (!res.headersSent)
        sendError(
          res,
          500,
          "Slip Generation Failed",
          error.message,
          ERROR_CODES.INTERNAL_ERROR,
        );
    }
  });

  /**
   * @route POST /kiosk/orders
   * @description Idempotent order creation from Touch Kiosks.
   * Deduplicates by client_mutation_id to prevent duplicate orders on retries.
   */
  router.post("/kiosk/orders", strictRateLimiter, async (req: Request, res: Response) => {
    try {
      const parsed = customRoutesSchemas.kioskOrder.safeParse(req.body);
      if (!parsed.success) {
        return sendInvalidInputError(res, "Invalid kiosk order format", parsed.error.issues);
      }
      
      const {
        clientMutationId,
        clientDeviceId,
        items,
        clientName,
        email,
        total,
        status,
        date,
        destinationId,
        photographerId,
        roomNumber,
        appliedDiscount,
        tipAmount,
      } = parsed.data;

      // Deduplication check
      const existing = dbManager.get<{ id: string }>(
        `SELECT id FROM orders WHERE client_mutation_id = ?`,
        [clientMutationId]
      );

      if (existing) {
        logger.info(`[Orders] Kiosk order deduplicated by clientMutationId`, {
          clientMutationId,
          existingId: existing.id,
        });
        return res.status(208).json({
          success: true,
          id: existing.id,
          deduplicated: true,
        });
      }

      const now = new Date().toISOString();
      const id = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

      // Calculate total server-side
      const safeDiscount = Math.max(0, Math.min(100, appliedDiscount || 0));
      const calculatedTotal = (items || []).reduce((sum: number, item: any) => {
        return sum + (Number(item.price) || 0) * (Number(item.quantity) || 1);
      }, 0) * (1 - safeDiscount / 100);

      dbManager.run(
        `INSERT INTO orders (
          id, clientName, email, total, status, items, date,
          destinationId, photographerId, roomNumber, appliedDiscount, tip_amount,
          client_mutation_id, client_device_id, mutation_timestamp, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          clientName || "",
          email || "",
          calculatedTotal,
          status || "Pending",
          JSON.stringify(items || []),
          date || now.split("T")[0],
          destinationId || "",
          photographerId || 0,
          roomNumber || "",
          appliedDiscount || 0,
          tipAmount || 0,
          clientMutationId,
          clientDeviceId || "",
          Date.now(),
          now,
          now,
        ]
      );

      // Broadcast to connected kiosks
      if (syncManager) {
        syncManager.broadcastOrderStatus(id, status || "Pending", {
          clientName,
          email,
          total,
        });
      }

      logger.info(`[Orders] Kiosk order created`, { id, clientMutationId });
      res.status(201).json({ success: true, id });
    } catch (error: any) {
      logger.error("[Orders] Kiosk order creation failed", { error: error.message });
      sendError(res, 500, "Kiosk Order Error", error.message, ERROR_CODES.INTERNAL_ERROR);
    }
  });

  return router;
}
