import { logger } from '@/utils/logger';

export interface AgentIntent {
    action: 'SEND_EMAIL' | 'DRAFT_CONTRACT' | 'LEAD_SCORE' | 'UNKNOWN';
    parameters: Record<string, any>;
    confidence: number;
}

export interface LeadScoreResult {
    score: number; // 1-100
    bant: {
        budget: boolean;
        authority: boolean;
        need: boolean;
        timeline: boolean;
    };
    summary: string;
}

/**
 * ClickFlash Agent Service
 * Powered by Google Gemini API (gemini-2.5-flash)
 */
export class GeminiAgentService {
    private static instance: GeminiAgentService;
    private apiKey: string;
    private baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';

    private constructor() {
        this.apiKey = process.env.GEMINI_API_KEY || '';
        if (!this.apiKey) {
            logger.warn('GEMINI_API_KEY is not set. Agent Service will not function correctly.');
        }
    }

    public static getInstance(): GeminiAgentService {
        if (!GeminiAgentService.instance) {
            GeminiAgentService.instance = new GeminiAgentService();
        }
        return GeminiAgentService.instance;
    }

    /**
     * Parses a natural language command into a structured intent.
     * @param command Natural language string (e.g., "Send a gallery reminder to John")
     */
    public async parseIntent(command: string): Promise<AgentIntent> {
        if (!this.apiKey) throw new Error("Missing GEMINI_API_KEY");

        const prompt = `
            You are the ClickFlash Studio Agent. Parse the following command into a structured JSON intent.
            Possible actions: SEND_EMAIL, DRAFT_CONTRACT, LEAD_SCORE, UNKNOWN.
            Extract any relevant parameters.
            Command: "${command}"
            
            Respond ONLY with a JSON object in this format:
            {
                "action": "ACTION_NAME",
                "parameters": {},
                "confidence": 0.95
            }
        `;

        try {
            const response = await fetch(`${this.baseUrl}/gemini-2.5-flash:generateContent?key=${this.apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        responseMimeType: "application/json"
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`Gemini API Error: ${response.statusText}`);
            }

            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            
            if (!text) {
                throw new Error("Empty response from Gemini");
            }

            return JSON.parse(text) as AgentIntent;
        } catch (error) {
            logger.error('Failed to parse intent via Gemini', error);
            return { action: 'UNKNOWN', parameters: {}, confidence: 0 };
        }
    }

    /**
     * CRM Integration: AI Lead Scoring
     * Extracts BANT parameters and assigns a score to an inbound email/message.
     */
    public async scoreLead(inquiryText: string): Promise<LeadScoreResult> {
        if (!this.apiKey) throw new Error("Missing GEMINI_API_KEY");

        const prompt = `
            You are a CRM AI for a photography studio. Analyze the following inbound inquiry.
            Extract BANT (Budget, Authority, Need, Timeline) as booleans.
            Assign a lead score from 1-100 based on the presence of BANT criteria and overall intent.
            Provide a short summary.
            
            Inquiry: "${inquiryText}"
            
            Respond ONLY with a JSON object in this format:
            {
                "score": 85,
                "bant": { "budget": true, "authority": false, "need": true, "timeline": true },
                "summary": "Short explanation"
            }
        `;

        try {
            const response = await fetch(`${this.baseUrl}/gemini-2.5-flash:generateContent?key=${this.apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        responseMimeType: "application/json"
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`Gemini API Error: ${response.statusText}`);
            }

            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            
            if (!text) {
                throw new Error("Empty response from Gemini");
            }

            return JSON.parse(text) as LeadScoreResult;
        } catch (error) {
            logger.error('Failed to score lead via Gemini', error);
            throw error;
        }
    }
}

export const geminiAgentService = GeminiAgentService.getInstance();
