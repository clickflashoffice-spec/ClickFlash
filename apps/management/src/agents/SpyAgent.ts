import { GeminiClient } from "@clickflash/ai";
import { FraudAlert } from "@clickflash/types";

const getApiKey = (): string =>
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_GEMINI_API_KEY) ||
  (typeof window !== "undefined" && (window as any).ENV?.GEMINI_API_KEY) ||
  (typeof process !== "undefined" && process.env?.GEMINI_API_KEY) ||
  "demo-api-key";

const aiClient = new GeminiClient({ apiKey: getApiKey(), model: "gemini-2.0-flash" });

export class SpyAgent {
  public static async analyze(
    fraudAlerts: FraudAlert[],
    photographerLogs: any[],
    voidedTransactions: any[]
  ): Promise<FraudAlert[]> {
    const prompt = `You are the Fraud & Compliance Monitoring (SpyAgent) for ClickFlash.
Analyze the following fraud alerts against the raw photographer logs and voided transactions to uncover "ghost captures" (photos taken but bypassed to steal revenue).
Calculate an AI confidenceScore (0.0 to 1.0) for each fraud alert, representing the likelihood of actual fraud.

Return ONLY a valid JSON array of objects, with no markdown formatting. Each object must contain exactly one key: "confidenceScore" (a number between 0.0 and 1.0). The array must correspond one-to-one with the input fraud alerts.

Fraud Alerts:
${JSON.stringify(fraudAlerts, null, 2)}

Photographer Logs:
${JSON.stringify(photographerLogs, null, 2)}

Voided Transactions:
${JSON.stringify(voidedTransactions, null, 2)}`;

    const response = await aiClient.chat([{ role: "user", content: prompt }]);
    let rawText = response.data || "[]";
    
    rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();

    try {
      const scoresResult: { confidenceScore: number }[] = JSON.parse(rawText);
      return fraudAlerts.map((alert, index) => ({
        ...alert,
        confidenceScore: scoresResult[index]?.confidenceScore ?? 0.0
      }));
    } catch (error) {
      console.error("Failed to parse AI response in SpyAgent:", error);
      // Fallback
      return fraudAlerts.map(alert => ({
        ...alert,
        confidenceScore: 0.0
      }));
    }
  }
}
