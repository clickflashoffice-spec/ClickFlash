import { checkLoginRateLimit, recordLoginAttempt } from "./loginRateLimiter.js";
import { getEnv, TABLE_MAP } from "./config.js";
import DatabaseManager from "./db.js";
import RecordService from "./services/recordService.js";
import AnalyticsService from "./services/analyticsService.js";
import PhotoProcessor from "./photoProcessor.js";
import EmailRelayService from "./services/emailRelayService.js";
import { validateLogin } from "./validation.js";
import { verifyPassword, hashPassword } from "./auth.js";
import {
  sendAuthError,
  sendNotFoundError,
  sendInternalError,
  createErrorResponse,
  sendDatabaseError,
} from "./errorHandler.js";
import { createToken, verifyToken, extractTokenFromHeader } from "./jwt.js";
import { PixelFounderService } from "./services/pixelFounderService.js";
import MarketingAutomationService from "./services/marketingAutomationService.js";
import { handleOAuth } from "./routes/oauth.js";
import { DLQService } from "./services/dlqService.js";

import { handleAuth } from "./routes/auth.js";
import { handleOrders } from "./routes/orders.js";
import { handleAnalytics } from "./routes/analytics.js";
import { handleCloud } from "./routes/cloud.js";
import { handleSettings } from "./routes/settings.js";
import { handleEmail } from "./routes/email.js";
import { handleAi } from "./routes/ai.js";
import { handleGdpr } from "./routes/gdpr.js";
import { handleTelemetry } from "./routes/telemetry.js";
import { handleMasters } from "./routes/masters.js";
import { handleOnboarding } from "./routes/onboarding.js";
import { handleBilling } from "./routes/billing.js";

/**
 * Management Hub Cloudflare Worker
 */

export interface Env {
  DB: D1Database;
  GALLERY_BUCKET: R2Bucket;
  JWT_SECRET: string;
  PROVISIONING_SECRET?: string;
  ALLOWED_ORIGINS: string;
  RESEND_API_KEY?: string;
  FROM_EMAIL?: string;
  ADMIN_NOTIFICATION_EMAIL?: string;
  SENTRY_DSN?: string; // Sentry DSN — optional; monitoring disabled when absent
  LICENSE_PRIVATE_KEY?: string;
  LICENSE_PUBLIC_KEY?: string;
  GEMINI_API_KEY?: string;
}

