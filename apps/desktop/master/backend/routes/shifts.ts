import { Router, Request, Response } from "express";
import { randomUUID } from "crypto";

export default function shiftRoutes(context: any) {
  const router = Router();
  const { dbManager, logger, photographerEventLedgerService } = context;

  // POST /api/shifts/proxy
  // Receives shift events from the mobile app via LAN, saves to local SQLite queue,
  // and attempts upstream forwarding to Cloudflare.
  router.post("/proxy", async (req: Request, res: Response) => {
    try {
      const shift = req.body;
      if (!shift || !shift.photographerId || !shift.type) {
        return res.status(400).json({ error: "Invalid shift data: photographerId and type required." });
      }

      logger.info(`[ShiftRoutes] Received shift proxy event from mobile: ${shift.photographerId} - ${shift.type} (method: ${shift.biometricMethod || 'STANDARD'})`);

      const payloadStr = JSON.stringify(shift);
      let rowId = 0;

      // Phase 4: Append to Immutable Event Ledger
      const nowIso = new Date().toISOString();
      const verificationMethod = shift.biometricMethod === 'FACE_VECTOR' ? 'BIOMETRIC' : 'UNVERIFIED';
      
      try {
        photographerEventLedgerService.append({
          schemaVersion: '1',
          eventId: randomUUID(),
          producer: 'MOBILE_PHOTOGRAPHER',
          producerEventId: shift.id || randomUUID(),
          photographerId: shift.photographerId,
          occurredAt: shift.timestamp || nowIso,
          recordedAt: nowIso,
          scope: { deskId: shift.stationId || 'MOBILE_APP', timezone: 'UTC' },
          sourceRecordId: shift.id || randomUUID(),
          payload: {
            kind: shift.type === 'START' ? 'SHIFT_STARTED' : 'SHIFT_ENDED',
            shiftId: shift.id || randomUUID(),
            stationId: shift.stationId,
            verification: verificationMethod,
          }
        });
      } catch (ledgerErr: any) {
        logger.error(`[ShiftRoutes] Failed to append shift to ledger: ${ledgerErr.message}`);
      }

      // 1. Publish event to Redis Streams instead of SQLite
      try {
        await context.redisCache.publishEvent("shift_proxy_ingestion", {
          photographerId: shift.photographerId,
          stationId: shift.stationId || '',
          shiftType: shift.type,
          timestamp: shift.timestamp || nowIso,
          biometricMethod: shift.biometricMethod || '',
          biometricConfidence: shift.biometricConfidence != null ? `${shift.biometricConfidence}` : '',
          payloadStr: payloadStr
        });
        logger.info(`[ShiftRoutes] Successfully pushed shift event to Redis Streams: shift_proxy_ingestion.`);
      } catch (redisErr: any) {
        logger.error(`[ShiftRoutes] Failed to publish shift to Redis stream: ${redisErr.message}`);
        // Fallback or just throw
      }

      return res.status(200).json({ success: true, message: "Shift proxied to event bus successfully" });
    } catch (error: any) {
      logger.error("[ShiftRoutes] Error handling shift proxy", error);
      return res.status(500).json({ error: "Failed to proxy shift" });
    }
  });

  // GET /api/shifts/proxy
  // Retrieves proxy queue events, optionally filtered by photographerId
  router.get("/proxy", async (req: Request, res: Response) => {
    try {
      const photographerId = req.query.photographerId as string;
      
      let query = `SELECT * FROM shifts_proxy_queue ORDER BY timestamp DESC LIMIT 50`;
      let params: any[] = [];
      
      if (photographerId) {
        query = `SELECT * FROM shifts_proxy_queue WHERE photographer_id = ? ORDER BY timestamp DESC LIMIT 50`;
        params = [photographerId];
      }

      const rows = dbManager.all(query, params);
      return res.status(200).json(rows);
    } catch (error: any) {
      logger.error("[ShiftRoutes] Error fetching shift proxy logs", error);
      return res.status(500).json({ error: "Failed to fetch shift logs" });
    }
  });

  // POST /api/shifts/reconcile
  // Exposes an endpoint for supervisor approvals (AND-013)
  router.post("/reconcile", async (req: Request, res: Response) => {
    try {
      const { photographerId, reconciliationId, periodFrom, periodToExclusive, currency, currencyExponent, eventSetHash, approvedById } = req.body;
      
      if (!photographerId || !periodFrom || !periodToExclusive || !approvedById) {
        return res.status(400).json({ error: "Missing required fields: photographerId, periodFrom, periodToExclusive, approvedById" });
      }

      const nowIso = new Date().toISOString();
      photographerEventLedgerService.append({
        schemaVersion: '1',
        eventId: randomUUID(),
        producer: 'MASTER',
        producerEventId: reconciliationId || randomUUID(),
        photographerId,
        occurredAt: nowIso,
        recordedAt: nowIso,
        scope: { deskId: 'MASTER_DESK', timezone: 'UTC' },
        sourceRecordId: reconciliationId || randomUUID(),
        payload: {
          kind: 'RECONCILIATION_APPROVED',
          reconciliationId: reconciliationId || randomUUID(),
          periodFrom,
          periodToExclusive,
          currency: currency || 'USD',
          currencyExponent: currencyExponent ?? 2,
          eventSetHash: eventSetHash || '0000000000000000000000000000000000000000000000000000000000000000', // Mock hash if not provided
          approvedById,
          approvedAt: nowIso,
        }
      });
      return res.status(200).json({ success: true });
    } catch (error: any) {
      logger.error("[ShiftRoutes] Error reconciling shifts", error);
      return res.status(500).json({ error: error.message });
    }
  });

  return router;
}

