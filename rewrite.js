const fs = require('fs');

const agents = {
  CeoAgent: {
    args: "hotspotReport: string, spyReport: string, staffingReport: string",
    prompt: "`You are the CEO Agent, the top-level orchestrator of the resort photography system.\nHotspot Insights: ${hotspotReport}\nFraud/Oversight Risk: ${spyReport}\nStaffing Status: ${staffingReport}\n\nSynthesize this into a powerful, executive-level summary for the Resort Director (max 3 sentences).`"
  },
  HotspotAgent: {
    args: "rawHeatmapData: string, conversionRates: string",
    prompt: "`Analyze the following data and return the top 3 highest-converting physical locations for photographers to deploy to.\nHeatmap: ${rawHeatmapData}\nConversions: ${conversionRates}`"
  },
  PricingAgent: {
    args: "currentDemand: string, weatherData: string, competitorPricing: string",
    prompt: "`Analyze the current park conditions and recommend a dynamic pricing multiplier (e.g. 1.2x) for photo passes.\nDemand: ${currentDemand}\nWeather: ${weatherData}\nCompetitors: ${competitorPricing}`"
  },
  SpyAgent: {
    args: "photographerLogs: string, voidedTransactions: string",
    prompt: "`Analyze the following logs for potential fraud or unauthorized free photo transfers.\nLogs: ${photographerLogs}\nVoids: ${voidedTransactions}`"
  },
  StaffingAgent: {
    args: "predictedFootTraffic: string, availableStaff: string",
    prompt: "`Generate an optimal shift schedule based on the following predicted park traffic and available staff.\nTraffic: ${predictedFootTraffic}\nStaff: ${availableStaff}`"
  }
};

for (const [name, data] of Object.entries(agents)) {
  const content = `import { GeminiClient } from "@clickflash/ai";

const aiClient = new GeminiClient({ apiKey: "demo-api-key", model: "gemini-2.0-flash" });

export class ${name} {
  public static async generate( ${data.args} ): Promise<string> {
    const prompt = ${data.prompt};
    const response = await aiClient.chat([{ role: "user", content: prompt }]);
    return response.data || "";
  }
}
`;
  fs.writeFileSync(`c:/Users/alamo/Desktop/ClickFlash/apps/management/src/agents/${name}.ts`, content);
}
