import dotenv from "dotenv";
dotenv.config();

// Ensure NODE_ENV is always defined — rateLimiter and other middleware depend on it
process.env.NODE_ENV = process.env.NODE_ENV || "development";

import express, { Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import fs from "fs";
import path from "path";
import { Bonjour } from "bonjour-service";
import helmet from "helmet";

// TLS Configuration
import { getTLSConfig, createSecureServer } from "./config/tlsConfig";

// Shared Modules
import rateLimiter, { userRateLimiter, setAuditLogger as setRateLimiterAuditLogger } from "./middleware/rateLimiter";
import { getLocalNetworkIPs } from "./services/networkDetection";
import { DatabaseManager } from "./database/db";
import AuditLogger from "./utils/auditLogger";
import { Logger } from "./utils/logger";
import { PhotoProcessor } from "./services/photoProcessor";
import { ThermalService } from "./services/thermalService";
import { ResourceMonitor } from "./services/ResourceMonitor";

import { sendNotFoundError } from "./utils/errorHandler";
import { createErrorMiddleware } from "./utils/apiError";

// Rule 05: Universal Environment Parity - Detection
const isElectron = process.versions && !!process.versions.electron;
console.log(`[Environment] Running in ${isElectron ? "Electron" : "Web"} mode`);

// Middleware
import { createSessionMiddleware } from "./middleware/session";
import { initCsrfTokenStore } from "./utils/csrfStore";
import { csrfMiddleware } from "./middleware/csrf";
import { authMiddleware } from "./middleware/auth";
import { createMutationAuditMiddleware } from "./middleware/mutationAudit";

// Routes
import { mountRoutes } from "./setup/routes";
import { initializeEcosystem } from "./setup/bootstrap";

// Services
import initWebSocketServer from "./services/websocket";
import RealtimeService from "./services/realtimeService";
import { NetworkMonitor } from "./services/NetworkMonitor";
import { SyncManager } from "./services/SyncManager";
import { udpDiscoveryService } from "./services/udpDiscoveryService";
import { CloudSyncService } from "./services/cloudSyncService";
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
import { BackupService } from "./services/BackupService";
import { AutomatedBackupService } from "./services/AutomatedBackupService";

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
  TLS_ENABLED,
  FORCE_HTTPS,
  PROTOCOL,
} from "./config/constants";

// --- Global Error Handling ---
// NOTE: The definitive uncaughtException and unhandledRejection handlers are
// registered at the bottom of this file (Phase 55) with graceful shutdown.
// Do NOT add duplicate handlers here.

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

// 2. Services Init (Bootstrap Phase)
export let dbManager: DatabaseManager;
export let logger: Logger;
export let auditLogger: AuditLogger;
import { TokenRefreshService } from "./middleware/tokenRefresh";
export let tokenRefreshService: TokenRefreshService;

try {
  // Logger
  logger = new Logger(DATA_DIR, (process.env.LOG_LEVEL as string) || "INFO");
  auditLogger = new AuditLogger(DATA_DIR);
  setRateLimiterAuditLogger(auditLogger);

  // Database
  // Run core migrations first (initial schema), then backend-specific migrations
  const SHARED_MIGRATIONS_DIR = path.join(__dirname, "database", "migrations");
  const BACKEND_MIGRATIONS_DIR = path.join(__dirname, "migrations");
  dbManager = new DatabaseManager(DB_FILE);
  dbManager.connect(SHARED_MIGRATIONS_DIR);
  dbManager.startIdleWalCheckpointScheduler(30 * 60 * 1000); // Checkpoint WAL every 30 minutes
  
  // Initialize CSRF token store with database (persists tokens across restarts)
  initCsrfTokenStore(dbManager);

  // Initialize Token Refresh Service
  tokenRefreshService = new TokenRefreshService(dbManager, auditLogger);
  
  // Run backend-specific migrations if directory exists and has different files
  if (
    fs.existsSync(BACKEND_MIGRATIONS_DIR) &&
    BACKEND_MIGRATIONS_DIR !== SHARED_MIGRATIONS_DIR
  ) {
    dbManager.runMigrations?.(BACKEND_MIGRATIONS_DIR);
  }
} catch (err) {
  console.error("[Fatal] Bootstrap Error:", err);
  process.exit(1);
}

