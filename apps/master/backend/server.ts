import dotenv from "dotenv";
dotenv.config();

// Ensure NODE_ENV is always defined — rateLimiter and other middleware depend on it
process.env.NODE_ENV = process.env.NODE_ENV || "development";

import { initSentry } from "./shared/sentryService";

// P2-F: Sentry is activated when SENTRY_DSN env var is present.
// Set SENTRY_DSN in .env to enable production error tracking.
// No-op when DSN is absent — zero overhead in offline/dev mode.
if (process.env.SENTRY_DSN) {
  initSentry(
    process.env.SENTRY_DSN,
    process.env.NODE_ENV || "development",
    `clickflash-master@${process.env.npm_package_version || "4.2.0"}`,
    "master-backend"
  ).then(() => {
    console.info("[Sentry] Node.js error tracking ACTIVE");
  }).catch(() => {});
}

import express, { Request, Response, NextFunction } from "express";
import http from "http";
import fs from "fs";
import path from "path";
import { Bonjour } from "bonjour-service";
import helmet from "helmet";

// Shared Modules
import rateLimiter, {
  strictRateLimiter,
  setAuditLogger as setRateLimiterAuditLogger,
} from "./shared/rateLimiter";
import { getLocalNetworkIPs } from "./shared/networkDetection";
import { DatabaseManager } from "./shared/db";
import AuditLogger from "./shared/auditLogger";
import { Logger } from "./shared/logger";
import { PhotoProcessor } from "./shared/photoProcessor";
import { ThermalService } from "./shared/thermalService";
import { ResourceMonitor } from "./shared/ResourceMonitor";

import { sendNotFoundError } from "./shared/errorHandler";
import { initDefaultUser } from "./shared/init-default-user";

// Rule 05: Universal Environment Parity - Detection
const isElectron = process.versions && !!process.versions.electron;
console.log(`[Environment] Running in ${isElectron ? "Electron" : "Web"} mode`);

// Middleware
import { createSessionMiddleware } from "./middleware/session";
import { csrfMiddleware } from "./middleware/csrf";
import { initCsrfStore } from "./shared/csrf";
import { authMiddleware } from "./middleware/auth";

// Routes
import authRoutes from "./routes/auth";
import collectionRoutes from "./routes/collections";
import systemRoutes from "./routes/system";
import fileRoutes from "./routes/files";
import realtimeRoutes from "./routes/realtime";
import pairingRoutes from "./routes/pairing";
import sessionTypeRoutes from "./routes/sessionTypes";
import cullingRoutes from "./routes/culling";
import cloudRoutes from "./routes/cloud";
import faceRoutes from "./routes/faces";
import orderRoutes from "./routes/orders";
import notificationRoutes from "./routes/notification";
import assistanceRoutes from "./routes/assistance";
import galleryRoutes from "./routes/gallery";
import galleryAuthRoutes from "./routes/galleryAuth";
import galleryCheckoutRoutes from "./routes/galleryCheckout";
import syncRoutes from "./routes/sync";
import analyticsRoutes from "./routes/analytics";
import marketingRoutes from "./routes/marketing";
import dashboardRoutes from "./routes/dashboard";
import healthRoutes from "./routes/health";
import exportRoutes from "./routes/export";
import { createResortAnalyticsRoutes } from "./routes/resortAnalytics";

// Services
import startFolderMonitor from "./services/folderMonitor";
import initWebSocketServer from "./services/websocket";
import RealtimeService from "./services/realtimeService";
import { NetworkMonitor } from "./services/NetworkMonitor";
import { SyncManager } from "./services/SyncManager";
import { CloudSyncService } from "./services/cloudSyncService";
import MaintenanceService from "./services/maintenanceService";
import { HardwareService } from "./services/HardwareService";
import { OrderValidationService } from "./services/OrderValidationService";
import { QueueProcessor } from "./services/QueueProcessor";
import { DbWriteQueue } from "./services/DbWriteQueue";
import { FulfillmentService } from "./services/FulfillmentService";
import { FulfillmentSlipService } from "./services/FulfillmentSlipService";
import MoneyTrashService from "./services/MoneyTrashService";
import { EmailService } from "./services/emailService";
import { BookingService } from "./services/bookingService";

