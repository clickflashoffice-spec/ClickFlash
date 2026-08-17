/**
 * ClickFlash Cloud Backend Worker - WhatsApp Sales Swarm V7.0
 * Autonomous Multi-Agent Pipeline for Abandoned Cart Recovery, Whale Lead Negotiation,
 * and Intelligent Cadence Escalation via WhatsApp & Meta Graph API.
 */
import { yieldPricingService, CadenceStage, WhalePackageType } from '@clickflash/utils';
import type { Bindings } from '../types';

export type LeadTier = 'WHALE' | 'HIGH_VALUE' | 'STANDARD' | 'MICRO';

export type LeadIntentAffinity = 
    | 'PHOTOBOOK' 
    | 'RAW_MASTER' 
    | 'VIP_FAMILY' 
    | 'ALL_INCLUSIVE' 
    | 'STANDARD_DIGITAL';

export type ObjectionCategory = 
    | 'PHOTOBOOK_CUSTOMIZATION' 
    | 'RAW_MEDIA_DOWNLOAD' 
    | 'VIP_FAMILY_GROUP' 
    | 'PRICE_SENSITIVITY' 
    | 'TRUST_AND_QUALITY' 
    | 'DECISION_DELAY_SPOUSE' 
    | 'DELIVERY_ACCESS_TECHNICAL' 
    | 'GENERAL_CONCIERGE';

export interface CartItemDetail {
    id?: string;
    type?: string;
    name?: string;
    price: number;
    quantity?: number;
    productId?: string;
    format?: string;
    metadata?: {
        isPhotobook?: boolean;
        isRawDownload?: boolean;
        isVipPackage?: boolean;
        photoCount?: number;
        guestCount?: number;
        [key: string]: unknown;
    };
}

export interface CartContext {
    userId: string;
    galleryId: string;
    cartItems: CartItemDetail[];
    lastActiveAt: number; // timestamp
    guestName?: string;
    resortName?: string;
    roomNumber?: string;
    destinationId?: string;
    photoCount?: number;
    cadenceStageOverride?: CadenceStage;
    phone?: string;
}

export interface SwarmMessage {
    recipientId: string;
    message: string;
    discountCode?: string;
    urgencyLevel: 'low' | 'medium' | 'high';
    interactiveButtons?: Array<{ id: string; title: string }>;
    leadTier?: LeadTier;
    objectionCategory?: ObjectionCategory;
    cadenceStage?: CadenceStage;
    suggestedUpsell?: string;
}

export interface InboundMessageContext {
    from: string;
    message: string;
    timestamp?: string;
    messageId?: string;
    env?: Bindings;
    db?: any;
    cartContext?: CartContext;
}

export interface AnalyzedGuestProfile {
    userId: string;
    galleryId: string;
    guestName?: string;
    resortName?: string;
    cartTotal: number;
    photoCount: number;
    hoursInactive: number;
    leadTier: LeadTier;
    leadIntent: LeadIntentAffinity;
    cadenceStage: CadenceStage;
    engagementLevel: 'HOT' | 'WARM' | 'COOLING' | 'COLD';
    hasPhotobook: boolean;
    hasRawDownload: boolean;
    hasVipPackage: boolean;
}

export interface NegotiatorOffer {
    discountPercentage: number;
    discountCode: string;
    incentiveType: string;
    incentiveDescription: string;
    urgencyLevel: 'low' | 'medium' | 'high';
    expiresInHours: number;
    suggestedUpsell?: string;
}

export class SalesSwarmOrchestrator {
    
