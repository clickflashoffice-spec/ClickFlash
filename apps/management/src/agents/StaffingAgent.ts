import { GeminiClient } from "@clickflash/ai";

const getApiKey = (): string =>
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_GEMINI_API_KEY) ||
  (typeof window !== "undefined" && (window as any).ENV?.GEMINI_API_KEY) ||
  (typeof process !== "undefined" && process.env?.GEMINI_API_KEY) ||
  "demo-api-key";

const aiClient = new GeminiClient({ apiKey: getApiKey(), model: "gemini-2.0-flash" });

export class StaffingAgent {
  public static async generate( predictedFootTraffic: string, availableStaff: string ): Promise<string> {
    const prompt = `Generate an optimal shift schedule based on the following predicted park traffic and available staff.
Traffic: ${predictedFootTraffic}
Staff: ${availableStaff}`;
    const response = await aiClient.chat([{ role: "user", content: prompt }]);
    return response.data || "";
  }
}
