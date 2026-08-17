import { describe, it, expect } from 'vitest';
import { spatialAudioEngine, SpatialAudioEngine } from '../SpatialAudioEngine';

describe('SpatialAudioEngine', () => {
  it('calculates 3D binaural gain and ITD for positioned audio sources', () => {
    // Sound source located to the right side (x: 5, y: 0, z: 0)
    const panRight = spatialAudioEngine.calculateBinauralPan({ x: 5, y: 0, z: 0 });
    expect(panRight.gainRight).toBeGreaterThan(panRight.gainLeft);
    expect(panRight.itdMilliseconds).toBeGreaterThan(0);

    // Sound source located to the left side (x: -5, y: 0, z: 0)
    const panLeft = spatialAudioEngine.calculateBinauralPan({ x: -5, y: 0, z: 0 });
    expect(panLeft.gainLeft).toBeGreaterThan(panLeft.gainRight);
  });

  it('synthesizes a 7.1.4 soundscape package for a photo highlight', () => {
    const result = spatialAudioEngine.synthesizeSoundscape('photo-audio-123', [
      {
        sourceId: 'coaster_scream_01',
        type: 'ROLLERCOASTER_SCREAM',
        coordinates: { x: 10, y: 5, z: 8 },
        volumeDb: -3.5,
        dopplerFactor: 1.25
      },
      {
        sourceId: 'ambient_music_01',
        type: 'AMBIENT_PARK_MUSIC',
        coordinates: { x: 0, y: 15, z: 0 },
        volumeDb: -12.0,
        dopplerFactor: 1.0
      }
    ]);

    expect(result.photoId).toBe('photo-audio-123');
    expect(result.renderedAudioChannels).toBe(12);
    expect(result.sourcesCount).toBe(2);
    expect(result.spatialStreamUrl).toContain('714_atmos.m4a');
    expect(result.acousticProfile.virtualSpeakerLayout).toBe('7.1.4_DOLBY_ATMOS');
  });
});
