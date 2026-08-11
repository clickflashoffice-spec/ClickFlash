/**
 * geminiService.ts — Google Gemini AI Integration Service
 *
 * Provides a centralized Gemini API client for all AI features:
 * - Auto-editing (exposure, white balance, crop analysis)
 * - Smart culling (sharpness, expression, composition scoring)
 * - Smart tagging (auto-keywords from photo content)
 * - Natural language search (query → SQL FTS5 conversion)
 * - Studio assistant (conversational AI for studio management)
 *
 * Uses @google/genai SDK with secure key storage via Electron safeStorage.
 */
import { logger } from "../utils/logger";

// Lazy-loaded to avoid bundling in environments without the SDK
let GoogleGenAI: any = null;
let genaiClient: any = null;

interface GeminiConfig {
  apiKey: string;
  defaultModel?: string;
  flashModel?: string;
}

interface PhotoAnalysis {
  sharpnessScore: number;     // 0-10
  compositionScore: number;   // 0-10
  expressionScore: number;    // 0-10
  eyesOpen: boolean;
  tags: string[];
  suggestedEdits: {
    exposure?: number;        // -2 to +2 EV
    whiteBalance?: string;    // "daylight" | "cloudy" | "flash" | "tungsten"
    cropSuggestion?: { x: number; y: number; width: number; height: number };
    saturation?: number;      // -100 to +100
    contrast?: number;        // -100 to +100
  };
}

interface CullingResult {
  photoId: string;
  keep: boolean;
  score: number;             // 0-100 overall quality
  reason: string;
  sharpness: number;
  composition: number;
  expression: number;
}

class GeminiService {
  private config: GeminiConfig | null = null;
  private initialized = false;

  /**
   * Initialize the Gemini client with an API key.
   * Called once during app startup or when the user configures AI settings.
   */
  async initialize(apiKey: string): Promise<boolean> {
    try {
      // Lazy-load the SDK
      if (!GoogleGenAI) {
        // @ts-ignore
        const module = await import("@google/genai");
        GoogleGenAI = module.GoogleGenAI;
      }

      genaiClient = new GoogleGenAI({ apiKey });
      this.config = {
        apiKey,
        defaultModel: "gemini-2.5-pro",
        flashModel: "gemini-2.0-flash",
      };
      this.initialized = true;
      logger.info("[GeminiService] Initialized successfully");
      return true;
    } catch (err: any) {
      logger.error("[GeminiService] Initialization failed:", err.message);
      this.initialized = false;
      return false;
    }
  }

  isReady(): boolean {
    return this.initialized && genaiClient !== null;
  }

