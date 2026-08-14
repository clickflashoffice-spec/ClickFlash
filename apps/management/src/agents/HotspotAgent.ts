import { GeminiClient } from "@clickflash/ai";

const aiClient = new GeminiClient({ apiKey: "demo-api-key", model: "gemini-2.0-flash" });

export class HotspotAgent {
  public static async generate( rawHeatmapData: string, conversionRates: string ): Promise<string> {
    const prompt = `Analyze the following data and return the top 3 highest-converting physical locations for photographers to deploy to.
Heatmap: ${rawHeatmapData}
Conversions: ${conversionRates}`;
    const response = await aiClient.chat([{ role: "user", content: prompt }]);
    return response.data || "";
  }
}
