import express, { Request, Response, Router } from "express";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import { Logger } from "../shared/logger";
import DatabaseManager from "../shared/db";
import stripeService from "../services/stripeService";
import { EmailService } from "../services/emailService";

interface GalleryCheckoutContext {
  dbManager: DatabaseManager;
  logger: Logger;
  JWT_SECRET: string;
  syncManager: any;
  emailService?: EmailService;
}

const FRONTEND_URL = process.env.GALLERY_URL || "http://localhost:5177";

export default function galleryCheckoutRoutes(
  context: GalleryCheckoutContext,
): Router {
  const { dbManager, logger, JWT_SECRET, syncManager, emailService } = context;
  const router = express.Router();

  /**
   * Create checkout session
   */
  router.post("/:token/create", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      const { items } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "Cart is empty" });
      }

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
      );

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
        items,
        customerEmail: payload.customerEmail,
        successUrl: `${FRONTEND_URL}/gallery/${token}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${FRONTEND_URL}/gallery/${token}`,
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
          const session = event.data.object as any;
          const galleryOrderId = session.metadata.orderId;
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

          // 2. Fetch album context from token
          const tokenRecord = dbManager.get(
            "SELECT albumId FROM gallery_tokens WHERE id = ?",
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

            // D. Phase 62: Send Purchase Receipt via Email Relay
            if (emailService && emailService.isConfigured()) {
              try {
                const parsedItems = JSON.parse(galleryOrder.items || "[]");
                const _itemCount = Array.isArray(parsedItems)
                  ? parsedItems.length
                  : 1;

                // Let the Hub format the exact professional HTML, we just send a generic one
                // fallback or explicitly call a specific Hub Endpoint if we had one.
                // However, since emailService.sendTransactional just forwards the raw HTML,
                // we should let the Hub handle it, or we compose a basic one here that gets relayed.
                // To perfectly match Phase 62 spec, we will send an HTTP post to the Hub's specialized receipt sender if it existed,
                // but since Hub uses `EmailRelayService.sendPurchaseReceipt`, it's actually best to trigger the Hub API directly.

                // For offline-first robustness, we'll compose the receipt HTML here and pass it through the relay:
                const receiptHtml = `
                            <!DOCTYPE html>
                            <html>
                            <body style="font-family: sans-serif; padding: 20px; background: #f8fafc;">
                                <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px;">
                                    <h2 style="color: #0f172a;">ClickFlash Receipt</h2>
                                    <p>Thank you for your purchase! Your order (#${galleryOrderId.substring(0, 8)}) is confirmed.</p>
                                    <p><strong>Total Paid:</strong> €${galleryOrder.total.toFixed(2)}</p>
                                    <p>Your high-resolution photos are now unlocked in your digital gallery.</p>
                                </div>
                            </body>
                            </html>
                            `;

                emailService
                  .sendTransactional({
                    to: galleryOrder.customerEmail,
                    subject: `ClickFlash Receipt - Order #${galleryOrderId.substring(0, 8)}`,
                    html: receiptHtml,
                    text: `Thank you for your purchase! Order #${galleryOrderId.substring(0, 8)} confirmed. Total: €${galleryOrder.total.toFixed(2)}.`,
                  })
                  .then((sent) => {
                    if (sent)
                      logger.info(
                        "[GalleryCheckout] Receipt email queued for delivery",
                        { galleryOrderId },
                      );
                    else
                      logger.warn(
                        "[GalleryCheckout] Receipt email failed to send",
                        { galleryOrderId },
                      );
                  });
              } catch (e: any) {
                logger.error(
                  "[GalleryCheckout] Failed to dispatch receipt email",
                  { error: e.message },
                );
              }
            }
          });
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

      let _payload: any;
      try {
        _payload = jwt.verify(token as string, JWT_SECRET) as any;
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
