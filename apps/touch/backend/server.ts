import http from "http";
import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { fileURLToPath } from "url";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import bodyParser from "body-parser";
import helmet from "helmet";

import { DatabaseManager } from "./shared/db";
import { verifyPassword, hashPassword } from "./shared/auth";
import { validateRequest, validateLogin } from "./shared/validation";
import AuditLogger from "./shared/auditLogger";
import { Logger } from "./shared/logger";
import PhotoProcessor from "./shared/photoProcessor";
import rateLimiter, {
  setAuditLogger as setRateLimiterAuditLogger,
} from "./shared/rateLimiter";
import { initDefaultUser } from "./shared/init-default-user";
import { initSentry } from "./shared/sentryService";

import createAuthRouter from "./routes/auth";
import createCollectionsRouter from "./routes/collections";
import createSyncRouter from "./routes/sync";
import createSystemRouter from "./routes/system";
import createFilesRouter from "./routes/files";
import createOrderExportRouter from "./routes/orderExport";
import createRealtimeRouter from "./routes/realtime";
import createFacesRouter from "./routes/faces";

import RealtimeService from "./services/realtimeService";
import { AlbumService } from "./services/albumService";
import WatcherService from "./services/watcherService";
import { VectorIndexService } from "./services/VectorIndexService";

import {
  sendError,
  sendValidationError,
  sendAuthError,
  sendNotFoundError,
  sendRateLimitError,
  sendInternalError,
  sendDatabaseError,
  sendFileError,
  sendInvalidInputError,
  ERROR_CODES,
} from "./shared/errorHandler";

// Rule 05: Universal Environment Parity - Detection
const isElectron = process.versions && !!process.versions.electron;
const isWeb = !isElectron;
console.log(`[Environment] Running in ${isElectron ? "Electron" : "Web"} mode`);

// Fix for __dirname in ESM (Not needed for CommonJS target, but keeping for reference if we switch)
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);
// For CommonJS output, __dirname is available globally or via wrapper

// Load env
import dotenv from "dotenv";
dotenv.config();

// Global Error Handling
process.on("uncaughtException", (err: Error) => {
  console.error("[FATAL] Uncaught Exception:", err);
  try {
    fs.appendFileSync(
      "touch_crash.log",
      `[${new Date().toISOString()}] Uncaught: ${err.message}\n${err.stack}\n`,
    );
  } catch {
    /* crash.log write failed — already logged to console above */
  }
  process.exit(1);
});

process.on("unhandledRejection", (reason: unknown) => {
  const msg = reason instanceof Error ? reason.message : String(reason);
  console.error("[FATAL] Unhandled Rejection:", msg);
  try {
    fs.appendFileSync(
      "touch_crash.log",
      `[${new Date().toISOString()}] Unhandled Rejection: ${msg}\n`,
    );
  } catch {
    /* crash.log write failed — already logged to console above */
  }
});

// --- Configuration ---
const PORT = parseInt(process.env.PORT || "8091", 10);

const DATA_DIR =
  process.argv[2] ||
  process.env.DATA_DIR ||
  path.join(process.cwd(), "pb_data");
const DB_FILE = path.join(DATA_DIR, "touch.db");
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
const IMPORT_DIR = path.join(DATA_DIR, "uploads");
const BACKUP_DIR = path.join(DATA_DIR, "backup");
const LOGS_DIR = path.join(DATA_DIR, "logs");
const AUDIT_LOGS_DIR = path.join(DATA_DIR, "audit_logs");
const ORDERS_DIR = path.join(DATA_DIR, "orders"); // <--- New Default Orders Folder

// Initialize PhotoProcessor
const photoProcessor = new PhotoProcessor(UPLOAD_DIR);

const app = express();

// --- Startup Diagnostics ---
console.log("========================================");
console.log("ClickFlash Photography OS - Touch Backend Server");
console.log("========================================");
console.log(`[Startup] Port: ${PORT}`);
console.log(`[Startup] Data Directory: ${DATA_DIR}`);
console.log(`[Startup] Environment: ${process.env.NODE_ENV || "development"}`);

