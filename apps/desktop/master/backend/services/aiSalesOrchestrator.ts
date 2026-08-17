import { whatsappService } from './whatsappService';
import { GeminiClient } from '@clickflash/ai';
import { logger } from '../utils/logger';
import { magicLinkService } from './magicLinkService';
import { AICullingService } from './aiCullingService';
import { performance } from 'perf_hooks';
import type { SwarmLeadEngagement, SwarmNegotiationSession, SwarmDispatchResult } from '@clickflash/types';

// Load from environment or configuration
const AI_API_KEY = process.env.GEMINI_API_KEY || '';

export class AISalesOrchestrator {
    private readonly client: GeminiClient;
    private readonly conversationStore: Map<string, SwarmNegotiationSession>;

    constructor() {
        this.client = new GeminiClient({
            apiKey: AI_API_KEY,
            model: 'gemini-2.0-flash',
            temperature: 0.7,
        });
        this.conversationStore = new Map();
    }

    /**
     * Retrieves or initializes an active negotiation session for a phone number.
     */
    public getSession(phoneNumber: string): SwarmNegotiationSession {
        const cleanPhone = phoneNumber.replace(/[^0-9+]/g, '');
        let session = this.conversationStore.get(cleanPhone);
        if (!session) {
            session = {
                id: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                phoneNumber: cleanPhone,
                engagementLevel: 'WARM',
                offeredDiscountPercentage: 0,
                status: 'active',
                messages: []
            };
            this.conversationStore.set(cleanPhone, session);
        }
        return session;
    }

    /**
     * Cron job entry point to evaluate customers and hunt for leads.
     */
    async huntForLeads(engagementRecords: SwarmLeadEngagement[]): Promise<SwarmDispatchResult[]> {
        const results: SwarmDispatchResult[] = [];
        for (const record of engagementRecords) {
            if (!record.customerPhone || !record.whatsappOptIn) {
                continue; // Can't contact them via WhatsApp
            }

            const isHotLead = await this.analyzeLead(record);
            if (isHotLead) {
                const dispatchResult = await this.closeLead(record);
                if (dispatchResult) {
                    results.push(dispatchResult);
                }
            }
        }
        return results;
    }

