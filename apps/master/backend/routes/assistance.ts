import { Router, Request, Response } from "express";
import { DatabaseManager } from "../shared/db";
import { Logger } from "../shared/logger";
import { sendError, ERROR_CODES } from "../shared/errorHandler";

export default function assistanceRoutes(context: any) {
  const router = Router();
  const dbManager: DatabaseManager = context.dbManager;
  const logger: Logger = context.logger;

  // GET /api/assistance - List pending requests
  router.get("/assistance", (_req: Request, res: Response) => {
    try {
      const requests = dbManager.query(
        "SELECT * FROM assistance_requests WHERE status = ? ORDER BY createdAt DESC",
        ["pending"],
      );
      res.json({ success: true, data: requests });
    } catch (error: any) {
      logger.error("Failed to fetch assistance requests", error);
      sendError(
        res,
        500,
        "DB Error",
        error.message,
        ERROR_CODES.INTERNAL_ERROR,
      );
    }
  });

  // POST /api/assistance - Create a new request
  router.post("/assistance", (req: Request, res: Response) => {
    const { kioskId, message, priority = "normal" } = req.body;

    if (!kioskId || !message) {
      return res
        .status(400)
        .json({ success: false, message: "kioskId and message are required" });
    }

    try {
      const id = `req_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const now = new Date().toISOString();

      dbManager.run(
        "INSERT INTO assistance_requests (id, kioskId, message, status, priority, createdAt) VALUES (?, ?, ?, ?, ?, ?)",
        [id, kioskId, message, "pending", priority, now],
      );

      logger.info(`New assistance request created: ${id}`, {
        kioskId,
        message,
      });

      // Broadcast via WebSocket if available
      if (context.wss) {
        const payload = JSON.stringify({
          type: "ASSISTANCE_REQUEST",
          payload: { id, kioskId, message, priority, createdAt: now },
        });
        context.wss.clients.forEach((client: any) => {
          if (client.readyState === 1) {
            client.send(payload);
          }
        });
      }

      res.status(201).json({ success: true, data: { id, status: "pending" } });
    } catch (error: any) {
      logger.error("Failed to create assistance request", error);
      sendError(
        res,
        500,
        "DB Error",
        error.message,
        ERROR_CODES.INTERNAL_ERROR,
      );
    }
  });

  // PATCH /api/assistance/:id - Resolve or dismiss
  router.patch("/assistance/:id", (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, resolvedBy } = req.body;

    if (!["resolved", "dismissed", "pending"].includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status" });
    }

    try {
      const now = new Date().toISOString();
      dbManager.run(
        "UPDATE assistance_requests SET status = ?, resolvedAt = ?, resolvedBy = ? WHERE id = ?",
        [status, status === "pending" ? null : now, resolvedBy || null, id],
      );

      logger.info(`Assistance request ${id} updated to ${status}`, {
        resolvedBy,
      });
      res.json({ success: true, message: `Request ${status}` });
    } catch (error: any) {
      logger.error("Failed to update assistance request", error);
      sendError(
        res,
        500,
        "DB Error",
        error.message,
        ERROR_CODES.INTERNAL_ERROR,
      );
    }
  });

  return router;
}
