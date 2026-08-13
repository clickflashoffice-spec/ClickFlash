import { logger } from "@/utils/logger";
import { isPublicDomain } from "@/utils/environment";

export interface ScoutInsight {
  zoneId: string;
  zoneName: string;
  profitabilityScore: number;
  revenuePerHour: number;
  recommendationText: string;
  actionType: "REDEPLOY" | "SURGE_WARNING" | "MAINTAIN";
  priority: "HIGH" | "MEDIUM" | "LOW";
}

export interface ManagerFlag {
  photographerId: string;
  flagReason: string;
  coachingMessage: string;
  actionPlan: string[];
}

export interface PricingSuggestion {
  id: string;
  trigger: string;
  suggestion: string;
  impact: string;
  confidence: number;
  color: string;
}

export interface CEOInsightsResponse {
  pricingSuggestions: PricingSuggestion[];
  executiveSummary: string;
  forecastAugust: number;
}

import { getEnv } from "@/utils/env";

/**
 * Helper to determine the cloud backend URL for AI endpoints.
 */
function getAICloudUrl(): string {
  const env = getEnv();
  if (env.VITE_AI_BACKEND_URL) {
    return env.VITE_AI_BACKEND_URL;
  }
  if (isPublicDomain()) {
    return "https://cloud-backend.public.workers.dev";
  }
  return "http://127.0.0.1:8787";
}

export const aiIntelligenceService = {
  /**
   * Fetch live profitability zones and recommendations from Gemini AI Scout engine.
   */
  async fetchScoutInsights(zonesData: any = {}): Promise<ScoutInsight[]> {
    const baseUrl = getAICloudUrl();
    try {
      const res = await fetch(`${baseUrl}/api/ai/scout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zonesData }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.insights)) {
          return data.insights;
        }
      }
    } catch (err) {
      logger.warn("[AI Intelligence] Cloud API unreachable for Scout. Using simulated AI insights.", err);
    }

    return [
      {
        zoneId: "poolside",
        zoneName: "Poolside",
        profitabilityScore: 94,
        revenuePerHour: 4250,
        recommendationText: "\"Poolside\" is currently generating 3x standard hourly revenue. We recommend redeploying 2 photographers from the lobby immediately.",
        actionType: "REDEPLOY",
        priority: "HIGH",
      },
      {
        zoneId: "sunset-pt",
        zoneName: "Sunset Point",
        profitabilityScore: 82,
        revenuePerHour: 1800,
        recommendationText: "Based on historical data and current check-in volume, expect a 40% surge in photo requests near \"Sunset Point\" within the next 45 minutes.",
        actionType: "SURGE_WARNING",
        priority: "MEDIUM",
      },
      {
        zoneId: "beach-pier",
        zoneName: "Beach Pier",
        profitabilityScore: 88,
        revenuePerHour: 2100,
        recommendationText: "Zone Beach Pier is under-staffed during peak hours (+€450 potential revenue)",
        actionType: "REDEPLOY",
        priority: "HIGH",
      },
      {
        zoneId: "main-lobby",
        zoneName: "Main Lobby",
        profitabilityScore: 68,
        revenuePerHour: 950,
        recommendationText: "Current fleet distribution is 85% optimal. Moving one unit from Main Lobby to Central Garden will increase projected revenue by 8%.",
        actionType: "MAINTAIN",
        priority: "LOW",
      },
    ];
  },

  /**
   * Fetch live coaching advice and flags for struggling or outstanding photographers.
   */
  async fetchManagerFlags(photographers: any[] = []): Promise<ManagerFlag[]> {
    const baseUrl = getAICloudUrl();
    try {
      const res = await fetch(`${baseUrl}/api/ai/manager`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photographers }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.flags)) {
          return data.flags;
        }
      }
    } catch (err) {
      logger.warn("[AI Intelligence] Cloud API unreachable for Manager Flags. Using simulated flags.", err);
    }

    return [
      {
        photographerId: "p2",
        flagReason: "Conversion rate critically low (18%). Customer satisfaction at risk.",
        coachingMessage: "Hi Sofia, your conversion rate is currently at 18%. Focus on inviting couples for rapid sunset poses and highlighting the digital album bundle value.",
        actionPlan: [
          "Check lighting angles at Beach Front against harsh midday glare.",
          "Offer instant mobile preview right after taking the first 3 shots.",
        ],
      },
      {
        photographerId: "p5",
        flagReason: "Photographer did not check-in today. No GPS signal.",
        coachingMessage: "System alert: Yusuf is currently marked offline during active shift window.",
        actionPlan: [
          "Verify device battery and mobile network SIM connection.",
          "Dispatch area coordinator to North Wing kiosk.",
        ],
      },
    ];
  },

  /**
   * Fetch CEO dynamic pricing suggestions and revenue forecasts.
   */
  async fetchCEOInsights(financialData: any = {}): Promise<CEOInsightsResponse> {
    const baseUrl = getAICloudUrl();
    try {
      const res = await fetch(`${baseUrl}/api/ai/ceo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ financialData }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.pricingSuggestions) {
          return {
            pricingSuggestions: data.pricingSuggestions,
            executiveSummary: data.executiveSummary || "Strong guest arrival velocity across resort locations.",
            forecastAugust: data.forecastAugust || 38500,
          };
        }
      }
    } catch (err) {
      logger.warn("[AI Intelligence] Cloud API unreachable for CEO Insights. Using simulated data.", err);
    }

    return {
      pricingSuggestions: [
        {
          id: "ps1",
          trigger: "Sunset Peak Demand",
          suggestion: "Increase package prices by 15% between 5 PM - 7 PM",
          impact: "+18% projected revenue",
          confidence: 92,
          color: "emerald",
        },
        {
          id: "ps2",
          trigger: "Low conversion rate at Beach Front",
          suggestion: "Offer 10% flash discount code for next 2 hours",
          impact: "+34% conversion at this location",
          confidence: 78,
          color: "amber",
        },
        {
          id: "ps3",
          trigger: "All-inclusive guests arriving (40 rooms today)",
          suggestion: "Pre-sell 'Resort Memory Package' at check-in (EUR 120)",
          impact: "EUR 4,800 potential incremental revenue",
          confidence: 85,
          color: "sky",
        },
      ],
      executiveSummary: "Current trajectory exceeds July revenue velocity by 11.4%. Dynamic pricing triggers are actively capturing peak afternoon demand.",
      forecastAugust: 38500,
    };
  },

  /**
   * Ask the Gemini AI Assistant any natural language query about the business or fleet.
   */
  async queryAssistant(query: string, context: any = {}): Promise<string> {
    const baseUrl = getAICloudUrl();
    try {
      const res = await fetch(`${baseUrl}/api/ai/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, context }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.answer) {
          return data.answer;
        }
      }
    } catch (err) {
      logger.warn("[AI Intelligence] Cloud API unreachable for Assistant query.", err);
    }

    return `Simulated AI Response for: "${query}"\nBased on your current fleet load and conversion metrics, we suggest maintaining active coverage at high-foot-traffic zones during afternoon peak hours and enabling instant mobile waivers.`;
  },
};
