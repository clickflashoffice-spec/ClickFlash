// backend/middleware/auth.ts
// Session-based authentication middleware

import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { sendAuthError } from '../utils/errorHandler';
import { JWT_SECRET } from "../config/constants";
import AuditLogger from '../utils/auditLogger';

// JWT payload type
interface JwtUserPayload extends JwtPayload {
  id: string;
  email: string;
  role: string;
}

/**
 * Authentication Middleware
 *
 * Verifies user session and injects user context into requests.
 * Logs unauthorized access attempts for security auditing.
 */
export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
  auditLogger?: AuditLogger,
): boolean | void {
  const clientIp = req.socket.remoteAddress || "unknown";

  // Check if user is authenticated via session
  if (req.session && req.session.user) {
    req.user = req.session.user;
  }

  // Check Authorization Header (Bearer Token)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET as string) as JwtUserPayload;
      req.user = decoded; // { id, email, role, ... }
    } catch (err) {
      // Token invalid or expired
      if (auditLogger) {
        auditLogger.logUnauthorizedAccess(req.url, clientIp, "INVALID_TOKEN");
      }
    }
  }

  // 4.5. Apply E2E test bypass & role injection before returning
  if (process.env.TEST_E2E === "1") {
    // FORCE CEO role for all E2E requests so seeding and tests have full permissions
    if (req.user) {
      (req.user as any).role = "CEO";
    } else {
      req.user = { id: "e2e-bypass", email: "e2e@clickflash.local", role: "CEO" };
    }
    if (next) next();
    return true;
  }

  // If authenticated by either method, allow
  if (req.user) {
    if (next) next();
    return true;
  }

  // Special Case: Allow /api/files/* ONLY from authorized internal services (Service Token)
  // This replaces the vulnerable IP-based check (req.ip === '::1').
  // When invoked via global app.use('/api', ...) the path is relative so we
  // check both the full and the relative form.
  if (req.path.startsWith("/api/files/") || req.path.startsWith("/files/")) {
    const serviceToken = req.headers["x-service-token"];
    const internalSecret = process.env.SERVICE_SECRET;

    // Check if a valid Service Token is provided
    if (internalSecret && serviceToken === internalSecret) {
      if (next) next();
      return true;
    }

    // Log the blocked attempt
    if (auditLogger) {
      auditLogger.logUnauthorizedAccess(
        req.url,
        clientIp,
        "UNAUTHORIZED_FILE_ACCESS_ATTEMPT",
      );
    }
  }

  if (auditLogger) {
    auditLogger.logUnauthorizedAccess(req.url, clientIp, "NO_SESSION_OR_TOKEN");
  }
  sendAuthError(res, "Authentication required. Please log in.");
  return false;
}