    /**
     * Deploys the autonomous sales swarm against an abandoned cart.
     * Evaluates lead tier, applies intelligent cadence escalation, and dispatches via WhatsApp.
     */
    public async deploySwarm(cart: CartContext, env?: Bindings): Promise<SwarmMessage> {
        console.log(`[SalesSwarm] 🚀 Deploying swarm for user ${cart.userId} (Gallery: ${cart.galleryId})`);
        
        // 1. Analyst Agent: Classify lead tier, intent affinity, and cadence stage
        const guestProfile = await this.analystAgent(cart);
        console.log(`[SalesSwarm] 📊 Profile: Tier=${guestProfile.leadTier}, Intent=${guestProfile.leadIntent}, Cadence=${guestProfile.cadenceStage}, Total=$${guestProfile.cartTotal}`);
        
        // 2. Negotiator Agent: Calculate bounded yield cadence offer and value-add incentives
        const offer = await this.negotiatorAgent(guestProfile);
        
        // 3. Closer Agent: Craft personalized WhatsApp copywriting with interactive quick-reply buttons
        const payload = await this.closerAgent(guestProfile, offer);
        
        // 4. Dispatch via Meta Graph API / Twilio Webhook
        await this.dispatchWhatsApp(payload, env);

        return payload;
    }

    /**
     * Deploys the swarm with a forced cadence stage (e.g. 2hr, 24hr, 48hr, 7day cron sweeps).
     */
    public async deployCadenceSwarm(cart: CartContext, stage: CadenceStage, env?: Bindings): Promise<SwarmMessage> {
        const enrichedCart: CartContext = {
            ...cart,
            cadenceStageOverride: stage
        };
        return this.deploySwarm(enrichedCart, env);
    }

    /**
     * Handles live inbound WhatsApp messages from customers (negotiations, objections, questions, button clicks).
     */
    public async handleIncomingMessage(context: InboundMessageContext): Promise<SwarmMessage> {
        const { from, message, env } = context;
        console.log(`[SalesSwarm] 💬 Inbound message from ${from}: "${message}"`);

        let replyText = '';
        let discountCode: string | undefined;
        let urgency: 'low' | 'medium' | 'high' = 'medium';
        let objectionCategory: ObjectionCategory = 'GENERAL_CONCIERGE';
        let buttons: Array<{ id: string; title: string }> = [];

        // 1. Classify objection category from incoming text
        objectionCategory = this.classifyObjection(message);
        console.log(`[SalesSwarm] 🎯 Detected objection category: ${objectionCategory}`);

        // 2. Call Gemini AI with domain-specific Whale Objection & Resort Sales Knowledge
        if (env?.GEMINI_API_KEY) {
            try {
                const aiReply = await this.callGeminiNegotiator(message, objectionCategory, env.GEMINI_API_KEY, context);
                if (aiReply) {
                    replyText = aiReply;
                }
            } catch (err) {
                console.warn('[SalesSwarm] Gemini inference error, falling back to rule engine:', err);
            }
        }

        // 3. Fallback Deterministic Rule-Based Objection Engine
        if (!replyText) {
            const ruleResult = this.evaluateRuleBasedObjection(message, objectionCategory, context);
            replyText = ruleResult.text;
            discountCode = ruleResult.discountCode;
            urgency = ruleResult.urgency;
            buttons = ruleResult.buttons;
        } else {
            // Assign matching interactive buttons based on objection category
            buttons = this.getInteractiveButtonsForCategory(objectionCategory, discountCode);
        }

        const payload: SwarmMessage = {
            recipientId: from,
            message: replyText,
            discountCode,
            urgencyLevel: urgency,
            objectionCategory,
            interactiveButtons: buttons
        };

        await this.dispatchWhatsApp(payload, env);
        return payload;
    }

