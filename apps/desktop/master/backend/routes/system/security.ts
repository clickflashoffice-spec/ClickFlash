// backend/routes/system/security.ts
import express, { Request, Response, Router } from "express";
import { Logger } from '../../utils/logger';
import DatabaseManager from '../../database/db';
import { verifyPassword, hashPassword } from '../../utils/passwordUtils';
import { sendInternalError, sendInvalidInputError, sendAuthError } from '../../utils/errorHandler';
import { strictRateLimiter } from '../../middleware/rateLimiter';
import { customRoutesSchemas } from '../../utils/validation';
interface SecurityContext {
  dbManager: DatabaseManager;
  logger: Logger;
  auditLogger?: any;
}

/**
 * Administrative Security Routes
 * Handles Master Station PIN verification and updates.
 */
export default function securityRoutes(context: SecurityContext): Router {
  const { dbManager, logger } = context;
  const router = express.Router();

  /**
   * @route POST /verify-pin
   * @desc Verify the administrative PIN
   */
  router.post("/verify-pin", strictRateLimiter, async (req: Request, res: Response) => {
    try {
      const parsed = customRoutesSchemas.securityVerifyPin.safeParse(req.body);
      if (!parsed.success) {
        return sendInvalidInputError(res, "PIN is required");
      }
      const { pin } = parsed.data;

      const row = dbManager.get<{ value: string }>(
        "SELECT value FROM settings WHERE key = 'admin_pin_hash'"
      );

      if (!row || !row.value) {
        logger.error("[Security] Admin PIN hash missing from database");
        return sendInternalError(res, "Security configuration missing");
      }

      const isValid = await verifyPassword(String(pin), row.value);

      if (context.auditLogger) {
        context.auditLogger.log("ADMIN_PIN_VERIFY", {
          success: isValid,
          actor: req.user?.email ?? "system",
        });
      }

      if (isValid) {
        res.json({ success: true, message: "PIN verified" });
      } else {
        logger.warn("[Security] Failed admin PIN attempt", { 
          actor: req.user?.email ?? "system" 
        });
        sendAuthError(res, "Invalid PIN");
      }
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      logger.error("[Security] PIN verification error", error);
      sendInternalError(res, error.message);
    }
  });

  /**
   * @route POST /update-pin
   * @desc Update the administrative PIN (requires current PIN verification)
   */
  router.post("/update-pin", strictRateLimiter, async (req: Request, res: Response) => {
    try {
      const parsed = customRoutesSchemas.securityUpdatePin.safeParse(req.body);
      if (!parsed.success) {
        return sendInvalidInputError(res, "Current and new PIN required");
      }
      const { currentPin, newPin } = parsed.data;

      if (String(newPin).length < 4) {
        return sendInvalidInputError(res, "New PIN must be at least 4 characters");
      }

      // Verify current PIN
      const row = dbManager.get<{ value: string }>(
        "SELECT value FROM settings WHERE key = 'admin_pin_hash'"
      );

      if (!row || !row.value) {
        return sendInternalError(res, "Security configuration missing");
      }

      const isCurrentValid = await verifyPassword(String(currentPin), row.value);
      if (!isCurrentValid) {
        return sendAuthError(res, "Current PIN is incorrect");
      }

      // Hash and update
      const newHash = await hashPassword(String(newPin));
      dbManager.run(
        "UPDATE settings SET value = ? WHERE key = 'admin_pin_hash'",
        [newHash]
      );

      if (context.auditLogger) {
        context.auditLogger.log("ADMIN_PIN_UPDATE", {
          actor: req.user?.email ?? "system",
        });
      }

      logger.info("[Security] Administrative PIN updated");
      res.json({ success: true, message: "PIN updated successfully" });
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      logger.error("[Security] PIN update error", error);
      sendInternalError(res, error.message);
    }
  });

  return router;
}
