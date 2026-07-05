import logger from '../utils/logger';

export interface DownloadEvent {
    galleryId: string;
    guestEmail: string;
    guestName?: string;
    photoId: string;
    downloadedAt: Date;
}

export class AdvocacyFunnelService {
    
    /**
     * Called whenever a guest downloads a high-resolution photo or shares it to social media.
     * This schedules an automated review request to be sent later when they are likely to be happiest.
     */
    async trackDownloadEvent(event: DownloadEvent): Promise<void> {
        logger.info(`[AdvocacyFunnel] Guest ${event.guestEmail} downloaded photo from gallery ${event.galleryId}`);
        
        // 1. Check if we've already asked this guest for a review recently to avoid spam
        const hasBeenAsked = await this.checkIfAlreadyAsked(event.guestEmail);
        if (hasBeenAsked) {
            logger.info(`[AdvocacyFunnel] Guest ${event.guestEmail} already in review funnel. Skipping.`);
            return;
        }

        // 2. Schedule the review request for 2 hours from now
        // In a real app, this might insert a job into Redis/BullMQ or a scheduled database table
        const scheduledTime = new Date(event.downloadedAt.getTime() + 2 * 60 * 60 * 1000);
        
        logger.info(`[AdvocacyFunnel] Scheduled review request for ${event.guestEmail} at ${scheduledTime.toISOString()}`);
        
        // Mock queue insertion
        // await db.jobs.insert({ type: 'SEND_REVIEW_REQUEST', email: event.guestEmail, executeAt: scheduledTime });
    }

    /**
     * Executes the actual review request (called by a worker processing the queue)
     */
    async sendReviewRequest(guestEmail: string, guestName: string, reviewLink: string): Promise<boolean> {
        logger.info(`[AdvocacyFunnel] Sending review request to ${guestEmail}...`);
        
        const emailBody = `
            Hi ${guestName},
            
            We hope you love your photos! If you had a great time, it would mean the world to our guides/photographers if you left a quick 5-star review here:
            
            ${reviewLink}
            
            Thank you!
        `;
        
        // await emailService.send(guestEmail, 'How were your photos?', emailBody);
        
        logger.info(`[AdvocacyFunnel] Review request sent successfully to ${guestEmail}`);
        return true;
    }

    private async checkIfAlreadyAsked(email: string): Promise<boolean> {
        // Mock check
        return false;
    }
}

export default new AdvocacyFunnelService();