    /**
     * Classifies the guest's message into structured objection categories.
     */
    public classifyObjection(message: string): ObjectionCategory {
        const lower = message.toLowerCase();

        // 1. Price Sensitivity & Discounts (Explicit promo/discount inquiries)
        if (
            lower.includes('discount') || lower.includes('promo') || lower.includes('coupon') || 
            lower.includes('expensive') || lower.includes('cheaper') || lower.includes('cost') || 
            lower.includes('deal') || lower.includes('offer') || lower.includes('budget') ||
            lower.includes('claim_discount') || lower.includes('20% off') || lower.includes('price')
        ) {
            return 'PRICE_SENSITIVITY';
        }

        // 2. Custom Photobooks & Print Keepsakes
        if (
            lower.includes('photobook') || lower.includes('photo book') || 
            lower.includes('layflat') || lower.includes('leather') || lower.includes('binding') || 
            lower.includes('print quality') || lower.includes('hardcover') || lower.includes('shipping') || 
            lower.includes('pages') || lower.includes('arrange') || lower.includes('preview book')
        ) {
            return 'PHOTOBOOK_CUSTOMIZATION';
        }

        // 3. RAW Media Downloads & Full Master Files
        if (
            lower.includes('raw') || lower.includes('dng') || lower.includes('cr3') || 
            lower.includes('uncompressed') || lower.includes('megapixels') || lower.includes('resolution') || 
            lower.includes('lightroom') || lower.includes('lut') || lower.includes('presets') || 
            lower.includes('sensor') || lower.includes('master file') || lower.includes('4k video')
        ) {
            return 'RAW_MEDIA_DOWNLOAD';
        }

        // 4. VIP Family Packages & Large Groups
        if (
            lower.includes('family') || lower.includes('group') || lower.includes('reunion') || 
            lower.includes('multiple rooms') || lower.includes('kids') || lower.includes('grandparents') || 
            lower.includes('everyone') || lower.includes('split') || lower.includes('all day') || 
            lower.includes('shadow') || lower.includes('vip') || lower.includes('multi-pass')
        ) {
            return 'VIP_FAMILY_GROUP';
        }

        // 5. Decision Delay / Spouse Objection
        if (
            lower.includes('husband') || lower.includes('wife') || lower.includes('partner') || 
            lower.includes('spouse') || lower.includes('discuss') || lower.includes('think about') || 
            lower.includes('later') || lower.includes('tomorrow') || lower.includes('not ready')
        ) {
            return 'DECISION_DELAY_SPOUSE';
        }

        // 6. Trust & Quality Assurance
        if (
            lower.includes('blurry') || lower.includes('quality') || lower.includes('watermark') || 
            lower.includes('refund') || lower.includes('guarantee') || lower.includes('retouch') || 
            lower.includes('satisfied') || lower.includes('enhance')
        ) {
            return 'TRUST_AND_QUALITY';
        }

        // 7. Delivery, PIN & Technical Access
        if (
            lower.includes('how to download') || lower.includes('link expired') || lower.includes('login') || 
            lower.includes('pin') || lower.includes('access') || lower.includes('wifi') || 
            lower.includes('storage') || lower.includes('cloud') || lower.includes('magic link') ||
            lower.includes('view_gallery') || lower.includes('view_album')
        ) {
            return 'DELIVERY_ACCESS_TECHNICAL';
        }

        return 'GENERAL_CONCIERGE';
    }

