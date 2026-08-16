import { GeminiClient } from "@clickflash/ai";

const getApiKey = (): string =>
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_GEMINI_API_KEY) ||
  (typeof window !== "undefined" && (window as any).ENV?.GEMINI_API_KEY) ||
  (typeof process !== "undefined" && process.env?.GEMINI_API_KEY) ||
  "demo-api-key";

const aiClient = new GeminiClient({ apiKey: getApiKey(), model: "gemini-2.0-flash" });

export class HotspotAgent {
  public static async generate( rawHeatmapData: string, conversionRates: string ): Promise<string> {
    const prompt = `Analyze the following data and return the top 3 highest-converting physical locations for photographers to deploy to.
Heatmap: ${rawHeatmapData}
Conversions: ${conversionRates}`;
    const response = await aiClient.chat([{ role: "user", content: prompt }]);
    return response.data || "";
  }
}
