import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { distributedTranscodingGrid } from '../../services/DistributedTranscodingGrid';
import createTranscodeRouter from '../transcode.routes';
import type { TranscodeGridNode } from '@clickflash/types';

describe('Distributed LAN Video Transcoding Grid', () => {
  let app: express.Express;

  beforeEach(() => {
    distributedTranscodingGrid.clearNodes();

    app = express();
    app.use(express.json());
    // Mock user permission middleware for testing
    app.use((req, _res, next) => {
      (req as any).user = { role: 'CEO', permissions: ['photo:edit'] };
      next();
    });

    const mockContext = {
      dbManager: {} as any,
      logger: { info: () => {}, error: () => {}, warn: () => {} },
      uploadDir: '/tmp/test_uploads'
    };

    app.use('/api/transcode', createTranscodeRouter(mockContext));
  });

  describe('Node Registration & Heartbeat Telemetry', () => {
    it('registers multiple LAN worker nodes and retrieves them via API', async () => {
      const nodeA: TranscodeGridNode = {
        nodeId: 'touch_kiosk_01',
        role: 'TOUCH_KIOSK',
        ipAddress: '192.168.1.101',
        port: 8091,
        hardwareCores: 8,
        hasGpuAcceleration: true,
        isBusy: false,
        currentLoadPercent: 12,
        lastHeartbeatTimestamp: Date.now()
      };

      const regRes = await request(app)
        .post('/api/transcode/grid/register')
        .send(nodeA);

      expect(regRes.status).toBe(200);
      expect(regRes.body.success).toBe(true);
      expect(regRes.body.node.nodeId).toBe('touch_kiosk_01');

      const listRes = await request(app).get('/api/transcode/grid/nodes');
      expect(listRes.status).toBe(200);
      expect(listRes.body.totalNodes).toBe(1);
      expect(listRes.body.availableWorkers).toBe(1);
    });

    it('records heartbeat telemetry and marks heavily loaded nodes as busy', async () => {
      distributedTranscodingGrid.registerWorker({
        nodeId: 'touch_kiosk_02',
        role: 'TOUCH_KIOSK',
        ipAddress: '192.168.1.102',
        port: 8091,
        hardwareCores: 4,
        hasGpuAcceleration: false,
        isBusy: false,
        currentLoadPercent: 20,
        lastHeartbeatTimestamp: Date.now()
      });

      const hbRes = await request(app)
        .post('/api/transcode/grid/heartbeat')
        .send({ nodeId: 'touch_kiosk_02', currentLoadPercent: 92 });

      expect(hbRes.status).toBe(200);

      const available = distributedTranscodingGrid.getAvailableWorkers();
      expect(available.some((n) => n.nodeId === 'touch_kiosk_02')).toBe(false); // Busy node filtered out
    });
  });

  describe('Dynamic Temporal Slicing & Parallel Execution', () => {
    it('creates accurate chunk slices across active workers with GPU prioritization', () => {
      const gpuNode: TranscodeGridNode = {
        nodeId: 'kiosk_gpu_hero',
        role: 'TOUCH_KIOSK',
        ipAddress: '192.168.1.105',
        port: 8091,
        hardwareCores: 8,
        hasGpuAcceleration: true,
        isBusy: false,
        currentLoadPercent: 15,
        lastHeartbeatTimestamp: Date.now()
      };

      const cpuNode: TranscodeGridNode = {
        nodeId: 'kiosk_cpu_aux',
        role: 'TOUCH_KIOSK',
        ipAddress: '192.168.1.106',
        port: 8091,
        hardwareCores: 4,
        hasGpuAcceleration: false,
        isBusy: false,
        currentLoadPercent: 10,
        lastHeartbeatTimestamp: Date.now()
      };

      distributedTranscodingGrid.registerWorker(cpuNode);
      distributedTranscodingGrid.registerWorker(gpuNode);

      const workers = distributedTranscodingGrid.getAvailableWorkers();
      expect(workers[0].nodeId).toBe('kiosk_gpu_hero'); // GPU node ranked first

      const chunks = distributedTranscodingGrid.createChunkPlan(15.0, 4, workers);
      expect(chunks).toHaveLength(4);
      expect(chunks[0].startTimeSec).toBe(0);
      expect(chunks[0].durationSec).toBe(3.75);
      expect(chunks[3].startTimeSec).toBe(11.25);
      expect(chunks[3].durationSec).toBe(3.75);
    });

    it('dispatches a distributed 4K transcode job and returns completed job status and URL', async () => {
      distributedTranscodingGrid.registerWorker({
        nodeId: 'node_alpha',
        role: 'TOUCH_KIOSK',
        ipAddress: '192.168.1.110',
        port: 8091,
        hardwareCores: 8,
        hasGpuAcceleration: true,
        isBusy: false,
        currentLoadPercent: 10,
        lastHeartbeatTimestamp: Date.now()
      });

      const dispatchRes = await request(app)
        .post('/api/transcode/grid/dispatch')
        .send({
          sourceAssetUrl: 'https://lan-master.clickflash.internal:8090/raw/4k_coaster_burst.mp4',
          targetFormat: '4K_H265',
          chunkCount: 4,
          totalDurationSec: 20
        });

      expect(dispatchRes.status).toBe(200);
      expect(dispatchRes.body.success).toBe(true);

      const job = dispatchRes.body.job;
      expect(job.status).toBe('COMPLETED');
      expect(job.targetFormat).toBe('4K_H265');
      expect(job.chunkCount).toBe(4);
      expect(job.completedChunks).toBe(4);
      expect(job.outputUrl).toContain('_4k_h265.mp4');
      expect(job.renderTimeMs).toBeGreaterThan(0);

      // Verify query by Job ID
      const queryRes = await request(app).get(`/api/transcode/grid/jobs/${job.jobId}`);
      expect(queryRes.status).toBe(200);
      expect(queryRes.body.job.jobId).toBe(job.jobId);
    });

    it('recovers from worker node timeout by re-routing to master fallback node', async () => {
      distributedTranscodingGrid.registerWorker({
        nodeId: 'unstable_node_99',
        role: 'WORKER_EDGE',
        ipAddress: '192.168.1.199',
        port: 8091,
        hardwareCores: 2,
        hasGpuAcceleration: false,
        isBusy: false,
        currentLoadPercent: 5,
        lastHeartbeatTimestamp: Date.now()
      });

      const job = await distributedTranscodingGrid.dispatchJob(
        'https://lan-master.clickflash.internal:8090/raw/highlight_reel.mp4',
        'TIKTOK_9_16_BEAT_SYNC',
        {
          totalDurationSec: 10,
          chunkCount: 2,
          failoverSimulation: true
        }
      );

      expect(job.status).toBe('COMPLETED');
      expect(job.chunks?.some((c) => c.assignedNodeId === 'master_primary_fallback')).toBe(true);
    });
  });
});
