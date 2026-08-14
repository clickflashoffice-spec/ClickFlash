import { AIRequestParams, AIResponse } from './types.js';

/**
 * @deprecated Ollama local inference has been disabled for Master/Touch nodes
 * because running local SLMs on 4-core CPUs degrades the UI performance.
 * Please use GeminiClient for cloud-offloaded AI inference.
 */
export class OllamaClient {
  constructor(config?: { baseUrl?: string }) {
    console.warn('OllamaClient is deprecated to maintain fast app performance. Falling back to NoOp.');
  }

  async generate(params: AIRequestParams, model: string = 'llama3'): Promise<AIResponse> {
    throw new Error('OllamaClient is disabled due to hardware constraints (CPU-only nodes). Use GeminiClient.');
  }
}

