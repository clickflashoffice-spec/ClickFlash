import { GeminiClient } from "@clickflash/ai";

const aiClient = new GeminiClient({ apiKey: "demo-api-key", model: "gemini-2.0-flash" });

export class SpyAgent {
  public static async generate( photographerLogs: string, voidedTransactions: string ): Promise<string> {
    const prompt = `Analyze the following logs for potential fraud or unauthorized free photo transfers.
Logs: ${photographerLogs}
Voids: ${voidedTransactions}`;
    const response = await aiClient.chat([{ role: "user", content: prompt }]);
    return response.data || "";
  }
}