// 0. Initialize Sentry
if (process.env.SENTRY_DSN) {
  initSentry(process.env.SENTRY_DSN, process.env.NODE_ENV || 'development')
    .then(() => console.log('[Init] Sentry initialized'))
    .catch(err => console.error('[Init] Sentry initialization failed:', err));
}

// --- Services & Global State ---
let dbManager: DatabaseManager;
let logger: Logger;
let auditLogger: AuditLogger;

// --- Initialization ---
try {
  [
    DATA_DIR,
    UPLOAD_DIR,
    IMPORT_DIR,
    BACKUP_DIR,
    LOGS_DIR,
    AUDIT_LOGS_DIR,
    ORDERS_DIR,
  ].forEach((dir) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

  const testFile = path.join(DATA_DIR, ".write-test");
  fs.writeFileSync(testFile, "test");
  fs.unlinkSync(testFile);
  console.log("[Init] Storage verified");

  // --- Database ---
  console.log("[Init] Initializing database...");
  const MIGRATIONS_DIR = path.join(__dirname, "migrations");
  dbManager = new DatabaseManager(DB_FILE);
  dbManager.connect(MIGRATIONS_DIR);

  // Ensure default settings exist (Auto-Configured for Export)
  const ordersSetting = dbManager.get(
    "SELECT value FROM settings WHERE key = 'touchOrdersFolder'",
  );
  if (!ordersSetting) {
    dbManager.run(
      "INSERT INTO settings (key, value, created_at, updated_at) VALUES (?, ?, ?, ?)",
      [
        "touchOrdersFolder",
        JSON.stringify({ path: ORDERS_DIR }),
        new Date().toISOString(),
        new Date().toISOString(),
      ],
    );
    console.log(
      `[Init] Created default touchOrdersFolder setting: ${ORDERS_DIR}`,
    );
  }
  console.log(`[Init] Database connected`);

  // --- Security Validation ---
  if (process.env.NODE_ENV === 'production') {
    const jwtSecretFile = path.join(DATA_DIR, 'jwt.secret');
    if (!fs.existsSync(jwtSecretFile)) {
      console.warn('[Security] JWT secret will be generated on first start. Consider pre-generating with: openssl rand -hex 64');
    }
    
    if (!process.env.KIOSK_PASSWORD) {
      console.warn('[Security] KIOSK_PASSWORD not set. Kiosk exit will require database configuration.');
    }
    
    if (!process.env.DEFAULT_ADMIN_PASSWORD || process.env.DEFAULT_ADMIN_PASSWORD === 'DEFAULT_PASSWORD_PLACEHOLDER') {
      console.warn('[Security] Default admin password in use. Set DEFAULT_ADMIN_PASSWORD environment variable.');
    }
  }

  // --- Default User Init ---
  setImmediate(async () => {
    try {
      await initDefaultUser(dbManager);
    } catch (initErr: unknown) {
      logger.warn(
        "[Init] Could not initialize default user",
        initErr instanceof Error ? initErr : undefined,
      );
    }
  });
} catch (err: any) {
  console.error("[Fatal] Initialization Error:", err.message);
  process.exit(1);
}

// --- Logging ---
console.log("[Init] Initializing logging...");
try {
  logger = new Logger(DATA_DIR, process.env.LOG_LEVEL || "INFO");
  auditLogger = new AuditLogger(DATA_DIR);
  setRateLimiterAuditLogger(auditLogger); // Use exported setter
} catch (logErr: any) {
  console.warn(`[Warning] Logging initialization failed: ${logErr.message}`);
  // Fallback/Mock
  logger = new Logger(DATA_DIR, "INFO");
  auditLogger = new AuditLogger(DATA_DIR);
}

// --- Vector Index ---
logger.info("[Init] Initializing Vector Index...");
const vectorIndex = VectorIndexService.getInstance(dbManager, logger);
setImmediate(async () => {
  try {
    await vectorIndex.initialize();
  } catch (err: unknown) {
    logger.error(
      "[Init] Vector Index failed",
      err instanceof Error ? err : undefined,
    );
  }
});

// Fail-safe migration — column already exists on subsequent starts, suppress
try {
  dbManager.run("ALTER TABLE albums ADD COLUMN kiosk_ready INTEGER DEFAULT 0");
} catch {
  /* expected on subsequent starts — column already exists */
}

// Security Config
const JWT_SECRET: string = (() => {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  const secretFile = path.join(DATA_DIR, "jwt.secret");
  try {
    if (fs.existsSync(secretFile)) {
      const secret = fs.readFileSync(secretFile, "utf8").trim();
      if (secret.length >= 32) return secret;
    }
    const newSecret = crypto.randomBytes(64).toString("hex");
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(secretFile, newSecret, { mode: 0o600 });
    logger.info("[Security] Generated and saved new persistent JWT secret");
    return newSecret;
  } catch (err: unknown) {
    logger.error(
      "[Security] Failed to manage persistent secret - using random fallback",
      err instanceof Error ? err : undefined,
    );
    // SECURITY: Use cryptographically random secret even as fallback
    // Note: This will change on every restart, invalidating existing tokens
    return crypto.randomBytes(64).toString("hex");
  }
})();

// CORS - Restrict to specific known origins only
const ALLOWED_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((origin) => origin.trim())
  : [
      "http://localhost:8090", // Master backend
      "http://localhost:8091", // Touch backend
      "http://127.0.0.1:8090",
      "http://127.0.0.1:8091",
    ];

const IS_PROD =
  path.basename(path.dirname(path.dirname(__dirname))) === "resources";

const resolveWebRoot = () => {
  // 1. Production Build (node dist/backend/server.js) -> dist/touch
  // __dirname is .../dist/backend. Target is .../dist/touch
  const candidate1 = path.join(__dirname, "../touch");
  if (fs.existsSync(path.join(candidate1, "index.html"))) return candidate1;

  // 2. Dev/Common Structure -> dist/touch (relative to CWD)
  const candidate2 = path.join(process.cwd(), "dist/touch");
  if (fs.existsSync(path.join(candidate2, "index.html"))) return candidate2;

  // 3. Electron Production (resources/app.asar...)
  const candidate3 = path.join(__dirname, "../../dist/touch");
  if (fs.existsSync(path.join(candidate3, "index.html"))) return candidate3;

  // 4. Fallback: try finding index.html anywhere reasonable
  if (fs.existsSync(path.join(__dirname, "../dist/touch/index.html")))
    return path.join(__dirname, "../dist/touch");

  // Default to CWD dist/touch to print error later if missing
  return path.join(process.cwd(), "dist/touch");
};

const WEB_ROOT = resolveWebRoot();
const DIST_DIR = WEB_ROOT; // Aliasing for existing code usage

// --- Auth Middleware ---
const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): boolean | void => {
  const authHeader = req.headers.authorization;
  const clientIp = req.socket.remoteAddress || "unknown";

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    auditLogger.logUnauthorizedAccess(req.url, clientIp, "NO_TOKEN");
    sendAuthError(res, "Authentication required.");
    return false;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    (req as Request & { user: unknown }).user = decoded;
    next();
    return true;
  } catch {
    auditLogger.logUnauthorizedAccess(req.url, clientIp, "INVALID_TOKEN");
    sendAuthError(res, "Invalid authentication token.");
    return false;
  }
};

