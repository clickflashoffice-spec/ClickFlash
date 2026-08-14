export interface AIRequestParams {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AIResponse {
  text: string;
  model: string;
  tokensUsed?: number;
}

/**
 * Lightweight client for local Ollama server integration.
 */
export class OllamaClient {
  private baseUrl: string;

  constructor(config?: { baseUrl?: string }) {
    this.baseUrl = config?.baseUrl || 'http://localhost:11434';
  }

  async generate(params: AIRequestParams, model: string = 'llama3'): Promise<AIResponse> {
    try {
      const res = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt: params.prompt,
          stream: false,
        }),
      });
      if (!res.ok) throw new Error(`Ollama error: ${res.statusText}`);
      const data = (await res.json()) as any;
      return {
        text: data.response || '',
        model: data.model || model,
        tokensUsed: data.eval_count,
      };
    } catch (err: any) {
      throw new Error(`Failed to generate text from Ollama: ${err.message}`);
    }
  }
}
