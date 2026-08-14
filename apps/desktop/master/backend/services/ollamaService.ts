/**
 * ollamaService.ts — Local Ollama LLM Integration Service
 *
 * OSS replacement for Gemini REST API (~$12K/yr savings).
 * Uses Ollama for local inference with LLaVA (vision) and Llama 3.1 (text).
 *
 * Mirrors the GeminiService interface for drop-in compatibility.
 * @see geminiService.ts for the original Gemini implementation
 */
import { logger } from "../utils/logger";

interface PhotoAnalysis {
  sharpnessScore: number;
  compositionScore: number;
  expressionScore: number;
  eyesOpen: boolean;
  tags: string[];
  suggestedEdits: {
    exposure?: number;
    whiteBalance?: string;
    cropSuggestion?: { x: number; y: number; width: number; height: number };
    saturation?: number;
    contrast?: number;
  };
}

interface CullingResult {
  photoId: string;
  keep: boolean;
  score: number;
  reason: string;
  sharpness: number;
  composition: number;
  expression: number;
}

interface OllamaConfig {
  host: string;
  visionModel: string;
  textModel: string;
}

class OllamaService {
  private config: OllamaConfig = {
    host: process.env.OLLAMA_HOST || "http://localhost:11434",
    visionModel: "llava",
    textModel: "llama3.1",
  };
  private initialized = false;

