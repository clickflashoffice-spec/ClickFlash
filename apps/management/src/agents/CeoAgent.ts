import { GeminiClient } from "@clickflash/ai";

const getApiKey = (): string =>
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_GEMINI_API_KEY) ||
  (typeof window !== "undefined" && (window as any).ENV?.GEMINI_API_KEY) ||
  (typeof process !== "undefined" && process.env?.GEMINI_API_KEY) ||
  "demo-api-key";

const aiClient = new GeminiClient({ apiKey: getApiKey(), model: "gemini-2.0-flash" });

export class CeoAgent {
  public static async generate( hotspotReport: string, spyReport: string, staffingReport: string ): Promise<string> {
    const prompt = `You are the CEO Agent, the top-level orchestrator of the resort photography system.
Hotspot Insights: ${hotspotReport}
Fraud/Oversight Risk: ${spyReport}
Staffing Status: ${staffingReport}

Synthesize this into a powerful, executive-level summary for the Resort Director (max 3 sentences).`;
    const response = await aiClient.chat([{ role: "user", content: prompt }]);
    return response.data || "";
  }
}
