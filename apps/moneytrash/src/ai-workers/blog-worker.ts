import { logger } from '../utils/logger';

export interface BlogRequest {
    galleryId: string;
    location: string;
    eventDate: string;
    heroPhotoUrls: string[];
    customerNames?: string;
    keywords?: string[];
}

export class BlogWorker {
    /**
     * Simulates generating SEO-optimized blog content for photographer portfolios.
     * Maps to Fotiqo feature: AI Blog.
     */
    public async generateBlogPost(req: BlogRequest): Promise<{ title: string; htmlContent: string; seoMeta: string }> {
        logger.info(`[BlogWorker] Generating AI Blog post for gallery ${req.galleryId}`);
        
        // Simulate LLM generation (e.g. calling Gemini or Claude API)
        await new Promise(resolve => setTimeout(resolve, 2500));

        const title = `Beautiful Memories at ${req.location} | ClickFlash Studio`;
        
        const htmlContent = `
            <article>
                <h1>${title}</h1>
                <p>On ${req.eventDate}, we had the pleasure of capturing stunning moments at ${req.location} ${req.customerNames ? `for ${req.customerNames}` : ''}.</p>
                <p>The lighting was perfect, and the energy was contagious. Check out some of our favorite shots below.</p>
                <!-- Image tags would be inserted here based on req.heroPhotoUrls -->
            </article>
        `;

        const metaKeywords = req.keywords ? req.keywords.join(', ') : `${req.location} photography, professional photos`;
        const seoMeta = `<meta name="description" content="Professional photography session at ${req.location}. View the beautiful gallery."><meta name="keywords" content="${metaKeywords}">`;

        logger.info(`[BlogWorker] Blog post generated successfully.`);

        return {
            title,
            htmlContent,
            seoMeta
        };
    }
}

export const blogWorker = new BlogWorker();
