import { describe, it, expect, vi, beforeEach } from 'vitest';
import { meshWorker, MeshWorker } from '../src/ai-workers/mesh-worker';
import type { GaussianSplatRequest, MeshGenerationRequest } from '@clickflash/types';

describe('MeshWorker & 3D Gaussian Splatting / NeRF Pipeline', () => {
  let worker: MeshWorker;

  beforeEach(() => {
    worker = new MeshWorker();
    vi.clearAllMocks();
  });

  describe('Gaussian Splat Metrics Estimation', () => {
    it('estimates fast_preview splat metrics with high framerate rendering target', () => {
      const metrics = worker.estimateSplatMetrics('fast_preview', 10);
      expect(metrics.splatCount).toBe(350_000);
      expect(metrics.renderFpsEstimate).toBe(120);
      expect(metrics.compressionRatio).toBeGreaterThan(4);
      expect(metrics.reconstructionTimeSec).toBe(8);
      expect(metrics.fileSizeBytes).toBe(14_000_000);
    });

    it('estimates cinematic_6dof splat metrics with 1.2M splat count for high fidelity', () => {
      const metrics = worker.estimateSplatMetrics('cinematic_6dof', 15);
      expect(metrics.splatCount).toBe(1_200_000);
      expect(metrics.renderFpsEstimate).toBe(60);
      expect(metrics.reconstructionTimeSec).toBe(33);
      expect(metrics.fileSizeBytes).toBe(48_000_000);
    });

    it('estimates ultra_dense splat metrics for archival park models', () => {
      const metrics = worker.estimateSplatMetrics('ultra_dense', 20);
      expect(metrics.splatCount).toBe(3_500_000);
      expect(metrics.renderFpsEstimate).toBe(45);
      expect(metrics.reconstructionTimeSec).toBe(90);
      expect(metrics.fileSizeBytes).toBe(140_000_000);
    });
  });

  describe('Gaussian Splat Scene Generation', () => {
    it('generates a complete .splat job with 6-DoF scene metadata', async () => {
      const request: GaussianSplatRequest = {
        photoIds: ['coaster_burst_01', 'coaster_burst_02', 'coaster_burst_03', 'coaster_burst_04'],
        sceneId: 'ride-splash-drop-cam-03',
        quality: 'cinematic_6dof',
        format: 'splat',
        boundingRadiusMeters: 4.5,
        cameraIntrinsics: {
          focalLength: 35,
          fovDegrees: 63.4,
          sensorWidthMm: 36
        }
      };

      const job = await worker.generateGaussianSplat(request);

      expect(job.id).toMatch(/^splat-job-/);
      expect(job.status).toBe('completed');
      expect(job.quality).toBe('cinematic_6dof');
      expect(job.format).toBe('splat');
      expect(job.sceneId).toBe('ride-splash-drop-cam-03');
      expect(job.splatUrl).toMatch(/\.splat$/);
      expect(job.plyUrl).toBeUndefined();
      expect(job.thumbnailUrl).toMatch(/thumb_splat-job-/);
      expect(job.splatCount).toBe(1_200_000);
      expect(job.renderFpsEstimate).toBe(60);
    });

    it('generates .ply format and caps splatCount when pointBudget is specified', async () => {
      const request: GaussianSplatRequest = {
        photoIds: ['char_meet_01', 'char_meet_02', 'char_meet_03'],
        quality: 'ultra_dense',
        format: 'ply',
        pointBudget: 800_000,
        webhookUrl: 'https://master.clickflash.internal:8090/webhooks/splat-ready'
      };

      const job = await worker.generateGaussianSplat(request);

      expect(job.format).toBe('ply');
      expect(job.plyUrl).toMatch(/\.ply$/);
      expect(job.splatUrl).toBeUndefined();
      expect(job.splatCount).toBe(800_000); // Capped by pointBudget
      expect(job.status).toBe('completed');
    });
  });

  describe('Standard 3D Mesh Generation Parity', () => {
    it('continues to generate standard GLB 3D models with polygon metrics', async () => {
      const request: MeshGenerationRequest = {
        photoIds: ['avatar_front', 'avatar_profile', 'avatar_45'],
        style: 'stylized',
        format: 'glb'
      };

      const job = await worker.generate3DMesh(request);

      expect(job.id).toMatch(/^mesh-job-/);
      expect(job.style).toBe('stylized');
      expect(job.format).toBe('glb');
      expect(job.modelUrl).toMatch(/\.glb$/);
      expect(job.polygonCount).toBe(35_000);
      expect(job.status).toBe('completed');
    });
  });
});