import { CampaignScheduler } from "./services/campaignScheduler";
import { InventoryService } from "./services/InventoryService";
import { VectorIndexService } from "./services/VectorIndexService";
import { LedgerService } from "./services/LedgerService";
import { MaintenancePoller } from "./services/MaintenancePoller";
import { ExportService } from "./services/ExportService";
import { ResortAnalyticsService } from "./services/ResortAnalyticsService";
import { DiagnosticSyncService } from "./services/DiagnosticSyncService";
import startOrderWatcher from "./services/orderWatcher";

// Configuration
import {
  PORT,
  DATA_DIR,
  DB_FILE,
  UPLOAD_DIR,
  BACKUP_DIR,
  LOGS_DIR,
  AUDIT_LOGS_DIR,
  ALLOWED_ORIGINS,
  WEB_ROOT,
  JWT_SECRET,
} from "./config/constants";

// --- Global Error Handling ---
// NOTE: The definitive uncaughtException and unhandledRejection handlers are
// registered at the bottom of this file (Phase 55) with graceful shutdown.
// Do NOT add duplicate handlers here.

// --- Security: Service Token Generation ---
import { randomUUID } from "crypto";
if (!process.env.SERVICE_SECRET) {
  process.env.SERVICE_SECRET = randomUUID();
  console.log(
    "[Security] Generated temporary SERVICE_SECRET (Valid for this session only)",
  );
} else {
  console.log("[Security] Loaded SERVICE_SECRET from environment");
}
// ------------------------------------------

// --- Initialization ---

// 1. Directory Setup
const requiredDirs = [
  DATA_DIR,
  UPLOAD_DIR,
  BACKUP_DIR,
  LOGS_DIR,
  AUDIT_LOGS_DIR,
];
requiredDirs.forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// 2. Services Init
export let dbManager: DatabaseManager;
export let logger: Logger;
export let auditLogger: AuditLogger;
let photoProcessor: PhotoProcessor;
let thermalService: ThermalService;
let dbWriteQueue: DbWriteQueue;
let fulfillmentService: FulfillmentService;
let fulfillmentSlipService: FulfillmentSlipService;
let emailService: EmailService;
let bookingService: BookingService;

let campaignScheduler: CampaignScheduler;
let inventoryService: InventoryService;
let vectorIndex: VectorIndexService;
let ledgerService: LedgerService;
let exportService: ExportService;
let resortAnalytics: ResortAnalyticsService;
let diagnosticSync: DiagnosticSyncService;

try {
  // Logger
  logger = new Logger(DATA_DIR, (process.env.LOG_LEVEL as string) || "INFO");
  auditLogger = new AuditLogger(DATA_DIR);
  setRateLimiterAuditLogger(auditLogger);

  // Database
  // Run shared migrations first (initial schema), then backend-specific migrations
  const SHARED_MIGRATIONS_DIR = path.join(__dirname, "shared", "migrations");
  const BACKEND_MIGRATIONS_DIR = path.join(__dirname, "migrations");
  dbManager = new DatabaseManager(DB_FILE);
  dbManager.connect(SHARED_MIGRATIONS_DIR);
  // Run backend-specific migrations if directory exists and has different files
  if (
    fs.existsSync(BACKEND_MIGRATIONS_DIR) &&
    BACKEND_MIGRATIONS_DIR !== SHARED_MIGRATIONS_DIR
  ) {
    dbManager.runMigrations?.(BACKEND_MIGRATIONS_DIR);
  }

  // Initialise the SQLite-backed CSRF token store so tokens survive server restarts.
  initCsrfStore(dbManager);

  // Default User, Vector Index, and other background services are now handled in initializeBackgroundServices()

  // Write Queue (Zero-Block IO)
  // Write Queue (Zero-Block IO)
  dbWriteQueue = new DbWriteQueue(dbManager, { logger }); // Pass DatabaseManager instance directly

  // Thermal Service (Sentinel)
  thermalService = new ThermalService(logger);

  // Photo Processor (Injected with Thermal Sentinel and DB Manager)
  photoProcessor = new PhotoProcessor(UPLOAD_DIR, thermalService, dbManager);

  // Fulfillment Service (Used for both local bundling and cloud sync)
  fulfillmentService = new FulfillmentService(
    dbManager,
    logger,
    photoProcessor,
  );

  // Fulfillment Slip Service (Branded Production Slips)
  fulfillmentSlipService = new FulfillmentSlipService(
    logger,
    dbManager,
    DATA_DIR,
  );

  // Email & Marketing (Rule 01, 14)
  emailService = new EmailService(logger);
  bookingService = new BookingService(logger);

  campaignScheduler = new CampaignScheduler(logger, dbManager, emailService);

  // Inventory & Ledger (New Services)
  inventoryService = new InventoryService(dbManager, logger);
  ledgerService = new LedgerService(dbManager, logger);
  vectorIndex = VectorIndexService.getInstance(dbManager, logger);

  // Vector Index initialization moved to initializeBackgroundServices()

  // --- P3: Export Service (Law 14) ---
  exportService = new ExportService(logger, dbManager);

  // Phase 75: Resort BI Analytics
  resortAnalytics = new ResortAnalyticsService(dbManager, logger);

  // Real-time Hub Diagnostic Sync
  diagnosticSync = new DiagnosticSyncService(dbManager, logger, resortAnalytics);
} catch (err) {
  console.error("[Fatal] Initialization Error:", err);
  process.exit(1);
}