    /**
     * Deterministic rule-based objection responses for zero-dependency reliability.
     */
    private evaluateRuleBasedObjection(
        message: string, 
        category: ObjectionCategory, 
        context: InboundMessageContext
    ): { text: string; discountCode?: string; urgency: 'low' | 'medium' | 'high'; buttons: Array<{ id: string; title: string }> } {
        const guestName = context.cartContext?.guestName ? ` ${context.cartContext.guestName}` : '';
        
        switch (category) {
            case 'PHOTOBOOK_CUSTOMIZATION':
                return {
                    text: `Hi${guestName}! 📚 Our custom photobooks feature seamless layflat binding, 300 DPI Italian archival lustre paper, and custom handcrafted covers. Our ClickFlash AI automatically arranges your photos chronologically. Plus, we ship worldwide with tracked DHL/FedEx! Use code BOOKUPGRADE for 20% OFF + a complimentary Layflat Binding upgrade! 🎁`,
                    discountCode: 'BOOKUPGRADE',
                    urgency: 'medium',
                    buttons: [
                        { id: 'preview_photobook', title: '📖 Preview My Book' },
                        { id: 'claim_book_upgrade', title: '🎁 Apply BOOKUPGRADE' },
                        { id: 'chat_designer', title: '💬 Speak to Designer' }
                    ]
                };

            case 'RAW_MEDIA_DOWNLOAD':
                return {
                    text: `Hi${guestName}! 💾 Our uncompressed RAW master pass includes 14-bit DNG/CR3 captures directly from our Sony Alpha & Canon EOS R full-frame sensors, delivering maximum dynamic range for Lightroom/Capture One. We also include a free Pro Resort LUT Preset pack! Use code RAWUNLOCK for 20% OFF the full sensor pass. 🎨`,
                    discountCode: 'RAWUNLOCK',
                    urgency: 'medium',
                    buttons: [
                        { id: 'download_raw_bundle', title: '💾 Download RAWs' },
                        { id: 'claim_raw_discount', title: '🎁 Apply RAWUNLOCK' },
                        { id: 'preview_lut_presets', title: '🎨 View LUT Presets' }
                    ]
                };

            case 'VIP_FAMILY_GROUP':
                return {
                    text: `Hi${guestName}! 👨‍👩‍👧‍👦 Our VIP Family Package links all family members and multiple resort rooms into a single shared album with unlimited biometric downloads, all ride photos, and dining shots! You can also easily share access links or split payments across rooms. Use code VIPFAMILY25 for 25% OFF the entire family pass! 🌴`,
                    discountCode: 'VIPFAMILY25',
                    urgency: 'high',
                    buttons: [
                        { id: 'unlock_vip_family', title: '👨‍👩‍👧‍👦 Claim Family VIP' },
                        { id: 'share_guest_link', title: '🔗 Share with Family' },
                        { id: 'split_payment', title: '💳 Split Payment' }
                    ]
                };

            case 'DECISION_DELAY_SPOUSE':
                return {
                    text: `We completely understand! Taking time to review with your family is important. 🌴 We have locked in your 20% discount with code PARTNERPASS for the next 24 hours so you don't lose your rate. Tap below to share a private full-screen preview with your partner! ✨`,
                    discountCode: 'PARTNERPASS',
                    urgency: 'low',
                    buttons: [
                        { id: 'share_preview_link', title: '🔗 Share with Partner' },
                        { id: 'claim_partner_pass', title: '🎁 Claim Code (24h)' },
                        { id: 'view_album', title: '📷 Preview Album' }
                    ]
                };

            case 'TRUST_AND_QUALITY':
                return {
                    text: `Every photo in your ClickFlash gallery was captured on pro gear and enhanced with AI color grading and sharpness mastering. Once purchased, all watermarks are removed instantly, unlocking full 4K print-ready files with our 100% money-back satisfaction guarantee! 🛡️`,
                    discountCode: 'MEMORIES20',
                    urgency: 'low',
                    buttons: [
                        { id: 'view_gallery', title: '🖼️ Inspect 4K Quality' },
                        { id: 'claim_discount', title: '🎁 Claim 20% Off' },
                        { id: 'speak_concierge', title: '🌴 VIP Concierge' }
                    ]
                };

            case 'PRICE_SENSITIVITY':
                return {
                    text: `We’d love for you to keep these priceless vacation memories forever! 📸 Use code FLASH20 at checkout for an exclusive 20% OFF your entire album. Tap below to claim your savings before the timer runs out! ⏳`,
                    discountCode: 'FLASH20',
                    urgency: 'high',
                    buttons: [
                        { id: 'checkout_now', title: '⚡ Checkout with 20% Off' },
                        { id: 'view_gallery', title: '🖼️ View My Photos' }
                    ]
                };

            case 'DELIVERY_ACCESS_TECHNICAL':
                return {
                    text: `Your high-resolution photos are safely stored in your private cloud gallery. Tap your magic link below to instantly view, share, or download your album in full resolution. No passwords or app downloads required! ⚡`,
                    urgency: 'low',
                    buttons: [
                        { id: 'view_gallery', title: '🖼️ Open My Gallery' },
                        { id: 'download_all', title: '📥 Download All' },
                        { id: 'help_support', title: '💬 Technical Help' }
                    ]
                };

            case 'GENERAL_CONCIERGE':
            default:
                return {
                    text: `Thanks for contacting ClickFlash Resort Photography! 🌴 Your memories are ready in your private gallery. Let us know if you need any assistance with photobooks, downloads, or custom framing! ✨`,
                    urgency: 'low',
                    buttons: [
                        { id: 'view_gallery', title: '🖼️ View My Photos' },
                        { id: 'claim_discount', title: '🎁 Claim 20% Off' }
                    ]
                };
        }
    }

