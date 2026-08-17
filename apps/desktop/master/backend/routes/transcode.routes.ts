import express, { Request, Response, Router } from 'express';
import { distributedTranscodingGrid } from '../services/DistributedTranscodingGrid';
import DatabaseManager from '../database/db';
import { requirePermission, PERMISSIONS } from '../middleware/permissions';
import type { TranscodeGridNode } from '@clickflash/types';

export default function (context: { dbManager: DatabaseManager; logger: any; uploadDir: string }): Router {
  const router = express.Router();
  const { logger } = context;

  /**
   * @route POST /api/transcode/grid/register
   * @desc Registers a Touch Kiosk or Master edge node into the distributed LAN grid
   */
  router.post('/grid/register', (req: Request, res: Response) => {
    try {
      const { nodeId, role, ipAddress, port, hardwareCores, hasGpuAcceleration } = req.body;

      if (!nodeId || !ipAddress) {
        return res.status(400).json({ error: 'nodeId and ipAddress are required' });
      }

      const node: TranscodeGridNode = {
        nodeId,
        role: role || 'TOUCH_KIOSK',
        ipAddress,
        port: port || 8091,
        hardwareCores: hardwareCores || 4,
        hasGpuAcceleration: Boolean(hasGpuAcceleration),
        isBusy: false,
        currentLoadPercent: 0,
        lastHeartbeatTimestamp: Date.now()
      };

      distributedTranscodingGrid.registerWorker(node);
      res.status(200).json({ success: true, node });
    } catch (error) {
      logger.error('[TranscodeRoutes] Failed to register grid node', error);
      res.status(500).json({ error: 'Failed to register grid node', details: String(error) });
    }
  });

  /**
   * @route POST /api/transcode/grid/heartbeat
   * @desc Records worker node telemetry and CPU/GPU load
   */
  router.post('/grid/heartbeat', (req: Request, res: Response) => {
    try {
      const { nodeId, currentLoadPercent = 0 } = req.body;

      if (!nodeId) {
        return res.status(400).json({ error: 'nodeId is required' });
      }

      const updated = distributedTranscodingGrid.recordHeartbeat(nodeId, currentLoadPercent);
      if (!updated) {
        return res.status(404).json({ error: `Node ${nodeId} is not registered` });
      }

      res.status(200).json({ success: true, nodeId, currentLoadPercent });
    } catch (error) {
      logger.error('[TranscodeRoutes] Heartbeat failure', error);
      res.status(500).json({ error: 'Heartbeat update failed', details: String(error) });
    }
  });

  /**
   * @route GET /api/transcode/grid/nodes
   * @desc Lists all active and healthy grid nodes
   */
  router.get('/grid/nodes', (_req: Request, res: Response) => {
    try {
      const nodes = distributedTranscodingGrid.getRegisteredNodes();
      const available = distributedTranscodingGrid.getAvailableWorkers();
      res.status(200).json({ success: true, totalNodes: nodes.length, availableWorkers: available.length, nodes });
    } catch (error) {
      logger.error('[TranscodeRoutes] Failed to retrieve grid nodes', error);
      res.status(500).json({ error: 'Failed to retrieve grid nodes', details: String(error) });
    }
  });

  /**
   * @route POST /api/transcode/grid/dispatch
   * @desc Dispatches a 4K highlight reel distributed transcode job across the LAN grid
   */
  router.post('/grid/dispatch', requirePermission(PERMISSIONS.PHOTO_EDIT), async (req: Request, res: Response) => {
    try {
      const { sourceAssetUrl, targetFormat = '4K_H265', chunkCount = 4, totalDurationSec = 15 } = req.body;

      if (!sourceAssetUrl) {
        return res.status(400).json({ error: 'sourceAssetUrl is required' });
      }

      const job = await distributedTranscodingGrid.dispatchJob(sourceAssetUrl, targetFormat, {
        chunkCount,
        totalDurationSec
      });

      res.status(200).json({ success: true, job });
    } catch (error) {
      logger.error('[TranscodeRoutes] Failed to dispatch transcode job', error);
      res.status(500).json({ error: 'Failed to dispatch transcode job', details: String(error) });
    }
  });

  /**
   * @route GET /api/transcode/grid/jobs/:jobId
   * @desc Queries job status, chunk breakdown, and rendered video output URL
   */
  router.get('/grid/jobs/:jobId', (req: Request, res: Response) => {
    try {
      const jobId = Array.isArray(req.params.jobId) ? req.params.jobId[0] : String(req.params.jobId);
      const job = distributedTranscodingGrid.getJob(jobId);

      if (!job) {
        return res.status(404).json({ error: `Transcode job ${jobId} not found` });
      }

      res.status(200).json({ success: true, job });
    } catch (error) {
      logger.error('[TranscodeRoutes] Failed to get transcode job', error);
      res.status(500).json({ error: 'Failed to get transcode job', details: String(error) });
    }
  });

  return router;
}
