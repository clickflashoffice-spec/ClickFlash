import { describe, it, expect } from 'vitest';
import { YieldArbitrageEngine, GuestCart } from './yield_arbitrage.js';
import { VisionBridge, PhotoQualityMetrics } from './vision_bridge.js';
import { EdgeSentinel } from './edge_sentinel.js';

describe('YieldArbitrageEngine', () => {
  it('should calculate time-decay discounts accurately', () => {
    const cart: GuestCart = {
      guestId: 'guest_101',
      guestName: 'Alex Mercer',
      resortName: 'Atlantis Grand',
      photoCount: 35,
      basePrice: 100,
      hoursSinceAbandonment: 30,
      activityType: 'Dolphin Encounter'
    };

    const offer = YieldArbitrageEngine.calculateOffer(cart);
    expect(offer.discountPercent).toBeGreaterThanOrEqual(25);
    expect(offer.discountedPrice).toBeLessThan(100);
    expect(offer.magicLink).toContain('guest_101');
    expect(offer.discountCode).toContain('SAVE');
  });

  it('should format WhatsApp recovery copy with key details', () => {
    const cart: GuestCart = {
      guestId: 'guest_102',
      guestName: 'Sarah Connor',
      resortName: 'Sun Valley Resort',
      photoCount: 15,
      basePrice: 50,
      hoursSinceAbandonment: 5
    };

    const offer = YieldArbitrageEngine.calculateOffer(cart);
    const pitch = YieldArbitrageEngine.formatWhatsAppPitch(cart, offer);

    expect(pitch).toContain('Sarah Connor');
    expect(pitch).toContain('Sun Valley Resort');
    expect(pitch).toContain(offer.discountCode);
  });
});

describe('VisionBridge', () => {
  it('should calculate cosine similarity between 512-d vectors accurately', () => {
    const vecA = new Array(512).fill(0.5);
    const vecB = new Array(512).fill(0.5);

    const similarity = VisionBridge.cosineSimilarity(vecA, vecB);
    expect(similarity).toBeCloseTo(1.0, 4);

    const vecC = new Array(512).fill(-0.5);
    const oppositeSimilarity = VisionBridge.cosineSimilarity(vecA, vecC);
    expect(oppositeSimilarity).toBeCloseTo(-1.0, 4);
  });

  it('should match faces above the ArcFace 0.68 threshold', () => {
    const selfie = [0.8, 0.6, 0.1, 0.4];
    const candidate = [0.8, 0.6, 0.1, 0.4];

    const match = VisionBridge.matchFace(selfie, candidate, 0.68);
    expect(match.matched).toBe(true);
    expect(match.similarityScore).toBeCloseTo(1.0, 2);
  });

  it('should cull blurry photos and reject them', () => {
    const blurryPhoto: PhotoQualityMetrics = {
      photoId: 'photo_blurry_01',
      sharpnessScore: 25,
      exposureScore: 80,
      compositionScore: 70,
      eyesOpenConfidence: 0.95,
      smileConfidence: 0.8,
      faceCount: 1
    };

    const result = VisionBridge.evaluateCulling(blurryPhoto);
    expect(result.grade).toBe('REJECT');
    expect(result.rejectReasons).toContain('Blurry / Out of focus');
    expect(result.isHeroShot).toBe(false);
  });

  it('should grade sharp smiling photos as A+ Hero shots', () => {
    const heroPhoto: PhotoQualityMetrics = {
      photoId: 'photo_hero_01',
      sharpnessScore: 95,
      exposureScore: 92,
      compositionScore: 90,
      eyesOpenConfidence: 0.98,
      smileConfidence: 0.95,
      faceCount: 2
    };

    const result = VisionBridge.evaluateCulling(heroPhoto);
    expect(result.grade).toBe('A+');
    expect(result.isHeroShot).toBe(true);
    expect(result.rejectReasons.length).toBe(0);
  });
});

describe('EdgeSentinel', () => {
  it('should initialize and report diagnostic status', async () => {
    const sentinel = new EdgeSentinel(60000);
    const statusBefore = sentinel.getStatus();
    expect(statusBefore.isRunning).toBe(false);
    expect(statusBefore.totalChecksRun).toBe(0);

    const healthy = await sentinel.checkHealth();
    expect(typeof healthy).toBe('boolean');

    const statusAfter = sentinel.getStatus();
    expect(statusAfter.totalChecksRun).toBe(1);
    expect(statusAfter.lastCheckTimestamp).not.toBeNull();
  });
});
