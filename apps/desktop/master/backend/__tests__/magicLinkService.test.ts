import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import jwt from 'jsonwebtoken';
import { magicLinkService } from '../services/magicLinkService';
import { whatsappService } from '../services/whatsappService';
import { redisCache } from '../services/redisCacheService';

vi.mock('../services/whatsappService', () => ({
    whatsappService: {
        sendTextMessage: vi.fn().mockResolvedValue(true),
        sendInteractiveButtonMessage: vi.fn().mockResolvedValue(true),
    },
}));

vi.mock('../services/redisCacheService', () => ({
    redisCache: {
        publishEvent: vi.fn().mockResolvedValue(undefined),
    },
}));

describe('MagicLinkService & Instant WhatsApp Delivery', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        vi.clearAllMocks();
        process.env = {
            ...originalEnv,
            MAGIC_LINK_SECRET: 'test-magic-link-secret-key-32chars!!',
            GALLERY_BASE_URL: 'https://gallery.clickflash.com',
        };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    describe('JWT Token Generation & Validation', () => {
        it('generates a valid, signed JWT token with required claims and default 72h expiration', () => {
            const req = {
                guestId: 'gst_12345',
                albumId: 'alb_rollercoaster_99',
                destinationId: 'dest_resort_01',
            };

            const token = magicLinkService.generateMagicLinkToken(req);
            expect(typeof token).toBe('string');
            expect(token.split('.')).toHaveLength(3); // Header.Payload.Signature

            const decoded = magicLinkService.validateToken(token);
            expect(decoded).not.toBeNull();
            expect(decoded?.guestId).toBe('gst_12345');
            expect(decoded?.albumId).toBe('alb_rollercoaster_99');
            expect(decoded?.destinationId).toBe('dest_resort_01');
            expect(decoded?.jti).toBeDefined();
            expect(decoded?.orderId).toBeUndefined();
            expect(decoded?.receiptData).toBeUndefined();

            // Expiration should be ~72 hours (259200 seconds)
            expect(decoded!.exp! - decoded!.iat!).toBe(259200);
        });

        it('generates a token with custom expiration and optional order details', () => {
            const req = {
                guestId: 'gst_vip_99',
                albumId: 'alb_resort_vip',
                destinationId: 'dest_vip',
                orderId: 'ord_123456',
                receiptData: { total: 199.00, currency: 'USD' },
                expiresInSeconds: 3600, // 1 hour
            };

            const token = magicLinkService.generateMagicLinkToken(req);
            const decoded = magicLinkService.validateToken(token);

            expect(decoded).not.toBeNull();
            expect(decoded?.orderId).toBe('ord_123456');
            expect(decoded?.receiptData).toEqual({ total: 199.00, currency: 'USD' });
            expect(decoded!.exp! - decoded!.iat!).toBe(3600);
        });

        it('returns null when validating an expired token', () => {
            const expiredPayload = {
                guestId: 'gst_old',
                albumId: 'alb_old',
                iat: Math.floor(Date.now() / 1000) - 7200,
                exp: Math.floor(Date.now() / 1000) - 3600, // expired 1 hour ago
            };

            const expiredToken = jwt.sign(expiredPayload, process.env.MAGIC_LINK_SECRET || 'test-magic-link-secret-key-32chars!!');
            const result = magicLinkService.validateToken(expiredToken);
            expect(result).toBeNull();
        });

        it('returns null when validating a token signed with a different secret', () => {
            const forgedToken = jwt.sign({ guestId: 'gst_attacker' }, 'wrong-secret-key');
            const result = magicLinkService.validateToken(forgedToken);
            expect(result).toBeNull();
        });
    });

    describe('Multi-Channel Magic Link Delivery', () => {
        it('delivers instant magic link via WhatsApp, publishes Redis Stream event, and dispatches message', async () => {
            const req = {
                guestId: 'gst_park_guest',
                albumId: 'alb_splash_mountain',
                destinationId: 'dest_themepark',
            };

            const target = {
                type: 'whatsapp' as const,
                address: '+14155552671',
            };

            const success = await magicLinkService.deliverLink(req, target);

            expect(success).toBe(true);

            // Verify Redis Stream event publication
            expect(redisCache.publishEvent).toHaveBeenCalledTimes(1);
            expect(redisCache.publishEvent).toHaveBeenCalledWith(
                'whatsapp_dispatch_queue',
                expect.objectContaining({
                    type: 'whatsapp:dispatch:magiclink',
                    payload: expect.stringContaining('+14155552671'),
                })
            );

            // Verify WhatsApp plain text message dispatch
            expect(whatsappService.sendTextMessage).toHaveBeenCalledTimes(1);
            expect(whatsappService.sendTextMessage).toHaveBeenCalledWith(
                '+14155552671',
                expect.stringContaining('https://gallery.clickflash.com/gallery/')
            );
        });

        it('delivers magic link via Email and publishes to email_dispatch_queue', async () => {
            const req = {
                guestId: 'gst_email_guest',
                albumId: 'alb_cabana',
                destinationId: 'dest_beach_resort',
                orderId: 'ord_9901',
                receiptData: { plan: 'All-Inclusive Digital Pass' },
            };

            const target = {
                type: 'email' as const,
                address: 'guest@example.com',
            };

            const success = await magicLinkService.deliverLink(req, target);

            expect(success).toBe(true);
            expect(redisCache.publishEvent).toHaveBeenCalledWith(
                'email_dispatch_queue',
                expect.objectContaining({
                    type: 'email:dispatch:receipt',
                    payload: expect.stringContaining('guest@example.com'),
                })
            );
            expect(whatsappService.sendTextMessage).not.toHaveBeenCalled();
        });

        it('catches and returns false gracefully when Redis or WhatsApp dispatch fails', async () => {
            vi.mocked(redisCache.publishEvent).mockRejectedValueOnce(new Error('Redis connection lost'));

            const req = {
                guestId: 'gst_fail',
                albumId: 'alb_fail',
                destinationId: 'dest_fail',
            };

            const success = await magicLinkService.deliverLink(req, {
                type: 'whatsapp',
                address: '+1999999999',
            });

            expect(success).toBe(false);
        });
    });
});
