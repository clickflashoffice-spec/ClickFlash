import { GeminiClient } from "@clickflash/ai";

const getApiKey = (): string =>
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_GEMINI_API_KEY) ||
  (typeof window !== "undefined" && (window as any).ENV?.GEMINI_API_KEY) ||
  (typeof process !== "undefined" && process.env?.GEMINI_API_KEY) ||
  "demo-api-key";

const aiClient = new GeminiClient({ apiKey: getApiKey(), model: "gemini-2.0-flash" });

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