const managementHandler = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Health check - public endpoint, no auth required
    if (url.pathname === "/api/health") {
      return Response.json(
        { status: "ok", timestamp: new Date().toISOString() },
      );
    }

    const { JWT_SECRET, ALLOWED_ORIGINS, PROVISIONING_SECRET } = env;
    
    // SECURITY: Fail-fast if JWT_SECRET not configured
    if (!JWT_SECRET) {
      return Response.json(
        { error: "Configuration Error", message: "JWT_SECRET environment variable is required" },
        { status: 500 }
      );
    }

    // Parse allowed origins from config
    const allowedOrigins = ALLOWED_ORIGINS ? ALLOWED_ORIGINS.split(',').map(o => o.trim()) : [];
    const requestOrigin = request.headers.get('Origin');

    const isClickFlashOrigin = (origin: string | null): boolean => {
      if (!origin) return true;
      if (allowedOrigins.includes(origin)) return true;
      try {
        const { hostname } = new URL(origin);
        return (
          hostname === "clickflash.com" || hostname.endsWith(".clickflash.com") ||
          hostname === "clicketflash.com" || hostname.endsWith(".clicketflash.com") ||
          hostname.endsWith(".pages.dev") ||
          hostname.endsWith(".workers.dev") ||
          hostname === "localhost" ||
          hostname === "127.0.0.1"
        );
      } catch {
        return false;
      }
    };

    if (requestOrigin && !isClickFlashOrigin(requestOrigin)) {
      return new Response("Forbidden Origin", { status: 403 });
    }

    const corsOrigin = requestOrigin || "*";

    // CORS Headers with proper validation
    const corsHeaders = {
      "Access-Control-Allow-Origin": corsOrigin,
      "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Credentials": "true",
      "Vary": "Origin",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const dbManager = new DatabaseManager(env.DB);
    DatabaseManager.setInstance(dbManager);

    const emailRelayService = new EmailRelayService(
      console,
      env.RESEND_API_KEY,
      env.FROM_EMAIL,
      env.ADMIN_NOTIFICATION_EMAIL,
    );
    const recordService = new RecordService(dbManager, emailRelayService);
    const analyticsService = new AnalyticsService(dbManager);
    const photoProcessor = new PhotoProcessor(env.GALLERY_BUCKET);
    const pixelFounderService = new PixelFounderService(env.GEMINI_API_KEY);

    const response = await (async () => {
      try {
      // --- OAuth Device Authorization Grant (RFC 8628) — 1-click installer flow ---
      if (url.pathname.startsWith("/api/v1/oauth/")) {
        const oauthRes = await handleOAuth(request, env, url, dbManager, corsHeaders);
        if (oauthRes) return oauthRes;
      }

      // --- Onboarding & License Validation ---
      if (url.pathname.startsWith("/api/v1/onboarding/") || url.pathname === "/api/v1/license/validate") {
        const onboardRes = await handleOnboarding(request, env, url, dbManager, corsHeaders);
        if (onboardRes) return onboardRes;
      }

      // --- PUBLIC & FLEET: Master Desk Registration & Heartbeats ---
      if (url.pathname.startsWith("/api/masters/")) {
        const mastersRes = await handleMasters(request, env, url, dbManager, corsHeaders);
        if (mastersRes) return mastersRes;
      }

      // Auth Routes (Login, etc.)
      const authRes = await handleAuth(request, url, env, dbManager, corsHeaders, recordService, analyticsService, emailRelayService, photoProcessor, pixelFounderService, null);
      if (authRes) return authRes;

      // Auth Middleware check for other routes
      let payload: any = null;
      const authHeader = request.headers.get("Authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = extractTokenFromHeader(authHeader);
        if (token) {
          payload = await verifyToken(token, JWT_SECRET);
        }
      }

      // Route Handlers
      const ordersRes = await handleOrders(request, url, env, dbManager, corsHeaders, recordService, analyticsService, emailRelayService, photoProcessor, pixelFounderService, payload);
      if (ordersRes) return ordersRes;

      const analyticsRes = await handleAnalytics(request, url, env, dbManager, corsHeaders, recordService, analyticsService, emailRelayService, photoProcessor, pixelFounderService, payload);
      if (analyticsRes) return analyticsRes;

      const cloudRes = await handleCloud(request, url, env, dbManager, corsHeaders, recordService, analyticsService, emailRelayService, photoProcessor, pixelFounderService, payload);
      if (cloudRes) return cloudRes;

      const settingsRes = await handleSettings(request, url, env, dbManager, corsHeaders, recordService, analyticsService, emailRelayService, photoProcessor, pixelFounderService, payload);
      if (settingsRes) return settingsRes;
      
      const telemetryRes = await handleTelemetry(request, url, corsHeaders);
      if (telemetryRes) return telemetryRes;

      const emailRes = await handleEmail(request, url, env, dbManager, corsHeaders, recordService, analyticsService, emailRelayService, photoProcessor, pixelFounderService, payload);
      if (emailRes) return emailRes;

      const aiRes = await handleAi(request, url, env, dbManager, corsHeaders, recordService, analyticsService, emailRelayService, photoProcessor, pixelFounderService, payload);
      if (aiRes) return aiRes;

      


      // --- GDPR API ---
      if (url.pathname.startsWith("/api/gdpr/")) {
        const gdprRes = await handleGdpr(request, url, dbManager, payload, corsHeaders);
        if (gdprRes) return gdprRes;
      }

      // --- Billing API ---
      if (url.pathname.startsWith("/api/billing/")) {
        const billingRes = await handleBilling(request, env, url, corsHeaders, payload);
        if (billingRes) return billingRes;
      }

      
      return sendNotFoundError("Route", url.pathname);
      } catch (e: any) {
        console.error("Worker Error:", e);
        if (e.status)
          return createErrorResponse(
            e.status,
            "Error",
            e.message,
            undefined,
            e.details,
          );
        return sendInternalError(e);
      }
    })();

    // Apply unified CORS + security headers to every response
    const headers = new Headers(response.headers);
    Object.entries(corsHeaders).forEach(([k, v]) => headers.set(k, v));
    headers.set("Vary", "Origin");

    // Security headers — matches gallery worker hardening
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("X-Frame-Options", "DENY");
    headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
    headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    headers.set("Content-Security-Policy",
      "default-src 'none'; img-src * data: blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },

  // Phase 62: System-Wide Email Architecture - Marketing Automation
  async scheduled(event: any, env: Env, ctx: ExecutionContext): Promise<void> {
    const dbManager = new DatabaseManager(env.DB);
    const emailRelayService = new EmailRelayService(
      console,
      env.RESEND_API_KEY,
      undefined,
      env.ADMIN_NOTIFICATION_EMAIL,
    );
    const marketingService = new MarketingAutomationService(
      dbManager,
      emailRelayService,
    );

    try {
      console.log("[Cron] Running Scheduled Maintenance tasks...");

      // Run MoneyTrash Campaigns
      await marketingService.processDailyCampaigns();

      // Run DLQ Retries
      const dlqService = new DLQService(dbManager);
      const dlqResult = await dlqService.processDLQ(async (queueName, payload) => {
        console.log(`[DLQ] Processing ${queueName} event...`);
        // Implementation of retry handlers based on queueName
        // E.g., if queueName === 'sync_order', retry sync order.
        // For now, just logging to satisfy the framework.
      });
      console.log(`[DLQ] Processed: ${dlqResult.processed}, Failed: ${dlqResult.failed}`);

      // Task 1: Abandoned Cart Recovery (Existing Logic)
      const twentyFourHoursAgo = new Date(
        Date.now() - 24 * 60 * 60 * 1000,
      ).toISOString();

      // Select orders that have been viewed but not purchased in the last 24-48 hours.
      // We limit to 50 per run to prevent timeout/rate limits on Cloudflare/Resend.
      const abandonedCarts = (await dbManager.query(
        `
        SELECT id as order_id, customer_email, customer_name, gallery_pin
        FROM orders
        WHERE status = 'VIEWED_ONLY' 
          AND updated_at < ?
          AND marketing_emails_sent < 1
        LIMIT 50
        `,
        [twentyFourHoursAgo],
      )) as Array<{
        order_id: string;
        customer_email: string;
        customer_name: string;
        gallery_pin: string;
      }>;

      console.log(
        `[Cron] Found ${abandonedCarts?.length || 0} abandoned carts to process.`,
      );

      if (abandonedCarts && abandonedCarts.length > 0) {
        await Promise.all(abandonedCarts.map(async (cart) => {
          try {
            // In a real app, this would route to their specific gallery URL
            const galleryUrl = `https://gallery.clicketflash.com/${cart.gallery_pin}`;

            const html = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px 0;">
              <table width="100%" max-width="600" align="center" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; max-width: 600px; margin: 0 auto;">
                <tr>
                  <td style="background-color: #0f172a; padding: 32px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px;">ClickFlash</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px 32px;">
                    <h2 style="color: #0f172a; margin-top: 0;">Don't lose your vacation memories, ${cart.customer_name}!</h2>
                    <p style="color: #475569; font-size: 16px; line-height: 1.5;">We noticed you viewed your gallery but haven't unlocked your high-resolution photos yet. They are still securely stored and waiting for you.</p>
                    
                    <div style="background-color: #f0fdfa; border: 1px dashed #14b8a6; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
                      <p style="color: #0f766e; margin-top: 0; font-weight: bold;">Unlock them today and get 10% off!</p>
                      <p style="color: #0f766e; margin-bottom: 0;">Use code <strong>SAVE10</strong> at checkout.</p>
                    </div>

                    <a href="${galleryUrl}" style="display: inline-block; background-color: #06b6d4; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600;">Return to Gallery</a>
                  </td>
                </tr>
              </table>
            </body>
            </html>
            `;

            // Note: Sending marketing emails from noreply
            const sent = await emailRelayService.sendEmail({
              to: cart.customer_email,
              from: "noreply@clicketflash.com",
              fromName: "ClickFlash Memories",
              subject: "Don't lose your vacation memories! (Get 10% Off)",
              html: html,
              text: `Don't lose your memories ${cart.customer_name}! Return to your gallery at ${galleryUrl} and use code SAVE10 for 10% off.`,
            });

            if (sent) {
              // Update D1 immediately so we don't double-email them next cron run
              await dbManager.run(
                "UPDATE orders SET marketing_emails_sent = marketing_emails_sent + 1, updated_at = ? WHERE id = ?",
                [new Date().toISOString(), cart.order_id],
              );
            }
          } catch (itemErr) {
            console.error(
              `[Cron] Failed to process cart ${cart.order_id}`,
              itemErr,
            );
          }
        }));
      }
    } catch (err) {
      console.error("[Cron] Uncaught error during scheduled execution:", err);
    }
  },
};

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return managementHandler.fetch(request, env);
  },
};
