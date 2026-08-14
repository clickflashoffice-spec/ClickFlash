import { Router } from "express";
import { getOrCreateManagedIdentity, rotateManagedIdentity } from "../config/tlsIdentityService";
import { authMiddleware } from "../middleware/auth";
import { sendInternalError } from "../utils/errorHandler";

export default function tlsRoutes(context: any): Router {
  const router = Router();

  // GET /api/tls/identity
  router.get("/identity", authMiddleware, (_req, res) => {
    try {
      const identity = getOrCreateManagedIdentity();
      res.json({
        fingerprintSha256: identity.fingerprintSha256,
      });
    } catch (err) {
      context.logger.error("[TLS Routes] Failed to retrieve TLS identity", err);
      sendInternalError(res, err);
    }
  });

  // POST /api/tls/rotate
  router.post("/rotate", authMiddleware, (_req, res) => {
    try {
      const newIdentity = rotateManagedIdentity();
      context.logger.info("[TLS Routes] Managed TLS Identity rotated via API");
      res.json({
        fingerprintSha256: newIdentity.fingerprintSha256,
        message: "TLS identity rotated successfully. Application restart may be required for clients."
      });
    } catch (err) {
      context.logger.error("[TLS Routes] Failed to rotate TLS identity", err);
      sendInternalError(res, err);
    }
  });

  return router;
}