    /**
     * Returns tailored interactive WhatsApp quick-reply buttons based on category.
     */
    private getInteractiveButtonsForCategory(category: ObjectionCategory, discountCode?: string): Array<{ id: string; title: string }> {
        switch (category) {
            case 'PHOTOBOOK_CUSTOMIZATION':
                return [
                    { id: 'preview_photobook', title: '📖 Preview My Book' },
                    { id: 'claim_book_upgrade', title: '🎁 Apply Code' },
                    { id: 'chat_designer', title: '💬 Speak to Designer' }
                ];
            case 'RAW_MEDIA_DOWNLOAD':
                return [
                    { id: 'download_raw_bundle', title: '💾 Download RAWs' },
                    { id: 'claim_raw_discount', title: '🎁 Apply RAW Code' },
                    { id: 'preview_lut_presets', title: '🎨 View LUT Presets' }
                ];
            case 'VIP_FAMILY_GROUP':
                return [
                    { id: 'unlock_vip_family', title: '👨‍👩‍👧‍👦 Claim Family VIP' },
                    { id: 'share_guest_link', title: '🔗 Share with Family' },
                    { id: 'split_payment', title: '💳 Split Payment' }
                ];
            case 'DECISION_DELAY_SPOUSE':
                return [
                    { id: 'share_preview_link', title: '🔗 Share with Partner' },
                    { id: 'claim_partner_pass', title: '🎁 Price Lock (24h)' }
                ];
            case 'PRICE_SENSITIVITY':
                return [
                    { id: 'checkout_now', title: '⚡ Checkout with Discount' },
                    { id: 'view_gallery', title: '🖼️ View My Photos' }
                ];
            default:
                return [
                    { id: 'view_gallery', title: '🖼️ View My Photos' },
                    { id: 'checkout_now', title: '⚡ Checkout Now' }
                ];
        }
    }