// 3. App Setup
export const app = express();
export const server = http.createServer(app);

// Initialize Services
const networkMonitor = new NetworkMonitor(logger);
const realtimeService = new RealtimeService(logger, networkMonitor);
const syncManager = new SyncManager(logger, dbManager);
const hardwareService = new HardwareService(
  logger,
  dbManager,
  inventoryService,
);
// Phase 35: Resource Monitoring (Law 15/09)
const resourceMonitor = new ResourceMonitor(logger);
resourceMonitor.start(30000); // Check every 30s

const cloudSyncService = new CloudSyncService(
  dbManager,
  logger,
  emailService,
  resourceMonitor,
  resortAnalytics,
);

// Phase 45: Maintenance Command Poller — pulls admin commands from Hub every 60s
const maintenancePoller = new MaintenancePoller({
  hubUrl: process.env.CLOUD_API_URL || "",
  hubToken: process.env.CLOUD_API_TOKEN || "",
  deskId: process.env.DESK_ID || "MASTER_01",
  dataDir: DATA_DIR,
  logger,
  dbManager,
  cloudSyncService: { sync: () => cloudSyncService.sync() },
});
  // Maintenance Poller and Setting Sync moved to initializeBackgroundServices()
const orderValidationService = new OrderValidationService(
  dbManager,
  logger,
  emailService,
  hardwareService,
  fulfillmentSlipService,
  JWT_SECRET,
);
const queueProcessor = new QueueProcessor(
  dbManager,
  logger,
  cloudSyncService,
  photoProcessor,
  fulfillmentService,
);
const moneyTrashService = new MoneyTrashService(dbManager, logger);

// Context for routes
const context = {
  dbManager,
  logger,
  auditLogger,
  photoProcessor,
  dbWriteQueue,
  fulfillmentService,
  fulfillmentSlipService,
  emailService,
  bookingService,
  campaignScheduler,
  config: {
    PORT,
    DATA_DIR,
    DB_FILE,
    UPLOAD_DIR,
    BACKUP_DIR,
    LOGS_DIR,
    AUDIT_LOGS_DIR,
    ALLOWED_ORIGINS,
    WEB_ROOT,
    JWT_SECRET,
  },
  JWT_SECRET,
  realtimeService,
  syncManager,
  hardwareService,
  cloudSyncService,
  orderValidationService,
  thermalService,

  uploadDir: UPLOAD_DIR, // For gallery watermark route
  vectorIndex,
  ledgerService,
  networkMonitor,
  exportService,
  resortAnalytics,
  diagnosticSync,
};

// ... (middleware) ...

// Start Background Services (Deferred for Phase 130 Performance)
const wss = initWebSocketServer(server, context);
(context as any).wss = wss;

// Background services will be initiated after server.listen() via initializeBackgroundServices()

// Metrics Streaming Loop (Rule 15 - Performance Visibility)
setInterval(() => {
  realtimeService.broadcastMetrics();
}, 5000);

// Middleware
const jsonParser = express.json({ limit: "50mb" });
const urlencodedParser = express.urlencoded({ extended: true, limit: "50mb" });

