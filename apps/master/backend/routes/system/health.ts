// backend/routes/system/health.ts
import express, { Request, Response, Router } from "express";
import os from "os";
import { Logger } from "../../shared/logger";
import DatabaseManager from "../../shared/db";
import { sendInvalidInputError } from "../../shared/errorHandler";

interface HealthContext {
  dbManager: DatabaseManager;
  logger: Logger;
  networkMonitor?: any;
}

export default function healthRoutes(context: HealthContext): Router {
  const { dbManager, logger } = context;
  const router = express.Router();

  /**
   * @route GET /health
   * @description Simple health check with diagnostics
   */
  router.get("/", (req: Request, res: Response) => {
    res.json({
      code: 200,
      message: "API Online",
      timestamp: new Date().toISOString(),
      diagnostics: {
        ip: req.socket.remoteAddress,
        host: req.headers.host,
        networkThroughput: context.networkMonitor?.getStats().throughput || 0,
        csrfToken: (req.session as any)?.csrfToken || null,
      },
    });
  });

  /**
   * @route GET /ip
   * @description Network interface discovery
   */
  router.get("/ip", (_req: Request, res: Response) => {
    try {
      const results: { name: string; ip: string }[] = [];
      const nets = os.networkInterfaces();

      for (const name of Object.keys(nets)) {
        const interfaces = nets[name];
        if (interfaces) {
          for (const net of interfaces) {
            const isIPv4 = net.family === "IPv4" || (net.family as any) === 4;
            if (isIPv4 && !net.internal) {
              results.push({ name: name, ip: net.address });
            }
          }
        }
      }

      if (results.length === 0) {
        results.push({ name: "Loopback", ip: "127.0.0.1" });
      }

      res.json({ interfaces: results });
    } catch (error) {
      logger.error("IP discovery error", { error });
      res.json({ interfaces: [{ name: "Loopback", ip: "127.0.0.1" }] });
    }
  });

  /**
   * @route GET /kiosk-sessions
   */
  router.get("/kiosk-sessions", (_req: Request, res: Response) => {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const sessions = dbManager.query<{ kioskId: string }>(
        "SELECT kioskId FROM kiosk_sessions WHERE last_seen >= ?",
        [fiveMinutesAgo],
      );

      const activeKioskIds = sessions.map((s) => s.kioskId).filter(Boolean);
      res.json({ activeKioskIds });
    } catch (error: any) {
      logger.error("Failed to get kiosk sessions", { error: error.message });
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * @route POST /kiosk/heartbeat
   */
  router.post("/kiosk/heartbeat", (req: Request, res: Response) => {
    try {
      const { kioskId, status = "Active" } = req.body;

      if (!kioskId) {
        return sendInvalidInputError(res, "kioskId is required");
      }

      const now = new Date().toISOString();

      // Upsert session
      const session = dbManager.get(
        "SELECT id FROM kiosk_sessions WHERE kioskId = ?",
        [kioskId],
      );
      if (session) {
        dbManager.run(
          "UPDATE kiosk_sessions SET last_seen = ?, status = ? WHERE kioskId = ?",
          [now, status, kioskId],
        );
      } else {
        dbManager.run(
          "INSERT INTO kiosk_sessions (kioskId, startTime, last_seen, status) VALUES (?, ?, ?, ?)",
          [kioskId, now, now, status],
        );
      }

      // Also update main Kiosks table for redundancy
      try {
        dbManager.run(
          "UPDATE kiosks SET status = ?, lastHeartbeat = ? WHERE id = ?",
          ["Connected", now, kioskId],
        );
      } catch (e) { /* ignore */ }

      res.json({ success: true, timestamp: now });
    } catch (error: any) {
      logger.error("Heartbeat failed", { error: error.message });
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
}