// --- Security: Service Token Generation ---
import { randomUUID } from "crypto";
if (!process.env.SERVICE_SECRET) {
  // Try to load from database for persistence across restarts
  const storedSecret = dbManager?.get<{ value: string }>(
    "SELECT value FROM settings WHERE id = 'SERVICE_SECRET'"
  );
  
  if (storedSecret?.value) {
    process.env.SERVICE_SECRET = storedSecret.value;
    console.log("[Security] Loaded SERVICE_SECRET from database");
  } else {
    // Generate new secret and store in database
    process.env.SERVICE_SECRET = randomUUID();
    try {
      dbManager?.run(
        "INSERT INTO settings (id, value) VALUES ('SERVICE_SECRET', ?) ON CONFLICT(id) DO UPDATE SET value = excluded.value",
        [process.env.SERVICE_SECRET]
      );
      console.log("[Security] Generated and stored persistent SERVICE_SECRET");
    } catch (err) {
      console.log("[Security] Generated temporary SERVICE_SECRET (DB not ready)");
    }
  }
} else {
  // Store env var secret in database for future use
  try {
    dbManager?.run(
      "INSERT INTO settings (id, value) VALUES ('SERVICE_SECRET', ?) ON CONFLICT(id) DO UPDATE SET value = excluded.value",
      [process.env.SERVICE_SECRET]
    );
  } catch (err) {
    // Ignore if DB not ready
  }
  console.log("[Security] Loaded SERVICE_SECRET from environment");
}
// ------------------------------------------

// 3. Dependent Services Init
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
let backupService: BackupService;
let automatedBackupService: AutomatedBackupService;

try {
  // Write Queue (Zero-Block IO)
  dbWriteQueue = new DbWriteQueue(dbManager, { logger });

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
  // All email is routed through the Cloudflare Hub Worker (/api/email/relay → Resend).
  emailService = new EmailService(logger);
  emailService.setCloudConfig(
    process.env.CLOUD_API_URL || '',
    process.env.CLOUD_API_TOKEN || '',
  );
  bookingService = new BookingService(logger, emailService);

  campaignScheduler = new CampaignScheduler(logger, dbManager, emailService);

  // Inventory & Ledger (New Services)
  inventoryService = new InventoryService(dbManager, logger);
  ledgerService = new LedgerService(dbManager, logger);
  vectorIndex = VectorIndexService.getInstance(dbManager, logger);

  // --- P3: Export Service (Law 14) ---
  exportService = new ExportService(logger, dbManager);

  // Phase 75: Resort BI Analytics
  resortAnalytics = new ResortAnalyticsService(dbManager, logger);

  // Real-time Hub Diagnostic Sync
  diagnosticSync = new DiagnosticSyncService(dbManager, logger, resortAnalytics);

  // Automated Cloud Backup Service
  backupService = new BackupService(DB_FILE, UPLOAD_DIR, logger);
  automatedBackupService = new AutomatedBackupService(
    backupService,
    process.env.DESK_ID || "MASTER_01",
    process.env.CLOUD_API_URL || "https://management.clickflash.com",
    process.env.CLOUD_API_TOKEN || ""
  );
} catch (err) {
  console.error("[Fatal] Service Initialization Error:", err);
  process.exit(1);
}

// 3. App Setup
export const app = express();

// TLS Configuration
const tlsConfig = getTLSConfig();
const serverResult = createSecureServer(app, PORT, "0.0.0.0");
export const server = serverResult.server;

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
    PROTOCOL,
    TLS_ENABLED: TLS_ENABLED,
    FORCE_HTTPS,
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
  tokenRefreshService,
  networkMonitor,
  exportService,
  resortAnalytics,
  diagnosticSync,
  automatedBackupService,
  queueProcessor,
  maintenancePoller,
  moneyTrashService,
  auditService: null as any, // Will be set after initialization
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
        styleSrc: ["'self'", "'unsafe-inline'"], // Tailwind/React runtime styles require unsafe-inline
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
        formAction: ["'self'"], // Prevent form submissions to external domains
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
    crossOriginEmbedderPolicy: false, // Required for Electron local asset loading
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow Kiosks to fetch images
  }),
);

app.use(cookieParser());
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
  '/v1/pairing',        // v1 kiosk pairing handshake
  '/v1/kiosks',         // auto-register kiosks
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

