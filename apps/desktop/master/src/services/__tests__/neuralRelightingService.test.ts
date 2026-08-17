import { describe, it, expect, vi } from 'vitest';
import { neuralRelightingService, NeuralRelightingService } from '../NeuralRelightingService';

describe('NeuralRelightingService', () => {
  it('returns appropriate default configurations for all presets', () => {
    const goldenHour = neuralRelightingService.getDefaultPresetConfig('GOLDEN_HOUR');
    expect(goldenHour.preset).toBe('GOLDEN_HOUR');
    expect(goldenHour.colorTemperatureK).toBe(3200);
    expect(goldenHour.intensity).toBeGreaterThan(1.0);

    const cyberpunk = neuralRelightingService.getDefaultPresetConfig('CYBERPUNK_NEON');
    expect(cyberpunk.preset).toBe('CYBERPUNK_NEON');
    expect(cyberpunk.specularBoost).toBeGreaterThan(2.0);

    const rembrandt = neuralRelightingService.getDefaultPresetConfig('STUDIO_REMBRANDT');
    expect(rembrandt.preset).toBe('STUDIO_REMBRANDT');
    expect(rembrandt.lightAzimuthDeg).toBe(45);
  });

  it('creates and completes a relighting job with depth estimation and PBR output', async () => {
    const job = await neuralRelightingService.createRelightingJob(
      'photo-test-8899',
      'GOLDEN_HOUR',
      { intensity: 1.5 },
      'GOLDEN_DUST'
    );

    expect(job.id).toBeDefined();
    expect(job.photoId).toBe('photo-test-8899');
    expect(job.particleEffect).toBe('GOLDEN_DUST');
    expect(job.relightingConfig.intensity).toBe(1.5);

    // Wait a brief tick for async processing to settle
    await new Promise(resolve => setTimeout(resolve, 60));

    const completed = neuralRelightingService.getJob(job.id);
    expect(completed).toBeDefined();
    expect(completed?.status).toBe('COMPLETED');
    expect(completed?.depthMapUrl).toContain('photo-test-8899_depth.png');
    expect(completed?.outputUrl).toContain('photo-test-8899_golden_hour_relit.jpg');
    expect(completed?.processingTimeMs).toBeGreaterThan(0);
  });
});
