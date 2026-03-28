import { logger } from '../utils/logger';
import { emailService } from './emailService';
import { db, CampaignTemplate, CampaignSend } from './db';
import { Order } from '../types';

interface CampaignTriggerContext {
    customerEmail: string;
    customerName?: string;
    albumId?: string;
    orderId?: string;
    variables: Record<string, string>;
}

/**
 * Campaign Scheduler Service
 * 
 * Monitors database for trigger events and sends automated email campaigns.
 * Runs in background every 5 minutes.
 */
class CampaignScheduler {
    private intervalId: NodeJS.Timeout | null = null;
    private isRunning = false;
    private pollIntervalMs = parseInt(process.env.CAMPAIGN_POLL_INTERVAL_MS || '300000'); // 5 minutes

    /**
     * Start the campaign scheduler
     */
    start(): void {
        if (this.intervalId) {
            logger.warn('[CampaignScheduler] Already running');
            return;
        }

        if (!emailService.isConfigured()) {
            logger.warn('[CampaignScheduler] Email service not configured - scheduler disabled');
            return;
        }

        logger.info(`[CampaignScheduler] Starting... (poll interval: ${this.pollIntervalMs}ms)`);

        // Run immediately on start
        this.checkCampaigns();

        // Then run on interval
        this.intervalId = setInterval(() => {
            this.checkCampaigns();
        }, this.pollIntervalMs);
    }

