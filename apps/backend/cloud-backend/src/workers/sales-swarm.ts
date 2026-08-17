/**
 * ClickFlash Cloud Backend Worker - WhatsApp Sales Swarm
 * Orchestrates a multi-agent AI pipeline for abandoned cart recovery & live inbound negotiation via WhatsApp.
 */
import { CartContext } from './abandoned-cart-crm';
import type { Bindings } from '../types';

export interface SwarmMessage {
    recipientId: string;
    message: string;
    discountCode?: string;
    urgencyLevel: 'low' | 'medium' | 'high';
    interactiveButtons?: Array<{ id: string; title: string }>;
}

export interface InboundMessageContext {
    from: string;
    message: string;
    timestamp?: string;
    messageId?: string;
    env?: Bindings;
    db?: any;
}

export class SalesSwarmOrchestrator {
    
    /**
     * Deploys the swarm against a specific abandoned cart.
     */
    public async deploySwarm(cart: CartContext, env?: Bindings): Promise<SwarmMessage> {
        console.log(`[SalesSwarm] 🚀 Deploying swarm for user ${cart.userId}`);
        
        // 1. Analyst Agent: Determine guest behavior and willingness to pay
        const guestProfile = await this.analystAgent(cart);
        
        // 2. Negotiator Agent: Decide if a discount is needed and at what tier
        const offer = await this.negotiatorAgent(guestProfile);
        
        // 3. Closer Agent: Craft the personalized WhatsApp payload
        const payload = await this.closerAgent(guestProfile, offer);
        
        // Dispatch to WhatsApp / Twilio Webhook
        await this.dispatchWhatsApp(payload, env);

        return payload;
    }

    /**
     * Handles live inbound WhatsApp messages from customers (negotiations, questions, button clicks).
     */
    public async handleIncomingMessage(context: InboundMessageContext): Promise<SwarmMessage> {
        const { from, message, env } = context;
        console.log(`[SalesSwarm] 💬 Inbound message from ${from}: "${message}"`);

        const lower = message.toLowerCase();
        let replyText = '';
        let discountCode: string | undefined;
        let urgency: 'low' | 'medium' | 'high' = 'medium';

        // 1. Call Gemini AI if API key is present
        if (env?.GEMINI_API_KEY) {
            try {
                const aiReply = await this.callGeminiNegotiator(message, env.GEMINI_API_KEY);
                if (aiReply) {
                    replyText = aiReply;
                }
            } catch (err) {
                console.warn('[SalesSwarm] Gemini inference error, falling back to rule engine:', err);
            }
        }

        // 2. Fallback Rule-Based Negotiation Engine
        if (!replyText) {
            if (lower.includes('discount') || lower.includes('promo') || lower.includes('coupon') || lower.includes('expensive') || lower.includes('cheaper')) {
                replyText = `We’d love for you to keep these memories forever! 📸 Use code FLASH20 at checkout for an exclusive 20% OFF your entire album. Tap your magic link to claim! ⏳`;
                discountCode = 'FLASH20';
                urgency = 'high';
            } else if (lower.includes('photo') || lower.includes('picture') || lower.includes('gallery') || lower.includes('link') || lower.includes('see')) {
                replyText = `Your high-resolution photos are safely stored in your private cloud gallery. Tap your magic link anytime to view, share, or download them instantly! ✨`;
                urgency = 'medium';
            } else if (lower.includes('help') || lower.includes('support') || lower.includes('human')) {
                replyText = `Our resort photography team is here for you! A team member has been notified and will assist you shortly. In the meantime, you can preview your photos via your gallery link. 🌴`;
                urgency = 'low';
            } else {
                replyText = `Thanks for messaging ClickFlash! 📸 Your vacation photos are ready in your gallery. Let us know if you need any assistance claiming your memories!`;
                urgency = 'low';
            }
        }

        const payload: SwarmMessage = {
            recipientId: from,
            message: replyText,
            discountCode,
            urgencyLevel: urgency,
            interactiveButtons: [
                { id: 'view_gallery', title: '🖼️ View My Photos' },
                { id: 'claim_discount', title: '🎁 Claim 20% Off' }
            ]
        };

        await this.dispatchWhatsApp(payload, env);
        return payload;
    }

