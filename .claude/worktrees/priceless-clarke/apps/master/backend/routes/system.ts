// backend/routes/system.ts
import express, { Router } from "express";
import { Logger } from "../shared/logger";
import DatabaseManager from "../shared/db";

// Sub-routers
import healthRoutes from "./system/health";
import networkRoutes from "./system/network";
import hardwareRoutes from "./system/hardware";
import maintenanceRoutes from "./system/maintenance";
import operationsRoutes from "./system/operations";

interface SystemContext {
  dbManager: DatabaseManager;
  logger: Logger;
  wss?: any;
  realtimeService?: any;
  networkMonitor?: any;
  thermalService?: any;
  hardwareService?: any;
  cloudSyncService?: any;
  photoProcessor?: any;
  vectorIndex?: any;
}

/**
 * Main System Router for Master App
 * Delegates to specialized sub-modules for health, network, hardware, and maintenance.
 */
export default function systemRoutes(context: SystemContext): Router {
  const router = express.Router();

  // Root-level aliases for backward compatibility with frontend
  router.use("/", healthRoutes(context));
  
  // Scoped sub-routers
  router.use("/network", networkRoutes(context));
  router.use("/hardware", hardwareRoutes(context));
  router.use("/maintenance", maintenanceRoutes(context));
  router.use("/ops", operationsRoutes(context));

  // Legacy/Compatibility Root Routes (if not covered by healthRoutes)
  // router.get("/ip", ...); // Already in healthRoutes

  context.logger.info("System modular routes initialized");

  return router;
}
