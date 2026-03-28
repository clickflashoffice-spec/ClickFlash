import { localPB } from "./pb";
import { logger } from "../utils/logger";
import { cloudSyncService } from "./cloudSyncService";
import { isCloudMode } from "../utils/appMode";

export interface PhotographerDailyAudit {
  date: string; // YYYY-MM-DD
  photographer_id: string;
  total_customers: number;
  imported_photos: number;
  sold_photos: number;
  bad_quality_photos: number;
  sales_revenue: number;
}

class MetricsAggregationService {
  private static instance: MetricsAggregationService;

  private constructor() {}

  public static getInstance(): MetricsAggregationService {
    if (!MetricsAggregationService.instance) {
      MetricsAggregationService.instance = new MetricsAggregationService();
    }
    return MetricsAggregationService.instance;
  }

  /**
   * Aggregates local data (photos, orders, customers) for a given date across all active photographers.
   */
  public async aggregateDailyAudits(
    targetDateStr?: string,
  ): Promise<PhotographerDailyAudit[]> {
    const dateString = targetDateStr || new Date().toISOString().split("T")[0];

    try {
      logger.info(
        `[MetricsAggregator] Starting local analytics aggregation for ${dateString}`,
      );

      // 1. Get all photographers (users with 'Photographer' role)
      const photographers = await localPB.collection("users").getFullList({
        filter: `role="Photographer"`,
      });

      if (photographers.length === 0) {
        logger.info("[MetricsAggregator] No photographers found to audit.");
        return [];
      }

      const audits: PhotographerDailyAudit[] = [];

      // 2. We use direct DB queries for complex aggregation to keep it lightweight,
      // since PocketBase JS SDK doesn't natively support GROUP BY or complex JOINs easily.
      // Using a raw query builder approach via the under-the-hood engine where possible.
      // Because localPB exposes a wrapper, we will fetch and manually reduce for safety in this iteration,
      // or use custom API endpoints if built. Since we have full access in Master via dbManager...
      // Wait, we are in the frontend codebase of Master app here. If this is invoked by main thread,
      // we should probably let a backend service do the raw SQL, OR do client-side reduce.
      // Let's do client-side reduce. It's safe since daily volume per photographer is manageable.

      // Fetch all orders for the day
      const dailyOrders = await localPB.collection("orders").getFullList({
        filter: `date >= "${dateString} 00:00:00" && date <= "${dateString} 23:59:59"`,
      });

      // Fetch all photos added today
      const dailyPhotos = await localPB.collection("photos").getFullList({
        filter: `created >= "${dateString} 00:00:00" && created <= "${dateString} 23:59:59"`,
      });

      for (const photographer of photographers) {
        const pId = photographer.id;

        // Filter orders for this photographer
        const pOrders = dailyOrders.filter((o) => o.photographerId === pId);
        const salesRevenue = pOrders.reduce(
          (acc, order) => acc + (order.totalAmount || order.total || 0),
          0,
        );

        // Customers = unique emails + distinct orders without emails
        const customerEmails = new Set(
          pOrders.map((o) => o.email).filter((e) => !!e),
        );
        const ordersWithoutEmails = pOrders.filter((o) => !o.email).length;
        const totalCustomers = customerEmails.size + ordersWithoutEmails;

        // Filter photos
        const pPhotos = dailyPhotos.filter(
          (p) =>
            p.photographerId === pId ||
            p.expand?.albumId?.photographerId === pId,
        );
        const importedPhotos = pPhotos.length;

        // Sold photos (status = purchased, or part of paid orders)
        const soldPhotos = pPhotos.filter(
          (p) => p.status === "purchased",
        ).length;

        // Bad Quality Photos (has quality_flags json array with elements, or manual flag)
        const badQualityPhotos = pPhotos.filter((p) => {
          if (!p.quality_flags) return false;
          try {
            const flags =
              typeof p.quality_flags === "string"
                ? JSON.parse(p.quality_flags)
                : p.quality_flags;
            return Array.isArray(flags) && flags.length > 0;
          } catch {
            return false;
          }
        }).length;

        audits.push({
          date: dateString,
          photographer_id: pId,
          total_customers: totalCustomers,
          imported_photos: importedPhotos,
          sold_photos: soldPhotos,
          bad_quality_photos: badQualityPhotos,
          sales_revenue: salesRevenue,
        });
      }

      logger.info(
        `[MetricsAggregator] Generated audits for ${audits.length} photographers.`,
      );
      return audits;
    } catch (error) {
      logger.error(
        "[MetricsAggregator] Failed to aggregate daily audits",
        error,
      );
      return [];
    }
  }

  /**
   * Pushes the aggregated local audits up to the Cloud Hub.
   */
  public async pushAuditsToCloud(targetDateStr?: string) {
    if (!isCloudMode) return;

    const audits = await this.aggregateDailyAudits(targetDateStr);
    if (audits.length === 0) return;

    try {
      logger.info("[MetricsAggregator] Pushing daily audits to Hub...");

      // Requires fetching the auth token for the hub
      const clConfig = JSON.parse(
        localStorage.getItem("cloud_settings") || "{}",
      );
      const token = clConfig.hubToken;
      const endpoint = clConfig.hubURL
        ? `${clConfig.hubURL}/api/analytics/daily-audit`
        : null;

      if (!token || !endpoint) {
        logger.warn(
          "[MetricsAggregator] Cloud configuration missing. Cannot push audits.",
        );
        return;
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ audits }),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(
          `Hub rejected audit payload: ${response.status} ${err}`,
        );
      }

      logger.info(
        "[MetricsAggregator] Successfully pushed daily audits to Hub.",
      );
    } catch (error) {
      logger.error("[MetricsAggregator] Failed to push audits to Hub", error);
    }
  }
}

export const metricsAggregationService =
  MetricsAggregationService.getInstance();
