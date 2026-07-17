import { alertingService, AlertRule } from "./alertingService";
import { sendChatMessage } from "./pixelFounderService";
import { pb } from "./pb";
import { logger } from "@/utils/logger";

/**
 * Rules-backed Studio Agent for business alerts.
 * It sends measured business metrics to the first-party Management Worker.
 */
export const studioAgentService = {
  async runHealthCheck(destinationId?: string): Promise<void> {
    try {
      // 1. Gather basic stats
      const orders = await pb.collection("orders").getFullList({
        filter: destinationId ? `destinationId="${destinationId}"` : "",
      });
      
      const pendingOrders = orders.filter((o: any) => o.status === "Pending");
      const completedOrders = orders.filter((o: any) => o.status === "Completed" || o.status === "Delivered");
      
      const revenueToday = completedOrders.reduce((sum: number, o: any) => sum + (o.total || 0), 0);

      const metrics = {
        totalOrders: orders.length,
        pendingOrders: pendingOrders.length,
        revenueToday,
      };

      // 2. Evaluate the supplied metrics through PixelFounder rules.
      const prompt = `Analyze these studio metrics and suggest a single brief actionable alert if needed (e.g. stalled galleries, opportunities for discounts). If everything is fine, return "OK". Metrics: ${JSON.stringify(metrics)}`;
      
      const insightResponse = await sendChatMessage(prompt, {
        selectedContext: destinationId || "Global",
        metrics,
      });

      if (insightResponse && !insightResponse.startsWith("OK")) {
        // Create an alert using the alertingService
        // Temporarily register a rule to trigger it
        const tempRule: Omit<AlertRule, "id" | "createdAt"> = {
          name: "PixelFounder Studio Insight",
          condition: {
            metric: "revenue",
            operator: ">=",
            threshold: 0
          },
          severity: "info",
          channels: ["email", "push"],
          recipients: ["managers"],
          cooldown: 0,
          enabled: true,
          autoResolve: false
        };

        alertingService.createRule(tempRule);
        
        // This mimics how the Fotiqo-style agent works.
        logger.info(`[StudioAgent] Insight generated: ${insightResponse}`);
      }
      
    } catch (err) {
      logger.error("Studio Agent health check failed:", err);
    }
  }
};
