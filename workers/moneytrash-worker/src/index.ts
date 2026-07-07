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
import { handleWebhook } from "./handlers/webhook";

export interface Env {
  DB: D1Database;
  UPLOADS_BUCKET: R2Bucket;
  UPLOAD_SESSIONS: KVNamespace;
  JWT_SECRET: string;
  STRIPE_SECRET_KEY: string;
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
      "https://moneytrash.clickflash.app,https://gallery.clickflash.app";
    const requestOrigin = request.headers.get("Origin") || "";
    
    const corsHeaders: Record<string, string> = {
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, X-Desk-Id, X-Office-Type",
      "Access-Control-Max-Age": "86400",
    };

    if (allowedOrigins.split(",").includes(requestOrigin)) {
      corsHeaders["Access-Control-Allow-Origin"] = requestOrigin;
    }

    // Handle preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
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

    // Webhook endpoint
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
      console.error("API Error:", error);

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
};
