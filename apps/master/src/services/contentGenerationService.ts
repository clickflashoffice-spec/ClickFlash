import {
    GeminiClient,
    QualityGateEngine,
    type QualityGateEvaluation,
    type GeminiConfig
} from '@clickflash/ai';

export interface GalleryMetadata {
    eventName: string;
    date: string;
    location: string;
    tags: string[];
    highlightImageCount: number;
    guestName?: string;
}

export interface GeneratedContent {
    blogPostHtml: string;
    emailSubject: string;
    emailBodyText: string;
    smsText: string;
    kioskHeadline: string;
    kioskDescription: string;
    qualityGate: QualityGateEvaluation;
    isAIGenerated: boolean;
}

const safeText = (value: unknown, fallback: string): string => {
    if (typeof value !== "string") return fallback;
    const normalized = value.trim().replace(/\s+/g, " ").slice(0, 160);
    return normalized || fallback;
};

const escapeHtml = (value: string): string => value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const safeCount = (value: unknown): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
};

/**
 * Enterprise AI Content Orchestration Service for Master Studio OS.
 * Synthesizes multi-channel resort media marketing copy, enforces quality gates,
 * and maintains resilient offline deterministic fallback.
 */
export class ContentGenerationService {
    private geminiClient: GeminiClient | null = null;

    constructor(geminiConfig?: GeminiConfig) {
        if (geminiConfig?.apiKey) {
            this.geminiClient = new GeminiClient(geminiConfig);
        }
    }

    public setGeminiConfig(config: GeminiConfig): void {
        if (config.apiKey) {
            this.geminiClient = new GeminiClient(config);
        }
    }

    /**
     * Builds reviewable gallery copy with AI generation, strict quality gates, and deterministic fallback.
     */
    async generateGalleryContent(
        metadata: GalleryMetadata,
        options?: { apiKey?: string; dailySpendUsd?: number; maxBudgetUsd?: number }
    ): Promise<GeneratedContent> {
        const eventName = safeText(metadata.eventName, "Vacation Experience");
        const location = safeText(metadata.location, "Resort & Beach Club");
        const date = safeText(metadata.date, "Today");
        const highlightImageCount = safeCount(metadata.highlightImageCount);
        const guestName = metadata.guestName ? safeText(metadata.guestName, "") : undefined;
        const tags = Array.isArray(metadata.tags)
            ? metadata.tags
                .map((tag) => safeText(tag, ""))
                .filter((tag, index, all) => tag && all.indexOf(tag) === index)
                .slice(0, 8)
            : [];

        // Build active client or use provided options
        let client = this.geminiClient;
        if (options?.apiKey) {
            client = new GeminiClient({
                apiKey: options.apiKey,
                model: 'gemini-2.0-flash',
                temperature: 0.3,
                maxTokens: 512,
            });
        }

        const imageLabel = `${highlightImageCount} highlighted photo${highlightImageCount === 1 ? "" : "s"}`;

        // Attempt AI generation if client is available
        if (client) {
            try {
                const systemPrompt = `You are the AI Creative Director for ClickFlash Resort Photography.
Write luxury, warm, vacation memory copy for a guest photo collection.
Maintain high brand quality. Do NOT make unrealistic claims or use words like 'guarantee' or 'cheap'.
Return ONLY valid JSON matching this schema:
{
  "emailSubject": "string",
  "emailBodyText": "string",
  "blogPostHtml": "string",
  "smsText": "string",
  "kioskHeadline": "string",
  "kioskDescription": "string"
}`;

                const userPrompt = `Event: ${eventName}
Location: ${location}
Date: ${date}
Highlight Count: ${highlightImageCount}
Guest Name: ${guestName || "Valued Guest"}
Tags: ${tags.join(", ") || "resort memories"}`;

                const result = await client.chat(
                    [{ role: 'user', content: userPrompt }],
                    systemPrompt
                );

                if (result.success && result.data) {
                    const parsed = JSON.parse(result.data);
                    const combinedText = `${parsed.emailSubject} ${parsed.emailBodyText} ${parsed.smsText}`;

                    const qualityGate = QualityGateEngine.evaluateContent(
                        combinedText,
                        { guestName, location, date, expectedImageCount: highlightImageCount },
                        { promptTokens: 150, completionTokens: 120 },
                        {
                            currentDailySpendUsd: options?.dailySpendUsd ?? 0,
                            maxDailyBudgetUsd: options?.maxBudgetUsd ?? 25.0,
                        }
                    );

                    if (qualityGate.passed || qualityGate.routing !== 'REJECT') {
                        return {
                            emailSubject: safeText(parsed.emailSubject, `${eventName} Memories Are Ready`),
                            emailBodyText: safeText(parsed.emailBodyText, `Your vacation photos from ${location} are ready.`),
                            blogPostHtml: parsed.blogPostHtml || `<h1>${escapeHtml(eventName)}</h1><p>Captured at ${escapeHtml(location)}.</p>`,
                            smsText: safeText(parsed.smsText, `Your ${eventName} photos are ready! View your memories at ${location}.`),
                            kioskHeadline: safeText(parsed.kioskHeadline, "Your Resort Moments Are Ready"),
                            kioskDescription: safeText(parsed.kioskDescription, `Relive ${imageLabel} captured at ${location}.`),
                            qualityGate,
                            isAIGenerated: true,
                        };
                    }
                }
            } catch {
                // Fall back gracefully to deterministic pipeline on error
            }
        }

        // Safe deterministic fallback (100% brand compliant)
        const escapedEvent = escapeHtml(eventName);
        const escapedLocation = escapeHtml(location);
        const escapedDate = escapeHtml(date);
        const escapedTags = tags.map(escapeHtml).join(", ");
        const tagSentence = escapedTags
            ? `The collection focuses on ${escapedTags}.`
            : "The collection presents the strongest resort memories selected by the studio.";

        const greeting = guestName ? `Hello ${guestName}, your` : "Your";
        const emailBody = `${greeting} ${eventName} vacation photography collection from ${date} at ${location} is ready to view. It includes ${imageLabel}. Relive your favorite resort memories and experience today!`;
        const emailSubject = `${eventName} Resort Moments Are Ready`;
        const smsText = `${greeting} ${eventName} photos from ${location} are ready to view! Relive your vacation memories now.`;
        const kioskHeadline = "Your Resort Moments Are Ready";
        const kioskDescription = `Relive ${imageLabel} from your ${eventName} experience at ${location}.`;

        const fallbackEvaluation = QualityGateEngine.evaluateContent(
            `${emailSubject} ${emailBody} ${smsText}`,
            { guestName, location, date, expectedImageCount: highlightImageCount },
            { promptTokens: 0, completionTokens: 0 },
            {
                currentDailySpendUsd: options?.dailySpendUsd ?? 0,
                maxDailyBudgetUsd: options?.maxBudgetUsd ?? 25.0,
            }
        );

        return {
            blogPostHtml: `<h1>${escapedEvent} photography at ${escapedLocation}</h1><p>Captured on ${escapedDate}, this gallery brings together ${imageLabel} from the vacation session.</p><p>${tagSentence} Every image was selected for a clear, consistent client story.</p>`,
            emailSubject,
            emailBodyText: emailBody,
            smsText,
            kioskHeadline,
            kioskDescription,
            qualityGate: fallbackEvaluation,
            isAIGenerated: false,
        };
    }
}

export default new ContentGenerationService();
