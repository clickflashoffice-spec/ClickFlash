import { describe, it, expect } from 'vitest';
import { subsurfaceSkinRadianceService, SubsurfaceSkinRadianceService } from '../SubsurfaceSkinRadianceService';

describe('SubsurfaceSkinRadianceService', () => {
  it('enhances skin radiance with realistic subsurface scattering and complexion fidelity', () => {
    const result = subsurfaceSkinRadianceService.enhanceSkinRadiance(
      'photo-portrait-777',
      'https://cdn.clickflash.com/raw/portrait_777.jpg',
      {
        epidermalScattering: 0.9,
        melaninLevel: 0.5,
        poreMicroDetailRetention: 0.98
      }
    );

    expect(result.photoId).toBe('photo-portrait-777');
    expect(result.enhancedUrl).toContain('_sss_radiance.jpg');
    expect(result.radianceScore).toBeGreaterThan(0.8);
    expect(result.skinTonePreservationIndex).toBeGreaterThan(0.95);
    expect(result.processingTimeMs).toBeGreaterThan(0);
  });
});
