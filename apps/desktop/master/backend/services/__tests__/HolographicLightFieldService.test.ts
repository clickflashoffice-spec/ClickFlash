import { describe, it, expect } from 'vitest';
import { holographicLightFieldService, HolographicLightFieldService } from '../HolographicLightFieldService';

describe('HolographicLightFieldService', () => {
  it('renders a 45-view light field quilt frame with default configuration', () => {
    const frame = holographicLightFieldService.renderQuiltFrame(
      'frame-holo-001',
      'https://cdn.clickflash.com/splats/coaster_ride_01.splat'
    );

    expect(frame.frameId).toBe('frame-holo-001');
    expect(frame.viewsRendered).toBe(45);
    expect(frame.quiltImageUrl).toContain('45v.png');
    expect(frame.encodingBitrateMbps).toBe(45);
    expect(frame.renderLatencyMs).toBeGreaterThan(0);
  });

  it('renders a high-density 180-view holographic memorial pillar quilt frame', () => {
    const frame = holographicLightFieldService.renderQuiltFrame(
      'frame-holo-002',
      'https://cdn.clickflash.com/splats/family_vip_01.splat',
      {
        viewsCount: 180,
        displayTarget: 'HOLOGRAPHIC_MEMORIAL_PILLAR'
      }
    );

    expect(frame.viewsRendered).toBe(180);
    expect(frame.quiltImageUrl).toContain('180v.png');
    expect(frame.encodingBitrateMbps).toBe(120);
  });
});
