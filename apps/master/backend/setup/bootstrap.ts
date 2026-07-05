import { initDefaultUser } from "./init-default-user";
import { BootstrapService } from "../services/provisioning/BootstrapService";
import startFolderMonitor from "../services/folderMonitor";
import MaintenanceService from "../services/maintenanceService";
import startOrderWatcher from "../services/orderWatcher";
import { tunnelService } from "../services/tunnelService";
import AuditService from '../services/auditService';
import path from "path";

export async function initializeEcosystem(context: any) {
  const {
    logger,
    dbManager,
    vectorIndex,
    faceIndexingWorker,
    queueProcessor,
    maintenancePoller,
    cloudSyncService,
    moneyTrashService,
    campaignScheduler,
    auditLogger,
    config
  } = context;

  logger.info("[Startup] Initiating architectural startup sequence...");
  const bootTime = Date.now();

  try {
    // 1. Critical: Default User & Bootstrap
    await initDefaultUser(dbManager);
    const bootstrapService = new BootstrapService(dbManager, logger);
    await bootstrapService.runIfRequired();
    logger.info("[Startup] Data Integrity: Default User and Bootstrap checks verified.");

    // 2. Critical: Vector Index
    await vectorIndex.initialize();
    faceIndexingWorker.start();
    logger.info("[Startup] AI Layer: Vector Index + Face Indexing Worker initialized.");

    // 3. Operational: Queue & Sync
    queueProcessor.start();
    maintenancePoller.start();
    await cloudSyncService.syncRemoteSettings().catch((e: Error) => logger.warn("[Startup] Settings sync failed", { error: e.message }));
    logger.info("[Startup] Core: Queue and Maintenance Poller active.");

    // 4. Operational Workers (Law 13 Compliance)
    startFolderMonitor(context);
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

    // 6. Cloudflare Tunnel (if configured)
    if (process.env.TUNNEL_ID) {
      tunnelService.start().then((started) => {
        if (started) {
          logger.info("[Startup] Cloudflare Tunnel: Connected and routing traffic.");
        } else {
          logger.warn("[Startup] Cloudflare Tunnel: Failed to start - check credentials and network.");
        }
      }).catch((err: Error) => {
        logger.error("[Startup] Cloudflare Tunnel error:", { error: err?.message ?? String(err) });
      });
    } else {
      logger.info("[Startup] Cloudflare Tunnel: Not configured (TUNNEL_ID not set).");
    }

    campaignScheduler.start();
    logger.info("[Startup] Marketing Layer: Scheduler active.");

    // Initialize Audit Service after all services are ready
    const auditService = new AuditService(dbManager, logger, auditLogger, config || { DATA_DIR: process.env.DATA_DIR || "./pb_data" });
    context.auditService = auditService;
    
    // Run initial audit on startup (non-blocking)
    auditService.runAudit().then((report: any) => {
      logger.info(`[Audit] Initial startup audit complete — ${report.passed}/${report.totalChecks} passed`);
      if (report.failed > 0) {
        logger.warn(`[Audit] ${report.failed} critical checks failed — see ${path.join(config?.DATA_DIR || process.env.DATA_DIR || "./pb_data", 'audit-reports', 'latest-summary.txt')}`);
      }
    }).catch((err: any) => {
      logger.error("[Audit] Initial audit failed:", err);
    });

    logger.info(`[Startup] Ecosystem initialized successfully in ${Date.now() - bootTime}ms.`);
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error("[Startup] CRITICAL SYSTEM BOOT FAILURE:", {
      message: error.message,
      stack: error.stack
    });
  }
}
