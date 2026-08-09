import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

// Shared Modules
import { DatabaseManager } from "../database/db";
import AuditLogger from "../utils/auditLogger";
import { Logger } from "../utils/logger";
import { setAuditLogger as setRateLimiterAuditLogger } from "../middleware/rateLimiter";
import { TokenRefreshService } from "../middleware/tokenRefresh";

// Services
import { PhotoProcessor } from "../services/photoProcessor";
import { ThermalService } from "../services/thermalService";
import { ResourceMonitor } from "../services/ResourceMonitor";
import RealtimeService from "../services/realtimeService";
import { NetworkMonitor } from "../services/NetworkMonitor";
import { SyncManager } from "../services/SyncManager";
import { CloudSyncService } from "../services/cloudSyncService";
import { HardwareService } from "../services/HardwareService";
import { OrderValidationService } from "../services/OrderValidationService";
import { QueueProcessor } from "../services/QueueProcessor";
import { DbWriteQueue } from "../services/DbWriteQueue";
import { FulfillmentService } from "../services/FulfillmentService";
import { FulfillmentSlipService } from "../services/FulfillmentSlipService";
import MoneyTrashService from "../services/MoneyTrashService";
import { EmailService } from "../services/emailService";
import { BookingService } from "../services/bookingService";
import { CampaignScheduler } from "../services/campaignScheduler";
import { InventoryService } from "../services/InventoryService";
import { VectorIndexService } from "../services/VectorIndexService";
import { LedgerService } from "../services/LedgerService";
import { PhotographerEventLedgerService } from "../services/PhotographerEventLedgerService";
import { MaintenancePoller } from "../services/MaintenancePoller";
import { ExportService } from "../services/ExportService";
import { ResortAnalyticsService } from "../services/ResortAnalyticsService";
import { DiagnosticSyncService } from "../services/DiagnosticSyncService";
import { BackupService } from "../services/BackupService";
import { AutomatedBackupService } from "../services/AutomatedBackupService";
import { FleetService } from "../services/FleetService";
import { PredictiveCacheService } from "../services/PredictiveCacheService";
import { BandwidthShaperService } from "../services/BandwidthShaperService";

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
} from "../config/constants";
import { initCsrfTokenStore } from "../utils/csrfStore";

export interface SetupServicesResult {
  dbManager: DatabaseManager;
  logger: Logger;
  auditLogger: AuditLogger;
  tokenRefreshService: TokenRefreshService;
  context: any;
  photoProcessor: PhotoProcessor;
  dbWriteQueue: DbWriteQueue;
  cloudSyncService: CloudSyncService;
  queueProcessor: QueueProcessor;
  campaignScheduler: CampaignScheduler;
  moneyTrashService: MoneyTrashService;
  resourceMonitor: ResourceMonitor;
  maintenancePoller: MaintenancePoller;
  fleetService: FleetService;
  automatedBackupService: AutomatedBackupService;
  udpDiscoveryService: any;
  realtimeService: RealtimeService;
}

/**
 * Initializes required directories and all backend services, returning the application context
 * and core service singletons.
 */
