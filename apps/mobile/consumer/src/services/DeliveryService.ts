import { logger } from '@clickflash/logger';

export interface MagicLinkDeliveryPayload {
  recipientPhone: string;
  channel: 'WHATSAPP' | 'SMS';
  guestSessionId: string;
  matchedPhotoCount: number;
}

export interface MagicLinkResponse {
  success: boolean;
  magicLinkUrl: string;
  deliveredAt: string;
}

export class DeliveryService {
  /**
   * Dispatches a passwordless WhatsApp or SMS magic link for Zero-App gallery access.
   * Matches Fotiqo's instant guest delivery strategy.
   */
  async dispatchMagicLink(payload: MagicLinkDeliveryPayload): Promise<MagicLinkResponse> {
    logger.info(`[DeliveryService] Dispatching ${payload.channel} magic link to ${payload.recipientPhone}...`);

    const magicToken = Math.random().toString(36).substring(2, 15);
    const magicLinkUrl = `https://gallery.clickflash.app/magic?token=${magicToken}&session=${payload.guestSessionId}`;

    // Stub payload dispatch to Cloudflare Worker endpoint
    return {
      success: true,
      magicLinkUrl,
      deliveredAt: new Date().toISOString(),
    };
  }
}

export const deliveryService = new DeliveryService();
