// backend/routes/system/hardware.ts
import express, { Request, Response, Router } from "express";
import { Logger } from "../../shared/logger";
import { sendInternalError } from "../../shared/errorHandler";

interface HardwareContext {
  logger: Logger;
  hardwareService?: any;
  thermalService?: any;
}

export default function hardwareRoutes(context: HardwareContext): Router {
  const { logger } = context;
  const router = express.Router();

  /**
   * @route GET /printers
   */
  router.get("/printers", async (_req: Request, res: Response) => {
    try {
      if (!context.hardwareService) {
        return sendInternalError(res, "Hardware service not initialized");
      }
      const printers = await context.hardwareService.getPrinters();
      res.json(printers);
    } catch (error: any) {
      logger.error("Failed to get printers", error);
      sendInternalError(res, `Failed to get printers: ${error.message}`);
    }
  });

  /**
   * @route GET /status
   */
  router.get("/status", async (_req: Request, res: Response) => {
    try {
      const printers = await context.hardwareService.getPrinters();
      const queue = context.hardwareService.queue || [];
      res.json({
        success: true,
        timestamp: Date.now(),
        printers: printers,
        queueDepth: queue.length,
        processing: context.hardwareService.isProcessing,
      });
    } catch (error: any) {
      sendInternalError(res, error.message);
    }
  });

  /**
   * @route GET /thermal
   */
  router.get("/thermal", async (_req: Request, res: Response) => {
    try {
      if (!context.thermalService) {
        return res.status(503).json({
          success: false,
          temp: null,
          status: "normal",
          delay: 0,
          workerLimit: 4,
          timestamp: Date.now(),
          message: "Thermal Sentinel not initialized",
        });
      }

      const temp = await context.thermalService.getTemperature();
      const rawStatus = context.thermalService.getStatus();
      const delay = await context.thermalService.getThrottleDelay();
      const workerLimit = await context.thermalService.getSuggestedConcurrency(4);

      const statusMap: Record<string, "normal" | "warning" | "critical"> = {
        NOMINAL: "normal",
        WARNING: "warning",
        CRITICAL: "critical",
        EMERGENCY: "critical",
      };

      res.json({
        success: true,
        temp: temp,
        status: statusMap[rawStatus.status] || "normal",
        delay: delay,
        workerLimit: workerLimit,
        timestamp: Date.now(),
      });
    } catch (error: any) {
      res.json({
        success: false,
        temp: null,
        status: "normal",
        delay: 0,
        workerLimit: 4,
        timestamp: Date.now(),
      });
    }
  });

  /**
   * @route POST /print
   */
  router.post("/print", async (req: Request, res: Response) => {
    try {
      const { printer, photoPath } = req.body || {};
      if (!context.hardwareService) throw new Error("Hardware service not available");

      if (photoPath) {
        const jobId = await context.hardwareService.enqueuePrint(photoPath, printer);
        res.json({ success: true, jobId, message: "Print job enqueued" });
      } else {
        const printers = await context.hardwareService.getPrinters();
        const exists = printers.some((p: any) => p.name === printer);
        if (!exists) throw new Error(`Printer '${printer}' not found`);
        res.json({ success: true, message: "Printer verified" });
      }
    } catch (error: any) {
      logger.error("Print failed", error);
      sendInternalError(res, error.message);
    }
  });

  return router;
}
