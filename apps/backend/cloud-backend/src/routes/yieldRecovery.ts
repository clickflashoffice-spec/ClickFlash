import { Hono } from 'hono';
import type { AppEnv } from '../types';

const app = new Hono<AppEnv>();

export interface CartRecoveryRequest {
  guestId: string;
  guestName: string;
  resortName: string;
  photoCount: number;
  basePrice: number;
  hoursSinceAbandonment: number;
  phoneNumber?: string;
  activityType?: string;
  isVip?: boolean;
}

/**
 * POST /api/yield/recover
 * Trigger dynamic yield recovery for an abandoned guest cart.
 */
app.post('/', async (c) => {
  try {
    const body = await c.req.json<CartRecoveryRequest>();
    if (!body.guestId || !body.guestName || !body.basePrice) {
      return c.json({ error: 'Missing required cart recovery parameters' }, 400);
    }

    const { basePrice, hoursSinceAbandonment, photoCount, isVip } = body;

    // Time decay elasticity calculation
    let discountPercent = 10;
    let urgencyLevel = 'LOW';

    if (hoursSinceAbandonment >= 48) {
      discountPercent = 35;
      urgencyLevel = 'CRITICAL';
    } else if (hoursSinceAbandonment >= 24) {
      discountPercent = 25;
      urgencyLevel = 'HIGH';
    } else if (hoursSinceAbandonment >= 6) {
      discountPercent = 15;
      urgencyLevel = 'MEDIUM';
    }

    if (photoCount >= 30) discountPercent += 5;
    if (isVip && discountPercent > 20) discountPercent = 20;
    discountPercent = Math.min(discountPercent, 40);

    const discountedPrice = Math.round(basePrice * (1 - discountPercent / 100) * 100) / 100;
    const discountCode = 'SAVE' + discountPercent + '_' + Math.random().toString(36).substring(2, 7).toUpperCase();
    const expiresInMinutes = hoursSinceAbandonment >= 24 ? 120 : 360;
    const magicLink = 'https://gallery.clickflash.io/checkout?guest=' + body.guestId + '&code=' + discountCode;

    const whatsAppPitch = 
      '🌴 *Hey ' + body.guestName + '!* Your vacation memories at *' + body.resortName + '* are ready.\n\n' +
      'We captured ' + photoCount + ' high-res photos from your ' + (body.activityType || 'resort') + ' experience!\n\n' +
      '⏳ *Exclusive Offer:* Unlock your entire album for *$' + discountedPrice + '* (was $' + basePrice + ') with code *' + discountCode + '*.\n\n' +
      '👉 *Instant Download:* ' + magicLink + '\n\n' +
      '⚠️ _Offer expires in ' + expiresInMinutes + ' minutes!_';

    return c.json({
      success: true,
      offer: {
        originalPrice: basePrice,
        discountedPrice,
        discountPercent,
        discountCode,
        expiresInMinutes,
        magicLink,
        urgencyLevel
      },
      whatsAppPitch,
      dispatched: Boolean(body.phoneNumber)
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

export default app;
