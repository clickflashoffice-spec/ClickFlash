import { GeminiClient } from "@clickflash/ai";

const aiClient = new GeminiClient({ apiKey: "demo-api-key", model: "gemini-2.0-flash" });

export class StaffingAgent {
  public static async generate( predictedFootTraffic: string, availableStaff: string ): Promise<string> {
    const prompt = `Generate an optimal shift schedule based on the following predicted park traffic and available staff.
Traffic: ${predictedFootTraffic}
Staff: ${availableStaff}`;
    const response = await aiClient.chat([{ role: "user", content: prompt }]);
    return response.data || "";
  }
}
