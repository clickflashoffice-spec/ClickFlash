import { RedisStreamConsumer } from './redisStreamConsumer';
import { redisCache } from './redisCacheService';
import { logger } from '../utils/logger';
import { VectorIndexService } from './VectorIndexService';
import { whatsappService } from './whatsappService';
import { aiSalesOrchestrator } from './aiSalesOrchestrator';

/**
 * Phantom Checkout Orchestrator
 * Implements the Zero-Friction Yield Pipeline
 */
export class PhantomCheckoutOrchestrator {
    private consumer: RedisStreamConsumer;

    constructor() {
        this.consumer = new RedisStreamConsumer(redisCache);
    }

    public start() {
        this.consumer.register({
            stream: 'phantom_events',
            group: 'phantom_checkout_group',
            consumer: 'master_orchestrator',
            handler: async (eventId: string, fields: Record<string, string>) => {
                const eventType = fields.eventType;
                logger.info(`[PhantomCheckout] Received event ${eventType} (${eventId})`);

                switch (eventType) {
                    case 'CaptureReceived':
                        await this.handleCaptureReceived(fields);
                        break;
                    case 'MediaScored':
                        await this.handleMediaScored(fields);
                        break;
                    case 'YieldCalculated':
                        await this.handleYieldCalculated(fields);
                        break;
                    case 'CartAbandoned':
                        await this.handleCartAbandoned(fields);
                        break;
                    default:
                        logger.warn(`[PhantomCheckout] Unknown event type: ${eventType}`);
                }
            }
        });

        this.consumer.start().catch(err => {
            logger.error('[PhantomCheckout] Failed to start consumer', err);
        });

        logger.info('[PhantomCheckout] Orchestrator started.');
    }

    public stop() {
        this.consumer.stop();
        logger.info('[PhantomCheckout] Orchestrator stopped.');
    }

    private async handleCaptureReceived(fields: Record<string, string>) {
        const { photoId, bleBeaconId, guestId } = fields;
        logger.info(`[PhantomCheckout] Processing CaptureReceived for photo ${photoId}`);
        
        // Mocking GPU ArcFace biometric matching & BLE ID resolution
        // In a real flow, this would call local C++ VP-Tree / GPU ArcFace
        
        // Emit MediaScored event (simulating next step in pipeline)
        await redisCache.publishEvent('phantom_events', {
            eventType: 'MediaScored',
            photoId,
            guestId: guestId || 'guest_123',
            emotionalScore: '95',
            blurCheck: 'PASS'
        });
    }

    private async handleMediaScored(fields: Record<string, string>) {
        const { photoId, guestId, emotionalScore } = fields;
        logger.info(`[PhantomCheckout] Processing MediaScored for photo ${photoId}, score: ${emotionalScore}`);
        
        // Pricing Engine consumes the score, weather API, and time
        const score = parseInt(emotionalScore || '0', 10);
        let dynamicPrice = 25.00; // Base price
        if (score > 90) {
            dynamicPrice += 5.00; // Premium memory
        }

        // Emit YieldCalculated event
        await redisCache.publishEvent('phantom_events', {
            eventType: 'YieldCalculated',
            photoId,
            guestId,
            yieldPrice: dynamicPrice.toString(),
            weatherFactor: 'sunny'
        });
    }

    private async handleYieldCalculated(fields: Record<string, string>) {
        const { photoId, guestId, yieldPrice } = fields;
        logger.info(`[PhantomCheckout] Processing YieldCalculated for photo ${photoId}. Price Locked at $${yieldPrice}`);
        
        // Emit PriceLocked event
        await redisCache.publishEvent('phantom_events', {
            eventType: 'PriceLocked',
            photoId,
            guestId,
            lockedPrice: yieldPrice
        });
    }

    private async handleCartAbandoned(fields: Record<string, string>) {
        const { guestId, phone, photoId, currentPrice } = fields;
        logger.info(`[PhantomCheckout] Processing CartAbandoned for guest ${guestId}`);
        
        if (!phone) {
            logger.warn(`[PhantomCheckout] No phone number for guest ${guestId}, cannot dispatch WhatsApp swarm.`);
            return;
        }

        // Trigger WhatsApp Swarm agent to execute direct-message negotiation
        const discountPrice = (parseFloat(currentPrice || '25.00') * 0.7).toFixed(2); // 30% expiring discount
        const message = `Hey! We noticed you left a perfect memory behind. For the next 10 minutes, get it for only $${discountPrice} instead of $${currentPrice || '25.00'}! 📸✨`;
        
        try {
            await whatsappService.sendTextMessage(phone, message);
            logger.info(`[PhantomCheckout] WhatsApp negotiation sent to ${phone}`);
        } catch (error) {
            logger.error(`[PhantomCheckout] Failed to send WhatsApp message to ${phone}`, error);
        }
    }
}

export const phantomCheckoutOrchestrator = new PhantomCheckoutOrchestrator();