  /**
   * Analyze a photo for culling — scores sharpness, composition, expression.
   * Uses Gemini Flash for speed on high-volume batches.
   */
  async analyzePhotoForCulling(
    imageBuffer: Buffer,
    mimeType: string = "image/jpeg"
  ): Promise<PhotoAnalysis> {
    if (!this.isReady()) throw new Error("Gemini not initialized");

    const base64 = imageBuffer.toString("base64");

    const response = await genaiClient.models.generateContent({
      model: this.config!.flashModel,
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType,
                data: base64,
              },
            },
            {
              text: `Analyze this photo for a professional photography studio. Return a JSON object with these fields:
- sharpnessScore (0-10): How sharp/in-focus is the main subject?
- compositionScore (0-10): Rate the composition (rule of thirds, leading lines, balance)
- expressionScore (0-10): Rate facial expressions (smiling, natural, engaged). Use 5 if no faces.
- eyesOpen (boolean): Are all visible eyes open?
- tags (string array): 5-10 descriptive keywords for this photo
- suggestedEdits: { exposure (EV adjustment -2 to +2), whiteBalance ("daylight"|"cloudy"|"flash"|"tungsten"), saturation (-100 to +100), contrast (-100 to +100) }

Return ONLY valid JSON, no markdown.`,
            },
          ],
        },
      ],
    });

    try {
      const text = response.text?.trim() || "{}";
      // Strip markdown code fences if present
      const cleaned = text.replace(/^```json?\n?/i, "").replace(/\n?```$/i, "");
      return JSON.parse(cleaned) as PhotoAnalysis;
    } catch (parseErr) {
      logger.warn("[GeminiService] Failed to parse photo analysis response");
      return {
        sharpnessScore: 5,
        compositionScore: 5,
        expressionScore: 5,
        eyesOpen: true,
        tags: [],
        suggestedEdits: {},
      };
    }
  }

  /**
   * Batch-cull photos — returns keep/reject decisions with scores.
   * Processes photos in parallel chunks for throughput.
   */
  async batchCull(
    photos: Array<{ id: string; buffer: Buffer; mimeType?: string }>,
    concurrency: number = 5
  ): Promise<CullingResult[]> {
    const results: CullingResult[] = [];
    const chunks: typeof photos[] = [];

    for (let i = 0; i < photos.length; i += concurrency) {
      chunks.push(photos.slice(i, i + concurrency));
    }

    for (const chunk of chunks) {
      const chunkResults = await Promise.allSettled(
        chunk.map(async (photo) => {
          const analysis = await this.analyzePhotoForCulling(
            photo.buffer,
            photo.mimeType || "image/jpeg"
          );
          const overallScore =
            analysis.sharpnessScore * 0.4 +
            analysis.compositionScore * 0.3 +
            analysis.expressionScore * 0.3;

          return {
            photoId: photo.id,
            keep: overallScore >= 5.0 && analysis.eyesOpen,
            score: Math.round(overallScore * 10),
            reason: !analysis.eyesOpen
              ? "Eyes closed"
              : overallScore < 3
                ? "Low quality"
                : overallScore < 5
                  ? "Below average"
                  : "Good quality",
            sharpness: analysis.sharpnessScore,
            composition: analysis.compositionScore,
            expression: analysis.expressionScore,
          } satisfies CullingResult;
        })
      );

      for (const result of chunkResults) {
        if (result.status === "fulfilled") {
          results.push(result.value);
        }
      }
    }

    return results;
  }

  /**
   * Generate tags for a photo using Gemini Vision.
   */
  async generateTags(
    imageBuffer: Buffer,
    mimeType: string = "image/jpeg"
  ): Promise<string[]> {
    if (!this.isReady()) throw new Error("Gemini not initialized");

    const base64 = imageBuffer.toString("base64");

    const response = await genaiClient.models.generateContent({
      model: this.config!.flashModel,
      contents: [
        {
          parts: [
            { inlineData: { mimeType, data: base64 } },
            {
              text: `Tag this photo with 8-15 descriptive keywords for a photography studio library. Include: subjects, setting, mood, activity, time of day, colors. Return ONLY a JSON array of strings, no markdown.`,
            },
          ],
        },
      ],
    });

    try {
      const text = response.text?.trim() || "[]";
      const cleaned = text.replace(/^```json?\n?/i, "").replace(/\n?```$/i, "");
      return JSON.parse(cleaned) as string[];
    } catch {
      return [];
    }
  }

  /**
   * Convert natural language query to SQLite FTS5 search terms.
   */
  async naturalLanguageToSearch(query: string): Promise<string> {
    if (!this.isReady()) throw new Error("Gemini not initialized");

    const response = await genaiClient.models.generateContent({
      model: this.config!.flashModel,
      contents: [
        {
          parts: [
            {
              text: `Convert this natural language photo search query into SQLite FTS5 search terms.
              
Query: "${query}"

Rules:
- Return ONLY the FTS5 match string, no quotes around it
- Use AND between required terms
- Use OR between alternatives
- Use * for prefix matching
- Example: "bride laughing near window" → "bride AND laugh* AND window"
- Example: "sunset beach photos" → "sunset AND beach"
- Example: "kids playing or swimming" → "kid* AND (play* OR swim*)"

Return ONLY the FTS5 string, nothing else.`,
            },
          ],
        },
      ],
    });

    return response.text?.trim() || query;
  }

  /**
   * Studio Assistant — answer questions about the studio using provided context.
   */
  async askAssistant(
    question: string,
    studioContext: string
  ): Promise<string> {
    if (!this.isReady()) throw new Error("Gemini not initialized");

    const response = await genaiClient.models.generateContent({
      model: this.config!.defaultModel,
      contents: [
        {
          parts: [
            {
              text: `You are a helpful photography studio assistant for ClickFlash Master OS. Answer the user's question based on the studio data provided.

## Studio Data
${studioContext}

## User Question
${question}

Respond concisely and professionally. If the data doesn't contain enough information, say so.`,
            },
          ],
        },
      ],
    });

    return response.text?.trim() || "I couldn't process that question. Please try again.";
  }
}

// Singleton export
export const geminiService = new GeminiService();
export type { PhotoAnalysis, CullingResult, GeminiConfig };
