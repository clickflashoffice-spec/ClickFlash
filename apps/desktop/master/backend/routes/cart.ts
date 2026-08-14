import express, { Request, Response, Router } from "express";
import { Logger } from '../utils/logger';
import DatabaseManager from '../database/db';

interface CartContext {
  dbManager: DatabaseManager;
  logger: Logger;
}

export default function cartRoutes(context: CartContext): Router {
  const { dbManager, logger } = context;
  const router = express.Router();

  /**
   * Snapshot cart for abandoned cart recovery
   */
  router.post("/snapshot", async (req: Request, res: Response) => {
    try {
      const { email, albumId, items, total, sessionId } = req.body;

      if (!email || !sessionId) {
        return res.status(400).json({ error: "Missing email or sessionId" });
      }

      // Upsert into orders with status 'Pending' for abandoned cart tracking
      // Prefix with CART_ to distinguish from real orders until checked out
      const orderId = `CART_${sessionId}`;
      const today = new Date().toISOString().split("T")[0];
      const now = new Date().toISOString();

      const existing = dbManager.get("SELECT id FROM orders WHERE id = ?", [orderId]);

      if (existing) {
        dbManager.run(
          `UPDATE orders SET items = ?, total = ?, updatedAt = ? WHERE id = ?`,
          [JSON.stringify(items), total, now, orderId]
        );
      } else {
        dbManager.run(
          `INSERT INTO orders (
            id, date, clientName, email, customerEmail, status, total,
            source, albumId, items, created_at, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            orderId,
            today,
            "Online Customer",
            email,
            email,
            "Pending",
            total,
            "gallery",
            albumId || null,
            JSON.stringify(items),
            now,
            now
          ]
        );
      }

      res.json({ success: true });
    } catch (error: any) {
      logger.error("[Cart] Failed to snapshot cart", { error: error.message });
      res.status(500).json({ error: "Internal server error" });
    }
  });

  /**
   * Mark cart recovered
   */
  router.post("/recovered", async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.body;
      if (!sessionId) {
        return res.status(400).json({ error: "Missing sessionId" });
      }

      const orderId = `CART_${sessionId}`;
      
      // We can delete the pending cart order, or mark it as 'Recovered'
      dbManager.run("UPDATE orders SET status = 'Recovered' WHERE id = ?", [orderId]);

      res.json({ success: true });
    } catch (error: any) {
      logger.error("[Cart] Failed to mark cart recovered", { error: error.message });
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
}