    /**
     * The Analyst Agent: Decides if this customer is worth pursuing based on engagement metrics.
     */
    public async analyzeLead(record: SwarmLeadEngagement): Promise<boolean> {
        logger.info(`[Analyst Agent] Evaluating customer ${record.customerEmail || record.customerPhone}...`);

        const systemPrompt = `You are an expert sales analyst for a resort photography business.
Evaluate the customer engagement record and determine if they are a "Hot Lead" worth pursuing with a promotional discount via WhatsApp.
Criteria for Hot Lead: High engagement (e.g., totalOpened >= 3, favorited 5+ photos, abandoned cart with items).
Respond with a JSON object: { "isHotLead": boolean, "reason": "short explanation" }`;

        const recordContext = JSON.stringify(record);

        const result = await this.client.chat([
            { role: 'user', content: `Engagement Record:\n${recordContext}` }
        ], systemPrompt);

        if (result.success && result.data) {
            try {
                let jsonStr = result.data.trim();
                if (jsonStr.startsWith('```json')) {
                    jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
                } else if (jsonStr.startsWith('```')) {
                    jsonStr = jsonStr.replace(/```/g, '').trim();
                }
                const parsed = JSON.parse(jsonStr);
                
                if (parsed.isHotLead) {
                    logger.info(`[Analyst Agent] HOT LEAD Identified: ${parsed.reason}`);
                    return true;
                }
            } catch (e) {
                logger.warn('[Analyst Agent] Non-JSON response, using fallback heuristic.', e);
            }
        }

        logger.info(`[Analyst Agent] Customer ${record.customerEmail || record.customerPhone} is not ready yet.`);
        return false;
    }

    /**
     * The Closer Agent: Generates tailored, dynamic promotional pitches via WhatsApp and Email.
     */
    public async closeLead(record: SwarmLeadEngagement): Promise<SwarmDispatchResult | null> {
        logger.info(`[Closer Agent] Closing customer ${record.customerEmail || record.customerPhone}...`);

        const phone = record.customerPhone || '';
        const session = this.getSession(phone);
        session.offeredDiscountPercentage = 20;
        session.offeredDiscountCode = 'MEMORIES20';

        const systemPrompt = `You are an elite salesperson for ClickFlash resort photography.
Draft a highly personalized, friendly, and persuasive message to a customer who has been viewing their photos but hasn't bought them yet.
Provide a 20% discount code: MEMORIES20 valid for 24 hours.
Keep it casual, exciting, and concise (under 3 sentences, use emojis).
Provide your response as a JSON object with two fields:
{
  "whatsapp": "The short WhatsApp message (under 3 sentences, include emojis)",
  "emailSubject": "The catchy email subject line",
  "emailHtml": "The HTML formatted email body"
}`;

        const recordContext = `Customer Name: ${record.customerName || 'Friend'}\nResort: ${record.resortName || 'the resort'}\nMost viewed activity: ${record.topActivity || 'their vacation photos'}`;

        let whatsappText = `Hi ${record.customerName || 'there'}! 📸 Your vacation photos look incredible. Use code MEMORIES20 for 20% OFF your entire album today! Tap here to claim: https://gallery.clickflash.com`;
        let emailSubject = `Special 20% off your vacation photos! 📸`;
        let emailHtml = `<p>Hi ${record.customerName || 'there'},</p><p>Use code <strong>MEMORIES20</strong> for 20% off your photo album!</p>`;

        const result = await this.client.chat([
            { role: 'user', content: recordContext }
        ], systemPrompt);

        if (result.success && result.data) {
            try {
                let jsonStr = result.data.trim();
                if (jsonStr.startsWith('```json')) {
                    jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
                } else if (jsonStr.startsWith('```')) {
                    jsonStr = jsonStr.replace(/```/g, '').trim();
                }
                const parsed = JSON.parse(jsonStr);
                if (parsed.whatsapp) whatsappText = parsed.whatsapp.trim();
                if (parsed.emailSubject) emailSubject = parsed.emailSubject.trim();
                if (parsed.emailHtml) emailHtml = parsed.emailHtml.trim();
            } catch (err) {
                logger.warn(`[Closer Agent] Using default template for ${record.customerEmail || phone}`, err);
            }
        }

        // Record message in conversation history
        session.messages.push({
            role: 'assistant',
            content: whatsappText,
            timestamp: new Date().toISOString()
        });

        // Dispatch to WhatsApp
        if (phone && record.whatsappOptIn) {
            await whatsappService.sendInteractiveButtonMessage(phone, whatsappText, [
                { id: 'view_album', title: '📷 View Album' },
                { id: 'apply_code', title: '🎁 Apply 20% Off' }
            ]);
            logger.info(`[Closer Agent] WhatsApp Dispatched to ${phone}`);
        }

        // Dispatch to Email
        if (record.customerEmail) {
            try {
                const { EmailService } = await import('./emailService');
                const emailService = new EmailService(logger as any);
                await emailService.sendTransactional({
                    to: record.customerEmail,
                    subject: emailSubject,
                    html: emailHtml,
                    text: whatsappText
                });
                logger.info(`[Closer Agent] Email Dispatched to ${record.customerEmail}`);
            } catch (e) {
                logger.warn(`[Closer Agent] Email service unavailable for ${record.customerEmail}`, e);
            }
        }

        return {
            success: true,
            leadId: record.guestId,
            recipientPhone: phone,
            message: whatsappText,
            discountCode: 'MEMORIES20',
            discountPercentage: 20,
            urgencyLevel: 'high'
        };
    }

    /**
     * The Negotiator Agent: Handles dynamic conversational replies and counter-offers from customers.
     */
    async handleIncomingReply(from: string, message: string, history: any[] = []): Promise<string> {
        logger.info(`[Negotiator Agent] Handling reply from ${from}: "${message}"`);
        const session = this.getSession(from);

        if (history && history.length > 0) {
            for (const h of history) {
                if (!session.messages.some(m => m.content === h.content)) {
                    session.messages.push({
                        role: h.role,
                        content: h.content,
                        timestamp: new Date().toISOString()
                    });
                }
            }
        }
        
        session.messages.push({
            role: 'user',
            content: message,
            timestamp: new Date().toISOString()
        });

        const lower = message.toLowerCase();
        let replyText = '';

        // Dynamic Negotiator Prompt
        const systemPrompt = `You are a helpful and persuasive customer service agent for a resort photography business.
A customer is replying to a WhatsApp promotional message.
Address their questions, reassure them of the quality of the photos, and gently push them to complete the purchase using their discount link.
Be concise, polite, and helpful. Do not be overly pushy. Limit your response to 2 sentences.`;

        const chatHistory = session.messages.slice(-6).map(h => ({
            role: h.role,
            content: h.content
        }));

        const result = await this.client.chat(chatHistory, systemPrompt);

        if (result.success && result.data) {
            replyText = result.data.trim();
        } else {
            // Rule-based fallback
            if (lower.includes('discount') || lower.includes('promo') || lower.includes('coupon') || lower.includes('expensive')) {
                replyText = "We'd love to help you save! 🎁 Use code FLASH20 at checkout for an instant 20% off your entire album today.";
                session.offeredDiscountCode = 'FLASH20';
                session.offeredDiscountPercentage = 20;
            } else if (lower.includes('photo') || lower.includes('gallery') || lower.includes('link')) {
                replyText = "Your high-resolution photos are ready! ✨ Tap your gallery link anytime to view, download, or share them.";
            } else {
                replyText = "Thanks for reaching out! Our team is reviewing your message and will get back to you shortly.";
            }
        }

        session.messages.push({
            role: 'assistant',
            content: replyText,
            timestamp: new Date().toISOString()
        });

        await whatsappService.sendTextMessage(from, replyText);
        return replyText;
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
            new AICullingService(dbManager, logger);
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
                guestId: guestId,
                albumId: `album_${guestId}`,
                destinationId: 'default',
                expiresInSeconds: 86400 * 7 // 7 days
            };
            const magicToken = await magicLinkService.generateMagicLinkToken(linkReq);
            const magicLinkUrl = `https://gallery.clickflash.com/gallery/${magicToken}`;

            // 4. Closer Swarm: Pitch the AI Culling
            const systemPrompt = `You are a lively, persuasive Closer Agent for ClickFlash resort photography.
A guest just uploaded their selfie, and our C++ VP-Tree and AI Culling pipeline instantly found their photos.
Draft a short, engaging WhatsApp message to the guest.
Pitch our "zero-labor AI culling" - explain that our AI automatically picked their best ${excellentPhotosCount} moments out of ${matchedPhotoIds.length} shots without them lifting a finger!
Include the magic link: ${magicLinkUrl}
Keep it under 3 sentences, use emojis, and focus on the magic of instant delivery and AI curation to maximize sales yield.
Respond only with the raw message text.`;

            const result = await this.client.chat([], systemPrompt);
            let messageBody = `✨ Your vacation photos are ready! Our AI picked your top ${excellentPhotosCount} best shots out of ${matchedPhotoIds.length} captured moments. View them now: ${magicLinkUrl}`;

            if (result.success && result.data) {
                messageBody = result.data.trim();
            }

            // 5. Dispatch via WhatsApp
            await whatsappService.sendTextMessage(guestPhone, messageBody);
            logger.info(`[Swarm] Instant magic link dispatched to ${guestPhone} successfully.`);
        } catch (error: any) {
            logger.error(`[Swarm] Failed to dispatch instant magic link for ${guestId}`, error);
            throw new Error(`Error in dispatchInstantMagicLink: ${error.message}`);
        }
    }
}

export const aiSalesOrchestrator = new AISalesOrchestrator();
