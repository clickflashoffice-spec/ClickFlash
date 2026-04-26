/**
 * Payment Routes - Stripe Integration
 * Handles payment intents, webhooks, and order processing
 */

const { handleStripeWebhook } = require('../services/stripeService');
const { executeWithRetry } = require('../utils/networkUtils');
const { sendError, ERROR_CODES } = require('../utils/errorHandler');
const { parseBody, getRawBody } = require('../utils/fileUtils');

/**
 * Setup payment routes
 * @param {Object} server - HTTP server instance
 * @param {Object} dbManager - Database manager
 * @param {Object} logger - Logger instance
 */
function setupPaymentRoutes(server, dbManager, logger) {
    
    /**
     * Create Payment Intent
     * POST /api/payments/create-intent
     */
    server.on('request', async (req, res) => {
        if (req.url === '/api/payments/create-intent' && req.method === 'POST') {
            try {
                const body = await parseBody(req);
                const { amount, currency = 'eur', metadata = {} } = body;

                if (!amount || amount <= 0) {
                    sendError(res, 400, ERROR_CODES.INVALID_INPUT, 'Invalid amount');
                    return;
                }

                // Import Stripe
                const Stripe = require('stripe');
                const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

                // Create payment intent with retry
                const paymentIntent = await executeWithRetry(async () => {
                    return await stripe.paymentIntents.create({
                        amount: Math.round(amount * 100), // Convert to cents
                        currency,
                        metadata,
                        automatic_payment_methods: { enabled: true }
                    });
                }, { maxRetries: 3 }, (err, attempt) => {
                    logger.warn(`[Payment] Stripe retry attempt ${attempt}`, { error: err.message });
                });

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    clientSecret: paymentIntent.client_secret,
                    paymentIntentId: paymentIntent.id
                }));

                logger.info(`[Payment] Created intent: ${paymentIntent.id}`);

            } catch (error) {
                logger.error('[Payment] Create intent error:', error);
                sendError(res, 500, ERROR_CODES.INTERNAL_ERROR, 'Failed to create payment intent');
            }
        }
    });

    /**
     * Stripe Webhook Handler
     * POST /api/webhooks/stripe
     */
    server.on('request', async (req, res) => {
        if (req.url === '/api/webhooks/stripe' && req.method === 'POST') {
            try {
                const payload = await getRawBody(req);
                const sig = req.headers['stripe-signature'];

                if (!sig) {
                    sendError(res, 400, ERROR_CODES.INVALID_INPUT, 'Missing signature');
                    return;
                }

                // Import Stripe
                const Stripe = require('stripe');
                const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

                let event;
                try {
                    event = stripe.webhooks.constructEvent(
                        payload,
                        sig,
                        process.env.STRIPE_WEBHOOK_SECRET
                    );
                } catch (err) {
                    logger.error('[Webhook] Invalid signature:', err.message);
                    sendError(res, 400, ERROR_CODES.INVALID_INPUT, 'Invalid signature');
                    return;
                }

                // Handle the event
                await handleWebhookEvent(event, dbManager, logger);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ received: true }));

            } catch (error) {
                logger.error('[Webhook] Handler error:', error);
                sendError(res, 500, ERROR_CODES.INTERNAL_ERROR, 'Webhook processing failed');
            }
        }
    });

    /**
     * Get Stripe Publishable Key
     * GET /api/payments/config
     */
    server.on('request', (req, res) => {
        if (req.url === '/api/payments/config' && req.method === 'GET') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
            }));
        }
    });
}

/**
 * Handle Stripe webhook events
 */
async function handleWebhookEvent(event, dbManager, logger) {
    const handlers = {
        'payment_intent.succeeded': handlePaymentSuccess,
        'payment_intent.payment_failed': handlePaymentFailed,
        'charge.refunded': handleRefund,
        'checkout.session.completed': handleCheckoutComplete,
        'customer.subscription.created': handleSubscriptionCreated,
        'customer.subscription.deleted': handleSubscriptionDeleted,
        'invoice.payment_succeeded': handleInvoicePaid,
        'invoice.payment_failed': handleInvoiceFailed
    };

    const handler = handlers[event.type];
    
    if (handler) {
        logger.info(`[Webhook] Processing: ${event.type}`);
        await handler(event.data.object, dbManager, logger);
    } else {
        logger.info(`[Webhook] Unhandled event: ${event.type}`);
    }

    // Log webhook event
    await logWebhookEvent(event, dbManager);
}

/**
 * Payment Intent Succeeded
 */