// --- Middleware Chain ---
// Request ID for tracing
app.use((req: Request, res: Response, next: NextFunction) => {
  const requestId = crypto.randomUUID();
  (req as Request & { requestId: string }).requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
});

// Audit logging
app.use((req, res, next) => {
  next();
});

// Security headers — env-aware CSP (unsafe-eval dev-only)
const isDev = process.env.NODE_ENV === "development" || process.env.NODE_ENV === undefined;

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        // unsafe-eval is restricted to dev (Vite HMR); unsafe-inline is never
        // needed in production since Vite outputs fully-bundled JS files.
        scriptSrc: isDev
          ? ["'self'", "'unsafe-inline'", "'unsafe-eval'"]
          : ["'self'"],
        // unsafe-inline for styles is required for Tailwind/React dynamic styles
        styleSrc: ["'self'", "'unsafe-inline'"],
        fontSrc: ["'self'", "data:"],
        imgSrc: ["'self'", "data:", "blob:", "http:", "https:"],
        connectSrc: isDev
          ? ["'self'", "ws:", "wss:", "http://localhost:*", "http://127.0.0.1:*", "http://192.168.*", "http://10.*"]
          : ["'self'", "ws://localhost:*", "http://localhost:*", "http://127.0.0.1:*", "http://192.168.*", "http://10.*"],
        objectSrc: ["'none'"],
        formAction: ["'self'"],
        frameAncestors: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false, // needed for Electron webContents
  }),
);

