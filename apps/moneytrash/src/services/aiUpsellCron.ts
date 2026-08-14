import cron from 'node-cron';
import { GeminiClient } from '@clickflash/ai';

const AI_API_KEY = process.env.GEMINI_API_KEY || 'demo-api-key';

export class AIUpsellCron {
  private readonly client: GeminiClient;

  constructor() {
    this.client = new GeminiClient({
      apiKey: AI_API_KEY,
      model: 'gemini-2.0-flash',
      temperature: 0.7,
    });
  }

  public start() {
    console.log('[AI Upsell Cron] Starting Unsold Photos Batch Analyzer...');
    
    // Run every day at 10:00 AM
    cron.schedule('0 10 * * *', async () => {
      console.log('[AI Upsell Cron] Running daily sweep for abandoned carts...');
      await this.sweepUnsoldPhotos();
    });
  }

  private async sweepUnsoldPhotos() {
    // 1. Fetch potential leads (e.g. users who viewed galleries 7 days ago but didn't buy)
    // Mocking the database fetch for now
    const abandonedCarts = [
      { id: '1', customerEmail: 'john@example.com', customerPhone: '+1234567890', daysSinceView: 7, photosViewed: 12 },
      { id: '2', customerEmail: 'sarah@example.com', customerPhone: '+1987654321', daysSinceView: 14, photosViewed: 45 }
    ];

    for (const cart of abandonedCarts) {
      console.log(`[AI Upsell Cron] Analyzing abandoned cart for ${cart.customerEmail}...`);
      
      const isHotLead = await this.analyzeLead(cart);
      if (isHotLead) {
        await this.triggerDeliveryDispatcher(cart);
      }
    }
  }

  private async analyzeLead(record: any): Promise<boolean> {
    const systemPrompt = `You are a revenue recovery AI.
Evaluate this customer record. If they have viewed more than 10 photos and it has been exactly 7 or 14 days, they are a Hot Lead for a "Flash Sale" discount.
Respond with JSON: { "isHotLead": boolean, "reason": "string" }`;

    const result = await this.client.chat([
        { role: 'user', content: JSON.stringify(record) }
    ], systemPrompt);

    if (result.success && result.data) {
        try {
            let jsonStr = result.data;
            if (jsonStr.startsWith('```json')) jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(jsonStr);
            return parsed.isHotLead;
        } catch (e) {
            return false;
        }
    }
    return false;
  }

  private async triggerDeliveryDispatcher(record: any) {
    console.log(`[AI Upsell Cron] Triggering Master Node aiSalesOrchestrator for ${record.customerEmail}...`);
    // In production, this would publish a Redis Event or HTTP POST to the Master Node's aiSalesOrchestrator
    // to actually draft and dispatch the WhatsApp & Email messages.
    
    // Mocking the cross-app communication
    console.log(`[Redis Event] Published 'upsell_dispatch_required' for lead ${record.id}`);
  }
}

// Instantiate and start
const cronService = new AIUpsellCron();
cronService.start();
