import { describe, it, expect, vi } from 'vitest';
import { MagicShotService } from '../magicShotService';

// Mock logger
vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}));

// Mock redisCacheService
vi.mock('../redisCacheService', () => ({
  redisCache: {
    isConnected: vi.fn().mockReturnValue(false),
    set: vi.fn().mockResolvedValue('OK')
  }
}));

describe('MagicShotService', () => {
  const service = new MagicShotService();

  it('should seed default Magic Shot templates', () => {
    const templates = service.getTemplates();
    expect(templates.length).toBeGreaterThan(0);
    expect(templates.some(t => t.id === 'magic-shot-dragon-burst')).toBe(true);
    expect(templates.some(t => t.id === 'magic-shot-galaxy-portal')).toBe(true);
  });

  it('should retrieve a specific template by ID', () => {
    const dragonTemplate = service.getTemplateById('magic-shot-dragon-burst');
    expect(dragonTemplate).toBeDefined();
    expect(dragonTemplate?.name).toBe('Inferno Dragon Magic Shot');
    expect(dragonTemplate?.layers.length).toBeGreaterThan(0);
  });

  it('should successfully render a Magic Shot with depth metadata', async () => {
    const result = await service.renderMagicShot({
      photoId: 'photo-test-123',
      albumId: 'album-test-456',
      destinationId: 'LOCAL_DEST',
      templateId: 'magic-shot-dragon-burst',
      sourcePhotoUrl: 'https://cdn.clickflash.resort/photos/sample.jpg',
      renderVideoReel: true,
      resolution: '4k'
    });

    expect(result.status).toBe('completed');
    expect(result.photoId).toBe('photo-test-123');
    expect(result.outputImageUrl).toContain('vfx=magic-shot-dragon-burst');
    expect(result.outputVideoReelUrl).toBeDefined();
    expect(result.depthMetadata?.confidenceScore).toBeGreaterThan(0.9);
  });

  it('should generate valid SpatialMediaPayload for WebXR parallax viewing', () => {
    const spatialPayload = service.generateSpatialMediaPayload(
      'photo-test-123',
      'https://cdn.clickflash.resort/photos/sample.jpg',
      'https://cdn.clickflash.resort/photos/depth_sample.png',
      'magic-shot-dragon-burst'
    );

    expect(spatialPayload.photoId).toBe('photo-test-123');
    expect(spatialPayload.parallaxIntensity).toBe(0.08);
    expect(spatialPayload.aspectRatio).toBe(0.75);
    expect(spatialPayload.magicShotTemplateId).toBe('magic-shot-dragon-burst');
  });

  it('should throw error when rendering with non-existent template ID', async () => {
    await expect(service.renderMagicShot({
      photoId: 'photo-test-123',
      albumId: 'album-test-456',
      destinationId: 'LOCAL_DEST',
      templateId: 'non-existent-template-id',
      sourcePhotoUrl: 'https://cdn.clickflash.resort/photos/sample.jpg'
    })).rejects.toThrow('MagicShot template not found');
  });
});
