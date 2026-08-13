import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mediaPipeGestureService } from '../mediaPipeGestureService';

describe('MediaPipeGestureService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // @ts-ignore
    mediaPipeGestureService.listeners.clear();
    // @ts-ignore
    mediaPipeGestureService.lastWristX = null;
    // @ts-ignore
    mediaPipeGestureService.lastSwipeTimestamp = 0;
  });

  const createLandmarks = (config: Record<number, { x: number; y: number }>) => {
    const landmarks = new Array(21).fill({ x: 0.5, y: 0.5, z: 0 });
    for (const [index, point] of Object.entries(config)) {
      landmarks[Number(index)] = { ...landmarks[Number(index)], ...point };
    }
    return landmarks;
  };

  it('detects palm open -> emits "gesture:palm" event (OPEN_PALM)', () => {
    // Open palm: all 4 fingers extended (tip.y < pip.y)
    const landmarks = createLandmarks({
      0: { x: 0.5, y: 0.9 }, // wrist
      4: { x: 0.8, y: 0.5 }, // thumb tip
      6: { x: 0.4, y: 0.5 }, // index pip
      8: { x: 0.4, y: 0.2 }, // index tip
      10: { x: 0.5, y: 0.5 }, // middle pip
      12: { x: 0.5, y: 0.2 }, // middle tip
      14: { x: 0.6, y: 0.5 }, // ring pip
      16: { x: 0.6, y: 0.2 }, // ring tip
      18: { x: 0.7, y: 0.5 }, // pinky pip
      20: { x: 0.7, y: 0.2 }, // pinky tip
    });

    const gesture = mediaPipeGestureService.processLandmarks(landmarks);
    expect(gesture).toBe('OPEN_PALM');
  });

  it('detects fist closed -> emits "gesture:fist" event (CLOSED_FIST)', () => {
    // Closed fist: 4 fingers curled (tip.y >= pip.y), thumb tip.y >= thumb mcp.y (index 3)
    const landmarks = createLandmarks({
      0: { x: 0.5, y: 0.9 }, // wrist
      3: { x: 0.6, y: 0.6 }, // thumb mcp
      4: { x: 0.6, y: 0.7 }, // thumb tip (curled)
      6: { x: 0.4, y: 0.5 }, // index pip
      8: { x: 0.4, y: 0.7 }, // index tip (curled)
      10: { x: 0.5, y: 0.5 }, // middle pip
      12: { x: 0.5, y: 0.7 }, // middle tip
      14: { x: 0.6, y: 0.5 }, // ring pip
      16: { x: 0.6, y: 0.7 }, // ring tip
      18: { x: 0.7, y: 0.5 }, // pinky pip
      20: { x: 0.7, y: 0.7 }, // pinky tip
    });

    const gesture = mediaPipeGestureService.processLandmarks(landmarks);
    expect(gesture).toBe('CLOSED_FIST');
  });

  it('detects swipe left -> emits "gesture:swipe-left" (SWIPE_LEFT)', () => {
    // Setup initial position
    const initialLandmarks = createLandmarks({
      0: { x: 0.8, y: 0.5 }, // wrist right
    });
    mediaPipeGestureService.processLandmarks(initialLandmarks);

    // Wait for debounce (simulated by mocking Date.now)
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 500);

    // Swipe left: deltaX < -0.15
    const swipeLandmarks = createLandmarks({
      0: { x: 0.2, y: 0.5 }, // wrist moved left (0.2 - 0.8 = -0.6 < -0.15)
    });
    const gesture = mediaPipeGestureService.processLandmarks(swipeLandmarks);
    expect(gesture).toBe('SWIPE_LEFT');
    
    vi.restoreAllMocks();
  });

  it('detects pinch -> emits "gesture:pinch" (PINCH)', () => {
    // Pinch: index tip and thumb tip close together (< 0.045 distance)
    const landmarks = createLandmarks({
      4: { x: 0.5, y: 0.5 }, // thumb tip
      8: { x: 0.52, y: 0.51 }, // index tip (dist ~0.022 < 0.045)
    });

    const gesture = mediaPipeGestureService.processLandmarks(landmarks);
    expect(gesture).toBe('PINCH');
  });

  it('returns UNKNOWN when no gesture matched', () => {
    // Arbitrary unmatching configuration
    const landmarks = createLandmarks({
      4: { x: 0.2, y: 0.2 }, // thumb tip far away
      8: { x: 0.8, y: 0.8 }, // index tip far away
      // some extended, some curled
      6: { x: 0.4, y: 0.5 }, // index pip
      10: { x: 0.5, y: 0.5 }, // middle pip
      12: { x: 0.5, y: 0.7 }, // middle tip (curled)
      14: { x: 0.6, y: 0.5 }, // ring pip
      16: { x: 0.6, y: 0.2 }, // ring tip (extended)
    });

    const gesture = mediaPipeGestureService.processLandmarks(landmarks);
    expect(gesture).toBe('UNKNOWN');
  });
});