    /**
     * Stop the campaign scheduler
     */
    stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            logger.info('[CampaignScheduler] Stopped');
        }
    }

    /**
     * Main campaign check loop
     */
    private async checkCampaigns(): Promise<void> {
        if (this.isRunning) {
            logger.debug('[CampaignScheduler] Previous check still running, skipping');
            return;
        }

        this.isRunning = true;

        try {
            logger.debug('[CampaignScheduler] Checking for campaign triggers...');

            await this.checkPostEventCampaigns();
            await this.checkAbandonedCartCampaigns();
            await this.checkReEngagementCampaigns();

            logger.debug('[CampaignScheduler] Check complete');
        } catch (error) {
            logger.error('[CampaignScheduler] Error during check', error);
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Check for post-event campaigns (gallery ready notifications)
     * Triggers 1 hour after album is finalized
     */
    private async checkPostEventCampaigns(): Promise<void> {
        try {
            logger.debug('[CampaignScheduler] Checking post-event campaigns');

            // Get active post-event templates
            const templates = await db.campaignTemplates
                .where({ type: 'post-event', isActive: true })
                .toArray();

            if (templates.length === 0) {
                logger.debug('[CampaignScheduler] No active post-event templates');
                return;
            }

            // Find albums that were finalized ~1 hour ago (within 50-70 minutes window)
            const now = new Date();
            const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
            const windowStart = new Date(oneHourAgo.getTime() - 10 * 60 * 1000); // 10 min buffer
            const windowEnd = new Date(oneHourAgo.getTime() + 10 * 60 * 1000);

            const albums = await db.albums
                .where('status')
                .equals('Finalized')
                .filter(album => {
                    if (!album.updated) return false;
                    const finalizedAt = new Date(album.updated);
                    return finalizedAt >= windowStart && finalizedAt <= windowEnd;
                })
                .toArray();

            for (const album of albums) {
                // Check if already sent
                const existingSend = await db.campaignSends
                    .where({ albumId: album.id, status: 'sent' })
                    .first();

                if (existingSend) {
                    logger.debug(`[CampaignScheduler] Campaign already sent for album ${album.id}`);
                    continue;
                }

                // Get customer email from album
                const customerEmail = album.customerEmail;
                if (!customerEmail) {
                    logger.warn(`[CampaignScheduler] No customer email for album ${album.id}`);
                    continue;
                }

                // Use first template (could be extended to support multiple)
                const template = templates[0];

                // Trigger campaign
                await this.triggerCampaign(template.id, {
                    customerEmail,
                    customerName: album.title?.split(' ')[0] || 'Valued Customer',
                    albumId: album.id,
                    variables: {
                        customer_name: album.title?.split(' ')[0] || 'Valued Customer',
                        event_name: album.title || 'Your Event',
                        gallery_link: `https://clickflash.com/gallery/${album.id}`,
                        photo_count: String(album.photos?.length || 0)
                    }
                });
            }
        } catch (error) {
            logger.error('[CampaignScheduler] Error checking post-event campaigns', error);
        }
    }

    /**
     * Check for abandoned cart campaigns
     * Triggers 1 hour after cart was last updated
     */
    private async checkAbandonedCartCampaigns(): Promise<void> {
        try {
            logger.debug('[CampaignScheduler] Checking abandoned cart campaigns');

            // Get active abandoned-cart templates
            const templates = await db.campaignTemplates
                .where({ type: 'abandoned-cart', isActive: true })
                .toArray();

            if (templates.length === 0) {
                logger.debug('[CampaignScheduler] No active abandoned-cart templates');
                return;
            }

            // Find orders with 'Pending' status updated ~1 hour ago
            const now = new Date();
            const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
            const windowStart = new Date(oneHourAgo.getTime() - 10 * 60 * 1000);
            const windowEnd = new Date(oneHourAgo.getTime() + 10 * 60 * 1000);

            const orders = await db.orders
                .where('status')
                .equals('Pending')
                .filter(order => {
                    if (!order.updated) return false;
                    const updatedAt = new Date(order.updated);
                    return updatedAt >= windowStart && updatedAt <= windowEnd;
                })
                .toArray();

            for (const order of orders) {
                // Check if already sent
                const existingSend = await db.campaignSends
                    .where({ orderId: order.id, status: 'sent' })
                    .first();

                if (existingSend) {
                    logger.debug(`[CampaignScheduler] Abandoned cart already sent for order ${order.id}`);
                    continue;
                }

                const customerEmail = order.email;
                if (!customerEmail) {
                    logger.warn(`[CampaignScheduler] No customer email for order ${order.id}`);
                    continue;
                }

                const template = templates[0];

                await this.triggerCampaign(template.id, {
                    customerEmail,
                    customerName: order.clientName?.split(' ')[0] || 'Valued Customer',
                    orderId: order.id,
                    variables: {
                        customer_name: order.clientName?.split(' ')[0] || 'Valued Customer',
                        cart_total: order.total ? `$${order.total.toFixed(2)}` : '$0.00',
                        cart_link: `https://clickflash.com/cart/${order.id}`,
                        discount_code: 'COMEBACK10'
                    }
                });
            }
        } catch (error) {
            logger.error('[CampaignScheduler] Error checking abandoned cart campaigns', error);
        }
    }

    /**
     * Check for re-engagement campaigns
     * Triggers 30 days after customer's last order
     */
    private async checkReEngagementCampaigns(): Promise<void> {
        try {
            logger.debug('[CampaignScheduler] Checking re-engagement campaigns');

            // Get active re-engagement templates
            const templates = await db.campaignTemplates
                .where({ type: 're-engagement', isActive: true })
                .toArray();

            if (templates.length === 0) {
                logger.debug('[CampaignScheduler] No active re-engagement templates');
                return;
            }

            // Find customers with last order ~30 days ago
            const now = new Date();
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            const windowStart = new Date(thirtyDaysAgo.getTime() - 1 * 24 * 60 * 60 * 1000);
            const windowEnd = new Date(thirtyDaysAgo.getTime() + 1 * 24 * 60 * 60 * 1000);

            // Get all completed orders
            const orders = await db.orders
                .where('status')
                .equals('Completed')
                .toArray();

            // Group by customer email and find last order date
            const customerLastOrder = new Map<string, { date: Date; order: Order }>();
            for (const order of orders) {
                const email = order.email;
                if (!email) continue;

                const orderDate = order.date ? new Date(order.date) : new Date(order.created || 0);
                const existing = customerLastOrder.get(email);

                if (!existing || orderDate > existing.date) {
                    customerLastOrder.set(email, { date: orderDate, order: order as Order });
                }
            }

            // Find customers in the 30-day window who haven't been sent re-engagement
            for (const [email, { date, order }] of customerLastOrder) {
                if (date < windowStart || date > windowEnd) continue;

                // Check if already sent
                const existingSend = await db.campaignSends
                    .where({ customerEmail: email })
                    .filter(send => send.campaignId?.includes('re-engagement'))
                    .first();

                if (existingSend) {
                    logger.debug(`[CampaignScheduler] Re-engagement already sent to ${email}`);
                    continue;
                }

                const template = templates[0];

                await this.triggerCampaign(template.id, {
                    customerEmail: email,
                    customerName: order.clientName?.split(' ')[0] || 'Valued Customer',
                    variables: {
                        customer_name: order.clientName?.split(' ')[0] || 'Valued Customer',
                        discount_code: 'WELCOME_BACK20'
                    }
                });
            }
        } catch (error) {
            logger.error('[CampaignScheduler] Error checking re-engagement campaigns', error);
        }
    }

    /**
     * Trigger a specific campaign for a customer
     */
    private async triggerCampaign(campaignId: string, context: CampaignTriggerContext): Promise<void> {
        try {
            logger.info(`[CampaignScheduler] Triggering campaign ${campaignId} for ${context.customerEmail}`);

            // Fetch campaign template from database
            const template = await db.campaignTemplates.get(campaignId);

            if (!template) {
                logger.error(`[CampaignScheduler] Template not found: ${campaignId}`);
                return;
            }

            if (!template.isActive) {
                logger.debug(`[CampaignScheduler] Template ${campaignId} is inactive`);
                return;
            }

            // Render template with variables
            const subject = emailService.renderTemplate(template.subjectTemplate, context.variables);
            const html = emailService.renderTemplate(template.bodyHtml, context.variables);
            const text = emailService.renderTemplate(template.bodyText, context.variables);

            // Generate tracking ID
            const trackingId = `${campaignId}_${context.customerEmail}_${Date.now()}`;

            // Create campaign send record
            const sendRecord: CampaignSend = {
                id: crypto.randomUUID(),
                campaignId,
                templateId: template.id,
                customerEmail: context.customerEmail,
                albumId: context.albumId,
                orderId: context.orderId,
                status: 'pending',
                trackingId,
                createdAt: new Date().toISOString()
            };

            // Save to database
            await db.campaignSends.add(sendRecord);

            // Send campaign email
            const messageId = await emailService.sendCampaignEmail({
                to: context.customerEmail,
                subject,
                html,
                text,
                campaignId,
                customerId: context.customerEmail,
                trackingId
            });

            if (messageId) {
                // Update send record
                await db.campaignSends.update(sendRecord.id, {
                    status: 'sent',
                    sentAt: new Date().toISOString(),
                    messageId
                });

                logger.info(`[CampaignScheduler] Campaign ${campaignId} sent successfully`, {
                    messageId,
                    customerEmail: context.customerEmail,
                    sendId: sendRecord.id
                });
            } else {
                // Mark as failed
                await db.campaignSends.update(sendRecord.id, {
                    status: 'failed',
                    error: 'Failed to send email'
                });

                logger.error(`[CampaignScheduler] Failed to send campaign ${campaignId}`);
            }
        } catch (error) {
            logger.error(`[CampaignScheduler] Failed to trigger campaign ${campaignId}`, error);
        }
    }

    /**
     * Manually trigger a campaign (for testing)
     */
    async triggerTestCampaign(campaignId: string, customerEmail: string, variables: Record<string, string>): Promise<void> {
        await this.triggerCampaign(campaignId, {
            customerEmail,
            variables
        });
    }

    /**
     * Get campaign analytics
     */
    async getCampaignAnalytics(campaignId: string): Promise<{
        sent: number;
        delivered: number;
        opened: number;
        clicked: number;
        failed: number;
    }> {
        const sends = await db.campaignSends
            .where({ campaignId })
            .toArray();

        return {
            sent: sends.filter(s => s.status === 'sent' || s.status === 'delivered' || s.status === 'opened' || s.status === 'clicked').length,
            delivered: sends.filter(s => s.status === 'delivered' || s.status === 'opened' || s.status === 'clicked').length,
            opened: sends.filter(s => s.status === 'opened' || s.status === 'clicked').length,
            clicked: sends.filter(s => s.status === 'clicked').length,
            failed: sends.filter(s => s.status === 'failed' || s.status === 'bounced').length
        };
    }

    /**
     * Create default campaign templates
     */
    async createDefaultTemplates(): Promise<void> {
        const defaults: CampaignTemplate[] = [
            {
                id: 'post-event-1h',
                name: 'Post-Event Gallery Ready (1 hour)',
                type: 'post-event',
                trigger: '1h-after-finalized',
                subjectTemplate: 'Your photos from {event_name} are ready! 📸',
                bodyHtml: `<h1>Hi {customer_name}!</h1>
<p>Your photos from <strong>{event_name}</strong> are now ready for viewing!</p>
<p>We've captured {photo_count} beautiful moments for you to cherish.</p>
<p><a href="{gallery_link}" style="padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px;">View Your Gallery</a></p>
<p>Thank you for choosing ClickFlash!</p>`,
                bodyText: `Hi {customer_name}! Your photos from {event_name} are now ready for viewing! We've captured {photo_count} beautiful moments. View your gallery: {gallery_link}`,
                isActive: true,
                delayMinutes: 60,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: 'abandoned-cart-1h',
                name: 'Abandoned Cart Reminder (1 hour)',
                type: 'abandoned-cart',
                trigger: '1h-after-abandon',
                subjectTemplate: 'You left something in your cart! 🛒',
                bodyHtml: `<h1>Hi {customer_name}!</h1>
<p>You have <strong>{cart_total}</strong> worth of photos waiting in your cart!</p>
<p>Complete your purchase now and use code <strong>{discount_code}</strong> for 10% off!</p>
<p><a href="{cart_link}" style="padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px;">Complete Purchase</a></p>`,
                bodyText: `Hi {customer_name}! You have {cart_total} worth of photos in your cart. Complete your purchase and use code {discount_code} for 10% off: {cart_link}`,
                isActive: true,
                delayMinutes: 60,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: 're-engagement-30d',
                name: 'Re-engagement (30 days)',
                type: 're-engagement',
                trigger: '30d-after-last-order',
                subjectTemplate: 'We miss you! Here\'s 20% off your next order 🎉',
                bodyHtml: `<h1>Hi {customer_name}!</h1>
<p>We noticed it's been a while since your last visit. We'd love to have you back!</p>
<p>Use code <strong>{discount_code}</strong> for 20% off your next photo purchase.</p>
<p><a href="https://clickflash.com" style="padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px;">Browse Photos</a></p>`,
                bodyText: `Hi {customer_name}! We miss you! Use code {discount_code} for 20% off your next photo purchase. Browse photos: https://clickflash.com`,
                isActive: true,
                delayMinutes: 30 * 24 * 60,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        ];

        for (const template of defaults) {
            const exists = await db.campaignTemplates.get(template.id);
            if (!exists) {
                await db.campaignTemplates.add(template);
                logger.info(`[CampaignScheduler] Created default template: ${template.id}`);
            }
        }
    }
}

export const campaignScheduler = new CampaignScheduler();