app.use((req: Request, res: Response, next: NextFunction) => {
  const contentType = req.headers["content-type"] || "";

  // Safety: Skip body parsing for GET/HEAD/DELETE (or any request without body)
  if (
    req.method === "GET" ||
    req.method === "HEAD" ||
    req.method === "OPTIONS"
  ) {
    return next();
  }

  if (contentType.includes("multipart/form-data")) {
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
const isDev = process.env.NODE_ENV === "development";

// Security Headers (Helmet)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: isDev
          ? [
              "'self'",
              "'unsafe-inline'",
              "'unsafe-eval'",
              "http://localhost:*",
              "http://127.0.0.1:*",
            ]
          : ["'self'", "'unsafe-inline'"], // unsafe-inline often needed for React runtime injection, but verify if strictly needed
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
            ], // Production: Allow local websocket and cloud domain
        imgSrc: ["'self'", "data:", "blob:", "http:", "https:"],
        workerSrc: ["'self'", "blob:"],
        objectSrc: ["'none'"], // Prevent Flash/Java plugins
        baseUri: ["'self'"], // Restrict <base> tag
        frameAncestors: ["'self'"], // Prevent clickjacking (modern X-Frame-Options)
      },
    },
    hsts: isDev
      ? false
      : {
          maxAge: 31536000, // 1 year
          includeSubDomains: true,
          preload: true,
        },
    crossOriginEmbedderPolicy: false, // Often breaks loading of local assets/images in Electron
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow Kiosks to fetch images
  }),
);

app.use(createSessionMiddleware());
app.use(csrfMiddleware);

// Global API auth — protects all /api/* routes that are not explicitly public.
// Paths in this list are accessible without a user session (kiosk pairing,
// gallery client auth, Stripe webhooks, etc.).  Everything else requires a
// valid session cookie or Bearer JWT.
const PUBLIC_API_PREFIXES = [
  '/auth',              // login, logout, QR session, magic-link
  '/health',            // health check (federated diagnostics)
  '/gallery-auth',      // gallery client authentication
  '/gallery-checkout',  // Stripe / payment webhook (no user context)
  '/gallery',           // watermarked image serving (uses gallery JWT)
  '/pairing',           // kiosk initial pairing handshake
  '/assistance',        // kiosk → master assistance calls
  '/notification',      // kiosk → master notification push
];
app.use('/api', (req: Request, res: Response, next: NextFunction) => {
  if (req.method === 'OPTIONS') return next();
  const isPublic = PUBLIC_API_PREFIXES.some(
    (p) => req.path === p || req.path.startsWith(p + '/'),
  );
  if (isPublic) return next();
  authMiddleware(req, res, next, auditLogger);
});

// CORS
app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  } else if (!origin && process.env.NODE_ENV !== "production") {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PATCH, PUT, DELETE, OPTIONS",
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, X-CSRF-Token, Cache-Control, X-Kiosk-Id",
  );

  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

// Rate Limiter
app.use(rateLimiter);

// Logging Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  if (req.url.startsWith("/api/")) {
    logger.info(`[Request] ${req.method} ${req.url}`);

    // Use finish event to log response status
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

// --- Routes Mounting ---
// Specific API routes
// Auth routes get stricter rate limiting (5 req/min) to resist brute-force
app.use("/api/auth", strictRateLimiter, authRoutes(context));
app.use("/api/collections", collectionRoutes(context)); // Handles /:collection/records
app.use("/api/cloud", cloudRoutes(context)); // Handles /status, /sync, /stats, /retention
app.use("/api/session-types", sessionTypeRoutes(context)); // Handles /session-types
app.use("/api/culling", cullingRoutes(context)); // Handles /culling/analyze, /culling/results
app.use("/api/faces", faceRoutes(context)); // Handles /faces/search, /faces/reindex
app.use("/api/orders", orderRoutes(context)); // Handles /orders fulfillment
app.use("/api/analytics", analyticsRoutes(context));
app.use("/api/marketing", marketingRoutes(context));
app.use("/api/dashboard", dashboardRoutes(context)); // Handles /dashboard/system-health
app.use("/api/health", healthRoutes(dbManager, thermalService)); // Federated deep diagnostics
app.use("/api/export", exportRoutes(context as any)); // Phase P3: Backend Batch Export
app.use(
  "/api/resort-analytics",
  createResortAnalyticsRoutes(resortAnalytics, logger),
); // Phase 75: BI Dash

