/**
 * Security middleware for Master App backend
 */

import type { Request, Response, NextFunction } from "express";
import helmet from "helmet";
// @ts-ignore — express-rate-limit types may not be installed
import rateLimit from "express-rate-limit";

// CSP for Electron app
// NOTE: 'unsafe-eval' is required for TensorFlow.js WebGL backend to function.
// TensorFlow.js uses dynamic code evaluation for WebGL shader compilation.
// In an Electron app with sandbox and contextIsolation enabled, this is acceptable.
const cspDirectives = {
  "default-src": ["'self'"],
  "script-src": ["'self'", "'unsafe-eval'"],
  "style-src": ["'self'", "'unsafe-inline'"],
  "img-src": ["'self'", "data:", "blob:"],
  "font-src": ["'self'"],
  "connect-src": ["'self'", "ws://localhost:*", "wss://localhost:*"],
  "frame-ancestors": ["'none'"],
  "base-uri": ["'self'"],
  "form-action": ["'self'"],
};

// Rate limiters
export const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5,
  message: {
    success: false,
    error: "Too many login attempts, please try again later",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (_req: any) => process.env.NODE_ENV === "development",
});

export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  message: { success: false, error: "Too many requests from this IP" },
  standardHeaders: true,
  legacyHeaders: false,
});

export const uploadLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    error: "Too many uploads, please try again later",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Helmet configuration
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: cspDirectives,
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "same-site" },
});

// Custom security middleware
export function securityMiddleware(
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=(self)",
  );
  res.removeHeader("X-Powered-By");
  next();
}
