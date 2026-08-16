import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { whatsappService } from './whatsappService';
import { redisCache } from './redisCacheService';
import { 
    MagicLinkToken, 
    GenerateMagicLinkRequest, 
    WhatsappDispatchMagicLinkEvent 
} from '@clickflash/types';

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
     * Generates a time-limited magic token for a specific guest/album using JWT.
     */
    public generateMagicLinkToken(req: GenerateMagicLinkRequest): string {
        const expiresInSeconds = req.expiresInSeconds || 259200; // Default 72 hours
        const iat = Math.floor(Date.now() / 1000);
        const exp = iat + expiresInSeconds;

        const payload: MagicLinkToken = {
            jti: uuidv4(),
            guestId: req.guestId,
            albumId: req.albumId,
            destinationId: req.destinationId,
            orderId: req.orderId,
            receiptData: req.receiptData,
            iat,
            exp,
        };

        // Remove undefined fields
        if (!payload.orderId) {
            delete payload.orderId;
        }
        if (!payload.receiptData) {
            delete payload.receiptData;
        }

        const token = jwt.sign(payload, this.secretKey);
        return token;
    }

    /**
     * Sends the magic link to the target (WhatsApp or Email).
     */
    public async deliverLink(req: GenerateMagicLinkRequest, target: DeliveryTarget): Promise<boolean> {
        const token = this.generateMagicLinkToken(req);
        // Ensure this matches the gallery URL format you are using, usually /gallery/:token
        const magicLinkUrl = `${this.baseUrl}/gallery/${token}`;

        try {
            if (target.type === 'whatsapp') {
                logger.info(`[MagicLinkService] Sending WhatsApp link to ${target.address}`);
                
                // Dispatch event to Redis Stream (Enterprise Event-Driven Architecture)
                const eventPayload: WhatsappDispatchMagicLinkEvent = {
                    eventId: uuidv4(),
                    type: 'whatsapp:dispatch:magiclink',
                    timestamp: new Date().toISOString(),
                    payload: {
                        guestId: req.guestId,
                        albumId: req.albumId,
                        phoneNumber: target.address,
                        magicLinkUrl,
                        destinationId: req.destinationId,
                        orderId: req.orderId,
                    }
                };
                
                // Publish to redis stream using stringified payload
                await redisCache.publishEvent('whatsapp_dispatch_queue', {
                    eventId: eventPayload.eventId,
                    type: eventPayload.type,
                    timestamp: eventPayload.timestamp,
                    payload: JSON.stringify(eventPayload.payload)
                });

                const messageBody = `Your high-speed ClickFlash photos are ready! 🎢\n\nClick below to securely access your gallery:\n${magicLinkUrl}`;
                const success = await whatsappService.sendTextMessage(target.address, messageBody);
                if (!success) {
                    logger.warn(`[MagicLinkService] WhatsApp API returned false for ${target.address}`);
                }
            } else if (target.type === 'email') {
                logger.info(`[MagicLinkService] Dispatching Email receipt event for ${target.address}`);
                
                const emailEvent = {
                    eventId: uuidv4(),
                    type: 'email:dispatch:receipt',
                    timestamp: new Date().toISOString(),
                    payload: {
                        email: target.address,
                        magicLinkUrl,
                        receiptData: req.receiptData,
                        orderId: req.orderId,
                    }
                };
                
                await redisCache.publishEvent('email_dispatch_queue', {
                    eventId: emailEvent.eventId,
                    type: emailEvent.type,
                    timestamp: emailEvent.timestamp,
                    payload: JSON.stringify(emailEvent.payload)
                });
            }
            return true;
        } catch (error) {
            logger.error(`[MagicLinkService] Failed to deliver magic link to ${target.address}`, error);
            return false;
        }
    }
    
    /**
     * Validates a magic link token and returns the payload if valid.
     */
    public validateToken(token: string): MagicLinkToken | null {
        try {
            const decoded = jwt.verify(token, this.secretKey) as MagicLinkToken;
            return decoded;
        } catch (error) {
            logger.error("[MagicLinkService] Invalid or expired magic link token", error);
            return null;
        }
    }
}

export const magicLinkService = new MagicLinkService();