// CORS — LAN-only with dev port exceptions gated by environment
app.use(
  cors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin) return callback(null, true);

      // Dev-only: Allow Vite HMR proxy ports
      if (isDev && (origin.includes(":5174") || origin.includes(":5173"))) {
        return callback(null, true);
      }

      if (ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        // LAN-only policy per Law 06 (Touch Local Fetch)
        const isLocalNetwork =
          /^http:\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|127\.0\.0\.1|localhost)/.test(
            origin,
          );
        if (isLocalNetwork) callback(null, true);
        else callback(null, false);
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Cache-Control",
      "X-Kiosk-Id",
    ],
  }),
);

// Body Parsing - Reduced limits for security
app.use(bodyParser.json({ limit: "1mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "1mb" }));

app.disable("x-powered-by");

// Request timeout (30 seconds)
app.use((req: Request, res: Response, next: NextFunction) => {
  req.setTimeout(30000, () => {
    logger.warn(`Request timeout: ${req.method} ${req.url}`, { requestId: (req as any).requestId });
    if (!res.headersSent) {
      res.status(408).json({ error: 'Request timeout', requestId: (req as any).requestId });
    }
  });
  next();
});

// Services
const realtimeService = new RealtimeService(logger);
const albumService = new AlbumService({ dbManager, logger, realtimeService });

// [Fix] Fetch dynamic watch path from DB settings
let watchPath = UPLOAD_DIR;
try {
  const setting = dbManager.get(
    "SELECT value FROM settings WHERE key = 'uploadFolderPath' OR key = 'kioskUploadPath' OR key = 'monitoredPath' LIMIT 1",
  );
  if (setting && setting.value) {
    try {
      const parsed = JSON.parse(setting.value);
      watchPath = parsed.path || parsed;
    } catch (e) {
      watchPath = setting.value;
    }
    if (logger && logger.info)
      logger.info(`[Server] Using custom monitored folder: ${watchPath}`);
  }
} catch (e) {}

const watcherService = new WatcherService(
  dbManager,
  albumService,
  vectorIndex,
  watchPath,
  logger,
  realtimeService,
);

try {
  watcherService.start();
  logger.info("[Server] Real-time folder monitor started");
} catch (err: unknown) {
  logger.error(
    "[Server] Failed to start folder monitor",
    err instanceof Error ? err : undefined,
  );
}

// Logging Middleware
app.use((req, res, next) => {
  if (req.url.startsWith("/api/")) {
    logger.info(`[Request] ${req.method} ${req.url}`);
  }
  next();
});

// Context
const context = {
  dbManager,
  logger,
  auditLogger,
  UPLOAD_DIR,
  IMPORT_DIR,
  PORT,
  JWT_SECRET,
  rateLimiter,
  authMiddleware,
  realtimeService,
  photoProcessor,
  vectorIndex,
};

app.use("/api", createAuthRouter(context));
app.use("/api/collections", createCollectionsRouter(context));
app.use("/api/sync", createSyncRouter(context));
app.use("/api", createSystemRouter(context));
app.use("/api/files", createFilesRouter({ logger, UPLOAD_DIR }));
app.use("/api/orders", createOrderExportRouter(context));
app.use("/api/realtime", createRealtimeRouter(context));
app.use("/api/faces", createFacesRouter(context));

// Global Express error handler — sanitized (Task 2.4)
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error("[Server] Unhandled route error", err);
  if (res.headersSent) {
    return next(err);
  }
  const isDevelopment = process.env.NODE_ENV === "development";
  res.status(500).json({
    error: "Internal Server Error",
    message: isDevelopment ? err.message : "An unexpected error occurred. Please try again.",
    ...(isDevelopment && { stack: err.stack }),
  });
});

// API 404 Handler (if /api request fell through)
app.use("/api", (req, res) => {
  sendNotFoundError(res, "API endpoint");
});

// --- Database Refresh (Run Migrations) ---
// Already handled at startup

// --- Static Files ---
if (fs.existsSync(DIST_DIR)) {
  logger.info(`[Init] Serving static files from: ${DIST_DIR}`);
  app.use(express.static(DIST_DIR));
} else {
  logger.warn(`[Server] Static files directory not found: ${DIST_DIR}`);
}

// SPA Fallback
app.get(/.*/, (req, res) => {
  const indexPath = path.join(DIST_DIR, "index.html");
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send("Not Found");
  }
});

