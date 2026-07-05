import logger from '../utils/logger';

export interface GalleryMetadata {
    eventName: string;
    date: string;
    location: string;
    tags: string[];
    highlightImageCount: number;
}

export interface GeneratedContent {
    blogPostHtml: string;
    emailSubject: string;
    emailBodyText: string;
}

export class ContentGenerationService {
    
    /**
     * Generates SEO-ready blog posts and email campaigns using Gemini
     */
    async generateGalleryContent(metadata: GalleryMetadata): Promise<GeneratedContent> {
        logger.info(`Generating AI Content for gallery: ${metadata.eventName}`);
        
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error("GEMINI_API_KEY is missing from environment");
        }

        const prompt = `
            You are a professional photography copywriter.
            I have a gallery with the following details:
            - Event: ${metadata.eventName}
            - Location: ${metadata.location}
            - Date: ${metadata.date}
            - Tags: ${metadata.tags.join(', ')}
            - Highlights: ${metadata.highlightImageCount} images
            
            Please output a JSON object exactly in this format:
            {
                "blogPostHtml": "<h1>SEO friendly title</h1><p>2 paragraphs of engaging SEO optimized content about the event.</p>",
                "emailSubject": "Engaging email subject line to clients",
                "emailBodyText": "Short email body announcing the gallery is ready to view."
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

            const parsedContent = JSON.parse(textOutput) as GeneratedContent;
            logger.info(`Successfully generated content for ${metadata.eventName}`);
            return parsedContent;

        } catch (error) {
            logger.error(`Error generating content: ${error instanceof Error ? error.message : 'Unknown'}`);
            throw error;
        }
    }
}

export default new ContentGenerationService();
