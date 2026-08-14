/**
 * aiServiceRouter.ts — Intelligent AI Provider Router
 *
 * Automatically routes AI requests between Ollama (local, free) and Gemini (cloud, paid).
 * 
 * Strategy:
 * - 'ollama': Local only — fails if Ollama unavailable
 * - 'gemini': Cloud only — uses Gemini REST API
 * - 'auto' (default): Try Ollama first, fall back to Gemini
 *
 * Configure via AI_PROVIDER environment variable.
 */
import { ollamaService } from "./ollamaService";
import { geminiService } from "./geminiService";
import { logger } from "../utils/logger";

type AIProvider = "ollama" | "gemini" | "auto";

interface AIServiceInterface {
  isReady(): boolean;
  analyzePhotoForCulling(imageBuffer: Buffer, mimeType?: string): Promise<any>;
  batchCull(photos: Array<{ id: string; buffer: Buffer; mimeType?: string }>, concurrency?: number): Promise<any[]>;
  generateTags(imageBuffer: Buffer, mimeType?: string): Promise<string[]>;
  naturalLanguageToSearch(query: string): Promise<string>;
  askAssistant(question: string, studioContext: string): Promise<string>;
}

class AIServiceRouter implements AIServiceInterface {
  private provider: AIProvider;
  private ollamaReady = false;
  private geminiReady = false;

  constructor() {
    this.provider = (process.env.AI_PROVIDER as AIProvider) || "auto";
    logger.info(`[AIRouter] Provider strategy: ${this.provider}`);
  }

  /**
   * Initialize both backends based on configured strategy.
   */
  async initialize(geminiApiKey?: string): Promise<void> {
    if (this.provider !== "gemini") {
      this.ollamaReady = await ollamaService.initialize();
      if (this.ollamaReady) {
        logger.info("[AIRouter] ✅ Ollama connected — local AI inference active");
      }
    }

    if (this.provider !== "ollama" && geminiApiKey) {
      this.geminiReady = await geminiService.initialize(geminiApiKey);
      if (this.geminiReady) {
        logger.info("[AIRouter] ✅ Gemini connected — cloud AI inference active");
      }
    }

    if (!this.ollamaReady && !this.geminiReady) {
      logger.warn("[AIRouter] ⚠️ No AI provider available — AI features disabled");
    }
  }

  isReady(): boolean {
    return this.ollamaReady || this.geminiReady;
  }

  getActiveProvider(): string {
    if (this.provider === "ollama") return this.ollamaReady ? "ollama" : "none";
    if (this.provider === "gemini") return this.geminiReady ? "gemini" : "none";
    // auto mode
    if (this.ollamaReady) return "ollama";
    if (this.geminiReady) return "gemini";
    return "none";
  }

  private async withFallback<T>(
    operation: string,
    ollamaFn: () => Promise<T>,
    geminiFn: () => Promise<T>
  ): Promise<T> {
    if (this.provider === "gemini") {
      return geminiFn();
    }

    if (this.provider === "ollama") {
      return ollamaFn();
    }

    // Auto mode: try Ollama first, fall back to Gemini
    if (this.ollamaReady) {
      try {
        return await ollamaFn();
      } catch (err: any) {
        logger.warn(`[AIRouter] Ollama ${operation} failed, falling back to Gemini: ${err.message}`);
        if (this.geminiReady) {
          return geminiFn();
        }
        throw err;
      }
    }

    if (this.geminiReady) {
      return geminiFn();
    }

    throw new Error(`No AI provider available for ${operation}`);
  }

  async analyzePhotoForCulling(imageBuffer: Buffer, mimeType: string = "image/jpeg") {
    return this.withFallback(
      "analyzePhotoForCulling",
      () => ollamaService.analyzePhotoForCulling(imageBuffer, mimeType),
      () => geminiService.analyzePhotoForCulling(imageBuffer, mimeType)
    );
  }

  async batchCull(
    photos: Array<{ id: string; buffer: Buffer; mimeType?: string }>,
    concurrency: number = 3
  ) {
    return this.withFallback(
      "batchCull",
      () => ollamaService.batchCull(photos, concurrency),
      () => geminiService.batchCull(photos, concurrency)
    );
  }

  async generateTags(imageBuffer: Buffer, mimeType: string = "image/jpeg") {
    return this.withFallback(
      "generateTags",
      () => ollamaService.generateTags(imageBuffer, mimeType),
      () => geminiService.generateTags(imageBuffer, mimeType)
    );
  }

  async naturalLanguageToSearch(query: string) {
    return this.withFallback(
      "naturalLanguageToSearch",
      () => ollamaService.naturalLanguageToSearch(query),
      () => geminiService.naturalLanguageToSearch(query)
    );
  }

  async askAssistant(question: string, studioContext: string) {
    return this.withFallback(
      "askAssistant",
      () => ollamaService.askAssistant(question, studioContext),
      () => geminiService.askAssistant(question, studioContext)
    );
  }
}

// Singleton — used by all routes/services
export const aiService = new AIServiceRouter();