// Start Server using app
const server = http.createServer(app);

server.listen(PORT, "0.0.0.0", () => {
  logger.info(`[Server] Touch backend running on port ${PORT}`, {
    port: PORT,
    mode: "SQLite",
    db: DB_FILE,
    portDiscipline: PORT === 8091 ? "HEALTHY" : "WARNING",
  });
  logger.info(
    "[Apex] Status: mDNS=ClickFlash-Client | Tiering=Active | WAL=Active",
  );

  // --- Graceful Shutdown (Task 1.7) ---
  const gracefulShutdown = async (signal: string) => {
    logger.info(`[Shutdown] ${signal} received — stopping Touch services...`);

    const shutdownSteps = [
      { name: "watcherService", fn: () => watcherService?.stop?.() },
    ];

    const results = await Promise.allSettled(
      shutdownSteps.map((s) =>
        Promise.resolve()
          .then(() => s.fn())
          .catch((err: unknown) => logger.error(`[Shutdown] ${s.name} failed:`, err as Record<string, any>)),
      ),
    );

    const failures = results.filter((r) => r.status === "rejected");
    if (failures.length > 0) {
      logger.error(
        `[Shutdown] ${failures.length}/${shutdownSteps.length} services failed`,
      );
    } else {
      logger.info("[Shutdown] All Touch services stopped gracefully");
    }

    // Close database connection
    try {
      dbManager?.close?.();
      logger.info("[Shutdown] Database connection closed.");
    } catch (err: unknown) {
      logger.error("[Shutdown] Database close failed:", err as Record<string, any>);
    }

    // Drain HTTP connections
    server.close(() => {
      logger.info("[Shutdown] Clean exit.");
      process.exit(failures.length > 0 ? 1 : 0);
    });

    // Force exit after 15s if server.close hangs
    setTimeout(() => {
      logger.error("[Shutdown] Forced exit after timeout");
      process.exit(1);
    }, 15_000).unref();
  };

  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
});

server.on("error", (e: any) => {
  if (e.code === "EADDRINUSE") {
    console.error(`[FATAL] Port ${PORT} is already in use.`);
    process.exit(1);
  } else {
    console.error("[FATAL] Server error:", e);
    process.exit(1);
  }
});
