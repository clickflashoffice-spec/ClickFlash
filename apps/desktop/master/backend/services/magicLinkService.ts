import crypto from 'crypto';
import { logger } from '../utils/logger';

export interface DeliveryTarget {
    type: 'whatsapp' | 'email';
    address: string;
}

class MagicLinkService {
    private secretKey: string;
    private baseUrl: string;

    constructor() {
        this.secretKey = process.env.MAGIC_LINK_SECRET || 'fallback-dev-secret-for-magic-links';
        this.baseUrl = process.env.GALLERY_BASE_URL || 'https://gallery.clickflash.com';
    }

    /**
     * Generates a time-limited magic token for a specific order.
     */
    public generateToken(orderId: string, expiresInMs: number = 24 * 60 * 60 * 1000): string {
        const expiresAt = Date.now() + expiresInMs;
        const payload = `${orderId}.${expiresAt}`;
        const hmac = crypto.createHmac('sha256', this.secretKey).update(payload).digest('hex');
        const token = Buffer.from(`${payload}.${hmac}`).toString('base64');
        return token;
    }

    /**
     * Sends the magic link to the target (WhatsApp or Email).
     */
    public async deliverLink(orderId: string, target: DeliveryTarget): Promise<boolean> {
        const token = this.generateToken(orderId);
        const magicLink = `${this.baseUrl}/?token=${token}`;

        try {
            if (target.type === 'whatsapp') {
                // In production, integrate with Twilio API or WhatsApp Business API
                logger.info(`[MagicLinkService] Sending WhatsApp link to ${target.address}`);
                logger.info(`[MagicLinkService] Link: ${magicLink}`);
                // simulate API delay
                await new Promise(resolve => setTimeout(resolve, 500));
            } else if (target.type === 'email') {
                // In production, integrate with SendGrid, AWS SES, or similar
                logger.info(`[MagicLinkService] Sending Email link to ${target.address}`);
                logger.info(`[MagicLinkService] Link: ${magicLink}`);
                // simulate API delay
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            return true;
        } catch (error) {
            logger.error(`[MagicLinkService] Failed to deliver magic link to ${target.address}`, error);
            return false;
        }
    }
    
    /**
     * Validates a token and returns the embedded orderId if valid.
     */
    public validateToken(token: string): string | null {
        try {
            const decoded = Buffer.from(token, 'base64').toString('utf-8');
            const [orderId, expiresAtStr, hmac] = decoded.split('.');
            
            const expiresAt = parseInt(expiresAtStr, 10);
            if (Date.now() > expiresAt) {
                logger.warn(`[MagicLinkService] Token expired for order ${orderId}`);
                return null;
            }

            const payload = `${orderId}.${expiresAtStr}`;
            const expectedHmac = crypto.createHmac('sha256', this.secretKey).update(payload).digest('hex');
            
            if (crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expectedHmac))) {
                return orderId;
            }
            
            return null;
        } catch (error) {
            logger.error("[MagicLinkService] Invalid token format", error);
            return null;
        }
    }
}

export const magicLinkService = new MagicLinkService();
