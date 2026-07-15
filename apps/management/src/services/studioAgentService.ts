import { alertingService, AlertRule } from "./alertingService";
import { sendChatMessage } from "./geminiService";
import { pb } from "./pb";
import { logger } from "@/utils/logger";

/**
 * LLM-based Studio Agent for Business Alerts
 * Actively monitors business metrics and uses AI to generate proactive insights and alerts.
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

      // 2. Query LLM for insight
      const prompt = `Analyze these studio metrics and suggest a single brief actionable alert if needed (e.g. stalled galleries, opportunities for discounts). If everything is fine, return "OK". Metrics: ${JSON.stringify(metrics)}`;
      
      const aiResponse = await sendChatMessage(prompt, { selectedContext: destinationId || "Global" });

      if (aiResponse && !aiResponse.startsWith("OK")) {
        // Create an alert using the alertingService
        const ruleId = `studio-agent-rule-${Date.now()}`;
        
        // Temporarily register a rule to trigger it
        const tempRule: Omit<AlertRule, "id" | "createdAt"> = {
          name: "AI Studio Insight",
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

        const createdRule = alertingService.createRule(tempRule);
        
        // This mimics how the Fotiqo-style agent works.
        logger.info(`[StudioAgent] Insight generated: ${aiResponse}`);
      }
      
    } catch (err) {
      logger.error("Studio Agent health check failed:", err);
    }
  }
};
