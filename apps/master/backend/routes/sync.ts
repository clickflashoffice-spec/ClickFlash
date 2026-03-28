// backend/routes/sync.ts
import express, { Request, Response, Router } from "express";
import { SyncManager } from "../services/SyncManager";
import { Logger } from "../shared/logger";
import { sendError, ERROR_CODES } from "../shared/errorHandler";
import { validate } from "../middleware/validate";
import { mutationSchema } from "../schemas/auth";
import { strictRateLimiter } from "../shared/rateLimiter";

import { DatabaseManager } from "../shared/db";
import { lanSigningMiddleware } from "../shared/lanSigningMiddleware";

interface SyncContext {
  syncManager: SyncManager;
  logger: Logger;
  dbManager: DatabaseManager;
}

export default function syncRoutes(context: SyncContext): Router {
  const { syncManager, logger, dbManager } = context;
  const router = express.Router();
  const verifyLanRequest = lanSigningMiddleware(dbManager, logger);

  /**
   * @route POST /sync/mutation
   * @description HTTP Fallback for OfflineQueue mutations (when WebSocket is unstable)
   * Phase 52: Opt-in HMAC-SHA256 LAN signing — enforced when x-kiosk-id header is present.
   */
  router.post(
    "/sync/mutation",
    strictRateLimiter,
    validate(mutationSchema),
    verifyLanRequest,

    async (req: Request, res: Response) => {
      try {
        const payload = req.body;
        const clientId =
          payload.clientId || req.headers["x-client-id"] || "http-fallback";
        await syncManager.handleMutation(payload, clientId);
        res.json({ success: true });
      } catch (error: any) {
        logger.error("[SyncRoute] Mutation failed", { error: error.message });
        sendError(
          res,
          500,
          "Sync Failed",
          error.message,
          ERROR_CODES.INTERNAL_ERROR,
        );
      }
    },
  );

  return router;
}