export function setupServices(): SetupServicesResult {
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

  // 2. Core Services Init (Bootstrap Phase)
  let dbManager: DatabaseManager;
  let logger: Logger;
  let auditLogger: AuditLogger;
  let tokenRefreshService: TokenRefreshService;

  try {
    logger = new Logger(DATA_DIR, (process.env.LOG_LEVEL as string) || "INFO");
    auditLogger = new AuditLogger(DATA_DIR);
    setRateLimiterAuditLogger(auditLogger);

    const SHARED_MIGRATIONS_DIR = path.join(__dirname, "..", "database", "migrations");
    const BACKEND_MIGRATIONS_DIR = path.join(__dirname, "..", "migrations");
    dbManager = new DatabaseManager(DB_FILE);
    dbManager.connect(SHARED_MIGRATIONS_DIR);
    dbManager.startIdleWalCheckpointScheduler(30 * 60 * 1000); // Checkpoint WAL every 30 minutes

    initCsrfTokenStore(dbManager);
    tokenRefreshService = new TokenRefreshService(dbManager, auditLogger);

    if (
      fs.existsSync(BACKEND_MIGRATIONS_DIR) &&
      BACKEND_MIGRATIONS_DIR !== SHARED_MIGRATIONS_DIR
    ) {
      dbManager.runMigrations?.(BACKEND_MIGRATIONS_DIR);
    }
  } catch (err) {
    process.stderr.write(`[Fatal] Bootstrap Error: ${err}\n`);
    process.exit(1);
  }

  // --- Security: Service Token Generation ---
  if (!process.env.SERVICE_SECRET) {
    const storedSecret = dbManager?.get<{ value: string }>(
      "SELECT value FROM settings WHERE id = 'SERVICE_SECRET'"
    );

    if (storedSecret?.value) {
      process.env.SERVICE_SECRET = storedSecret.value;
      logger.info("[Security] Loaded SERVICE_SECRET from database");
    } else {
      process.env.SERVICE_SECRET = randomUUID();
      try {
        dbManager?.run(
          "INSERT INTO settings (id, value) VALUES ('SERVICE_SECRET', ?) ON CONFLICT(id) DO UPDATE SET value = excluded.value",
          [process.env.SERVICE_SECRET]
        );
        logger.info("[Security] Generated and stored persistent SERVICE_SECRET");
      } catch (err) {
        logger.info("[Security] Generated temporary SERVICE_SECRET (DB not ready)");
      }
    }
  } else {
    try {
      dbManager?.run(
        "INSERT INTO settings (id, value) VALUES ('SERVICE_SECRET', ?) ON CONFLICT(id) DO UPDATE SET value = excluded.value",
        [process.env.SERVICE_SECRET]
      );
    } catch (err) {
      // Ignore if DB not ready
    }
    logger.info("[Security] Loaded SERVICE_SECRET from environment");
  }

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
  let photographerEventLedgerService: PhotographerEventLedgerService;
  let exportService: ExportService;
  let resortAnalytics: ResortAnalyticsService;
  let diagnosticSync: DiagnosticSyncService;
  let backupService: BackupService;
  let automatedBackupService: AutomatedBackupService;

  try {
    dbWriteQueue = new DbWriteQueue(dbManager, { logger });
    thermalService = new ThermalService(logger);
    photoProcessor = new PhotoProcessor(UPLOAD_DIR, thermalService, dbManager);
    fulfillmentService = new FulfillmentService(
      dbManager,
      logger,
      photoProcessor,
    );
    fulfillmentSlipService = new FulfillmentSlipService(
      logger,
      dbManager,
      DATA_DIR,
    );

    emailService = new EmailService(logger);
    emailService.setCloudConfig(
      process.env.CLOUD_API_URL || "",
      process.env.CLOUD_API_TOKEN || "",
    );
    bookingService = new BookingService(logger, emailService);

    campaignScheduler = new CampaignScheduler(logger, dbManager, emailService);

    inventoryService = new InventoryService(dbManager, logger);
    ledgerService = new LedgerService(dbManager, logger);
    photographerEventLedgerService = new PhotographerEventLedgerService(
      dbManager,
      logger,
    );
    vectorIndex = VectorIndexService.getInstance(dbManager, logger);

    exportService = new ExportService(logger, dbManager);
    resortAnalytics = new ResortAnalyticsService(dbManager, logger);
    diagnosticSync = new DiagnosticSyncService(dbManager, logger, resortAnalytics);

    backupService = new BackupService(DB_FILE, UPLOAD_DIR, logger);
    automatedBackupService = new AutomatedBackupService(
      backupService,
      process.env.DESK_ID || "MASTER_01",
      process.env.CLOUD_API_URL || "https://management.clickflash.com",
      process.env.CLOUD_API_TOKEN || ""
    );
  } catch (err) {
    logger.error("[Fatal] Service Initialization Error:", err);
    process.exit(1);
  }

  // 4. Operational Services
  const networkMonitor = new NetworkMonitor(logger);
  const realtimeService = new RealtimeService(logger, networkMonitor);
  const syncManager = new SyncManager(logger, dbManager);
  const hardwareService = new HardwareService(
    logger,
    dbManager,
    inventoryService,
  );

  const predictiveCacheService = PredictiveCacheService.getInstance(dbManager, logger);
  predictiveCacheService.startPredictiveWorker();

  const bandwidthShaperService = BandwidthShaperService.getInstance(logger, networkMonitor);
  bandwidthShaperService.startShaperLoop();

  const resourceMonitor = new ResourceMonitor(logger);
  resourceMonitor.start(30000); // Check every 30s

  const cloudSyncService = new CloudSyncService(
    dbManager,
    logger,
    emailService,
    resourceMonitor,
    resortAnalytics,
  );

  const maintenancePoller = new MaintenancePoller({
    hubUrl: process.env.CLOUD_API_URL || "",
    hubToken: process.env.CLOUD_API_TOKEN || "",
    deskId: process.env.DESK_ID || "MASTER_01",
    dataDir: DATA_DIR,
    logger,
    dbManager,
    cloudSyncService: { sync: () => cloudSyncService.sync() },
  });

  const fleetService = new FleetService(
    logger,
    dbManager,
    thermalService,
    photoProcessor,
    dbWriteQueue,
    process.env.CLOUD_API_URL || "",
    process.env.CLOUD_API_TOKEN || ""
  );

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

  // Context for routes & workers
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
      TLS_ENABLED,
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

    uploadDir: UPLOAD_DIR,
    vectorIndex,
    ledgerService,
    photographerEventLedgerService,
    tokenRefreshService,
    networkMonitor,
    exportService,
    resortAnalytics,
    diagnosticSync,
    automatedBackupService,
    queueProcessor,
    maintenancePoller,
    fleetService,
    moneyTrashService,
    predictiveCacheService,
    bandwidthShaperService,
    auditService: null as any,
  };

  return {
    dbManager,
    logger,
    auditLogger,
    tokenRefreshService,
    context,
    photoProcessor,
    dbWriteQueue,
    cloudSyncService,
    queueProcessor,
    campaignScheduler,
    moneyTrashService,
    resourceMonitor,
    maintenancePoller,
    fleetService,
    automatedBackupService,
    udpDiscoveryService: require("../services/udpDiscoveryService").udpDiscoveryService,
    realtimeService,
  };
}
