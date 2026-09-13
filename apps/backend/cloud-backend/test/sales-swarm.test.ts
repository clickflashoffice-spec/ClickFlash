import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { salesSwarm, SalesSwarmOrchestrator } from '../src/workers/sales-swarm';
import { yieldPricingService } from '@clickflash/utils';

vi.mock('@clickflash/utils', () => ({
  yieldPricingService: {
    calculateCadenceEscalation: vi.fn()
  }
}));

describe('SalesSwarmOrchestrator', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    global.fetch = vi.fn();
    vi.mocked(yieldPricingService.calculateCadenceEscalation).mockReturnValue({
      discountPercentage: 20,
      discountCode: 'TEST20',
      incentiveType: 'discount',
      incentiveDescription: '20% off test',
      urgencyLevel: 'medium',
      expiresInHours: 24
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  describe('classifyObjection', () => {
    it('classifies PRICE_SENSITIVITY', () => {
      expect(salesSwarm.classifyObjection('is there a discount?')).toBe('PRICE_SENSITIVITY');
      expect(salesSwarm.classifyObjection('too expensive')).toBe('PRICE_SENSITIVITY');
    });
    it('classifies PHOTOBOOK_CUSTOMIZATION', () => {
      expect(salesSwarm.classifyObjection('i want a photobook')).toBe('PHOTOBOOK_CUSTOMIZATION');
    });
    it('classifies RAW_MEDIA_DOWNLOAD', () => {
      expect(salesSwarm.classifyObjection('can i get raw files')).toBe('RAW_MEDIA_DOWNLOAD');
    });
    it('classifies VIP_FAMILY_GROUP', () => {
      expect(salesSwarm.classifyObjection('we are a large family')).toBe('VIP_FAMILY_GROUP');
    });
    it('classifies DECISION_DELAY_SPOUSE', () => {
      expect(salesSwarm.classifyObjection('need to ask my husband')).toBe('DECISION_DELAY_SPOUSE');
    });
    it('classifies TRUST_AND_QUALITY', () => {
      expect(salesSwarm.classifyObjection('photos look blurry')).toBe('TRUST_AND_QUALITY');
    });
    it('classifies DELIVERY_ACCESS_TECHNICAL', () => {
      expect(salesSwarm.classifyObjection('how to download')).toBe('DELIVERY_ACCESS_TECHNICAL');
    });
    it('defaults to GENERAL_CONCIERGE', () => {
      expect(salesSwarm.classifyObjection('hello')).toBe('GENERAL_CONCIERGE');
    });
  });

  describe('analystAgent', () => {
    const baseCart = {
      userId: 'u1',
      galleryId: 'g1',
      lastActiveAt: Date.now() - 5 * 3600 * 1000, // 5 hours inactive
    };

    it('identifies WHALE tier for high value cart', async () => {
      const profile = await salesSwarm.analystAgent({
        ...baseCart,
        cartItems: [{ price: 200, quantity: 1 }]
      });
      expect(profile.leadTier).toBe('WHALE');
      expect(profile.leadIntent).toBe('ALL_INCLUSIVE');
      expect(profile.engagementLevel).toBe('WARM');
      expect(profile.cadenceStage).toBe('2hr_nudge'); // wait, 5 hours is < 6 hours so 2hr_nudge
    });

    it('identifies HIGH_VALUE tier', async () => {
      const profile = await salesSwarm.analystAgent({
        ...baseCart,
        cartItems: [{ price: 80, quantity: 1 }]
      });
      expect(profile.leadTier).toBe('HIGH_VALUE');
    });

    it('identifies STANDARD tier', async () => {
      const profile = await salesSwarm.analystAgent({
        ...baseCart,
        cartItems: [{ price: 40, quantity: 1 }]
      });
      expect(profile.leadTier).toBe('STANDARD');
    });

    it('identifies MICRO tier', async () => {
      const profile = await salesSwarm.analystAgent({
        ...baseCart,
        cartItems: [{ price: 10, quantity: 1 }]
      });
      expect(profile.leadTier).toBe('MICRO');
    });

    it('identifies PHOTOBOOK intent', async () => {
      const profile = await salesSwarm.analystAgent({
        ...baseCart,
        cartItems: [{ price: 50, type: 'photobook' }]
      });
      expect(profile.leadIntent).toBe('PHOTOBOOK');
    });

    it('identifies RAW_MASTER intent', async () => {
      const profile = await salesSwarm.analystAgent({
        ...baseCart,
        cartItems: [{ price: 50, metadata: { isRawDownload: true } }]
      });
      expect(profile.leadIntent).toBe('RAW_MASTER');
    });

    it('identifies VIP_FAMILY intent', async () => {
      const profile = await salesSwarm.analystAgent({
        ...baseCart,
        cartItems: [{ price: 50, name: 'vip family package' }]
      });
      expect(profile.leadIntent).toBe('VIP_FAMILY');
    });

    it('identifies WHALE tier when both photobook and raw are present', async () => {
      const profile = await salesSwarm.analystAgent({
        ...baseCart,
        cartItems: [{ price: 50, type: 'photobook' }, { price: 50, type: 'raw' }]
      });
      expect(profile.leadTier).toBe('WHALE');
    });

    it('identifies HOT engagement level', async () => {
      const profile = await salesSwarm.analystAgent({
        ...baseCart,
        cartItems: [],
        lastActiveAt: Date.now() - 2 * 3600 * 1000 // 2 hours
      });
      expect(profile.engagementLevel).toBe('HOT');
    });

    it('identifies COOLING engagement level', async () => {
      const profile = await salesSwarm.analystAgent({
        ...baseCart,
        cartItems: [],
        lastActiveAt: Date.now() - 48 * 3600 * 1000 // 48 hours
      });
      expect(profile.engagementLevel).toBe('COOLING');
      expect(profile.cadenceStage).toBe('48hr_whale_urgency');
    });

    it('identifies COLD engagement level', async () => {
      const profile = await salesSwarm.analystAgent({
        ...baseCart,
        cartItems: [],
        lastActiveAt: Date.now() - 100 * 3600 * 1000 // 100 hours
      });
      expect(profile.engagementLevel).toBe('COLD');
      expect(profile.cadenceStage).toBe('7day_cold_vault');
    });

    it('respects cadenceStageOverride', async () => {
      const profile = await salesSwarm.analystAgent({
        ...baseCart,
        cadenceStageOverride: '24hr_golden',
        cartItems: []
      });
      expect(profile.cadenceStage).toBe('24hr_golden');
    });
  });

  describe('negotiatorAgent', () => {
    const baseProfile = {
      userId: 'u1',
      galleryId: 'g1',
      cartTotal: 100,
      photoCount: 10,
      hoursInactive: 24,
      leadTier: 'STANDARD' as const,
      leadIntent: 'STANDARD_DIGITAL' as const,
      cadenceStage: '24hr_golden' as const,
      engagementLevel: 'WARM' as const,
      hasPhotobook: false,
      hasRawDownload: false,
      hasVipPackage: false
    };

    it('returns default escalation for STANDARD', async () => {
      const offer = await salesSwarm.negotiatorAgent(baseProfile);
      expect(offer.discountCode).toBe('TEST20');
      expect(offer.suggestedUpsell).toBeUndefined();
    });

    it('applies WHALE PHOTOBOOK overrides', async () => {
      const offer = await salesSwarm.negotiatorAgent({
        ...baseProfile,
        leadTier: 'WHALE',
        leadIntent: 'PHOTOBOOK'
      });
      expect(offer.discountCode).toBe('BOOKVIP');
      expect(offer.suggestedUpsell).toContain('Photobook');
    });

    it('applies WHALE RAW_MASTER overrides', async () => {
      const offer = await salesSwarm.negotiatorAgent({
        ...baseProfile,
        leadTier: 'WHALE',
        leadIntent: 'RAW_MASTER'
      });
      expect(offer.discountCode).toBe('RAWFREE');
      expect(offer.suggestedUpsell).toContain('RAW');
    });

    it('applies WHALE VIP_FAMILY overrides', async () => {
      const offer = await salesSwarm.negotiatorAgent({
        ...baseProfile,
        leadTier: 'WHALE',
        leadIntent: 'VIP_FAMILY'
      });
      expect(offer.discountCode).toBe('VIPFAMILY25');
      expect(offer.discountPercentage).toBe(25);
    });
  });

  describe('closerAgent', () => {
    const baseProfile = {
      userId: 'u1',
      galleryId: 'g1',
      cartTotal: 100,
      photoCount: 10,
      hoursInactive: 24,
      leadTier: 'STANDARD' as const,
      leadIntent: 'STANDARD_DIGITAL' as const,
      cadenceStage: '24hr_golden' as const,
      engagementLevel: 'WARM' as const,
      hasPhotobook: false,
      hasRawDownload: false,
      hasVipPackage: false
    };

    const offer = {
      discountPercentage: 20,
      discountCode: 'TEST20',
      incentiveType: 'discount',
      incentiveDescription: '20% off test',
      urgencyLevel: 'medium' as const,
      expiresInHours: 24
    };

    it('crafts 2hr_nudge message', async () => {
      const msg = await salesSwarm.closerAgent({ ...baseProfile, cadenceStage: '2hr_nudge' }, offer);
      expect(msg.message).toContain('We noticed you left some beautiful memories');
      expect(msg.interactiveButtons).toHaveLength(2);
    });

    it('crafts 24hr_golden message', async () => {
      const msg = await salesSwarm.closerAgent({ ...baseProfile, cadenceStage: '24hr_golden' }, offer);
      expect(msg.message).toContain('Don\'t let your vacation memories slip away');
      expect(msg.interactiveButtons).toHaveLength(3);
    });

    it('crafts 24hr_golden message for WHALE with upsell', async () => {
      const msg = await salesSwarm.closerAgent({ ...baseProfile, cadenceStage: '24hr_golden', leadTier: 'WHALE' }, { ...offer, suggestedUpsell: 'upsell' });
      expect(msg.message).toContain('Includes 20% off test');
    });

    it('crafts 48hr_whale_urgency message', async () => {
      const msg = await salesSwarm.closerAgent({ ...baseProfile, cadenceStage: '48hr_whale_urgency' }, offer);
      expect(msg.message).toContain('Final VIP Offer');
      expect(msg.interactiveButtons).toHaveLength(3);
    });

    it('crafts 7day_cold_vault message', async () => {
      const msg = await salesSwarm.closerAgent({ ...baseProfile, cadenceStage: '7day_cold_vault' }, offer);
      expect(msg.message).toContain('Final Notice');
      expect(msg.interactiveButtons).toHaveLength(2);
    });
  });

  describe('dispatchWhatsApp', () => {
    const payload = {
      recipientId: '12345',
      message: 'Hello',
      urgencyLevel: 'medium' as const,
      interactiveButtons: [{ id: 'b1', title: 'Btn1' }]
    };

    it('returns true if no token provided', async () => {
      const res = await salesSwarm.dispatchWhatsApp(payload, {});
      expect(res).toBe(true);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('sends interactive message and returns true on success', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({ ok: true } as any);
      const res = await salesSwarm.dispatchWhatsApp(payload, { WHATSAPP_ACCESS_TOKEN: 'tok', WHATSAPP_PHONE_NUMBER_ID: 'pid' } as any);
      expect(res).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith('https://graph.facebook.com/v17.0/pid/messages', expect.any(Object));
      
      const body = JSON.parse(vi.mocked(global.fetch).mock.calls[0][1]!.body as string);
      expect(body.type).toBe('interactive');
    });

    it('sends text message and returns true on success', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({ ok: true } as any);
      const res = await salesSwarm.dispatchWhatsApp({ ...payload, interactiveButtons: [] }, { WHATSAPP_ACCESS_TOKEN: 'tok', WHATSAPP_PHONE_NUMBER_ID: 'pid' } as any);
      expect(res).toBe(true);
      
      const body = JSON.parse(vi.mocked(global.fetch).mock.calls[0][1]!.body as string);
      expect(body.type).toBe('text');
    });

    it('returns false on fetch error', async () => {
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network error'));
      const res = await salesSwarm.dispatchWhatsApp(payload, { WHATSAPP_ACCESS_TOKEN: 'tok', WHATSAPP_PHONE_NUMBER_ID: 'pid' } as any);
      expect(res).toBe(false);
    });

    it('returns false on non-ok response', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({ ok: false, text: () => Promise.resolve('err') } as any);
      const res = await salesSwarm.dispatchWhatsApp(payload, { WHATSAPP_ACCESS_TOKEN: 'tok', WHATSAPP_PHONE_NUMBER_ID: 'pid' } as any);
      expect(res).toBe(false);
    });
  });

  describe('handleIncomingMessage', () => {
    const baseContext = {
      from: '12345',
      message: 'hello',
      env: { GEMINI_API_KEY: 'gemini_key' } as any
    };

    it('uses gemini if enabled and successful', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ candidates: [{ content: { parts: [{ text: 'Gemini reply' }] } }] })
      } as any);
      
      const res = await salesSwarm.handleIncomingMessage(baseContext);
      expect(res.message).toBe('Gemini reply');
      // gemini classification might be GENERAL_CONCIERGE
      expect(res.interactiveButtons).toHaveLength(2); // fallback buttons
    });

    it('falls back to rule engine if gemini fails', async () => {
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Gemini error'));
      
      const res = await salesSwarm.handleIncomingMessage({
        ...baseContext,
        message: 'discount please'
      });
      
      expect(res.message).toContain('FLASH20');
      expect(res.discountCode).toBe('FLASH20');
      expect(res.urgencyLevel).toBe('high');
    });

    it('falls back to rule engine if gemini returns empty', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({ ok: false } as any);
      
      const res = await salesSwarm.handleIncomingMessage({
        ...baseContext,
        message: 'photobook'
      });
      
      expect(res.message).toContain('BOOKUPGRADE');
    });

    it('handles rule based for RAW_MEDIA_DOWNLOAD', async () => {
      const res = await salesSwarm.handleIncomingMessage({
        from: '123', message: 'raw', env: {} as any
      });
      expect(res.message).toContain('RAWUNLOCK');
    });

    it('handles rule based for VIP_FAMILY_GROUP', async () => {
      const res = await salesSwarm.handleIncomingMessage({
        from: '123', message: 'family', env: {} as any
      });
      expect(res.message).toContain('VIPFAMILY25');
    });

    it('handles rule based for DECISION_DELAY_SPOUSE', async () => {
      const res = await salesSwarm.handleIncomingMessage({
        from: '123', message: 'husband', env: {} as any
      });
      expect(res.message).toContain('PARTNERPASS');
    });

    it('handles rule based for TRUST_AND_QUALITY', async () => {
      const res = await salesSwarm.handleIncomingMessage({
        from: '123', message: 'blurry', env: {} as any
      });
      expect(res.discountCode).toBe('MEMORIES20');
    });

    it('handles rule based for GENERAL_CONCIERGE', async () => {
      const res = await salesSwarm.handleIncomingMessage({
        from: '123', message: 'hello', env: {} as any
      });
      expect(res.urgencyLevel).toBe('low');
    });

    it('handles rule based for PRICE_SENSITIVITY', async () => {
      const res = await salesSwarm.handleIncomingMessage({
        from: '123', message: 'discount', env: {} as any
      });
      expect(res.discountCode).toBe('FLASH20');
    });

    it('handles rule based for PHOTOBOOK_CUSTOMIZATION', async () => {
      const res = await salesSwarm.handleIncomingMessage({
        from: '123', message: 'photobook', env: {} as any
      });
      expect(res.discountCode).toBe('BOOKUPGRADE');
    });

    it('handles rule based for DELIVERY_ACCESS_TECHNICAL', async () => {
      const res = await salesSwarm.handleIncomingMessage({
        from: '123', message: 'how to download', env: {} as any
      });
      expect(res.message).toContain('safely stored');
    });
  });

  describe('deploySwarm', () => {
    it('runs the full swarm flow', async () => {
      const res = await salesSwarm.deploySwarm({
        userId: 'u1',
        galleryId: 'g1',
        cartItems: [{ price: 50, quantity: 1 }],
        lastActiveAt: Date.now() - 24 * 3600 * 1000
      });
      expect(res.recipientId).toBe('u1');
      expect(res.message).toContain('Don\'t let your vacation memories');
    });
  });

  describe('deployCadenceSwarm', () => {
    it('runs with override cadence stage', async () => {
      const res = await salesSwarm.deployCadenceSwarm({
        userId: 'u1',
        galleryId: 'g1',
        cartItems: [],
        lastActiveAt: Date.now()
      }, '7day_cold_vault');
      expect(res.cadenceStage).toBe('7day_cold_vault');
      expect(res.message).toContain('Final Notice');
    });
  });
});
