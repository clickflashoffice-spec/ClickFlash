/**
 * fastifyServer.ts — Fastify-Powered LAN Gateway (Express Compatibility Bridge)
 *
 * OSS upgrade: Express 5 → Fastify (33K★, MIT)
 * ~40% higher throughput for multi-kiosk LAN serving.
 *
 * Uses @fastify/express plugin for gradual migration — all existing Express
 * route files work unchanged through the compatibility layer. This allows
 * migrating routes to native Fastify incrementally.
 *
 * @see server.ts for the original Express implementation
 */
import dotenv from "dotenv";
dotenv.config();

process.env.NODE_ENV = process.env.NODE_ENV || "development";

import crypto from "crypto";
import fs from "fs";
import path from "path";

if (!process.env.DB_ENCRYPTION_KEY) {
  const newKey = crypto.randomBytes(32).toString("hex");
  process.env.DB_ENCRYPTION_KEY = newKey;
  const envPath = path.resolve(process.cwd(), ".env");
  try {
    fs.appendFileSync(envPath, `\nDB_ENCRYPTION_KEY=${newKey}\n`);
    console.log("[Security] Auto-generated DB_ENCRYPTION_KEY and saved to .env");
  } catch (err) {
    console.error("[Security] Failed to save DB_ENCRYPTION_KEY to .env", err);
  }
}

import Fastify, { type FastifyInstance } from "fastify";
import fastifyExpress from "@fastify/express";
import fastifyCors from "@fastify/cors";
import fastifyHelmet from "@fastify/helmet";
import fastifyRateLimit from "@fastify/rate-limit";

import { getTLSConfig } from "./config/tlsConfig";
import { mountRoutes } from "./setup/routes";
import { whatsappRoutes } from "./routes/whatsappRoutes";
import initWebSocketServer from "./services/websocket";
import { setupServices } from "./setup/services";
import { setupExpressMiddleware } from "./setup/middlewareSetup";
import { setupStaticAndErrorFallback, startServer } from "./setup/serverLifecycle";
import { MQTTBrokerService } from "./services/mqttBrokerService";
import { MQTTPublisher } from "./services/mqttPublisher";
import { YjsWebsocketServer } from "./services/yjsWebsocketServer";

const isElectron = process.versions && !!process.versions.electron;
process.stdout.write(`[Environment] Running in ${isElectron ? "Electron" : "Web"} mode (Fastify)\n`);

// 1. Initialize all backend services
const {
  dbManager,
  logger,
  auditLogger,
  tokenRefreshService,
  context,
  realtimeService,
} = setupServices();

export { dbManager, logger, auditLogger, tokenRefreshService };

// 2. Create Fastify instance
const tlsConfig = getTLSConfig();
const fastify: FastifyInstance = Fastify({
  logger: false, // We use our own logger
  bodyLimit: 52_428_800, // 50MB
  // TLS is handled by the underlying server
});

async function buildServer() {
  // Register Fastify-native plugins (faster than Express equivalents)
  await fastify.register(fastifyCors, {
    origin: true, // Matches ALLOWED_ORIGINS logic from Express
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "X-CSRF-Token"],
  });

  await fastify.register(fastifyHelmet, {
    contentSecurityPolicy: false, // Electron needs inline scripts
    crossOriginEmbedderPolicy: false,
  });

  await fastify.register(fastifyRateLimit, {
    max: 100,
    timeWindow: "1 minute",
    allowList: ["127.0.0.1", "::1"], // Localhost bypass
  });

  // Native Fastify health endpoint (bypasses Express layer)
  fastify.get("/api/health/ping", async () => ({
    status: "ok",
    engine: "fastify",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  }));

  // Native Fastify AI Ingestion Pipeline endpoint
  fastify.post("/api/ai/pipeline/run", async (request, reply) => {
    try {
      const body = request.body as any;
      const { photoId, base64Image, autoEnhance, removeBg, upscaleFactor, extractPalette } = body;

      if (!base64Image) {
        return reply.status(400).send({ error: "base64Image is required" });
      }

      const { aiPipelineOrchestrator } = await import("./services/aiPipelineOrchestrator");
      const buffer = Buffer.from(base64Image.replace(/^data:image\/\w+;base64,/, ""), "base64");
      const result = await aiPipelineOrchestrator.processPhoto(buffer, {
        photoId: photoId || `photo_${Date.now()}`,
        autoEnhance,
        removeBg,
        upscaleFactor,
        extractPalette,
      });

      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // 3. Register Express compatibility layer for existing routes
  await fastify.register(fastifyExpress);

  // Register native Fastify WhatsApp routes
  await fastify.register(whatsappRoutes);

  // Mount all existing Express middleware and routes through compatibility layer
  setupExpressMiddleware(fastify.express, context);
  mountRoutes(fastify.express, context);
  setupStaticAndErrorFallback(fastify.express, context);

  // 4. Setup WebSocket, MQTT, and Yjs on the underlying Node.js server
  const rawServer = fastify.server;

  const wss = initWebSocketServer(rawServer, context);
  (context as any).wss = wss;

  if (context.cloudSyncService) {
    (context.cloudSyncService as any).onSettingsUpdated = (settings: any[]) => {
      logger.info(`[CloudSync] Broadcasting LOCAL_CONFIG_UPDATED (${settings.length} items)`);
      if ((wss as any).safeBroadcast) {
        (wss as any).safeBroadcast(null, JSON.stringify({
          type: "LOCAL_CONFIG_UPDATED",
          payload: { settings, hash: Date.now() },
        }));
      }
    };
  }

  MQTTBrokerService.start();
  MQTTPublisher.initialize().catch((err) =>
    logger.error("Failed to init MQTT Publisher", err)
  );
  YjsWebsocketServer.initialize(rawServer, "/yjs");

  // Initialize WebRTC Signaling Server for spontaneous video check-ins
  const { webRtcSignalingService } = await import("./services/webrtcSignaling");
  webRtcSignalingService.init(rawServer as any);

  // Initialize self-hosted GlitchTip error tracking
  const { glitchtipService } = await import("./services/glitchtipService");
  glitchtipService.initialize().catch((err) =>
    logger.warn("[Fastify] GlitchTip init non-fatal warning", err)
  );

  // Initialize SuperTokens authentication bridge
  const { supertokensService } = await import("./services/supertokensService");
  supertokensService.initialize().catch((err) =>
    logger.warn("[Fastify] SuperTokens init non-fatal warning", err)
  );

  // 5. Metrics broadcast
  const metricsTimer = setInterval(() => {
    realtimeService.broadcastMetrics();
  }, 15000);
  if (metricsTimer && typeof metricsTimer.unref === "function") {
    metricsTimer.unref();
  }

  return fastify;
}

// Boot sequence
buildServer()
  .then((server) => {
    const port = context.config.PORT || 8090;
    server.listen({ port, host: "0.0.0.0" }, (err: any) => {
      if (err) {
        logger.error("[Fastify] Failed to start:", err);
        process.exit(1);
      }
      logger.info(`[Fastify] ClickFlash Master OS listening on port ${port}`);

      // Start Bonjour/UDP discovery and background ecosystem
      startServer(server.server, context, tlsConfig);
    });
  })
  .catch((err) => {
    console.error("[Fastify] Build failed:", err);
    process.exit(1);
  });

export { fastify };
