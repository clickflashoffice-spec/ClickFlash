// backend/middleware/auth.ts
// Session-based authentication middleware

import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { sendAuthError } from "../shared/errorHandler";
import { JWT_SECRET } from "../config/constants";
import AuditLogger from "../shared/auditLogger";
import type { User } from "../types/shared";

// JWT payload type
interface JwtUserPayload extends JwtPayload {
  id: string;
  email: string;
  role: string;
}

// Extend Express Request interface to include session and user
declare module "express-session" {
  interface SessionData {
    user: User;
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: User | JwtUserPayload;
    }
  }
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

  // Public paths that don't require authentication
  // Note: This list is illustrative; explicit use of authMiddleware on routes is preferred over global middleware with exclusion list.
  // However, if used globally, this list is needed.
  // In current server.js structure, authMiddleware might be applied globally or per route.
  // Keeping logic for safety.
  const publicPaths = [
    "/api/health",
    "/api/mode",
    "/api/ip",
    "/api/auth/login",
    "/api/auth/logout",
    "/api/init/default-user",
  ];

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