    /**
     * Gemini AI Inbound Sales Negotiator with full resort domain & Whale objection intelligence.
     */
    private async callGeminiNegotiator(
        userMessage: string, 
        category: ObjectionCategory, 
        apiKey: string,
        context: InboundMessageContext
    ): Promise<string | null> {
        const guestName = context.cartContext?.guestName || 'Guest';
        const resortName = context.cartContext?.resortName || 'ClickFlash Resort & Parks';

        const prompt = `You are an elite, highly persuasive, and warm WhatsApp Sales Negotiator for ClickFlash (${resortName}).
You are talking to ${guestName}.
Their message: "${userMessage}".
Detected topic/objection: ${category}.

Guidelines:
1. Keep the reply concise, warm, and conversational (maximum 2-3 sentences with emojis).
2. For Custom Photobooks: Mention seamless layflat binding, 300 DPI archival lustre paper, automated chronological layout, tracked worldwide shipping, and offer code BOOKUPGRADE for 20% off.
3. For RAW Media Downloads: Mention 14-bit uncompressed DNG/CR3 full-frame sensor files, wide color grading latitude, and free pro Lightroom LUT pack with code RAWUNLOCK.
4. For VIP Family Packages: Reassure multi-room biometric linking, full group coverage, all ride + dining photos, and offer code VIPFAMILY25 for 25% off.
5. For Price/Discount requests: Offer code FLASH20 for 20% off with urgency.
6. For Decision Delay/Partner: Offer a 24-hour price lock with code PARTNERPASS and encourage sharing the interactive preview.
7. For Quality/Trust: Reassure 4K watermark-free instant delivery with 100% money-back guarantee.
8. Respond with the plain message text only. Do NOT include markdown headers or meta instructions.`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { maxOutputTokens: 180, temperature: 0.7 }
            })
        });

        if (!response.ok) return null;
        const data = await response.json() as any;
        const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        return candidateText ? candidateText.trim() : null;
    }

    /**
     * 1. Analyst Agent: Classifies cart value, item affinities, lead tier, and abandonment duration.
     */
    public async analystAgent(cart: CartContext): Promise<AnalyzedGuestProfile> {
        console.log(`[AnalystAgent] Analyzing cart value and behavioral intent for ${cart.userId}...`);
        
        const cartTotal = cart.cartItems.reduce((sum, item) => sum + (item.price * (item.quantity ?? 1)), 0);
        const hoursInactive = (Date.now() - cart.lastActiveAt) / (1000 * 60 * 60);
        const photoCount = cart.photoCount ?? cart.cartItems.reduce((sum, item) => sum + (item.metadata?.photoCount ?? 1), 0);

        // Detect Item Affinities
        const hasPhotobook = cart.cartItems.some(i => 
            i.metadata?.isPhotobook || i.type === 'photobook' || i.name?.toLowerCase().includes('photobook') || i.name?.toLowerCase().includes('album')
        );
        const hasRawDownload = cart.cartItems.some(i => 
            i.metadata?.isRawDownload || i.type === 'raw' || i.name?.toLowerCase().includes('raw') || i.name?.toLowerCase().includes('dng')
        );
        const hasVipPackage = cart.cartItems.some(i => 
            i.metadata?.isVipPackage || i.type === 'vip' || i.name?.toLowerCase().includes('vip') || i.name?.toLowerCase().includes('family')
        );

        // Determine Lead Intent Affinity
        let leadIntent: LeadIntentAffinity = 'STANDARD_DIGITAL';
        if (hasPhotobook) leadIntent = 'PHOTOBOOK';
        else if (hasRawDownload) leadIntent = 'RAW_MASTER';
        else if (hasVipPackage) leadIntent = 'VIP_FAMILY';
        else if (cartTotal >= 100) leadIntent = 'ALL_INCLUSIVE';

        // Determine Lead Tier
        let leadTier: LeadTier = 'STANDARD';
        if (cartTotal >= 150 || (hasPhotobook && hasRawDownload) || hasVipPackage || photoCount >= 40) {
            leadTier = 'WHALE';
        } else if (cartTotal >= 75) {
            leadTier = 'HIGH_VALUE';
        } else if (cartTotal >= 30) {
            leadTier = 'STANDARD';
        } else {
            leadTier = 'MICRO';
        }

        // Determine Inactivity Engagement Level
        let engagementLevel: 'HOT' | 'WARM' | 'COOLING' | 'COLD' = 'WARM';
        if (hoursInactive < 4) engagementLevel = 'HOT';
        else if (hoursInactive < 24) engagementLevel = 'WARM';
        else if (hoursInactive < 72) engagementLevel = 'COOLING';
        else engagementLevel = 'COLD';

        // Determine Cadence Stage
        let cadenceStage: CadenceStage;
        if (cart.cadenceStageOverride) {
            cadenceStage = cart.cadenceStageOverride;
        } else if (hoursInactive < 6) {
            cadenceStage = '2hr_nudge';
        } else if (hoursInactive < 36) {
            cadenceStage = '24hr_golden';
        } else if (hoursInactive < 96) {
            cadenceStage = '48hr_whale_urgency';
        } else {
            cadenceStage = '7day_cold_vault';
        }

        return {
            userId: cart.userId,
            galleryId: cart.galleryId,
            guestName: cart.guestName,
            resortName: cart.resortName,
            cartTotal,
            photoCount,
            hoursInactive,
            leadTier,
            leadIntent,
            cadenceStage,
            engagementLevel,
            hasPhotobook,
            hasRawDownload,
            hasVipPackage
        };
    }

    /**
     * 2. Negotiator Agent: Calculates optimal yield concessions and value-add incentives.
     */
    public async negotiatorAgent(profile: AnalyzedGuestProfile): Promise<NegotiatorOffer> {
        console.log(`[NegotiatorAgent] Calculating optimal cadence escalation for ${profile.leadTier} lead at stage ${profile.cadenceStage}...`);
        
        const isWhale = profile.leadTier === 'WHALE' || profile.leadTier === 'HIGH_VALUE';
        const cadenceResult = yieldPricingService.calculateCadenceEscalation(
            profile.hoursInactive,
            profile.cartTotal,
            isWhale
        );

        let discountPercentage = cadenceResult.discountPercentage;
        let discountCode = cadenceResult.discountCode;
        let incentiveType = cadenceResult.incentiveType;
        let incentiveDescription = cadenceResult.incentiveDescription;
        let suggestedUpsell: string | undefined;

        // Specialized High-Value Whale Incentives
        if (profile.leadTier === 'WHALE') {
            if (profile.leadIntent === 'PHOTOBOOK') {
                discountCode = 'BOOKVIP';
                incentiveDescription = '20% OFF + Complimentary Layflat Upgrade & Hardcover Keepsake Box';
                suggestedUpsell = 'Custom Leather Layflat Photobook';
            } else if (profile.leadIntent === 'RAW_MASTER') {
                discountCode = 'RAWFREE';
                incentiveDescription = '20% OFF + Complimentary Full 14-Bit Sensor RAW Master Unlock';
                suggestedUpsell = 'Uncompressed RAW + 4K Video Pass';
            } else if (profile.leadIntent === 'VIP_FAMILY') {
                discountCode = 'VIPFAMILY25';
                discountPercentage = 25;
                incentiveDescription = '25% OFF Complete Family Multi-Room Pass + Free Guest Passes';
                suggestedUpsell = 'Multi-Room Extended Family Pass';
            }
        }

        return {
            discountPercentage,
            discountCode,
            incentiveType,
            incentiveDescription,
            urgencyLevel: cadenceResult.urgencyLevel,
            expiresInHours: cadenceResult.expiresInHours,
            suggestedUpsell
        };
    }

    /**
     * 3. Closer Agent: Crafts high-converting WhatsApp messages and interactive action buttons.
     */
    public async closerAgent(profile: AnalyzedGuestProfile, offer: NegotiatorOffer): Promise<SwarmMessage> {
        console.log(`[CloserAgent] Crafting personalized copywriting for ${profile.leadTier} lead...`);
        
        const guestGreeting = profile.guestName ? `Hi ${profile.guestName}!` : 'Hi there!';
        const resortTag = profile.resortName ? ` from ${profile.resortName}` : '';
        
        let message = '';
        let interactiveButtons: Array<{ id: string; title: string }> = [];

        switch (profile.cadenceStage) {
            case '2hr_nudge': {
                // T+2 Hours: Gentle high-touch alert
                message = `${guestGreeting} We noticed you left some beautiful memories in your ClickFlash gallery${resortTag}! 📸\n\nYour photos are safely stored in full 4K resolution. Tap below to preview your album anytime.`;
                if (offer.discountPercentage > 0) {
                    message += `\n\n✨ Special Gift: Use code *${offer.discountCode}* to get ${offer.discountPercentage}% off + complimentary AI portrait retouching!`;
                }
                interactiveButtons = [
                    { id: 'view_album', title: '🖼️ View My Photos' },
                    { id: 'checkout_now', title: '⚡ Checkout Now' }
                ];
                break;
            }

            case '24hr_golden': {
                // T+24 Hours: Golden recovery window with value-add hook
                message = `${guestGreeting} Don't let your vacation memories slip away! 🌴\n\nYour private gallery${resortTag} is active and ready for download. We've unlocked an exclusive offer for you:\n\n🎁 Use code *${offer.discountCode}* for *${offer.discountPercentage}% OFF* your entire order!`;
                if (profile.leadTier === 'WHALE' && offer.suggestedUpsell) {
                    message += `\nIncludes ${offer.incentiveDescription}!`;
                }
                message += `\n\n⏳ Your exclusive discount code expires in ${offer.expiresInHours} hours.`;
                interactiveButtons = [
                    { id: 'claim_discount', title: `🎁 Claim ${offer.discountPercentage}% Off` },
                    { id: 'view_gallery', title: '🖼️ Preview Album' },
                    { id: 'checkout_now', title: '⚡ Instant Checkout' }
                ];
                break;
            }

            case '48hr_whale_urgency': {
                // T+48 Hours: High-urgency escalation & Whale concession
                message = `🚨 ${guestGreeting} Urgent update regarding your ClickFlash gallery${resortTag}!\n\nYour private album reservation is scheduled to expire in *${offer.expiresInHours} hours*! ⏳\n\n🔥 Final VIP Offer: Use code *${offer.discountCode}* for *${offer.discountPercentage}% OFF* + ${offer.incentiveDescription}.`;
                message += `\n\nTap below to claim and lock in lifetime cloud access before expiration!`;
                interactiveButtons = [
                    { id: 'claim_urgent_discount', title: `🔥 Claim ${offer.discountPercentage}% Before Expiry` },
                    { id: 'view_gallery', title: '🖼️ View Photos' },
                    { id: 'speak_concierge', title: '💬 Speak to VIP Concierge' }
                ];
                break;
            }

            case '7day_cold_vault':
            default: {
                // T+7 Days: Cold vault liquidation sweep
                message = `🗄️ ${guestGreeting} Final Notice: Your ClickFlash gallery is moving to cold storage archive today.\n\nTo help you preserve your vacation memories forever, we've applied our highest *30% Vault Clearance Discount* with code *${offer.discountCode}*! 📸\n\n⏳ This archive link expires in ${offer.expiresInHours} hours.`;
                interactiveButtons = [
                    { id: 'claim_vault_discount', title: '🗄️ Save My Album (30% Off)' },
                    { id: 'restore_gallery', title: '⚡ Instant Download' }
                ];
                break;
            }
        }

        return {
            recipientId: profile.userId,
            message,
            discountCode: offer.discountCode,
            urgencyLevel: offer.urgencyLevel,
            leadTier: profile.leadTier,
            cadenceStage: profile.cadenceStage,
            suggestedUpsell: offer.suggestedUpsell,
            interactiveButtons
        };
    }

    /**
     * Dispatches the crafted message and interactive quick-reply buttons via Meta Graph API or Twilio.
     */
    public async dispatchWhatsApp(payload: SwarmMessage, env?: Bindings): Promise<boolean> {
        console.log(`[WhatsApp Dispatch] 🟢 Sending to ${payload.recipientId}...`);
        console.log(`[Payload] Urgency: ${payload.urgencyLevel} | Code: ${payload.discountCode || 'NONE'} | Tier: ${payload.leadTier || 'STANDARD'}`);
        console.log(`[MessageBody]\n${payload.message}\n`);

        const token = env?.WHATSAPP_ACCESS_TOKEN;
        const phoneId = env?.WHATSAPP_PHONE_NUMBER_ID;

        if (token && phoneId) {
            try {
                const url = `https://graph.facebook.com/v17.0/${phoneId}/messages`;
                
                // If interactive buttons exist, format as Meta Interactive Message, else plain text
                let bodyPayload: any;
                if (payload.interactiveButtons && payload.interactiveButtons.length > 0) {
                    bodyPayload = {
                        messaging_product: 'whatsapp',
                        recipient_type: 'individual',
                        to: payload.recipientId,
                        type: 'interactive',
                        interactive: {
                            type: 'button',
                            body: { text: payload.message },
                            action: {
                                buttons: payload.interactiveButtons.slice(0, 3).map(btn => ({
                                    type: 'reply',
                                    reply: {
                                        id: btn.id,
                                        title: btn.title.slice(0, 20) // Meta API limits button title to 20 chars
                                    }
                                }))
                            }
                        }
                    };
                } else {
                    bodyPayload = {
                        messaging_product: 'whatsapp',
                        recipient_type: 'individual',
                        to: payload.recipientId,
                        type: 'text',
                        text: { preview_url: true, body: payload.message }
                    };
                }

                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(bodyPayload)
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
