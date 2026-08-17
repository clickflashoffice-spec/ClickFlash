import { GeminiClient } from "@clickflash/ai";
import { getAgentApiKey } from "./getAgentApiKey";

const aiClient = new GeminiClient({ apiKey: getAgentApiKey(), model: "gemini-2.0-flash" });


export class StaffingAgent {
  public static async generate( predictedFootTraffic: string, availableStaff: string ): Promise<string> {
    const prompt = `Generate an optimal shift schedule based on the following predicted park traffic and available staff.
Traffic: ${predictedFootTraffic}
Staff: ${availableStaff}`;
    const response = await aiClient.chat([{ role: "user", content: prompt }]);
    return response.data || "";
  }
}
