import { dataService } from './dataService';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface EditParams {
  brightness: number;
  contrast: number;
  saturation: number;
  sharpness: number;
  temperature: number;
  tint: number;
}

class GeminiService {
  private isElectron: boolean;

  constructor() {
    this.isElectron = typeof window !== 'undefined' && Boolean((window as any).electron?.invoke);
  }

  /**
   * Generates a conversational response based on user input and local data context.
   */
  async askAssistant(prompt: string, history: ChatMessage[] = []): Promise<string> {
    try {
      // Gather context
      const [orders, users, products] = await Promise.all([
        dataService.orders.getAll().catch(() => []),
        dataService.users.getAll().catch(() => []),
        dataService.products.getAll().catch(() => [])
      ]);

      const contextPayload = {
        prompt,
        history,
        context: {
          ordersCount: orders.length,
          totalRevenue: orders.reduce((sum: number, o: any) => sum + (o.total || 0), 0),
          photographersCount: users.length,
          productsCount: products.length,
        }
      };

      if (this.isElectron) {
        const response = await (window as any).electron.invoke('ai:askAssistant', contextPayload);
        return response.text || "I couldn't generate a response at this time.";
      }

      // Browser fallback (if needed)
      const res = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contextPayload),
      });

      if (!res.ok) throw new Error('AI API request failed');
      const data = await res.json();
      return data.text || "No response received.";
    } catch (err) {
      console.error('GeminiService askAssistant Error:', err);
      return "Sorry, there was an error processing your request.";
    }
  }

  /**
   * Recommends edit parameters for a given photo url or base64.
   */
  async autoEnhance(photoUrl: string): Promise<EditParams> {
    try {
      if (this.isElectron) {
        const response = await (window as any).electron.invoke('ai:autoEnhance', { photoUrl });
        return response.params || this.getDefaultParams();
      }
      
      const res = await fetch('/api/ai/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoUrl }),
      });
      if (!res.ok) throw new Error('AI API request failed');
      const data = await res.json();
      return data.params || this.getDefaultParams();
    } catch (err) {
      console.error('GeminiService autoEnhance Error:', err);
      return this.getDefaultParams();
    }
  }

  private getDefaultParams(): EditParams {
    return {
      brightness: 10,
      contrast: 15,
      saturation: 10,
      sharpness: 5,
      temperature: 0,
      tint: 0
    };
  }
}

export const geminiService = new GeminiService();
export default geminiService;
