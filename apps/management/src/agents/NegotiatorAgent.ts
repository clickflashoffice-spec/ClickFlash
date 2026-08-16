import { GeminiClient } from "@clickflash/ai";

const getApiKey = (): string =>
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_GEMINI_API_KEY) ||
  (typeof window !== "undefined" && (window as any).ENV?.GEMINI_API_KEY) ||
  (typeof process !== "undefined" && process.env?.GEMINI_API_KEY) ||
  "demo-api-key";

const aiClient = new GeminiClient({ apiKey: getApiKey(), model: "gemini-2.0-flash" });

export class NegotiatorAgent {
  public static async calculateCounterOffer(replyText: string, aiSalvageScore: number, initialOffer: number): Promise<number> {
    const prompt = `A user replied "${replyText}" to our initial offer of $${initialOffer}. The photo has an aiSalvageScore of ${aiSalvageScore} (0-100). Calculate a counter-offer price. Respond ONLY with a number, no currency symbols or text.`;
    
    try {
      const response = await aiClient.chat([{ role: "user", content: prompt }]);
      const parsed = parseFloat(response.data || "");
      if (!isNaN(parsed)) {
        return parsed;
      }
    } catch (e) {
      console.warn("NegotiatorAgent AI fallback triggered", e);
    }
    
    // Fallback logic
    if (aiSalvageScore > 80) return initialOffer * 0.9; // 10% discount for high salvage
    return initialOffer * 0.5; // 50% discount
  }

  public static async handleIncomingReply(replyText: string, phone: string, aiSalvageScore: number, initialOffer: number) {
    const counterOffer = await this.calculateCounterOffer(replyText, aiSalvageScore, initialOffer);
    
    // Dispatch it back via WhatsApp API
    const message = `We hear you! How about $${counterOffer.toFixed(2)}?`;
    
    console.log(`[NegotiatorAgent] Dispatching WhatsApp API message to ${phone}: "${message}"`);
    
    // Simulate API call to WhatsApp Business API
    try {
      await fetch("https://graph.facebook.com/v17.0/PHONE_NUMBER_ID/messages", {
        method: "POST",
        headers: {
          "Authorization": `Bearer WA_TOKEN`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: phone,
          type: "text",
          text: {
            body: message
          }
        })
      });
      console.log(`[NegotiatorAgent] Successfully dispatched counter offer to ${phone}`);
    } catch (error) {
      console.error(`[NegotiatorAgent] Failed to dispatch counter offer to ${phone}`, error);
    }

    return counterOffer;
  }
}
