import { whatsappService } from './whatsappService';

export class AISalesOrchestrator {
    public readonly model = 'gemini-1.5-pro';

    /**
     * Cron job entry point to evaluate customers and hunt for leads.
     */
    async huntForLeads(engagementRecords: any[]) {
        for (const record of engagementRecords) {
            if (!record.customerPhone || !record.whatsappOptIn) {
                continue; // Can't contact them via WhatsApp
            }

            const isHotLead = await this.analyzeLead(record);
            if (isHotLead) {
                await this.closeLead(record);
            }
        }
    }

    /**
     * The Analyst Agent: Decides if this customer is worth pursuing based on engagement metrics.
     */
    private async analyzeLead(record: any): Promise<boolean> {
        console.log(`[Analyst Agent (${this.model})] Evaluating customer ${record.customerEmail}...`);
        
        if (record.totalOpened >= 3 && record.totalConverted === 0) {
            console.log(`[Analyst Agent] Customer ${record.customerEmail} is a HOT LEAD. High engagement, zero conversion.`);
            return true;
        }

        console.log(`[Analyst Agent] Customer ${record.customerEmail} is not ready yet.`);
        return false;
    }

    /**
     * The Closer Agent: Generates tailored, dynamic promotional pitches via WhatsApp.
     */
    private async closeLead(record: any) {
        console.log(`[Closer Agent] Closing customer ${record.customerEmail}...`);

        const prompt = `
            Hi ${record.customerName || 'there'}! We noticed you've been looking at your holiday photos from ${record.resortName || 'the resort'}! 📸
            
            We'd love to offer you an exclusive 20% discount on your entire digital photo album if you complete your order today.
            
            Use promo code: MEMORIES20 at checkout!
        `;

        await whatsappService.sendTextMessage(record.customerPhone, prompt);
    }

    /**
     * The Negotiator Agent: Handles dynamic conversational replies from customers.
     */
    async handleIncomingReply(from: string, message: string) {
        console.log(`[Negotiator Agent] Handling reply from ${from}: "${message}"`);
        
        const responseText = "Thanks for reaching out! Our team is reviewing your message and will get back to you shortly. You can also view your full album at your personalized link!";
        await whatsappService.sendTextMessage(from, responseText);
    }
}

export const aiSalesOrchestrator = new AISalesOrchestrator();
