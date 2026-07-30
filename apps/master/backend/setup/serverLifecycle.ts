import express, { Application, Request, Response } from "express";
import fs from "fs";
import path from "path";
import { Bonjour } from "bonjour-service";
import { Server } from "http";
import { Server as HttpsServer } from "https";

import { getLocalNetworkIPs } from "../services/networkDetection";
import { initializeEcosystem } from "./bootstrap";
import { sendNotFoundError } from "../utils/errorHandler";
import { createErrorMiddleware } from "../utils/apiError";
import { tunnelManager } from "../services/TunnelManager";
import { MQTTBrokerService } from "../services/mqttBrokerService";
import { YjsWebsocketServer } from "../services/yjsWebsocketServer";
import { PORT, WEB_ROOT } from "../config/constants";
import { MOBILE_CAPTURE_MASTER_ID } from "../services/mobileCaptureProtocol";

/**
 * Sets up static file serving and global error handling fallbacks.
 */
export function setupStaticAndErrorFallback(app: Application, context: any): void {
  const { logger } = context;

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
  app.use(createErrorMiddleware(logger));
}

/**
 * Starts the HTTP/HTTPS server, initializes Bonjour/UDP discovery, kicks off background
 * services, and registers graceful shutdown and crash handlers.
 */
export function startServer(
  server: Server | HttpsServer,
  context: any,
  tlsConfig: { enabled: boolean }
): void {
  const {
    logger,
    dbWriteQueue,
    photoProcessor,
    cloudSyncService,
    queueProcessor,
    campaignScheduler,
    moneyTrashService,
    resourceMonitor,
    maintenancePoller,
    fleetService,
    automatedBackupService,
    udpDiscoveryService,
  } = context;

  // Start Tunnel Manager if configured
  if (process.env.ENABLE_CLOUDFLARED_TUNNEL === "true") {
    tunnelManager.start().catch((e) => logger.error("Failed to start tunnel:", e));
  } else {
    logger.info("[Tunnel] Cloudflared tunnel disabled. Set ENABLE_CLOUDFLARED_TUNNEL=true to enable.");
  }

  const protocol = tlsConfig.enabled ? "https" : "http";
  server.listen(PORT, "0.0.0.0", async () => {
    try {
      // Signal to parent process (Electron) that server is ready
      if (process.send) {
        process.send({ type: "server-ready", port: PORT });
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
        txt: {
          mode: "master",
          version: "4.1.0",
          captureProtocol: "CF-MOBILE-V1",
          masterId: MOBILE_CAPTURE_MASTER_ID,
          transport: protocol,
        },
      });

      // Start UDP auto-discovery for Touch pairing
      if (udpDiscoveryService) {
        udpDiscoveryService.start();
      }

      // Fire off background services
      await initializeEcosystem(context);

      // Graceful shutdown: stop all background services before exit
      const gracefulShutdown = async (signal: string) => {
        logger.info(
          `[Shutdown] ${signal} received — stopping background services...`,
        );

        const serviceStoppers = [
          { name: "udpDiscovery", fn: () => { udpDiscoveryService.stop(); return Promise.resolve(); } },
          { name: "tunnelManager", fn: () => tunnelManager.stop() },
          { name: "cloudSyncService", fn: () => cloudSyncService?.stop?.() },
          { name: "queueProcessor", fn: () => queueProcessor?.stop?.() },
          { name: "campaignScheduler", fn: () => campaignScheduler?.stop?.() },
          { name: "moneyTrashService", fn: () => moneyTrashService?.stop?.() },
          { name: "resourceMonitor", fn: () => resourceMonitor?.stop?.() },
          { name: "maintenancePoller", fn: () => maintenancePoller?.stop?.() },
          { name: "fleetService", fn: () => fleetService?.stop?.() },
          { name: "automatedBackupService", fn: () => automatedBackupService?.stop?.() },
          { name: "mqttBroker", fn: () => { MQTTBrokerService.stop(); return Promise.resolve(); } },
          { name: "yjsWebsocketServer", fn: () => { YjsWebsocketServer.stop(); return Promise.resolve(); } }
        ];

        const results = await Promise.allSettled(
          serviceStoppers.map((s) => s.fn())
        );

        const failures = results.filter((r) => r.status === "rejected");
        if (failures.length > 0) {
          logger.error(
            `[Shutdown] ${failures.length}/${serviceStoppers.length} services failed: ${
              failures.map((_) => serviceStoppers[results.indexOf(_)].name).join(", ")
            }`,
          );
        } else {
          logger.info("[Shutdown] All services stopped gracefully");
        }

        // Drain pending DB writes before closing
        try {
          await dbWriteQueue.shutdown();
          logger.info("[Shutdown] DbWriteQueue drained.");
        } catch (err: any) {
          logger.error("[Shutdown] DbWriteQueue drain failed:", { error: err?.message ?? String(err) });
        }

        // Terminate photo/ML worker pools
        try {
          await photoProcessor?.shutdown?.();
          logger.info("[Shutdown] Worker pools terminated.");
        } catch (err: any) {
          logger.error("[Shutdown] Worker pool shutdown failed:", { error: err?.message ?? String(err) });
        }

        bonjour.unpublishAll(() => {
          server.close(() => {
            logger.info("[Shutdown] Clean exit.");
            process.exit(failures.length > 0 ? 1 : 0);
          });
        });

        // Force exit after 30s if server.close hangs
        setTimeout(() => {
          logger.error("[Shutdown] Forced exit after timeout");
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
      context.logger.error(`[FATAL] Port ${PORT} is already in use.`);
      process.exit(1);
    } else {
      context.logger.error("[FATAL] Server error:", e);
      process.exit(1);
    }
  });

  // ─── Phase 55: Global Crash Monitoring ──────────────────────────────────────
  process.on("uncaughtException", async (err: Error) => {
    context.logger.error(`[FATAL] Uncaught Exception: ${err.message}`, { stack: err.stack });
    try {
      const { Logger: LoggerC } = await import("../utils/logger");
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
    context.logger.error("[FATAL] Unhandled Promise Rejection:", message);
    try {
      const { Logger: LoggerC } = await import("../utils/logger");
      const logDir = process.env.DATA_DIR || "./pb_data";
      const emergencyLogger = new LoggerC(logDir);
      emergencyLogger.error("[FATAL] Unhandled Promise Rejection", {
        message,
        stack,
      });
    } catch (e) {
      // Silently swallow — already logged
    }
  });
}