  /**
   * Initialize connection to local Ollama instance.
   * Verifies connectivity and pulls required models if not present.
   */
  async initialize(host?: string): Promise<boolean> {
    if (host) this.config.host = host;

    try {
      const res = await fetch(`${this.config.host}/api/tags`, {
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) {
        logger.warn("[OllamaService] Ollama not reachable");
        return false;
      }

      const data = (await res.json()) as { models?: Array<{ name: string }> };
      const models = (data.models || []).map((m) => m.name);
      logger.info(`[OllamaService] Connected. Available models: ${models.join(", ")}`);

      // Auto-pull vision model if not available
      const hasVision = models.some((m) => m.startsWith(this.config.visionModel));
      if (!hasVision) {
        logger.info(`[OllamaService] Pulling ${this.config.visionModel}...`);
        await fetch(`${this.config.host}/api/pull`, {
          method: "POST",
          body: JSON.stringify({ name: this.config.visionModel, stream: false }),
        }).catch(() => {
          logger.warn(`[OllamaService] Failed to pull ${this.config.visionModel}`);
        });
      }

      this.initialized = true;
      return true;
    } catch (err: any) {
      logger.warn(`[OllamaService] Init failed: ${err.message}`);
      this.initialized = false;
      return false;
    }
  }

  isReady(): boolean {
    return this.initialized;
  }

  private async generate(model: string, prompt: string, images?: string[]): Promise<string> {
    const body: Record<string, unknown> = {
      model,
      prompt,
      stream: false,
      options: { temperature: 0.1 },
    };
    if (images?.length) body.images = images;

    const res = await fetch(`${this.config.host}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120_000),
    });

    if (!res.ok) throw new Error(`Ollama error: ${res.status}`);
    const data = (await res.json()) as { response?: string };
    return data.response || "";
  }

  /**
   * Analyze a photo for culling using LLaVA vision model.
   */
  async analyzePhotoForCulling(
    imageBuffer: Buffer,
    _mimeType: string = "image/jpeg"
  ): Promise<PhotoAnalysis> {
    if (!this.isReady()) throw new Error("Ollama not initialized");

    const base64 = imageBuffer.toString("base64");

    const prompt = `Analyze this photo for a professional photography studio. Return a JSON object with these fields:
- sharpnessScore (0-10): How sharp/in-focus is the main subject?
- compositionScore (0-10): Rate the composition (rule of thirds, leading lines, balance)
- expressionScore (0-10): Rate facial expressions (smiling, natural, engaged). Use 5 if no faces.
- eyesOpen (boolean): Are all visible eyes open?
- tags (string array): 5-10 descriptive keywords for this photo
- suggestedEdits: { exposure (EV adjustment -2 to +2), whiteBalance ("daylight"|"cloudy"|"flash"|"tungsten"), saturation (-100 to +100), contrast (-100 to +100) }

Return ONLY valid JSON, no markdown.`;

    try {
      const text = await this.generate(this.config.visionModel, prompt, [base64]);
      const cleaned = text.replace(/^```json?\n?/i, "").replace(/\n?```$/i, "").trim();
      // Find JSON object boundaries
      const jsonStart = cleaned.indexOf("{");
      const jsonEnd = cleaned.lastIndexOf("}");
      if (jsonStart >= 0 && jsonEnd > jsonStart) {
        return JSON.parse(cleaned.substring(jsonStart, jsonEnd + 1)) as PhotoAnalysis;
      }
      return JSON.parse(cleaned) as PhotoAnalysis;
    } catch (parseErr) {
      logger.warn("[OllamaService] Failed to parse photo analysis");
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
   * Batch-cull photos in parallel chunks.
   */
  async batchCull(
    photos: Array<{ id: string; buffer: Buffer; mimeType?: string }>,
    concurrency: number = 3
  ): Promise<CullingResult[]> {
    const results: CullingResult[] = [];
    const chunks: (typeof photos)[] = [];

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
   * Generate tags for a photo using LLaVA.
   */
  async generateTags(
    imageBuffer: Buffer,
    _mimeType: string = "image/jpeg"
  ): Promise<string[]> {
    if (!this.isReady()) throw new Error("Ollama not initialized");

    const base64 = imageBuffer.toString("base64");
    const prompt = `Tag this photo with 8-15 descriptive keywords for a photography studio library. Include: subjects, setting, mood, activity, time of day, colors. Return ONLY a JSON array of strings, no markdown.`;

    try {
      const text = await this.generate(this.config.visionModel, prompt, [base64]);
      const cleaned = text.replace(/^```json?\n?/i, "").replace(/\n?```$/i, "").trim();
      const arrStart = cleaned.indexOf("[");
      const arrEnd = cleaned.lastIndexOf("]");
      if (arrStart >= 0 && arrEnd > arrStart) {
        return JSON.parse(cleaned.substring(arrStart, arrEnd + 1)) as string[];
      }
      return JSON.parse(cleaned) as string[];
    } catch {
      return [];
    }
  }

  /**
   * Convert natural language to SQLite FTS5 search query.
   */
  async naturalLanguageToSearch(query: string): Promise<string> {
    if (!this.isReady()) throw new Error("Ollama not initialized");

    const prompt = `Convert this natural language photo search query into SQLite FTS5 search terms.

Query: "${query}"

Rules:
- Return ONLY the FTS5 match string, no quotes around it
- Use AND between required terms
- Use OR between alternatives
- Use * for prefix matching
- Example: "bride laughing near window" → "bride AND laugh* AND window"
- Example: "kids playing or swimming" → "kid* AND (play* OR swim*)"

Return ONLY the FTS5 string, nothing else.`;

    try {
      const text = await this.generate(this.config.textModel, prompt);
      return text.trim().replace(/^["']|["']$/g, "");
    } catch {
      return query;
    }
  }

  /**
   * Studio assistant — answer questions using provided context.
   */
  async askAssistant(question: string, studioContext: string): Promise<string> {
    if (!this.isReady()) throw new Error("Ollama not initialized");

    const prompt = `You are a helpful photography studio assistant for ClickFlash Master OS. Answer the user's question based on the studio data provided.

## Studio Data
${studioContext}

## User Question
${question}

Respond concisely and professionally. If the data doesn't contain enough information, say so.`;

    try {
      return (await this.generate(this.config.textModel, prompt)).trim();
    } catch {
      return "I couldn't process that question. Please try again.";
    }
  }
}

export const ollamaService = new OllamaService();
export type { PhotoAnalysis, CullingResult, OllamaConfig };
