import { Application, Request, Response } from "express";
import { strictRateLimiter } from "../middleware/rateLimiter";
import { sendNotFoundError } from "../utils/errorHandler";
import { createResortAnalyticsRoutes } from "../routes/resortAnalytics";

// Routes
import authRoutes from "../routes/auth";
import collectionRoutes from "../routes/collections";
import systemRoutes from "../routes/system";
import fileRoutes from "../routes/files";
import realtimeRoutes from "../routes/realtime";
import pairingRoutes from "../routes/pairing";
import sessionTypeRoutes from "../routes/sessionTypes";
import cullingRoutes from "../routes/culling";
import cloudRoutes from "../routes/cloud";
import faceRoutes from "../routes/faces";
import orderRoutes from "../routes/orders";
import notificationRoutes from "../routes/notification";
import assistanceRoutes from "../routes/assistance";
import galleryRoutes from "../routes/gallery";
import galleryAuthRoutes from "../routes/galleryAuth";
import galleryCheckoutRoutes from "../routes/galleryCheckout";
import syncRoutes from "../routes/sync";
import analyticsRoutes from "../routes/analytics";
import marketingRoutes from "../routes/marketing";
import dashboardRoutes from "../routes/dashboard";
import healthRoutes from "../routes/health";
import exportRoutes from "../routes/export";
import setupRoutes from "../routes/setup";
import backupRoutes from "../routes/backup";
import telemetryRoutes from "../routes/system/telemetry";
import licenseRoutes from "../routes/license";
import { createHardwareRouter } from "../routes/hardware.routes";
import createAutoRegisterRouter from "../routes/autoRegister";

export function mountRoutes(app: Application, context: any) {
  // Specific API routes
  app.use("/api/hardware", createHardwareRouter());
  app.use("/api/auth", strictRateLimiter, authRoutes(context));
  app.use("/api/collections", collectionRoutes(context));
  app.use("/api/cloud", cloudRoutes(context));
  app.use("/api/session-types", sessionTypeRoutes(context));
  app.use("/api/culling", cullingRoutes(context));
  app.use("/api/faces", faceRoutes(context));
  app.use("/api/orders", orderRoutes(context));
  app.use("/api/analytics", analyticsRoutes(context));
  app.use("/api/marketing", marketingRoutes(context));
  app.use("/api/dashboard", dashboardRoutes(context));
  app.use("/api/health", healthRoutes(context.dbManager, context.thermalService, context));
  app.use("/api/export", exportRoutes(context as any));
  app.use("/api/backup", backupRoutes(context));
  app.use("/api/telemetry", telemetryRoutes(context));
  app.use("/api/system/telemetry", telemetryRoutes(context));
  
  app.use(
    "/api/resort-analytics",
    createResortAnalyticsRoutes(context.resortAnalytics, context.logger),
  );

  // General API routes mounted at /api
  app.use("/api", fileRoutes(context));
  app.use("/api", systemRoutes(context));
  app.use("/api", realtimeRoutes(context));
  app.use("/api", pairingRoutes(context));
  app.use("/api", notificationRoutes(context));
  app.use("/api", assistanceRoutes(context));
  app.use("/api/gallery", galleryRoutes(context));
  app.use("/api/gallery-auth", strictRateLimiter, galleryAuthRoutes(context));
  app.use("/api/gallery-checkout", strictRateLimiter, galleryCheckoutRoutes(context));
  app.use("/api", syncRoutes(context as any));
  app.use("/api/setup", setupRoutes(context));
  app.use("/api/license", licenseRoutes(context));
  app.use("/api/v1/kiosks", createAutoRegisterRouter(context.dbManager, context.logger));

  // Fallback for unhandled API routes
  app.all(/\/api\/(.*)/, (_req: Request, res: Response) => {
    sendNotFoundError(res, "API endpoint");
  });
}
