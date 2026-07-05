import { Request, Response, NextFunction } from "express";
import { generateToken, validateToken } from "../utils/csrfStore";
import { sendAuthorizationError } from "../utils/errorHandler";
import { logger } from '../utils/logger';

/**
 * CSRF Protection Middleware
 */
export const csrfMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const session = req.session as any;

  // 1. Ensure session has a token AND it's still valid in our in-memory store
  // This allows recovery if the server restarts but the session persists
  if (
    !session.csrfToken ||
    !validateToken(session.csrfToken, session.user?.id || null)
  ) {
    session.csrfToken = generateToken(session.user?.id || null);
  }

  // 2. Set double-submit cookie
  res.cookie("XSRF-TOKEN", session.csrfToken, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  // 3. Skip validation for safe methods
  const safeMethods = ["GET", "HEAD", "OPTIONS"];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // 4. Skip validation for kiosk requests
  if (req.headers["x-kiosk-id"] && req.headers["x-signature"]) {
    return next();
  }

  // 5. Validate token from header
  const clientToken = req.headers["x-csrf-token"] as string;

  if (!clientToken || !validateToken(clientToken, session.user?.id || null)) {
    logger.warn(`[CSRF] Validation failed for ${req.method} ${req.url}.`);
    return sendAuthorizationError(res, "Invalid or missing CSRF token");
  }

  next();
};
