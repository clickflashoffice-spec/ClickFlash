import { logger } from "../utils/logger";

export interface WeeklyMetrics {
    galleryViews: number;
    ordersPlaced: number;
    cartAbandonmentRate: number;
    averageOrderValue: number;
    totalRevenue: number;
    currentTier: string;
}

export interface CoachingReport {
    summary: string;
    actionItems: string[];
    upsellRecommendation: string;
}

export class CoachingReportService {
    
    /**
     * Generates a weekly AI Coaching Report based on sales metrics
     */
    async generateWeeklyReport(metrics: WeeklyMetrics, photographerId: string): Promise<CoachingReport> {
        logger.info(`Generating AI Coaching Report for photographer ${photographerId}`);
        
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error("GEMINI_API_KEY is missing from environment");
        }

        const prompt = `
            You are an expert photography business coach.
            Analyze these weekly metrics for a photographer:
            - Views: ${metrics.galleryViews}
            - Orders: ${metrics.ordersPlaced}
            - Cart Abandonment: ${metrics.cartAbandonmentRate}%
            - Average Order Value: €${metrics.averageOrderValue}
            - Total Revenue: €${metrics.totalRevenue}
            - Current Tier: ${metrics.currentTier}
            
            Provide a coaching report as a JSON object exactly in this format:
            {
                "summary": "1-2 sentences summarizing their week.",
                "actionItems": ["Actionable advice 1", "Actionable advice 2"],
                "upsellRecommendation": "A specific recommendation on how to upsell or change pricing to improve conversions."
            }
        `;

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
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
                const errText = await response.text();
                throw new Error(`Gemini API Error: ${response.status} - ${errText}`);
            }

            const data = await response.json();
            const textOutput = data.candidates?.[0]?.content?.parts?.[0]?.text;
            
            if (!textOutput) {
                throw new Error("Invalid response format from Gemini");
            }

            const parsedReport = JSON.parse(textOutput) as CoachingReport;
            logger.info(`Successfully generated Coaching Report for ${photographerId}`);
            return parsedReport;

        } catch (error) {
            logger.error(`Error generating coaching report: ${error instanceof Error ? error.message : 'Unknown'}`);
            throw error;
        }
    }
}

export default new CoachingReportService();
