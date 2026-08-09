console.log("Starting server.ts...");
import dotenv from "dotenv";
dotenv.config();

// Ensure NODE_ENV is always defined — rateLimiter and other middleware depend on it
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

import express from "express";
import { getTLSConfig, createSecureServer } from "./config/tlsConfig";
import { mountRoutes } from "./setup/routes";
import initWebSocketServer from "./services/websocket";
import { setupServices } from "./setup/services";
import { setupExpressMiddleware } from "./setup/middlewareSetup";
import { setupStaticAndErrorFallback, startServer } from "./setup/serverLifecycle";
import { MQTTBrokerService } from "./services/mqttBrokerService";
import { MQTTPublisher } from "./services/mqttPublisher";
import { YjsWebsocketServer } from "./services/yjsWebsocketServer";

// Rule 05: Universal Environment Parity - Detection
const isElectron = process.versions && !!process.versions.electron;
process.stdout.write(`[Environment] Running in ${isElectron ? "Electron" : "Web"} mode\n`);

// 1. Initialize all backend directories and domain services
const {
  dbManager,
  logger,
  auditLogger,
  tokenRefreshService,
  context,
  realtimeService,
} = setupServices();

// Export singletons for backward compatibility with existing imports and scripts
export { dbManager, logger, auditLogger, tokenRefreshService };

// 2. Setup Express App and TLS Server
export const app = express();
const tlsConfig = getTLSConfig();
const serverResult = createSecureServer(app, context.config.PORT, "0.0.0.0");
export const server = serverResult.server;

// 3. Setup WebSocket Server and attach to context
const wss = initWebSocketServer(server, context);
(context as any).wss = wss;

if (context.cloudSyncService) {
  (context.cloudSyncService as any).onSettingsUpdated = (settings: any[]) => {
    logger.info(`[CloudSync] Broadcasting LOCAL_CONFIG_UPDATED to all connected WebSocket clients (${settings.length} items)`);
    if ((wss as any).safeBroadcast) {
      (wss as any).safeBroadcast(null, JSON.stringify({
        type: 'LOCAL_CONFIG_UPDATED',
        payload: { settings, hash: Date.now() }
      }));
    }
  };
}


// 3.5 Setup Yjs & MQTT
MQTTBrokerService.start();
MQTTPublisher.initialize().catch(err => logger.error("Failed to init MQTT Publisher", err));
YjsWebsocketServer.initialize(server, '/yjs');

// 4. Setup Global Express Middleware (Helmet, CORS, Auth, Rate Limiting, Audit)
setupExpressMiddleware(app, context);

// 5. Mount API Routes
mountRoutes(app, context);

// 6. Setup Static File Serving and Error Fallback
setupStaticAndErrorFallback(app, context);

// 7. Start Metrics Broadcast Loop (Rule 15 - Performance Visibility)
setInterval(() => {
  realtimeService.broadcastMetrics();
}, 5000);

// 8. Start HTTP/HTTPS Server, Bonjour/UDP Discovery, and Background Ecosystem
startServer(server, context, tlsConfig);
