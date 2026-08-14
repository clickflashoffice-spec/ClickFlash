import { GeminiClient } from "@clickflash/ai";

const aiClient = new GeminiClient({ apiKey: "demo-api-key", model: "gemini-2.0-flash" });

export class PricingAgent {
  public static async generate( currentDemand: string, weatherData: string, competitorPricing: string ): Promise<string> {
    const prompt = `Analyze the current park conditions and recommend a dynamic pricing multiplier (e.g. 1.2x) for photo passes.
Demand: ${currentDemand}
Weather: ${weatherData}
Competitors: ${competitorPricing}`;
    const response = await aiClient.chat([{ role: "user", content: prompt }]);
    return response.data || "";
  }
}
