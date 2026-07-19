import { Application, Request, Response } from "express";
import { strictRateLimiter } from "../middleware/rateLimiter";
import { sendNotFoundError } from "../utils/errorHandler";
import { createResortAnalyticsRoutes } from "../routes/resortAnalytics";

import authRoutes from "../routes/auth";
import collectionRoutes from "../routes/collections";
import albumsRoutes from "../routes/albums.routes";
import photosRoutes from "../routes/photos.routes";
import usersRoutes from "../routes/users.routes";
import ordersCollectionRoutes from "../routes/orders_collection.routes";
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
import cartRoutes from "../routes/cart";
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
import reelRoutes from "../routes/reels.routes";
import createEntaggedRouter from "../routes/entagged.routes";
import mobileShareRoutes from "../routes/mobileShareRoutes";
import bridgeRoutes from "../routes/bridge.routes";
import settingsRoutes from "../routes/settings.routes";
import shiftRoutes from "../routes/shifts";
import photographerRoutes from "../routes/photographers.routes";

export function mountRoutes(app: Application, context: any) {
  // Specific API routes
  app.use("/api/bridge", bridgeRoutes(context));
  app.use("/api/mobile-share", strictRateLimiter, mobileShareRoutes(context));
  app.use("/api/entagged", createEntaggedRouter(context));
  app.use("/api/hardware", createHardwareRouter());
  app.use("/api/auth", strictRateLimiter, authRoutes(context));
  app.use("/api/collections/albums/records", albumsRoutes(context));
  app.use("/api/collections/photos/records", photosRoutes(context));
  app.use("/api/collections/users/records", usersRoutes(context));
  app.use("/api/collections/orders/records", ordersCollectionRoutes(context));
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
  app.use("/api/cart", cartRoutes(context));
  app.use("/api", syncRoutes(context as any));
  app.use("/api/setup", setupRoutes(context));
  app.use("/api/settings", settingsRoutes(context));
  app.use("/api/shifts", shiftRoutes(context));
  app.use("/api/photographers", photographerRoutes(context));
  app.use("/api/license", licenseRoutes(context));
  app.use("/api/reels", reelRoutes(context));
  app.use("/api/v1/kiosks", createAutoRegisterRouter(context.dbManager, context.logger));

  // Fallback for unhandled API routes
  app.all(/\/api\/(.*)/, (_req: Request, res: Response) => {
    sendNotFoundError(res, "API endpoint");
  });
}