async function handlePaymentSuccess(paymentIntent, dbManager, logger) {
    try {
        const orderId = paymentIntent.metadata.orderId;
        
        if (!orderId) {
            logger.error('[Webhook] No orderId in payment intent');
            return;
        }

        // Update order status
        dbManager.run(`
            UPDATE orders 
            SET status = 'paid', 
                payment_status = 'completed',
                payment_intent_id = ?,
                paid_at = datetime('now'),
                updated_at = datetime('now')
            WHERE id = ?
        `, [paymentIntent.id, orderId]);

        // Update payment status
        dbManager.run(`
            INSERT INTO payments (order_id, amount, currency, status, stripe_payment_intent_id, created_at)
            VALUES (?, ?, ?, 'completed', ?, datetime('now'))
        `, [orderId, paymentIntent.amount / 100, paymentIntent.currency, paymentIntent.id]);

        logger.info(`[Webhook] Payment succeeded for order: ${orderId}`);

        // Trigger fulfillment workflow
        await triggerFulfillment(orderId, dbManager, logger);

    } catch (error) {
        logger.error('[Webhook] Payment success handler error:', error);
    }
}

/**
 * Payment Intent Failed
 */
async function handlePaymentFailed(paymentIntent, dbManager, logger) {
    try {
        const orderId = paymentIntent.metadata.orderId;
        
        if (orderId) {
            dbManager.run(`
                UPDATE orders 
                SET status = 'payment_failed',
                    payment_status = 'failed',
                    payment_error = ?,
                    updated_at = datetime('now')
                WHERE id = ?
            `, [paymentIntent.last_payment_error?.message || 'Unknown error', orderId]);

            logger.warn(`[Webhook] Payment failed for order: ${orderId}`);
        }
    } catch (error) {
        logger.error('[Webhook] Payment failed handler error:', error);
    }
}

/**
 * Charge Refunded
 */
async function handleRefund(charge, dbManager, logger) {
    try {
        const paymentIntentId = charge.payment_intent;
        
        // Find order by payment intent
        const order = dbManager.query(`
            SELECT id FROM orders WHERE payment_intent_id = ?
        `, [paymentIntentId]);

        if (order) {
            const refundAmount = charge.amount_refunded / 100;
            
            dbManager.run(`
                UPDATE orders 
                SET status = 'refunded',
                    refund_status = 'completed',
                    refund_amount = ?,
                    refunded_at = datetime('now'),
                    updated_at = datetime('now')
                WHERE id = ?
            `, [refundAmount, order.id]);

            logger.info(`[Webhook] Refund processed for order: ${order.id}, amount: ${refundAmount}`);
        }
    } catch (error) {
        logger.error('[Webhook] Refund handler error:', error);
    }
}

/**
 * Checkout Session Completed
 */
async function handleCheckoutComplete(session, dbManager, logger) {
    try {
        const orderId = session.metadata?.orderId;
        
        if (orderId) {
            dbManager.run(`
                UPDATE orders 
                SET status = 'paid',
                    checkout_session_id = ?,
                    customer_email = ?,
                    updated_at = datetime('now')
                WHERE id = ?
            `, [session.id, session.customer_email, orderId]);

            logger.info(`[Webhook] Checkout completed for order: ${orderId}`);
        }
    } catch (error) {
        logger.error('[Webhook] Checkout complete handler error:', error);
    }
}

/**
 * Subscription Events (for future use)
 */
async function handleSubscriptionCreated(subscription, dbManager, logger) {
    logger.info(`[Webhook] Subscription created: ${subscription.id}`);
}

async function handleSubscriptionDeleted(subscription, dbManager, logger) {
    logger.info(`[Webhook] Subscription deleted: ${subscription.id}`);
}

async function handleInvoicePaid(invoice, dbManager, logger) {
    logger.info(`[Webhook] Invoice paid: ${invoice.id}`);
}

async function handleInvoiceFailed(invoice, dbManager, logger) {
    logger.warn(`[Webhook] Invoice payment failed: ${invoice.id}`);
}

/**
 * Trigger order fulfillment
 */
async function triggerFulfillment(orderId, dbManager, logger) {
    try {
        // Add to fulfillment queue
        dbManager.run(`
            INSERT INTO fulfillment_queue (order_id, status, created_at)
            VALUES (?, 'pending', datetime('now'))
        `, [orderId]);

        logger.info(`[Fulfillment] Order ${orderId} queued for fulfillment`);

        // TODO: Notify fulfillment worker
        // await notifyFulfillmentWorker(orderId);

    } catch (error) {
        logger.error('[Fulfillment] Queue error:', error);
    }
}

/**
 * Log webhook event to database
 */
async function logWebhookEvent(event, dbManager) {
    try {
        dbManager.run(`
            INSERT INTO stripe_webhook_events (event_id, event_type, event_data, created_at)
            VALUES (?, ?, ?, datetime('now'))
        `, [event.id, event.type, JSON.stringify(event.data)]);
    } catch (error) {
        // Non-critical, just log
        console.error('[Webhook] Failed to log event:', error);
    }
}

/**
 * Parse request body
 */
function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                resolve(JSON.parse(body));
            } catch (e) {
                reject(e);
            }
        });
        req.on('error', reject);
    });
}

/**
 * Get raw body for webhooks
 */
function getRawBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', chunk => chunks.push(chunk));
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', reject);
    });
}

module.exports = { setupPaymentRoutes };
