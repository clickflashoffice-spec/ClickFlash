import { Router } from "express";
import type { Request, Response } from "express";
import { DatabaseManager } from "../shared/db";
import { HardwareService } from "../shared/hardwareService";
import { ThermalService } from "../shared/thermalService";

const router = Router();

export default (db: DatabaseManager, thermalService: ThermalService) => {
  // Detailed health check
  router.get("/detailed", async (_req: Request, res: Response) => {
    const healthResult = await HardwareService.getHealthStatus();
    const thermal = thermalService.getStatus();

    // Check DB per Rule 15 scalability - just a simple ping
    let dbStatus = false;
    try {
      const result = db.get<{ one: number }>("SELECT 1 as one");
      dbStatus = result?.one === 1;
    } catch {
      dbStatus = false;
    }

    const health = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "unknown",
      machineId: process.env.MACHINE_ID || "not_provisioned",
      uptime: process.uptime(),
      checks: {
        database: dbStatus,
        diskSpace: healthResult ? healthResult.diskPercent < 90 : false,
        memory: healthResult ? healthResult.memoryPercent < 90 : false,
        thermal: thermal ? thermal.status !== "CRITICAL" : true,
      },
      metrics: {
        memory: {
          percent: healthResult?.memoryPercent || 0,
          usedMB: healthResult?.memoryUsed || 0,
          totalMB: healthResult?.memoryTotal || 0,
        },
        disk: {
          percent: healthResult?.diskPercent || 0,
          usedGB: healthResult?.diskUsed || 0,
          totalGB: healthResult?.diskTotal || 0,
        },
        thermal: thermal || { status: "UNKNOWN" },
      },
    };

    // Determine overall status
    const failedChecks = Object.values(health.checks).filter((v) => !v).length;
    if (failedChecks === 0) {
      health.status = "healthy";
    } else if (health.checks.database === false || failedChecks >= 2) {
      health.status = "unhealthy";
    } else {
      health.status = "degraded";
    }

    const statusCode =
      health.status === "healthy"
        ? 200
        : health.status === "degraded"
          ? 200
          : 503;

    res.status(statusCode).json(health);
  });

  // Basic health check
  router.get("/", (_req: Request, res: Response) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  });

  return router;
};
