import express, { Request, Response, Router } from "express";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import { Logger } from '../utils/logger';
import DatabaseManager from '../database/db';
import stripeService from "../services/stripeService";
import { EmailService } from "../services/emailService";
import { ReceiptPDFService } from "../services/ReceiptPDFService";
import { DATA_DIR } from "../config/constants";
import { strictRateLimiter } from '../middleware/rateLimiter';
import { customRoutesSchemas } from '../utils/validation';
import { PhotographerEventLedgerService } from "../services/PhotographerEventLedgerService";
interface GalleryCheckoutContext {
  dbManager: DatabaseManager;
  logger: Logger;
  JWT_SECRET: string;
  syncManager: any;
  emailService?: EmailService;
  photographerEventLedgerService: PhotographerEventLedgerService;
}

const FRONTEND_URL = process.env.GALLERY_URL || "http://localhost:5177";

export default function galleryCheckoutRoutes(
  context: GalleryCheckoutContext,
): Router {
  const { dbManager, logger, JWT_SECRET, syncManager, emailService, photographerEventLedgerService } = context;
  const receiptPDFService = new ReceiptPDFService(DATA_DIR, logger);
  const router = express.Router();

  /**
   * Create checkout session
   */
  router.post("/:token/create", strictRateLimiter, async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      const parsed = customRoutesSchemas.galleryCheckout.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({ error: "Cart is empty or items format is invalid" });
      }
      const { items } = parsed.data;

      let payload: any;
      try {
        payload = jwt.verify(token as string, JWT_SECRET) as any;
      } catch (error) {
        return res.status(401).json({ error: "Invalid or expired token" });
      }

      if (payload.type !== "magic-link") {
        return res
          .status(403)
          .json({ error: "Checkout not available for order downloads" });
      }

      const tokenRecord = dbManager.get(
        "SELECT id FROM gallery_tokens WHERE token = ?",
        [token],
      );

      if (!tokenRecord) {
        return res.status(404).json({ error: "Token not found" });
      }

      const total = items.reduce(
        (sum: number, item: any) => sum + item.price * item.quantity,
        0,
      ) + (payload.tipAmount || 0);

      // Law 12: Organized Storage & Law 02: Order Mirroring (Generate stable ID)
      const galleryOrderId = `GLY_${randomUUID().replace(/-/g, "").substring(0, 12)}`;

      dbManager.run(
        `INSERT INTO gallery_orders (id, tokenId, customerEmail, items, total, status)
                 VALUES (?, ?, ?, ?, ?, 'pending')`,
        [
          galleryOrderId,
          tokenRecord.id,
          payload.customerEmail,
          JSON.stringify(items),
          total,
        ],
      );

      const session = await stripeService.createCheckoutSession({
        orderId: galleryOrderId,
        items: items.map((i: any) => ({ photoId: i.id, product: i.title, quantity: i.quantity, price: i.price })),
        customerEmail: payload.customerEmail,
        successUrl: `${FRONTEND_URL}/gallery/${token}/success`,
        cancelUrl: `${FRONTEND_URL}/gallery/${token}`,
        tipAmount: payload.tipAmount || 0,
      });

      dbManager.run(
        "UPDATE gallery_orders SET stripeSessionId = ? WHERE id = ?",
        [session.id, galleryOrderId],
      );

      logger.info("[GalleryCheckout] Created checkout session", {
        galleryOrderId,
        sessionId: session.id,
        total,
      });

      res.json({
        success: true,
        sessionUrl: session.url,
        orderId: galleryOrderId,
      });
    } catch (error: any) {
      logger.error("[GalleryCheckout] Failed to create checkout session", {
        error: error.message,
      });
      res
        .status(500)
        .json({ error: error.message || "Failed to create checkout session" });
    }
  });

  /**
   * Create cash checkout session (notifies staff app)
   */
  router.post("/:token/cash", strictRateLimiter, async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      const parsed = customRoutesSchemas.galleryCheckout.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({ error: "Cart is empty or items format is invalid" });
      }
      const { items } = parsed.data;

      let payload: any;
      try {
        payload = jwt.verify(token as string, JWT_SECRET) as any;
      } catch (error) {
        return res.status(401).json({ error: "Invalid or expired token" });
      }

      if (payload.type !== "magic-link") {
        return res.status(403).json({ error: "Checkout not available for order downloads" });
      }

      const tokenRecord = dbManager.get(
        "SELECT id, albumId FROM gallery_tokens WHERE token = ?",
        [token],
      );

      if (!tokenRecord) {
        return res.status(404).json({ error: "Token not found" });
      }

      const total = items.reduce(
        (sum: number, item: any) => sum + item.price * item.quantity,
        0,
      ) + (payload.tipAmount || 0);

      const galleryOrderId = `GLY_${randomUUID().replace(/-/g, "").substring(0, 12)}`;

      dbManager.run(
        `INSERT INTO gallery_orders (id, tokenId, customerEmail, items, total, status)
                 VALUES (?, ?, ?, ?, ?, 'awaiting_cash')`,
        [
          galleryOrderId,
          tokenRecord.id,
          payload.customerEmail,
          JSON.stringify(items),
          total,
        ],
      );

      logger.info("[GalleryCheckout] Created cash pending session", {
        galleryOrderId,
        total,
      });

      // Broadcast cash pending event
      if (syncManager) {
          syncManager.broadcastCashPending(galleryOrderId, { 
              total, 
              items, 
              albumId: tokenRecord.albumId, 
              customerEmail: payload.customerEmail 
          });
      }

      res.json({
        success: true,
        orderId: galleryOrderId,
        status: "awaiting_cash"
      });
    } catch (error: any) {
      logger.error("[GalleryCheckout] Failed to create cash pending session", {
        error: error.message,
      });
      res.status(500).json({ error: error.message || "Failed to create cash checkout session" });
    }
  });

  /**
   * Stripe webhook handler
   */
  router.post(
    "/webhook",
    express.raw({ type: "application/json" }),
    async (req: Request, res: Response) => {
      try {
        const signature = (req.headers["stripe-signature"] as string) || "";

        if (!signature) {
          return res
            .status(400)
            .json({ error: "Missing stripe-signature header" });
        }

        const event = stripeService.constructWebhookEvent(req.body, signature);

        logger.info("[GalleryCheckout] Webhook received", { type: event.type });

        if (event.type === "checkout.session.completed") {
          const stripeEventId = event.id;
          
          // Idempotency check
          const isProcessed = dbManager.get(
            "SELECT id FROM processed_stripe_events WHERE id = ?",
            [stripeEventId]
          );

          if (isProcessed) {
            logger.info("[GalleryCheckout] Webhook: Stripe event already processed", { stripeEventId });
            return res.json({ received: true, status: "already_processed" });
          }

          const session = event.data.object as any;
          const galleryOrderId = session.metadata.orderId;
          const tipAmount = parseFloat(session.metadata.tipAmount || '0');
          const paymentIntentId = session.payment_intent;

          // 1. Fetch current gallery order status and items
          const galleryOrder = dbManager.get(
            "SELECT status, tokenId, items, total, customerEmail FROM gallery_orders WHERE id = ?",
            [galleryOrderId],
          );

          if (!galleryOrder) {
            throw new Error(
              `Gallery order ${galleryOrderId} not found in database`,
            );
          }

          if (galleryOrder.status === "paid") {
            logger.info("[GalleryCheckout] Webhook: Order already processed", {
              galleryOrderId,
            });
            return res.json({ received: true, status: "already_processed" });
          }

          // 2. Fetch album context from token to get photographerId
          const tokenRecord = dbManager.get(
            "SELECT albumId, albums.photographerId FROM gallery_tokens JOIN albums ON gallery_tokens.albumId = albums.id WHERE gallery_tokens.id = ?",
            [galleryOrder.tokenId],
          );

          if (!tokenRecord) {
            throw new Error(`Token record ${galleryOrder.tokenId} not found`);
          }

          // Law 08: Order Push (Mirror to master)
          // Use a database transaction to ensure atomicity
          dbManager.transaction(() => {
            // A. Update gallery order status
            dbManager.run(
              `UPDATE gallery_orders 
                         SET status = 'paid', stripePaymentId = ?, updatedAt = datetime('now')
                         WHERE id = ?`,
              [paymentIntentId, galleryOrderId],
            );

            // Record Stripe event to prevent duplicate processing
            dbManager.run(
              `INSERT INTO processed_stripe_events (id, type) VALUES (?, ?)`,
              [stripeEventId, event.type]
            );

            // B. Mirror to main orders table (Fulfillment Lab Visibility)
            const mainOrderId = `EXT_${galleryOrderId}`;
            const today = new Date().toISOString().split("T")[0];

            dbManager.run(
              `INSERT INTO orders (
                            id, date, clientName, email, status, total,
                            source, albumId, customerEmail, items, paymentIntentId, created_at
                         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                mainOrderId,
                today,
                "Online Customer", // Default or fetch real name from session if available
                galleryOrder.customerEmail,
                "Processing", // Show in Lab Bench
                galleryOrder.total,
                "gallery",
                tokenRecord.albumId,
                galleryOrder.customerEmail,
                galleryOrder.items,
                paymentIntentId,
                new Date().toISOString(),
              ],
            );

            // Emit Immutable Events (Phase 4)
            const nowIso = new Date().toISOString();
            const grossMinor = Math.round(galleryOrder.total * 100);
            const tipMinor = Math.round(tipAmount * 100);
            const paymentId = randomUUID();

            if (tokenRecord.photographerId) {
              photographerEventLedgerService.append({
                schemaVersion: '1',
                eventId: randomUUID(),
                producer: 'GALLERY',
                producerEventId: mainOrderId,
                photographerId: tokenRecord.photographerId,
                occurredAt: nowIso,
                recordedAt: nowIso,
                scope: { deskId: 'GALLERY_WEB', timezone: 'UTC' },
                sourceRecordId: mainOrderId,
                payload: {
                  kind: 'ORDER_COMPLETED',
                  orderId: mainOrderId,
                  gross: { currency: 'USD', currencyExponent: 2, amountMinor: grossMinor },
                  tips: { currency: 'USD', currencyExponent: 2, amountMinor: tipMinor },
                  photoCount: 1, 
                }
              });

              photographerEventLedgerService.append({
                schemaVersion: '1',
                eventId: randomUUID(),
                producer: 'GALLERY',
                producerEventId: mainOrderId,
                photographerId: tokenRecord.photographerId,
                occurredAt: nowIso,
                recordedAt: nowIso,
                scope: { deskId: 'GALLERY_WEB', timezone: 'UTC' },
                sourceRecordId: mainOrderId,
                payload: {
                  kind: 'ATTRIBUTION_ASSIGNED',
                  orderId: mainOrderId,
                  method: 'ALBUM_OWNER',
                  confidenceBps: 10000,
                }
              });

              photographerEventLedgerService.append({
                schemaVersion: '1',
                eventId: randomUUID(),
                producer: 'GALLERY',
                producerEventId: paymentIntentId,
                photographerId: tokenRecord.photographerId,
                occurredAt: nowIso,
                recordedAt: nowIso,
                scope: { deskId: 'GALLERY_WEB', timezone: 'UTC' },
                sourceRecordId: mainOrderId,
                payload: {
                  kind: 'PAYMENT_CAPTURED',
                  orderId: mainOrderId,
                  paymentId: paymentId,
                  amount: { currency: 'USD', currencyExponent: 2, amountMinor: grossMinor + tipMinor },
                  method: 'STRIPE',
                }
              });
              logger.info(`[GalleryCheckout] Appended ORDER, ATTRIBUTION, PAYMENT events for ${mainOrderId}`);
            }

            logger.info(
              "[GalleryCheckout] Order synced to master fulfillment",
              {
                mainOrderId,
                galleryOrderId,
                albumId: tokenRecord.albumId,
              },
            );

            // C. Broadcast to Lab UI
            if (syncManager) {
              syncManager.broadcastOrderStatus(mainOrderId, "Processing");
            }

            // D. Phase 1-D: Send Purchase Receipt via Email with PDF attachment
            if (emailService && emailService.isConfigured()) {
              // Run PDF generation + email send asynchronously so we don't block
              // the Stripe webhook response (must reply < 30 s).
              (async () => {
                try {
                  // Parse line items from JSON stored in DB
                  let lineItems: Array<{ description: string; quantity: number; unitPrice: number }> = [];
                  try {
                    const parsed = JSON.parse(galleryOrder.items || "[]") as Array<any>;
                    lineItems = parsed.map((item: any) => ({
                      description: item.name ?? item.description ?? "Photo package",
                      quantity: item.quantity ?? 1,
                      unitPrice: item.price ?? item.unitPrice ?? 0,
                    }));
                  } catch {
                    lineItems = [{ description: "Photo package", quantity: 1, unitPrice: galleryOrder.total }];
                  }

                  const displayId = galleryOrderId.substring(0, 8).toUpperCase();

                  // Generate PDF (saved to DATA_DIR/receipts/<orderId>.pdf)
                  let pdfBase64: string | null = null;
                  try {
                    const pdfResult = await receiptPDFService.generate({
                      orderId: galleryOrderId,
                      displayId,
                      customerName: "Valued Customer",
                      customerEmail: galleryOrder.customerEmail,
                      albumName: tokenRecord.albumId ?? "Your Gallery",
                      lineItems,
                      totalAmount: galleryOrder.total,
                      currency: "EUR",
                      paidAt: new Date().toISOString(),
                    });
                    pdfBase64 = pdfResult.base64;
                    logger.info("[GalleryCheckout] Receipt PDF generated", { galleryOrderId });
                  } catch (pdfErr: any) {
                    logger.warn("[GalleryCheckout] PDF generation failed, sending plain email", { error: pdfErr.message });
                  }

                  const receiptHtml = `
                    <!DOCTYPE html>
                    <html>
                    <body style="font-family:sans-serif;padding:20px;background:#f8fafc;">
                      <div style="max-width:600px;margin:0 auto;background:white;padding:30px;border-radius:8px;">
                        <h2 style="color:#0f172a;">ClickFlash Receipt</h2>
                        <p>Thank you for your purchase! Your order (<strong>#${displayId}</strong>) is confirmed.</p>
                        <p><strong>Total Paid:</strong> €${galleryOrder.total.toFixed(2)}</p>
                        <p>Your high-resolution photos are now unlocked in your digital gallery.</p>
                        ${pdfBase64 ? '<p style="color:#64748b;font-size:12px;">Your PDF receipt is attached.</p>' : ""}
                      </div>
                    </body>
                    </html>`;

                  const sent = await emailService.sendTransactional({
                    to: galleryOrder.customerEmail,
                    subject: `ClickFlash Receipt - Order #${displayId}`,
                    html: receiptHtml,
                    text: `Thank you for your purchase! Order #${displayId} confirmed. Total: €${galleryOrder.total.toFixed(2)}.`,
                    attachments: pdfBase64
                      ? [{ filename: `receipt-${displayId}.pdf`, content: pdfBase64, type: "application/pdf" }]
                      : undefined,
                  });

                  if (sent) {
                    logger.info("[GalleryCheckout] Receipt email with PDF sent", { galleryOrderId });
                  } else {
                    logger.warn("[GalleryCheckout] Receipt email failed to send", { galleryOrderId });
                  }
                } catch (e: any) {
                  logger.error("[GalleryCheckout] Failed to dispatch receipt email", { error: e.message });
                }
              })();
            }
          });
        } else if (event.type === "charge.refunded") {
          const stripeEventId = event.id;
          
          const isProcessed = dbManager.get(
            "SELECT id FROM processed_stripe_events WHERE id = ?",
            [stripeEventId]
          );

          if (isProcessed) {
            return res.json({ received: true, status: "already_processed" });
          }

          const charge = event.data.object as any;
          const paymentIntentId = charge.payment_intent;
          const amountRefundedMinor = charge.amount_refunded; // Stripe amounts are in minor units (cents)

          // Find the corresponding order
          const mainOrder = dbManager.get(
            "SELECT id, albumId FROM orders WHERE paymentIntentId = ?",
            [paymentIntentId]
          );

          if (mainOrder) {
            dbManager.transaction(() => {
              dbManager.run(
                `INSERT INTO processed_stripe_events (id, type) VALUES (?, ?)`,
                [stripeEventId, event.type]
              );

              // Find photographerId via albumId
              const tokenRecord = dbManager.get(
                "SELECT photographerId FROM albums WHERE id = ?",
                [mainOrder.albumId]
              );

              if (tokenRecord && tokenRecord.photographerId) {
                const nowIso = new Date().toISOString();
                photographerEventLedgerService.append({
                  schemaVersion: '1',
                  eventId: randomUUID(),
                  producer: 'GALLERY',
                  producerEventId: stripeEventId,
                  photographerId: tokenRecord.photographerId,
                  occurredAt: nowIso,
                  recordedAt: nowIso,
                  scope: { deskId: 'GALLERY_WEB', timezone: 'UTC' },
                  sourceRecordId: mainOrder.id,
                  payload: {
                    kind: 'REFUND_POSTED',
                    orderId: mainOrder.id,
                    paymentId: paymentIntentId,
                    refundId: charge.id,
                    amount: { currency: 'USD', currencyExponent: 2, amountMinor: amountRefundedMinor },
                    reasonCode: charge.refunds?.data?.[0]?.reason || 'requested_by_customer',
                  }
                });
                logger.info(`[GalleryCheckout] Appended REFUND_POSTED for ${mainOrder.id}`);
              }
            });
          }
          return res.json({ received: true });
        } else if (event.type === "payout.paid") {
          const stripeEventId = event.id;
          
          const isProcessed = dbManager.get(
            "SELECT id FROM processed_stripe_events WHERE id = ?",
            [stripeEventId]
          );

          if (isProcessed) {
            return res.json({ received: true, status: "already_processed" });
          }

          dbManager.transaction(() => {
            dbManager.run(
              `INSERT INTO processed_stripe_events (id, type) VALUES (?, ?)`,
              [stripeEventId, event.type]
            );
          });
          // Note: Payout reconciliation requires iterating through payout balance transactions
          // to emit SETTLEMENT_POSTED for individual orders, which requires calling Stripe API.
          // For now, we just mark it received. A worker should do the reconciliation.
          logger.info(`[GalleryCheckout] Payout paid: ${event.data.object.id}`);

          return res.json({ received: true });
        }

        res.json({ received: true });
      } catch (error: any) {
        logger.error("[GalleryCheckout] Webhook error", {
          error: error.message,
        });
        res.status(400).json({ error: error.message });
      }
    },
  );

  router.get("/:token/order/:orderId", async (req: Request, res: Response) => {
    try {
      const { token, orderId } = req.params;

      try {
        jwt.verify(token as string, JWT_SECRET);
      } catch (error) {
        return res.status(401).json({ error: "Invalid or expired token" });
      }

      const order = dbManager.get(
        `SELECT o.*, t.customerEmail 
                 FROM gallery_orders o
                 JOIN gallery_tokens t ON t.id = o.tokenId
                 WHERE o.id = ? AND t.token = ?`,
        [orderId, token],
      );

      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      res.json({
        success: true,
        order: {
          id: order.id,
          items: JSON.parse(order.items),
          total: order.total,
          status: order.status,
          createdAt: order.createdAt,
        },
      });
    } catch (error: any) {
      logger.error("[GalleryCheckout] Failed to get order", {
        error: error.message,
      });
      res.status(500).json({ error: "Failed to get order details" });
    }
  });

  return router;
}
