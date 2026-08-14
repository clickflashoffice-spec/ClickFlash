import express, { type Request, type Response, type Router } from "express";
import { z } from "zod";

import type { DatabaseManager } from "../database/db";
import { PERMISSIONS, requirePermission } from "../middleware/permissions";
import { strictRateLimiter } from "../middleware/rateLimiter";
import {
  PhotographerCommandCenterError,
  PhotographerCommandCenterService,
} from "../services/PhotographerCommandCenterService";
import type { Logger } from "../utils/logger";

interface PhotographerCommandCenterContext {
  dbManager: DatabaseManager;
  logger: Logger;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_PERIOD_DAYS = 93;
const DAY_MS = 24 * 60 * 60 * 1000;

const querySchema = z
  .object({
    from: z.string().regex(DATE_PATTERN).refine(isValidIsoDate),
    to: z.string().regex(DATE_PATTERN).refine(isValidIsoDate),
    timezone: z.string().trim().min(1).max(64),
  })
  .strict();

export default function photographerCommandCenterRoutes(
  context: PhotographerCommandCenterContext
): Router {
  const router = express.Router();
  const service = new PhotographerCommandCenterService(context.dbManager);

  router.get(
    "/command-center",
    strictRateLimiter,
    requirePermission(PERMISSIONS.PHOTOGRAPHER_SELF_VIEW),
    (req: Request, res: Response) => {
      const parsed = querySchema.safeParse(req.query);
      if (!parsed.success) {
        res.status(400).json({
          error: "A valid from, exclusive to, and timezone are required.",
        });
        return;
      }
      const range = validateRange(parsed.data.from, parsed.data.to);
      if (!range.ok) {
        res.status(400).json({ error: range.error });
        return;
      }
      const photographerId = req.user?.id;
      if (typeof photographerId !== "string" || !photographerId.trim()) {
        res.status(401).json({ error: "Authenticated photographer identity is required." });
        return;
      }

      try {
        const snapshot = service.buildSnapshot({
          photographerId: photographerId.trim(),
          from: parsed.data.from,
          toExclusive: parsed.data.to,
          timezone: parsed.data.timezone,
        });
        res.setHeader("Cache-Control", "private, no-store");
        context.logger.info("[CommandCenter] Self snapshot read", {
          photographerId: photographerId.trim(),
          deskId: snapshot.scope.deskId,
          from: snapshot.scope.from,
          toExclusive: snapshot.scope.toExclusive,
          completeness: snapshot.completeness,
        });
        res.json(snapshot);
      } catch (error) {
        const status = error instanceof PhotographerCommandCenterError
          ? error.statusCode
          : 500;
        const message = error instanceof PhotographerCommandCenterError
          ? error.message
          : "Photographer command center snapshot could not be generated.";
        context.logger.error("[CommandCenter] Snapshot generation failed", {
          photographerId: photographerId.trim(),
          error: error instanceof Error ? error.message : String(error),
        });
        res.status(status).json({ error: message });
      }
    }
  );

  return router;
}

function validateRange(
  from: string,
  toExclusive: string
): { ok: true } | { ok: false; error: string } {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${toExclusive}T00:00:00Z`);
  const days = (end - start) / DAY_MS;
  if (!Number.isInteger(days) || days <= 0) {
    return { ok: false, error: "The exclusive to date must be after from." };
  }
  if (days > MAX_PERIOD_DAYS) {
    return { ok: false, error: `The maximum period is ${MAX_PERIOD_DAYS} days.` };
  }
  return { ok: true };
}

function isValidIsoDate(value: string): boolean {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}