// CORS — Strict origin whitelist. No wildcard fallback.
app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
  // No origin header = same-origin or server-to-server request.
  // Intentionally not setting Access-Control-Allow-Origin (no wildcard).

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

// Rate Limiters — IP-based global first, then per-user for authenticated routes
app.use(rateLimiter);
app.use(userRateLimiter); // Phase 5-B: per-user 200 req/min (keyed by user ID)

// Phase 5-C: Mutation Audit — logs every successful PUT/PATCH/DELETE to /api/*
app.use(createMutationAuditMiddleware(auditLogger));

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
mountRoutes(app, context);

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

// Error handling middleware — ApiError (4xx/5xx structured) + catch-all 500
// createErrorMiddleware unifies Pattern C (throw ApiError) with Pattern A (sendError)
app.use(createErrorMiddleware(logger));

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
// Start Server
const protocol = tlsConfig.enabled ? 'https' : 'http';
server.listen(PORT, "0.0.0.0", async () => {
    try {
        // Signal to parent process (Electron) that server is ready
        if (process.send) {
            process.send({ type: 'server-ready', port: PORT });
        }

        const ips = getLocalNetworkIPs();
        logger.info(`[Titan Protocol] Master Server running on port ${PORT} (${protocol.toUpperCase()})`);
        ips.forEach((ip) =>
            logger.info(`[Network] Available at: ${protocol}://${ip.ip}:${PORT}`),
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

        // Start UDP auto-discovery for Touch pairing
        udpDiscoveryService.start();

        // Fire off background services
        await initializeEcosystem(context);

        // Graceful shutdown: stop all background services before exit (P7 audit fix)
        const gracefulShutdown = async (signal: string) => {
            logger.info(
                `[Shutdown] ${signal} received — stopping background services...`,
            );

            const serviceStoppers = [
                { name: 'udpDiscovery', fn: () => { udpDiscoveryService.stop(); return Promise.resolve(); } },
                { name: 'tunnelManager', fn: () => tunnelManager.stop() },
                { name: 'cloudSyncService', fn: () => cloudSyncService?.stop?.() },
                { name: 'queueProcessor', fn: () => queueProcessor?.stop?.() },
                { name: 'campaignScheduler', fn: () => campaignScheduler?.stop?.() },
                { name: 'moneyTrashService', fn: () => moneyTrashService?.stop?.() },
                { name: 'resourceMonitor', fn: () => resourceMonitor?.stop?.() },
                { name: 'maintenancePoller', fn: () => maintenancePoller?.stop?.() },
                { name: 'automatedBackupService', fn: () => automatedBackupService?.stop?.() },
            ];

            const results = await Promise.allSettled(
                serviceStoppers.map(s => s.fn())
            );

            const failures = results.filter(r => r.status === 'rejected');
            if (failures.length > 0) {
                logger.error(
                    `[Shutdown] ${failures.length}/${serviceStoppers.length} services failed: ${
                        failures.map((_) => serviceStoppers[results.indexOf(_)].name).join(', ')
                    }`,
                );
            } else {
                logger.info('[Shutdown] All services stopped gracefully');
            }
            // Drain pending DB writes before closing (P4 audit fix — prevents data loss)
            try {
                await dbWriteQueue.shutdown();
                logger.info("[Shutdown] DbWriteQueue drained.");
            } catch (err: any) {
                logger.error("[Shutdown] DbWriteQueue drain failed:", { error: err?.message ?? String(err) });
            }
            // Terminate photo/ML worker pools (P8 audit fix — prevents thread leaks on exit)
            try {
                await photoProcessor?.shutdown?.();
                logger.info("[Shutdown] Worker pools terminated.");
            } catch (err: any) {
                logger.error("[Shutdown] Worker pool shutdown failed:", { error: err?.message ?? String(err) });
            }
            bonjour.unpublishAll(() => {
                server.close(() => {
                    logger.info('[Shutdown] Clean exit.');
                    process.exit(failures.length > 0 ? 1 : 0);
                });
            });

            // Force exit after 30s if server.close hangs
            setTimeout(() => {
                logger.error('[Shutdown] Forced exit after timeout');
                process.exit(1);
            }, 30_000).unref();
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
        const { Logger: LoggerC } = await import("./utils/logger");
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
    const { Logger: LoggerC } = await import("./utils/logger");
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