    private async callGeminiNegotiator(userMessage: string, apiKey: string): Promise<string | null> {
        const prompt = `You are an elite, friendly, and persuasive sales negotiator for ClickFlash, a premier resort and theme park photography platform.
A guest sent this message over WhatsApp: "${userMessage}".
Draft a concise, warm, and helpful reply (maximum 2-3 sentences, with emojis).
If they ask for discounts or complain about prices, offer code MEMORIES20 for 20% off.
Encourage them to view and download their memories via their gallery magic link.
Respond with the plain message text only.`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { maxOutputTokens: 150, temperature: 0.7 }
            })
        });

        if (!response.ok) return null;
        const data = await response.json() as any;
        const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        return candidateText ? candidateText.trim() : null;
    }

    private async analystAgent(cart: CartContext) {
        console.log(`[AnalystAgent] Analyzing cart value and abandonment timeline...`);
        const cartTotal = cart.cartItems.reduce((sum, item) => sum + item.price, 0);
        const hoursInactive = (Date.now() - cart.lastActiveAt) / (1000 * 60 * 60);
        
        return {
            userId: cart.userId,
            cartTotal,
            hoursInactive,
            isHighValue: cartTotal > 40,
            engagementLevel: hoursInactive > 48 ? 'COLD' : 'WARM'
        };
    }

    private async negotiatorAgent(profile: any) {
        console.log(`[NegotiatorAgent] Calculating optimal discount threshold...`);
        let discount = 0;
        let code = '';
        
        if (profile.engagementLevel === 'COLD') {
            // Aggressive 25% discount for cold leads
            discount = 25;
            code = 'COMEBACK25';
        } else if (profile.isHighValue && profile.hoursInactive > 12) {
            // Gentle 10% nudge for high value warm leads
            discount = 10;
            code = 'FLASH10';
        }
        
        return { discount, code };
    }

    private async closerAgent(profile: any, offer: any): Promise<SwarmMessage> {
        console.log(`[CloserAgent] Crafting personalized urgency hook...`);
        
        let message = `Hi there! We noticed you left some amazing memories in your ClickFlash gallery. 📸`;
        let urgency: 'low' | 'medium' | 'high' = 'low';
        
        if (offer.discount > 0) {
            message += `\n\nAs a special gift, use code ${offer.code} to get ${offer.discount}% OFF your entire order!`;
            message += `\n\nHurry, this exclusive link expires in 2 hours! ⏳`;
            urgency = 'high';
        } else {
            message += `\n\nYour gallery link is still active. Tap here to checkout seamlessly!`;
            urgency = 'medium';
        }
        
        return {
            recipientId: profile.userId,
            message,
            discountCode: offer.code || undefined,
            urgencyLevel: urgency,
            interactiveButtons: [
                { id: 'checkout_now', title: '⚡ Checkout Now' },
                { id: 'view_album', title: '📷 Preview Album' }
            ]
        };
    }

    public async dispatchWhatsApp(payload: SwarmMessage, env?: Bindings): Promise<boolean> {
        console.log(`[WhatsApp Dispatch] 🟢 Sending to ${payload.recipientId}...`);
        console.log(`[Payload] Urgency: ${payload.urgencyLevel} | Code: ${payload.discountCode || 'NONE'}`);
        console.log(`[MessageBody]\n${payload.message}\n`);

        const token = env?.WHATSAPP_ACCESS_TOKEN;
        const phoneId = env?.WHATSAPP_PHONE_NUMBER_ID;

        if (token && phoneId) {
            try {
                const url = `https://graph.facebook.com/v17.0/${phoneId}/messages`;
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        messaging_product: 'whatsapp',
                        recipient_type: 'individual',
                        to: payload.recipientId,
                        type: 'text',
                        text: { preview_url: true, body: payload.message }
                    })
                });

                if (response.ok) {
                    console.log(`[WhatsApp Dispatch] ✅ Meta Graph API accepted message for ${payload.recipientId}`);
                    return true;
                } else {
                    const err = await response.text();
                    console.error(`[WhatsApp Dispatch] Meta Graph API error:`, err);
                    return false;
                }
            } catch (err) {
                console.error(`[WhatsApp Dispatch] Network error dispatching to Meta API:`, err);
                return false;
            }
        }

        return true;
    }
}

export const salesSwarm = new SalesSwarmOrchestrator();
