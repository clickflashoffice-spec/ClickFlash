import { whatsappService } from './whatsappService';
import { GeminiClient } from '@clickflash/ai';

// Hardcoded for now. In a real app this should be loaded from env or secure vault.
const AI_API_KEY = process.env.GEMINI_API_KEY || 'demo-api-key';

export class AISalesOrchestrator {
    private readonly client: GeminiClient;

    constructor() {
        this.client = new GeminiClient({
            apiKey: AI_API_KEY,
            model: 'gemini-2.0-flash',
            temperature: 0.7,
        });
    }

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
        console.log(`[Analyst Agent] Evaluating customer ${record.customerEmail}...`);
        
        const systemPrompt = `You are an expert sales analyst for a resort photography business.
Evaluate the customer engagement record and determine if they are a "Hot Lead" worth pursuing with a promotional discount via WhatsApp.
Criteria for Hot Lead: High engagement (e.g., totalOpened >= 3) but zero conversions. Or they specifically favorited 5+ photos.
Respond with a JSON object: { "isHotLead": boolean, "reason": "short explanation" }`;

        const recordContext = JSON.stringify(record);

        const result = await this.client.chat([
            { role: 'user', content: `Engagement Record:\n${recordContext}` }
        ], systemPrompt);

        if (result.success && result.data) {
            try {
                // The GeminiClient currently returns plain text. We might need to parse it if it includes markdown blocks.
                let jsonStr = result.data;
                if (jsonStr.startsWith('```json')) {
                    jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
                }
                const parsed = JSON.parse(jsonStr);
                
                if (parsed.isHotLead) {
                    console.log(`[Analyst Agent] HOT LEAD Identified: ${parsed.reason}`);
                    return true;
                }
            } catch (e) {
                console.error('[Analyst Agent] Failed to parse JSON response.', e);
            }
        }

        console.log(`[Analyst Agent] Customer ${record.customerEmail} is not ready yet.`);
        return false;
    }

    /**
     * The Closer Agent: Generates tailored, dynamic promotional pitches via WhatsApp and Email.
     */
    private async closeLead(record: any) {
        console.log(`[Closer Agent] Closing customer ${record.customerEmail || record.customerPhone}...`);

        const systemPrompt = `You are an elite salesperson for a resort photography business.
Draft a highly personalized, friendly, and persuasive message to a customer who has been viewing their photos but hasn't bought them yet.
Provide a 20% discount code: MEMORIES20 valid for 24 hours.
Keep it casual, exciting, and concise.
Provide your response as a JSON object with two fields:
{
  "whatsapp": "The short WhatsApp message (under 3 sentences, include emojis)",
  "emailSubject": "The catchy email subject line",
  "emailHtml": "The HTML formatted email body"
}`;

        const recordContext = `Customer Name: ${record.customerName || 'Friend'}\nResort: ${record.resortName || 'the resort'}\nMost viewed activity: ${record.topActivity || 'their photos'}`;

        const result = await this.client.chat([
            { role: 'user', content: recordContext }
        ], systemPrompt);

        if (result.success && result.data) {
            try {
                let jsonStr = result.data;
                if (jsonStr.startsWith('```json')) {
                    jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
                }
                const parsed = JSON.parse(jsonStr);

                // Dispatch to WhatsApp
                if (record.customerPhone && record.whatsappOptIn) {
                    await whatsappService.sendTextMessage(record.customerPhone, parsed.whatsapp.trim());
                    console.log(`[Closer Agent] WhatsApp Dispatched to ${record.customerPhone}`);
                }

                // Dispatch to Email
                if (record.customerEmail) {
                    const { EmailService } = await import('./emailService');
                    // We need a dummy logger to instantiate EmailService, or use the global logger.
                    const { logger } = await import('../utils/logger'); // Adjust path if necessary
                    const emailService = new EmailService(logger);
                    
                    await emailService.sendTransactional({
                        to: record.customerEmail,
                        subject: parsed.emailSubject,
                        html: parsed.emailHtml,
                        text: parsed.whatsapp // Fallback text
                    });
                    console.log(`[Closer Agent] Email Dispatched to ${record.customerEmail}`);
                }
            } catch (err) {
                 console.error(`[Closer Agent] Failed to parse JSON or dispatch message for ${record.customerEmail}`, err);
            }
        } else {
            console.error(`[Closer Agent] Failed to generate message for ${record.customerEmail}`);
        }
    }

    /**
     * The Negotiator Agent: Handles dynamic conversational replies from customers.
     */
    async handleIncomingReply(from: string, message: string, history: any[] = []) {
        console.log(`[Negotiator Agent] Handling reply from ${from}: "${message}"`);
        
        const systemPrompt = `You are a helpful and persuasive customer service agent for a resort photography business.
A customer is replying to a WhatsApp promotional message.
Address their questions, reassure them of the quality of the photos, and gently push them to complete the purchase using their discount link.
Be concise, polite, and helpful. Do not be overly pushy. Limit your response to 2 sentences.`;

        const messages = history.map(h => ({
            role: h.role, // 'user' or 'assistant'
            content: h.content
        }));
        
        messages.push({ role: 'user', content: message });

        const result = await this.client.chat(messages, systemPrompt);

        if (result.success && result.data) {
            await whatsappService.sendTextMessage(from, result.data.trim());
        } else {
            await whatsappService.sendTextMessage(from, "Thanks for reaching out! Our team is reviewing your message and will get back to you shortly.");
        }
    }
}

export const aiSalesOrchestrator = new AISalesOrchestrator();
