/**
 * MoneyTrash Cloudflare Worker API
 * Handles chunked uploads, office registration, and gallery creation
 */

import { Router } from "./router";
import { authMiddleware } from "./middleware/auth";
import { rateLimitMiddleware } from "./middleware/rateLimit";
import { handleUploadInit } from "./handlers/upload/init";
import { handleUploadChunk } from "./handlers/upload/chunk";
import { handleUploadFinalize } from "./handlers/upload/finalize";
import { handleUploadCancel } from "./handlers/upload/cancel";
import { handleOfficeRegister } from "./handlers/office/register";
import { handleOfficeVerify } from "./handlers/office/verify";
import { handleGalleryCreate } from "./handlers/gallery/create";
import { handleGalleryGet } from "./handlers/gallery/get";
import { handleGalleryAssetGet } from "./handlers/gallery/asset";
import { handleWebhook } from "./handlers/webhook";
import { handleGalleryCheckoutCreate } from "./handlers/checkout/create";
import { handleGalleryCheckoutStatus } from "./handlers/checkout/status";
import { handleStripeWebhook } from "./handlers/stripeWebhook";
import { handleGalleryPurchaseDownload } from "./handlers/checkout/download";
import { logger } from "@clickflash/logger";
import { purgeExpiredGalleries } from "./services/galleryRetentionService";

export interface Env {
  DB: D1Database;
  UPLOADS_BUCKET: R2Bucket;
  UPLOAD_SESSIONS: KVNamespace;
  JWT_SECRET: string;
  MASTER_API_KEY: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  WEBHOOK_SECRET: string;
  ENVIRONMENT: string;
  GALLERY_APP_URL: string;
  MAX_UPLOAD_SIZE: string;
  CHUNK_SIZE: string;
  ALLOWED_ORIGINS: string;
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const router = new Router();

    // CORS headers - use configured origins or default to production domains
    const allowedOrigins =
      env.ALLOWED_ORIGINS ||
      "https://moneytrash.clickflash.com,https://gallery.clickflash.com";
    const allowedOriginSet = new Set(
      allowedOrigins.split(",").map((origin) => origin.trim()).filter(Boolean),
    );
    const requestOrigin = request.headers.get("Origin") || "";
    
    const corsHeaders: Record<string, string> = {
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, X-Desk-Id, X-Office-Type",
      "Access-Control-Max-Age": "86400",
    };

    const isAllowedOrigin = (origin: string): boolean => {
      if (!origin) return true;
      return allowedOriginSet.has(origin);
    };

    if (isAllowedOrigin(requestOrigin)) {
      corsHeaders["Access-Control-Allow-Origin"] = requestOrigin || "*";
    }

    // Handle preflight
    if (request.method === "OPTIONS") {
      if (requestOrigin && !isAllowedOrigin(requestOrigin)) {
        return Response.json({ error: "Origin is not allowed" }, { status: 403 });
      }
      return new Response(null, { headers: corsHeaders });
    }

    if (requestOrigin && !isAllowedOrigin(requestOrigin)) {
      return Response.json({ error: "Origin is not allowed" }, { status: 403 });
    }

    // Apply rate limiting
    router.use(rateLimitMiddleware);

    // Public routes (no auth required)
    router.post("/api/office/register", handleOfficeRegister);
    router.post("/api/office/verify", handleOfficeVerify);

    // Protected routes (auth required)
    router.use(authMiddleware);

    // Upload endpoints
    router.post("/api/upload/chunk/init", handleUploadInit);
    router.put("/api/upload/chunk", handleUploadChunk);
    router.patch("/api/upload/chunk/finalize", handleUploadFinalize);
    router.post("/api/upload/chunk/cancel", handleUploadCancel);

    // Gallery endpoints
    router.post("/api/galleries", handleGalleryCreate);
    router.get("/api/galleries/:code", handleGalleryGet);
    router.get("/api/gallery-assets/:id", handleGalleryAssetGet);

    // Dedicated customer commerce endpoints. These are authorized with the
    // short-lived gallery purchase token issued by GET /api/galleries/:code.
    router.post("/api/gallery-checkout", handleGalleryCheckoutCreate);
    router.get("/api/gallery-checkout/sessions/:id", handleGalleryCheckoutStatus);
    router.get("/api/gallery-purchases/:orderId/assets/:assetId", handleGalleryPurchaseDownload);
    router.post("/api/stripe/webhook", handleStripeWebhook);

    // Legacy office-to-office webhook endpoint
    router.post("/api/webhooks/:event", handleWebhook);

    // Health check
    router.get("/api/health", () => {
      return Response.json({
        status: "ok",
        service: "moneytrash-api",
        version: "4.2.0",
        timestamp: new Date().toISOString(),
      });
    });

    try {
      const response = await router.handle(request, env, ctx);

      // Add CORS headers to all responses
      const newHeaders = new Headers(response.headers);
      Object.entries(corsHeaders).forEach(([key, value]) => {
        newHeaders.set(key, value);
      });

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    } catch (error) {
      logger.error("API Error:", { args: [error] });

      const errorHeaders = new Headers();
      Object.entries(corsHeaders).forEach(([key, value]) => {
        errorHeaders.set(key, value);
      });
      errorHeaders.set("Content-Type", "application/json");

      return new Response(
        JSON.stringify({
          error: "Internal server error",
          message: error instanceof Error ? error.message : "Unknown error",
        }),
        { 
          status: 500,
          headers: errorHeaders 
        },
      );
    }
  },
  async scheduled(
    _controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    ctx.waitUntil(purgeExpiredGalleries(env));
  },
};
