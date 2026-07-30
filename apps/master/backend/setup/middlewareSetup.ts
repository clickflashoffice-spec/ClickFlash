import express, { Application, Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";

import { createSessionMiddleware } from "../middleware/session";
import { csrfMiddleware } from "../middleware/csrf";
import { authMiddleware } from "../middleware/auth";
import rateLimiter, { userRateLimiter } from "../middleware/rateLimiter";
import { createMutationAuditMiddleware } from "../middleware/mutationAudit";
import { ALLOWED_ORIGINS } from "../config/constants";

export function setupExpressMiddleware(app: Application, context: any): void {
  const { logger, auditLogger } = context;
  const isDev = process.env.NODE_ENV === "development";

  // Body Parsers
  const jsonParser = express.json({ limit: "50mb" });
  const urlencodedParser = express.urlencoded({ extended: true, limit: "50mb" });

  app.use((req: Request, res: Response, next: NextFunction) => {
    const contentType = req.headers["content-type"] || "";

    if (
      req.method === "GET" ||
      req.method === "HEAD" ||
      req.method === "OPTIONS"
    ) {
      return next();
    }

    if (
      contentType.includes("multipart/form-data") ||
      contentType.includes("application/octet-stream")
    ) {
      next(); // Skip body parsing for formidable
    } else if (contentType.includes("application/json")) {
      jsonParser(req, res, (err) => {
        if (err) {
          logger.error("[BodyParser] JSON parse error", {
            url: req.url,
            error: err instanceof Error ? err.message : String(err),
          });
          return next(err);
        }
        next();
      });
    } else {
      urlencodedParser(req, res, next);
    }
  });

  // Security Headers (Helmet)
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            "'unsafe-inline'",
            "'unsafe-eval'",
            "http://localhost:*",
            "http://127.0.0.1:*",
          ],
          styleSrc: ["'self'", "'unsafe-inline'"],
          fontSrc: ["'self'", "data:"],
          connectSrc: isDev
            ? [
                "'self'",
                "ws://localhost:*",
                "http://localhost:*",
                "ws://127.0.0.1:*",
                "http://127.0.0.1:*",
                "ws://*:*",
                "http://*:*",
                "https://*.clickflash.photo",
              ]
            : [
                "'self'",
                "ws://localhost:*",
                "http://localhost:*",
                "http://127.0.0.1:*",
                "https://*.clickflash.photo",
              ],
          imgSrc: ["'self'", "data:", "blob:", "http:", "https:"],
          workerSrc: ["'self'", "blob:"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'self'"],
          upgradeInsecureRequests: null,
        },
      },
      hsts: isDev
        ? false
        : {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true,
          },
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );

  app.use(cookieParser());
  app.use(createSessionMiddleware());
  app.use(csrfMiddleware);

  // Global API auth — protects all /api/* routes that are not explicitly public
  const PUBLIC_API_PREFIXES = [
    "/auth",              // login, logout, QR session, magic-link
    "/health",            // health check (federated diagnostics)
    "/gallery-auth",      // gallery client authentication
    "/gallery-checkout",  // Stripe / payment webhook
    "/gallery",           // watermarked image serving
    "/pairing",           // kiosk initial pairing handshake
    "/v1/pairing",        // v1 kiosk pairing handshake
    "/v1/kiosks",         // auto-register kiosks
    "/v1/mobile-capture", // paired Android capture transport (route-level HMAC)
    "/assistance",        // kiosk → master assistance calls
    "/notification",      // kiosk → master notification push
  ];
  app.use("/api", (req: Request, res: Response, next: NextFunction) => {
    if (req.method === "OPTIONS") return next();
    const isPublic = PUBLIC_API_PREFIXES.some(
      (p) => req.path === p || req.path.startsWith(p + "/"),
    );
    if (isPublic) return next();
    authMiddleware(req, res, next, auditLogger);
  });

  // CORS — Strict origin whitelist
  app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
    }

    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PATCH, PUT, DELETE, OPTIONS",
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Requested-With, X-CSRF-Token, Cache-Control, X-Kiosk-Id, X-ClickFlash-Device-Id, X-ClickFlash-Timestamp, X-ClickFlash-Nonce, X-ClickFlash-Idempotency-Key, X-ClickFlash-Content-Sha256, X-ClickFlash-Asset-Sha256, X-ClickFlash-Asset-Size, X-ClickFlash-Offset, X-ClickFlash-Asset-Role, X-ClickFlash-Filename, X-ClickFlash-Signature",
    );

    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
    next();
  });

  // Rate Limiters
  app.use(rateLimiter);
  app.use(userRateLimiter);

  // Mutation Audit
  app.use(createMutationAuditMiddleware(auditLogger));

  // Request & Response Logging
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    if (req.url.startsWith("/api/")) {
      logger.info(`[Request] ${req.method} ${req.url}`);

      res.on("finish", () => {
        const duration = Date.now() - start;
        const level = res.statusCode >= 400 ? "warn" : "info";
        logger[level](
          `[Response] ${req.method} ${req.url} ${res.statusCode} (${duration}ms)`,
        );
      });
    }
    next();
  });
}
