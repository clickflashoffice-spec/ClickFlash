import { ShootIdea, PhotoCategory } from "../types.ts";

// All Gemini calls are proxied through the management backend worker.
// The GOOGLE_API_KEY lives as a wrangler secret — never in the browser bundle.

const API = import.meta.env.VITE_API_BASE_URL ?? "";

const authHeaders = (): Record<string, string> => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${sessionStorage.getItem("authToken") ?? ""}`,
});

/**
 * Generates creative photoshoot ideas based on location and theme.
 */
export async function generateShootIdeas(
  location: string,
  theme: string,
  photographerExpertise: string,
): Promise<ShootIdea[]> {
  try {
    const res = await fetch(`${API}/api/ai/shoot-ideas`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ location, theme, expertise: photographerExpertise }),
    });
    if (!res.ok) throw new Error(`Backend error: ${res.status}`);
    const data = (await res.json()) as { ideas?: ShootIdea[] };
    return data.ideas ?? [];
  } catch (error) {
    console.error("Error generating shoot ideas:", error);
    return [];
  }
}

/**
 * Edits an image using a text prompt.
 * Note: Server-side image generation via gemini-1.5-flash is not yet stable.
 * This function is kept for API compatibility but throws to surface the limitation.
 */
export async function editImageWithAI(
  _base64Image: string,
  _mimeType: string,
  prompt: string,
): Promise<{ data: string; mimeType: string }> {
  throw new Error(`Image editing not yet supported server-side. Prompt: ${prompt}`);
}

/**
 * Analyzes a set of images to suggest album metadata.
 */
export async function generateAlbumSuggestions(
  images: { mimeType: string; data: string }[],
  availableCategories: string[] = [
    "Beach & Pool",
    "Photo Session",
    "Evening",
    "Activities",
    "Restaurant",
  ],
): Promise<{
  title: string;
  description: string;
  categories: PhotoCategory[];
  coverPhotoIndex: number;
}> {
  const defaults = { title: "New Album", description: "", categories: [] as PhotoCategory[], coverPhotoIndex: 0 };
  if (images.length === 0) throw new Error("At least one image is required.");
  try {
    const res = await fetch(`${API}/api/ai/album-suggestions`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ images, categories: availableCategories }),
    });
    if (!res.ok) throw new Error(`Backend error: ${res.status}`);
    const d = (await res.json()) as {
      title?: string;
      description?: string;
      categories?: PhotoCategory[];
      coverPhotoIndex?: number;
    };
    return {
      title: d.title ?? defaults.title,
      description: d.description ?? defaults.description,
      categories: d.categories ?? defaults.categories,
      coverPhotoIndex: d.coverPhotoIndex ?? defaults.coverPhotoIndex,
    };
  } catch (error) {
    console.error("Error generating album suggestions:", error);
    throw new Error("Failed to generate album suggestions.");
  }
}

/**
 * Generates an end-of-week/month revenue forecast.
 */
export async function generateSalesForecast(metrics: Record<string, unknown>): Promise<{
  end_of_week_revenue: number;
  end_of_month_revenue: number;
  insights: string[];
}> {
  try {
    const res = await fetch(`${API}/api/ai/sales-forecast`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ metrics }),
    });
    if (!res.ok) throw new Error(`Backend error: ${res.status}`);
    const d = (await res.json()) as {
      end_of_week_revenue?: number;
      end_of_month_revenue?: number;
      insights?: string[];
    };
    return {
      end_of_week_revenue: d.end_of_week_revenue ?? 0,
      end_of_month_revenue: d.end_of_month_revenue ?? 0,
      insights: d.insights ?? ["Not enough data."],
    };
  } catch (error) {
    console.error("Error generating sales forecast:", error);
    throw new Error("Failed to generate sales forecast.");
  }
}

/**
 * Proxies chat to local/workers AI, with a pure local fallback if offline.
 */
export async function sendChatMessage(message: string, context: any): Promise<string> {
  try {
    const res = await fetch(`${API}/api/ai/chat`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ message, context }),
    });
    
    if (!res.ok) {
      // Fallback to local rule-based engine if proxy fails
      return executeLocalChatFallback(message, context);
    }
    
    const data = await res.json() as { response?: string };
    return data.response ?? "No response from AI service.";
  } catch (err) {
    console.warn("AI service unreachable. Falling back to local intelligence.", err);
    return executeLocalChatFallback(message, context);
  }
}

function executeLocalChatFallback(message: string, context: any): string {
  const msgLower = message.toLowerCase();
  if (msgLower.includes("revenue") || msgLower.includes("income") || msgLower.includes("money")) {
    return `Based on local SQLite records, your revenue metrics are actively being tracked. Currently viewing context: ${context.selectedContext || 'global'}.`;
  }
  if (msgLower.includes("order") || msgLower.includes("sale")) {
    return "Orders are processed locally on the Master stations and synced. If you see pending orders, check the network connection to the kiosk.";
  }
  if (msgLower.includes("station") || msgLower.includes("kiosk") || msgLower.includes("fleet")) {
    return "Your fleet status is available in the Operations dashboard. Stations sync via local network (UDP broadcast) to the Master.";
  }
  
  return "I'm currently operating in offline/local mode. I can answer basic questions about revenue, orders, and station status based on local logs.";
}
