export interface AgentIntent {
    action: "SEND_EMAIL" | "DRAFT_CONTRACT" | "LEAD_SCORE" | "UNKNOWN";
    parameters: Record<string, string | number | boolean>;
    confidence: number;
}

export interface LeadScoreResult {
    score: number;
    bant: {
        budget: boolean;
        authority: boolean;
        need: boolean;
        timeline: boolean;
    };
    summary: string;
}

export interface ShootIdea {
    title: string;
    description: string;
    settings?: {
        aperture: string;
        shutter_speed: string;
        iso: string;
    };
}

const safeText = (value: unknown, fallback = ""): string => {
    if (typeof value !== "string") return fallback;
    const normalized = value.trim().replace(/\s+/g, " ").slice(0, 500);
    return normalized || fallback;
};

/** First-party rules for studio intents, lead qualification, and creative prompts. */
export class StudioIntelligenceService {
    private static instance: StudioIntelligenceService;

    private constructor() {}

    public static getInstance(): StudioIntelligenceService {
        if (!StudioIntelligenceService.instance) {
            StudioIntelligenceService.instance = new StudioIntelligenceService();
        }
        return StudioIntelligenceService.instance;
    }

    public async parseIntent(command: string): Promise<AgentIntent> {
        const source = safeText(command);
        const normalized = source.toLowerCase();
        if (!normalized) return { action: "UNKNOWN", parameters: {}, confidence: 0 };

        if (/score|qualify|lead/.test(normalized)) {
            return { action: "LEAD_SCORE", parameters: {}, confidence: 0.9 };
        }

        if (/contract|proposal|agreement|quote/.test(normalized)) {
            return { action: "DRAFT_CONTRACT", parameters: {}, confidence: 0.85 };
        }

        if (/send|email|message|remind/.test(normalized)) {
            const email = source.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
            return {
                action: "SEND_EMAIL",
                parameters: email ? { email } : {},
                confidence: email ? 0.95 : 0.75,
            };
        }

        return { action: "UNKNOWN", parameters: {}, confidence: 0.2 };
    }

    public async scoreLead(inquiryText: string): Promise<LeadScoreResult> {
        const normalized = safeText(inquiryText).toLowerCase();
        const bant = {
            budget: /budget|price|pricing|cost|rate|quote|€|\$|£/.test(normalized),
            authority: /owner|manager|director|decision|i am responsible|we decided/.test(normalized),
            need: /photo|photography|photographer|session|gallery|wedding|event|shoot|booking/.test(normalized),
            timeline: /today|tomorrow|this week|next week|this month|next month|deadline|by \w+|\b20\d{2}-\d{2}-\d{2}\b/.test(normalized),
        };
        const detected = Object.entries(bant)
            .filter(([, present]) => present)
            .map(([criterion]) => criterion);
        const score = Math.max(1, detected.length * 25);
        const missing = Object.entries(bant)
            .filter(([, present]) => !present)
            .map(([criterion]) => criterion);

        return {
            score,
            bant,
            summary: detected.length
                ? `Detected ${detected.join(", ")}; missing ${missing.length ? missing.join(", ") : "none"}.`
                : "No explicit BANT qualification signals were detected in the supplied inquiry.",
        };
    }

    public async generateShootIdeas(location: string, theme: string, expertise: string): Promise<ShootIdea[]> {
        const safeLocation = safeText(location, "the selected location").slice(0, 120);
        const safeTheme = safeText(theme, "timeless travel").slice(0, 120);
        const safeExpertise = safeText(expertise, "all-level").slice(0, 120);

        return [
            {
                title: `${safeTheme} Arrival Story`,
                description: `Build an establishing sequence at ${safeLocation}, moving from a wide scene to candid guest interactions. Suitable for ${safeExpertise} photographers.`,
                settings: { aperture: "4", shutter_speed: "1/250", iso: "200" },
            },
            {
                title: `${safeLocation} Detail Trail`,
                description: `Pair environmental details with relaxed portraits to create a cohesive ${safeTheme} album narrative.`,
                settings: { aperture: "2.8", shutter_speed: "1/320", iso: "320" },
            },
            {
                title: `${safeTheme} Motion Finale`,
                description: `Finish with guided movement and one clean group frame using the strongest available directional light at ${safeLocation}.`,
                settings: { aperture: "5.6", shutter_speed: "1/500", iso: "400" },
            },
        ];
    }
}

export const studioIntelligenceService = StudioIntelligenceService.getInstance();