// General API routes mounted at /api
app.use("/api", fileRoutes(context)); // Handles /files and /settings/logo
app.use("/api", systemRoutes(context)); // Handles /health, /ip, /printers, etc.
app.use("/api", realtimeRoutes(context)); // Handles /realtime SSE
app.use("/api", pairingRoutes(context)); // Handles /pairing
app.use("/api", notificationRoutes(context)); // Handles /notify/customer
app.use("/api", assistanceRoutes(context)); // Handles /assistance
app.use("/api/gallery", galleryRoutes(context)); // Handles /gallery/export watermark generation
app.use("/api/gallery-auth", strictRateLimiter, galleryAuthRoutes(context));
app.use("/api/gallery-checkout", strictRateLimiter, galleryCheckoutRoutes(context));
app.use("/api", syncRoutes(context as any)); // Mount /api/sync/mutation — Touch→Master push

// Fallback for unhandled API routes
app.all(/\/api\/(.*)/, (_req: Request, res: Response) => {
  sendNotFoundError(res, "API endpoint");
});

// Static Serving (Web App)
if (WEB_ROOT && fs.existsSync(WEB_ROOT)) {
  app.use(express.static(WEB_ROOT));
}

app.get(/.*/, (_req: Request, res: Response) => {
  if (_req.url.startsWith("/api")) {
    sendNotFoundError(res, "API endpoint");
    return;
  }

  if (WEB_ROOT && fs.existsSync(path.join(WEB_ROOT, "index.html"))) {
    res.sendFile(path.join(WEB_ROOT, "index.html"));
  } else {
    res.status(404).send("Web root not found");
  }
});

// Error handling middleware — catch-all for unhandled errors
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  logger.error("Unhandled Server Error", {
    error: err.message,
    stack: err.stack,
    url: _req.url,
    method: _req.method,
  });
  if (!res.headersSent) {
    // Never leak stack traces or internal details to client
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

// NOTE: uncaughtException and unhandledRejection handlers are registered
// below in the Phase 55 block (after server.listen). Registering them here
// as well caused double-logging and a race between two process.exit() calls.
// DO NOT re-add handlers here.

// Start Background Services
import { tunnelManager } from "./services/TunnelManager";
if (process.env.ENABLE_CLOUDFLARED_TUNNEL === "true") {
  tunnelManager.start().catch((e) => logger.error("Failed to start tunnel:", e));
} else {
  logger.info("[Tunnel] Cloudflared tunnel disabled. Set ENABLE_CLOUDFLARED_TUNNEL=true to enable.");
}

// Cloud Sync
// cloudSyncService.start() is already called above

  // Services started via initializeBackgroundServices()

// Start Server
// --- Unified Ecosystem Initialization (P3-D, P3-E) ---
const initializeEcosystem = async () => {
    logger.info("[Startup] Initiating architectural startup sequence...");
    const bootTime = Date.now();

    try {
        // 1. Critical: Default User
        await initDefaultUser(dbManager);
        logger.info("[Startup] Data Integrity: Default User verified.");

        // 2. Critical: Vector Index
        await vectorIndex.initialize();
        logger.info("[Startup] AI Layer: Vector Index initialized.");

        // 3. Operational: Queue & Sync
        queueProcessor.start();
        maintenancePoller.start();
        await cloudSyncService.syncRemoteSettings().catch((e: Error) => logger.warn("[Startup] Settings sync failed", { error: e.message }));
        logger.info("[Startup] Core: Queue and Maintenance Poller active.");

        // 4. Operational Workers (Law 13 Compliance)
        startFolderMonitor(context as any);
        logger.info("[Startup] Folder Monitor: Active (Law 13).");

        const maintenanceService = new MaintenanceService(dbManager, logger);
        maintenanceService.start();
        logger.info("[Startup] Maintenance Agent: Active.");

        startOrderWatcher(context);
        logger.info("[Startup] Order Watcher: Active.");

        // 5. External Hub Integrations
        cloudSyncService.start();
        logger.info("[Startup] Cloud Relay: Sync service started.");

        moneyTrashService.start();
        logger.info("[Startup] MoneyTrash Integration: Active.");

        campaignScheduler.start();
        logger.info("[Startup] Marketing Layer: Scheduler active.");

        logger.info(`[Startup] Ecosystem initialized successfully in ${Date.now() - bootTime}ms.`);
    } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        logger.error("[Startup] CRITICAL SYSTEM BOOT FAILURE:", {
            message: error.message,
            stack: error.stack
        });
    }
};

