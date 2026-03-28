export class GeminiService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Generates an end-of-week/month revenue forecast based on recent sales velocity.
   * Uses Gemini 1.5 Flash via direct fetch to avoid library dependencies in Cloudflare Workers.
   */
  async generateSalesForecast(metrics: {
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    thirtyDayTrend: { date: string; revenue: number; orders: number }[];
  }): Promise<{
    end_of_week_revenue: number;
    end_of_month_revenue: number;
    insights: string[];
  }> {
    if (!this.apiKey) {
      return {
        end_of_week_revenue: 0,
        end_of_month_revenue: 0,
        insights: ["API Key missing. Forecast unavailable."],
      };
    }

    try {
      const promptText = `You are an expert hospitality business analyst for a resort photography franchise.
Based on the following 30-day sales metrics:
${JSON.stringify(metrics, null, 2)}

Provide a realistic financial forecast (end_of_week_revenue, end_of_month_revenue) and 3 short, actionable strategic insights for maximizing revenue this week.
Respond EXACTLY in the following JSON structure:
{
  "end_of_week_revenue": number,
  "end_of_month_revenue": number,
  "insights": ["insight 1", "insight 2", "insight 3"]
}`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }],
            generationConfig: {
              responseMimeType: "application/json",
            },
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error: ${response.status} ${errorText}`);
      }

      const jsonResp = (await response.json()) as any;
      const textResult = jsonResp.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!textResult) {
        throw new Error("Empty response from Gemini API");
      }

      const result = JSON.parse(textResult);

      return {
        end_of_week_revenue: result?.end_of_week_revenue || 0,
        end_of_month_revenue: result?.end_of_month_revenue || 0,
        insights: result?.insights || ["Not enough data to generate insights."],
      };
    } catch (error) {
      console.error("Error generating sales forecast with Gemini:", error);
      return {
        end_of_week_revenue: 0,
        end_of_month_revenue: 0,
        insights: ["Failed to generate forecast due to an internal error."],
      };
    }
  }

  /**
   * Generates a general-purpose AI response for chat.
   */
  async generateResponse(
    message: string,
    context?: string,
  ): Promise<string> {
    if (!this.apiKey) return "AI Service Unavailable (API Key Missing)";

    try {
      const promptText = `You are an expert AI assistant for ClickFlash, a professional photography management platform.
Context: ${context || "No specific context provided."}
User Message: ${message}

Provide a helpful, professional, and concise response. Avoid jargon.`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }],
          }),
        },
      );

      if (!response.ok) throw new Error(`Gemini API error: ${response.status}`);

      const jsonResp = (await response.json()) as any;
      return (
        jsonResp.candidates?.[0]?.content?.parts?.[0]?.text ||
        "I'm sorry, I couldn't generate a response."
      );
    } catch (error) {
      console.error("Gemini Chat Error:", error);
      return "An error occurred while communicating with the AI service.";
    }
  }
}
