// backend/routes/pairing.ts
// Touch Kiosk pairing routes — mDNS discovery, QR scan, and completion

import { Router, Request, Response } from "express";
import crypto from "crypto";
import { Logger } from "../shared/logger";
import { DatabaseManager } from "../shared/db";
import { customRoutesSchemas } from "../shared/validation";
import { sendValidationError } from "../shared/errorHandler";
import { TouchMdnsDiscovery as MdnsDiscovery } from "../services/mdnsDiscovery";

interface PairingContext {
  dbManager: DatabaseManager;
  logger: Logger;
  mdnsDiscovery: MdnsDiscovery;
  PORT: number;
}

interface QRPayload {
  deskId: string;
  ip: string;
  port: number;
  pairingToken: string;
  timestamp: number;
  version?: string;
}

export default function createPairingRouter(context: PairingContext): Router {
  const router = Router();
  const { dbManager, logger, mdnsDiscovery, PORT } = context;

  // ─────────────────────────────────────────────────────────────
  // POST /pairing/discover — Auto-discover masters via mDNS
  // ─────────────────────────────────────────────────────────────
  router.post("/pairing/discover", async (_req: Request, res: Response) => {
    try {
      const masters = await mdnsDiscovery.getMasters();
      logger.info("[Pairing] Discover request", { count: masters.length });

      res.json({
        success: true,
        count: masters.length,
        masters: masters.map((m: any) => ({
          name: m.name,
          host: m.host,
          port: m.port,
          addresses: m.addresses,
          deskId: m.txt?.deskId,
          version: m.txt?.version,
          status: m.txt?.status,
          latencyMs: m.latencyMs,
        })),
      });
    } catch (error: any) {
      logger.error("[Pairing] Discover error", { error: error.message });
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ─────────────────────────────────────────────────────────────
  // POST /pairing/scan-qr — Scan QR code from Master
  // ─────────────────────────────────────────────────────────────
  router.post("/pairing/scan-qr", (req: Request, res: Response) => {
    try {
      const validation = customRoutesSchemas.pairingScanQr.safeParse(req.body);
      if (!validation.success) {
        return sendValidationError(res, "Invalid pairing request", validation.error);
      }
      const { qrData } = validation.data;


      let payload: QRPayload;
      try {
        payload = JSON.parse(qrData);
      } catch {
        return res.status(400).json({
          success: false,
          message: "Invalid QR data format",
        });
      }

      // Validate required fields
      if (!payload.deskId || !payload.ip || !payload.pairingToken) {
        return res.status(400).json({
          success: false,
          message: "QR payload missing required fields (deskId, ip, pairingToken)",
        });
      }

      // Check token freshness (QR generated within last 5 minutes)
      const ageMs = Date.now() - (payload.timestamp || 0);
      if (ageMs > 5 * 60 * 1000) {
        return res.status(410).json({
          success: false,
          message: "QR code has expired. Please regenerate on Master.",
        });
      }

      logger.info("[Pairing] QR scanned", { deskId: payload.deskId, ip: payload.ip });

      res.json({
        success: true,
        deskId: payload.deskId,
        masterIp: payload.ip,
        port: payload.port || 8090,
        pairingToken: payload.pairingToken,
        version: payload.version,
      });
    } catch (error: any) {
      logger.error("[Pairing] Scan QR error", { error: error.message });
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ─────────────────────────────────────────────────────────────
  // POST /pairing/complete — Complete pairing with Master
  // ─────────────────────────────────────────────────────────────
  router.post("/pairing/complete", async (req: Request, res: Response) => {
    try {
      const validation = customRoutesSchemas.pairingComplete.safeParse(req.body);
      if (!validation.success) {
        return sendValidationError(res, "Invalid pairing complete request", validation.error);
      }
      const { masterIp, port, pairingToken, kioskId, kioskName } = validation.data;


      const masterPort = port || 8090;
      const protocol = req.secure ? "https" : "http";
      const confirmUrl = `${protocol}://${masterIp}:${masterPort}/api/pairing/confirm`;

      // Send pairingToken to Master /api/pairing/confirm
      logger.info("[Pairing] Completing with Master", { masterIp, port: masterPort });

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(confirmUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pairingToken,
          kioskId: kioskId || `TOUCH_${crypto.randomBytes(4).toString("hex").toUpperCase()}`,
          kioskName: kioskName || "Touch Kiosk",
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        logger.warn("[Pairing] Master confirm failed", { status: response.status, error: errBody.message });
        return res.status(response.status).json({
          success: false,
          message: errBody.message || `Master returned ${response.status}`,
        });
      }

      const confirmData = await response.json();
      const { kioskId: resolvedKioskId, hmacSecret } = confirmData;

      if (!hmacSecret) {
        return res.status(500).json({
          success: false,
          message: "Master did not return HMAC secret",
        });
      }

      // Store HMAC secret locally in settings
      dbManager.run(
        `INSERT OR REPLACE INTO settings (key, value, created_at, updated_at)
         VALUES (?, ?, ?, ?)`,
        [
          "pairing_config",
          JSON.stringify({
            kioskId: resolvedKioskId,
            hmacSecret,
            masterIp,
            masterPort,
            pairedAt: new Date().toISOString(),
          }),
          new Date().toISOString(),
          new Date().toISOString(),
        ]
      );

      // Test sync with a lightweight health ping
      const syncTest = await testSync(masterIp, masterPort, resolvedKioskId, hmacSecret);

      logger.info("[Pairing] Completed", {
        kioskId: resolvedKioskId,
        masterIp,
        syncTest,
      });

      res.json({
        success: true,
        kioskId: resolvedKioskId,
        masterIp,
        masterPort,
        syncTest,
      });
    } catch (error: any) {
      logger.error("[Pairing] Complete error", { error: error.message });
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ─────────────────────────────────────────────────────────────
  // GET /pairing/status — Check current pairing status
  // ─────────────────────────────────────────────────────────────
  router.get("/pairing/status", (_req: Request, res: Response) => {
    try {
      const setting = dbManager.get<{ value: string }>(
        "SELECT value FROM settings WHERE key = ?",
        ["pairing_config"]
      );

      if (!setting || !setting.value) {
        return res.json({
          success: true,
          paired: false,
          message: "Not paired with any Master",
        });
      }

      const config = JSON.parse(setting.value);
      res.json({
        success: true,
        paired: true,
        kioskId: config.kioskId,
        masterIp: config.masterIp,
        masterPort: config.masterPort,
        pairedAt: config.pairedAt,
      });
    } catch (error: any) {
      logger.error("[Pairing] Status error", { error: error.message });
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ─────────────────────────────────────────────────────────────
  // Helper: Test sync with Master using HMAC-signed request
  // ─────────────────────────────────────────────────────────────
  async function testSync(
    masterIp: string,
    masterPort: number,
    kioskId: string,
    hmacSecret: string
  ): Promise<boolean> {
    try {
      const timestamp = Date.now().toString();
      const payload = `${kioskId}:${timestamp}`;
      const signature = crypto.createHmac("sha256", hmacSecret).update(payload).digest("hex");

      const protocol = "http"; // LAN-only; HTTPS only if TLS explicitly enabled on Master
      const url = `${protocol}://${masterIp}:${masterPort}/api/health`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(url, {
        headers: {
          "X-Kiosk-Id": kioskId,
          "X-Kiosk-Signature": `sha256=${signature}`,
          "X-Kiosk-Timestamp": timestamp,
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);
      return res.ok;
    } catch (err: any) {
      logger.warn("[Pairing] Sync test failed", { error: err.message });
      return false;
    }
  }

  return router;
}
