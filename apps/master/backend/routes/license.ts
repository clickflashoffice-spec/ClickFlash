import express, { Request, Response, Router } from "express";
import { strictRateLimiter } from "../middleware/rateLimiter";
import { LicenseService } from "../services/license-service";
import { z } from "zod";

const validateLicenseSchema = z.object({
  licenseKey: z.string().min(10, "Invalid license key format")
});

export default function licenseRoutes(context: any): Router {
  const { dbManager, logger } = context;
  const cloudApiUrl = (dbManager.get("SELECT value FROM settings WHERE key = 'cloud_url'") as {value: string})?.value || process.env.CLOUD_URL || 'http://localhost:8080';
  
  const router = express.Router();
  const licenseService = new LicenseService(dbManager, logger, cloudApiUrl);

  /**
   * @route GET /api/license/status
   * @desc Get the current license status of the Master OS
   */
  router.get("/status", strictRateLimiter, async (_req: Request, res: Response) => {
    try {
      const status = licenseService.getLocalLicenseStatus();
      res.json({
        success: true,
        status: {
          isValid: status.isValid,
          status: status.status,
          gracePeriodEndsAt: status.gracePeriodEndsAt,
          lastChecked: status.lastChecked,
          licenseKeyPrefix: status.licenseKey ? status.licenseKey.substring(0, 15) + "..." : null,
        }
      });
    } catch (err: any) {
      logger.error("[LicenseRoute] Error fetching status", { error: err.message });
      res.status(500).json({ success: false, error: "Internal Server Error" });
    }
  });

  /**
   * @route POST /api/license/validate
   * @desc Submits a new license key, verifies it locally and optionally with hub
   */
  router.post("/validate", strictRateLimiter, async (req: Request, res: Response) => {
    try {
      const result = validateLicenseSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ success: false, error: "Invalid request body format" });
      }

      const { licenseKey } = result.data;
      
      const setSuccess = await licenseService.setLicenseKey(licenseKey);
      if (!setSuccess) {
        return res.status(400).json({ success: false, error: "Invalid license checksum format" });
      }

      // Automatically trigger a hub sync if configured
      // The deskId / stationId isn't easily available from DB here, let's just grab 'desk_id' or use 'unknown'
      const deskIdRecord = dbManager.get("SELECT value FROM settings WHERE key = 'desk_id'") as {value: string} | undefined;
      const deskId = deskIdRecord ? JSON.parse(deskIdRecord.value) : 'unknown-desk';
      
      const isOnlineValid = await licenseService.verifyWithHub(deskId);

      res.json({
        success: true,
        isValid: isOnlineValid,
        message: isOnlineValid ? "License successfully verified and activated." : "License installed, but hub verification failed. Check connection."
      });

    } catch (err: any) {
      logger.error("[LicenseRoute] Error validating license", { error: err.message });
      res.status(500).json({ success: false, error: "Internal Server Error" });
    }
  });

  return router;
}
