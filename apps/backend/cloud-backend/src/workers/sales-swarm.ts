/**
 * ClickFlash Cloud Backend Worker - WhatsApp Sales Swarm
 * Orchestrates a multi-agent AI pipeline for abandoned cart recovery via WhatsApp.
 */
import { CartContext } from './abandoned-cart-crm';

export interface SwarmMessage {
    recipientId: string;
    message: string;
    discountCode?: string;
    urgencyLevel: 'low' | 'medium' | 'high';
}

export class SalesSwarmOrchestrator {
    
    /**
     * Deploys the swarm against a specific abandoned cart.
     */
    public async deploySwarm(cart: CartContext): Promise<void> {
        console.log(`[SalesSwarm] 🚀 Deploying swarm for user ${cart.userId}`);
        
        // 1. Analyst Agent: Determine guest behavior and willingness to pay
        const guestProfile = await this.analystAgent(cart);
        
        // 2. Negotiator Agent: Decide if a discount is needed and at what tier
        const offer = await this.negotiatorAgent(guestProfile);
        
        // 3. Closer Agent: Craft the personalized WhatsApp payload
        const payload = await this.closerAgent(guestProfile, offer);
        
        // Dispatch to WhatsApp / Twilio Webhook
        await this.dispatchWhatsApp(payload);
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
            urgencyLevel: urgency
        };
    }

    private async dispatchWhatsApp(payload: SwarmMessage) {
        console.log(`[WhatsApp Dispatch] 🟢 Sending to ${payload.recipientId}...`);
        console.log(`[Payload] Urgency: ${payload.urgencyLevel} | Code: ${payload.discountCode || 'NONE'}`);
        console.log(`[MessageBody]\n${payload.message}\n`);
    }
}

export const salesSwarm = new SalesSwarmOrchestrator();
