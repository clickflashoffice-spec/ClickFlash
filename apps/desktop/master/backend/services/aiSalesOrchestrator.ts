import { whatsappService } from './whatsappService';
import { GeminiClient } from '@clickflash/ai';
import { logger } from '@clickflash/logger';
import { internal } from '@clickflash/errors';
import { magicLinkService } from './magicLinkService';
import { AICullingService } from './aiCullingService';
import { performance } from 'perf_hooks';

// Load from environment or configuration
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
        logger.info(`[Analyst Agent] Evaluating customer ${record.customerEmail}...`);
        
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
                let jsonStr = result.data;
                if (jsonStr.startsWith('```json')) {
                    jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
                }
                const parsed = JSON.parse(jsonStr);
                
                if (parsed.isHotLead) {
                    logger.info(`[Analyst Agent] HOT LEAD Identified: ${parsed.reason}`);
                    return true;
                }
            } catch (e) {
                logger.error('[Analyst Agent] Failed to parse JSON response.', e);
            }
        }

        logger.info(`[Analyst Agent] Customer ${record.customerEmail} is not ready yet.`);
        return false;
    }

    /**
     * The Closer Agent: Generates tailored, dynamic promotional pitches via WhatsApp and Email.
     */
    private async closeLead(record: any) {
        logger.info(`[Closer Agent] Closing customer ${record.customerEmail || record.customerPhone}...`);

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
                    logger.info(`[Closer Agent] WhatsApp Dispatched to ${record.customerPhone}`);
                }

                // Dispatch to Email
                if (record.customerEmail) {
                    const { EmailService } = await import('./emailService');
                    const emailService = new EmailService(logger as any);
                    
                    await emailService.sendTransactional({
                        to: record.customerEmail,
                        subject: parsed.emailSubject,
                        html: parsed.emailHtml,
                        text: parsed.whatsapp // Fallback text
                    });
                    logger.info(`[Closer Agent] Email Dispatched to ${record.customerEmail}`);
                }
            } catch (err) {
                 logger.error(`[Closer Agent] Failed to parse JSON or dispatch message for ${record.customerEmail}`, err);
            }
        } else {
            logger.error(`[Closer Agent] Failed to generate message for ${record.customerEmail}`);
        }
    }

    /**
     * The Negotiator Agent: Handles dynamic conversational replies from customers.
     */
    async handleIncomingReply(from: string, message: string, history: any[] = []) {
        logger.info(`[Negotiator Agent] Handling reply from ${from}: "${message}"`);
        
        const systemPrompt = `You are a helpful and persuasive customer service agent for a resort photography business.
A customer is replying to a WhatsApp promotional message.
Address their questions, reassure them of the quality of the photos, and gently push them to complete the purchase using their discount link.
Be concise, polite, and helpful. Do not be overly pushy. Limit your response to 2 sentences.`;

        const messages = history.map(h => ({
            role: h.role,
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

    /**
     * Instant Magic Link Dispatch with VP-Tree Face Matching and AI Culling Pitch
     */
    async dispatchInstantMagicLink(
        guestId: string,
        guestPhone: string,
        selfieVector: number[] | Float32Array,
        vectorIndex: any,
        dbManager: any
    ): Promise<void> {
        try {
            logger.info(`[Swarm] Dispatching instant magic link for guest ${guestId}`);
            
            // 1. Sub-second VP-Tree Search
            const startSearch = performance.now();
            const matchedPhotoIds = vectorIndex.search(selfieVector, 50, 0.8366);
            const searchMs = performance.now() - startSearch;
            
            if (!matchedPhotoIds || matchedPhotoIds.length === 0) {
                logger.info(`[Swarm] No photos matched for guest ${guestId}`);
                return;
            }
            logger.info(`[Swarm] VP-Tree found ${matchedPhotoIds.length} matches in ${searchMs.toFixed(2)}ms`);

            // 2. Fetch photo paths and apply AI Culling
            const placeholders = matchedPhotoIds.map(() => '?').join(',');
            const photos = dbManager.all(
                `SELECT id, path FROM photos WHERE id IN (${placeholders})`,
                matchedPhotoIds
            );

            let excellentPhotosCount = 0;
            const cullingService = new AICullingService(dbManager, logger);
            await AICullingService.init();

            for (const photo of photos) {
                const scores = await AICullingService.evaluateImage(photo.path);
                const aiScore = Math.max(0, Math.min(100, Math.round(100 - (scores.blurScore * 100))));
                
                if (aiScore >= 70) {
                    excellentPhotosCount++;
                }
            }

            // 3. Generate Magic Link
            const linkReq = {
                guestId,
                albumId: `album_${guestId}`,
                expiresInSeconds: 259200
            };
            const magicToken = magicLinkService.generateMagicLinkToken(linkReq);
            const magicLinkUrl = `https://gallery.clicketflash.com/gallery/${magicToken}`;

            // 4. Closer Swarm: Pitch the AI Culling
            const systemPrompt = `You are a lively, persuasive Closer Agent for ClickFlash resort photography.
A guest just uploaded their selfie, and our C++ VP-Tree and AI Culling pipeline instantly found their photos.
Draft a short, engaging WhatsApp message to the guest.
Pitch our "zero-labor AI culling" - explain that our AI automatically picked their best ${excellentPhotosCount} moments out of ${matchedPhotoIds.length} shots without them lifting a finger!
Include the magic link: ${magicLinkUrl}
Keep it under 3 sentences, use emojis, and focus on the magic of instant delivery and AI curation to maximize sales yield.
Respond only with the raw message text.`;

            const result = await this.client.chat([], systemPrompt);

            if (result.success && result.data) {
                const messageBody = result.data.trim();
                
                // 5. Dispatch via WhatsApp
                await whatsappService.sendTextMessage(guestPhone, messageBody);
                logger.info(`[Swarm] Instant magic link dispatched to ${guestPhone} successfully.`);
            } else {
                throw internal("Gemini Swarm failed to generate AI Culling pitch");
            }
        } catch (error: any) {
            logger.error(`[Swarm] Failed to dispatch instant magic link for ${guestId}`, error);
            throw internal("Error in dispatchInstantMagicLink", error);
        }
    }
}

export const aiSalesOrchestrator = new AISalesOrchestrator();