// Start Server
server.listen(PORT, "0.0.0.0", async () => {
    try {
        const ips = getLocalNetworkIPs();
        logger.info(`[Titan Protocol] Master Server running on port ${PORT}`);
        ips.forEach((ip) =>
            logger.info(`[Network] Available at: http://${ip.ip}:${PORT}`),
        );

        logger.info("\n--- Apex Operational Status ---");
        logger.info(
            `[Apex] Port Discipline: ${PORT === 8090 ? "HEALTHY" : "WARNING"}`
        );
        logger.info("[Apex] mDNS Discovery: StarMaster (Type: http)");
        logger.info(
            "[Apex] Asset Tiering: 3-Resolution Pipeline (Tiny, Preview, Original)"
        );
        logger.info("[Apex] Power-Loss Recovery: SQLite WAL Mode Active");
        logger.info("-------------------------------");

        const bonjour = new Bonjour();
        bonjour.publish({
            name: "StarMaster",
            type: "http",
            port: PORT,
            txt: { mode: "master", version: "4.1.0" },
        });

        // Fire off background services
        await initializeEcosystem();

        // Graceful shutdown: stop all background services before exit (P7 audit fix)
        const gracefulShutdown = async (signal: string) => {
            logger.info(
                `[Shutdown] ${signal} received — stopping background services...`,
            );
            try {
                tunnelManager.stop();
            } catch {
                /* ignore */
            }
            try {
                cloudSyncService?.stop?.();
            } catch {
                /* ignore */
            }
            try {
                queueProcessor?.stop?.();
            } catch {
                /* ignore */
            }
            try {
                campaignScheduler?.stop?.();
            } catch {
                /* ignore */
            }
            try {
                moneyTrashService?.stop?.();
            } catch {
                /* ignore */
            }
            try {
                resourceMonitor?.stop?.();
            } catch {
                /* ignore */
            }
            try {
                maintenancePoller?.stop?.();
            } catch {
                /* ignore */
            }
            // Drain pending DB writes before closing (P4 audit fix — prevents data loss)
            try {
                await dbWriteQueue.shutdown();
                logger.info("[Shutdown] DbWriteQueue drained.");
            } catch (err) {
                logger.error("[Shutdown] DbWriteQueue drain failed:", err);
            }
            // Terminate photo/ML worker pools (P8 audit fix — prevents thread leaks on exit)
            try {
                await photoProcessor?.shutdown?.();
                logger.info("[Shutdown] Worker pools terminated.");
            } catch (err) {
                logger.error("[Shutdown] Worker pool shutdown failed:", err);
            }
            bonjour.unpublishAll(() => {
                server.close(() => {
                    logger.info("[Shutdown] Clean exit.");
                    process.exit(0);
                });
                // Force exit after 5s if server.close hangs
                setTimeout(() => process.exit(0), 5000).unref();
            });
        };

        process.on("SIGINT", () => gracefulShutdown("SIGINT"));
        process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    } catch (e) {
        const error = e instanceof Error ? e : new Error(String(e));
        logger.error("[Server] Discovery/Bonjour failed:", { message: error.message, stack: error.stack });
    }
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


// ─── Phase 55: Global Crash Monitoring ──────────────────────────────────────
process.on("uncaughtException", async (err: Error) => {
    console.error("[FATAL] Uncaught Exception:", err.message, err.stack);
    try {
        const { Logger: LoggerC } = await import("./shared/logger");
        const logDir = process.env.DATA_DIR || "./pb_data";
        const emergencyLogger = new LoggerC(logDir);
        emergencyLogger.error("[FATAL] Uncaught Exception", {
            message: err.message,
            stack: err.stack,
        });
    } catch { /* ignore logger failure during crash */ }
    
    setTimeout(() => process.exit(1), 2000).unref();
    server.close(() => process.exit(1));
});

process.on("unhandledRejection", async (reason: unknown) => {
  const message = reason instanceof Error ? reason.message : String(reason);
  const stack = reason instanceof Error ? reason.stack : undefined;
  console.error("[FATAL] Unhandled Promise Rejection:", message);
  try {
    const { Logger: LoggerC } = await import("./shared/logger");
    const logDir = process.env.DATA_DIR || "./pb_data";
    const emergencyLogger = new LoggerC(logDir);
    emergencyLogger.error("[FATAL] Unhandled Promise Rejection", {
      message,
      stack,
    });
  } catch (e) {
    // Silently swallow — already logged to console
  }
  // Do NOT exit on unhandled rejections — log and continue (Express handles route errors)
});
