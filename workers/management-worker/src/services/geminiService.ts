import { executeWithRetry } from "../utils/networkUtils";

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

      const response = await executeWithRetry(async () => {
        const res = await fetch(
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
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res;
      }, { maxRetries: 2 });

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
   * Generates creative photoshoot ideas based on location, theme, and photographer expertise.
   */
  async generateShootIdeas(
    location: string,
    theme: string,
    expertise: string,
  ): Promise<{ title: string; description: string; settings: { aperture: string; shutter_speed: string; iso: number } }[]> {
    if (!this.apiKey) return [];

    try {
      const promptText = `Generate 3 creative photoshoot ideas for a '${expertise}' photographer at '${location}' with a '${theme}' theme.
Respond EXACTLY as a JSON array with this structure:
[{"title":"string","description":"string","settings":{"aperture":"string","shutter_speed":"string","iso":number}}]`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }],
            generationConfig: { responseMimeType: "application/json" },
          }),
        },
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = (await response.json()) as any;
      const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";
      const arr = JSON.parse(text);
      return Array.isArray(arr) ? arr : [];
    } catch (error) {
      console.error("Error generating shoot ideas with Gemini:", error);
      return [];
    }
  }

  /**
   * Analyses a set of images and suggests album metadata.
   */
  async generateAlbumSuggestions(
    images: { mimeType: string; data: string }[],
    availableCategories: string[] = ["Beach & Pool", "Photo Session", "Evening", "Activities", "Restaurant"],
  ): Promise<{ title: string; description: string; categories: string[]; coverPhotoIndex: number }> {
    const defaults = { title: "New Album", description: "", categories: [], coverPhotoIndex: 0 };
    if (!this.apiKey || images.length === 0) return defaults;

    try {
      const imageParts = images.slice(0, 3).map((img) => ({
        inlineData: { mimeType: img.mimeType, data: img.data },
      }));
      const promptText = `Analyse these images. Suggest a creative album title, a brief description, and relevant categories from: ${JSON.stringify(availableCategories)}. Also suggest the 0-indexed best cover image.
Respond EXACTLY as JSON: {"title":"string","description":"string","categories":["string"],"coverPhotoIndex":number}`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [...imageParts, { text: promptText }] }],
            generationConfig: { responseMimeType: "application/json" },
          }),
        },
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = (await response.json()) as any;
      const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
      const data = JSON.parse(text);
      return {
        title: data?.title ?? defaults.title,
        description: data?.description ?? defaults.description,
        categories: data?.categories ?? defaults.categories,
        coverPhotoIndex: data?.coverPhotoIndex ?? defaults.coverPhotoIndex,
      };
    } catch (error) {
      console.error("Error generating album suggestions with Gemini:", error);
      return defaults;
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

      const response = await executeWithRetry(async () => {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: promptText }] }],
            }),
          },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res;
      }, { maxRetries: 2 });

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
