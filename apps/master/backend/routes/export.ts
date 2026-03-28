import express, { Request, Response, Router } from "express";
import { ExportService } from "../services/ExportService";
import { Logger } from "../shared/logger";
import {
  sendInvalidInputError,
  sendInternalError,
} from "../shared/errorHandler";

interface ExportContext {
  logger: Logger;
  exportService: ExportService;
}

export default function exportRoutes(context: ExportContext): Router {
  const { logger, exportService } = context;
  const router = express.Router();

  /**
   * @route POST /export/batch
   * @description Batch process photos and save to a local directory (Law 14)
   */
  router.post("/batch", async (req: Request, res: Response) => {
    try {
      const { items, targetDir, options } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return sendInvalidInputError(
          res,
          "Items array is required and cannot be empty",
        );
      }

      if (!targetDir) {
        return sendInvalidInputError(res, "Target directory is required");
      }

      logger.info(
        `Starting batch export of ${items.length} photos to ${targetDir}`,
      );

      const result = await exportService.exportBatch(items, targetDir, options);

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
    } catch (error: any) {
      logger.error("Batch export route failed", { error: error.message });
      sendInternalError(res, error.message);
    }
  });

  return router;
}
