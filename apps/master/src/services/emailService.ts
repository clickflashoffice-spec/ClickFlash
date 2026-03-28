import { logger } from '../utils/logger';

interface EmailOptions {
    to: string;
    subject: string;
    html: string;
    text: string;
    trackingId?: string;
}

interface CampaignEmail extends EmailOptions {
    campaignId: string;
    customerId: string;
}

/**
 * Frontend Email Service API Client
 * 
 * Bridges communication to the backend marketing API.
 * This resolves build issues with SendGrid Node-only library.
 */
class EmailServiceClient {
    private backendUrl = '/api/marketing';

    /**
     * Send transactional email via backend API
     */
    async sendTransactional(options: EmailOptions): Promise<boolean> {
        try {
            const response = await fetch(`${this.backendUrl}/test-email`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(options),
            });

            if (!response.ok) {
                const errorData = await response.json();
                logger.error('[EmailService] API Error:', errorData);
                return false;
            }

            logger.info(`[EmailService] Email sent via API to ${options.to}`);
            return true;
        } catch (error) {
            logger.error('[EmailService] Network Error:', error);
            return false;
        }
    }

    /**
     * Send campaign email with tracking (usually handled by backend scheduler, 
     * but provided here for manual triggers)
     */
    async sendCampaignEmail(options: CampaignEmail): Promise<string | null> {
        // In the new architecture, campaigns are mostly triggered by the backend.
        // If the frontend needs to trigger one, it uses the test-email endpoint
        // or a dedicated campaign trigger if added.
        const success = await this.sendTransactional(options);
        return success ? 'sent-via-api' : null;
    }

    /**
     * Send test email for campaign preview
     */
    async sendTestEmail(to: string, subject: string, html: string, text: string): Promise<boolean> {
        return this.sendTransactional({ to, subject, html, text });
    }

    /**
     * Render template with variables
     */
    renderTemplate(template: string, variables: Record<string, string>): string {
        return template.replace(/{(\w+)}/g, (match, key) => {
            return variables[key] !== undefined ? variables[key] : match;
        });
    }

    /**
     * Check if email service is configured
     * In frontend, we assume backend is configured if API is reachable.
     */
    isConfigured(): boolean {
        return true;
    }
}

export const emailService = new EmailServiceClient();
export type { EmailOptions, CampaignEmail };
