import { Resend } from 'resend';
import { Logger } from '../shared/logger';

export interface EmailOptions {
    to: string;
    subject: string;
    html: string;
    text: string;
    trackingId?: string;
}

export interface CampaignEmail extends EmailOptions {
    campaignId: string;
    customerId: string;
}

/**
 * Backend Email Service
 * 
 * Handles email sending via Resend (Primary) with Hub Relay fallback.
 */
export class EmailService {
    private initialized = false;
    private resend: Resend | null = null;
    private fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@clickflash.com';
    private fromName = process.env.SENDGRID_FROM_NAME || 'ClickFlash Photography';
    private cloudApiUrl: string | null = null;
    private cloudToken: string | null = null;
    private logger: Logger;

    constructor(logger: Logger) {
        this.logger = logger;
        this.initialize();
    }

    /**
     * Configure Cloud Hub Relay
     */
    public setCloudConfig(apiUrl: string, token: string): void {
        this.cloudApiUrl = apiUrl;
        this.cloudToken = token;
        this.initialized = !!(apiUrl && token);
        if (this.initialized) {
            this.logger.info('[EmailService] Hub Relay configured successfully');
        }
    }

    private initialize(): void {
        const apiKey = process.env.RESEND_API_KEY;
        if (apiKey) {
            this.resend = new Resend(apiKey);
            this.initialized = true;
            this.logger.info('[EmailService] Initialized with Resend (Primary)');
        } else if (process.env.SENDGRID_API_KEY) {
            // Legacy SendGrid Fallback
            this.initialized = true;
            this.logger.info('[EmailService] Initialized with SendGrid (Direct Fallback)');
        }
    }

    /**
     * Send campaign email with tracking
     */
    async sendCampaignEmail(options: CampaignEmail): Promise<string | null> {
        if (!this.initialized) {
            this.logger.error('[EmailService] Cannot send email - not initialized');
            return null;
        }

        try {
            // Add tracking pixel for open tracking
            const backendUrl = process.env.BACKEND_URL || 'http://localhost:8090';
            const trackingPixelUrl = `${backendUrl}/api/marketing/track-open/${options.trackingId}`;
            const htmlWithTracking = options.html + `<img src="${trackingPixelUrl}" width="1" height="1" alt="" />`;

            // Add unsubscribe link (CAN-SPAM compliance)
            const unsubscribeUrl = `${backendUrl}/api/marketing/unsubscribe?email=${encodeURIComponent(options.to)}`;
            const htmlWithUnsubscribe = htmlWithTracking + `
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #999; text-align: center;">
          <a href="${unsubscribeUrl}" style="color: #999;">Unsubscribe</a>
        </div>
      `;

            const relayBody = {
                to: options.to,
                from: this.fromEmail,
                fromName: this.fromName,
                subject: options.subject,
                text: options.text,
                html: htmlWithUnsubscribe
            };

            if (this.resend) {
                // Primary: Resend
                const { data, error } = await this.resend.emails.send({
                    from: `${this.fromName} <${this.fromEmail}>`,
                    to: [options.to],
                    subject: options.subject,
                    text: options.text,
                    html: htmlWithUnsubscribe
                });
                if (error) throw error;
                return data?.id || 'SENT_VIA_RESEND';
            } else if (this.cloudApiUrl && this.cloudToken) {
                const response = await fetch(`${this.cloudApiUrl}/api/email/relay`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.cloudToken}`
                    },
                    body: JSON.stringify(relayBody)
                });

                if (response.ok) {
                    this.logger.info(`[EmailService] Campaign email sent to ${options.to} via Hub Relay`);
                    return 'SENT_VIA_HUB';
                } else {
                    const err = await response.text();
                    throw new Error(`Hub Relay failed (${response.status}): ${err}`);
                }
            } else if (process.env.SENDGRID_API_KEY) {
                // Secondary Fallback: SendGrid
                const sgMail = require('@sendgrid/mail');
                sgMail.setApiKey(process.env.SENDGRID_API_KEY);
                const [response] = await sgMail.send({
                    ...relayBody,
                    from: { email: relayBody.from, name: relayBody.fromName }
                });
                return (response.headers['x-message-id'] as string) || 'SENT_VIA_SENDGRID';
            }

            return null;
        } catch (error: any) {
            this.logger.error('[EmailService] Failed to send campaign email', { error: error.message });
            return null;
        }
    }

    /**
     * Send transactional email (order confirmations, etc.)
     */
    async sendTransactional(options: EmailOptions): Promise<boolean> {
        if (!this.initialized) {
            this.logger.error('[EmailService] Cannot send email - not initialized');
            return false;
        }

        try {
            const relayBody = {
                to: options.to,
                from: this.fromEmail,
                fromName: this.fromName,
                subject: options.subject,
                text: options.text,
                html: options.html
            };

            if (this.resend) {
                // Primary: Resend
                const { error } = await this.resend.emails.send({
                    from: `${this.fromName} <${this.fromEmail}>`,
                    to: [options.to],
                    subject: options.subject,
                    text: options.text,
                    html: options.html
                });
                if (error) throw error;
                return true;
            } else if (this.cloudApiUrl && this.cloudToken) {
                const response = await fetch(`${this.cloudApiUrl}/api/email/relay`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.cloudToken}`
                    },
                    body: JSON.stringify(relayBody)
                });
                return response.ok;
            } else if (process.env.SENDGRID_API_KEY) {
                const sgMail = require('@sendgrid/mail');
                sgMail.setApiKey(process.env.SENDGRID_API_KEY);
                await sgMail.send({
                    ...relayBody,
                    from: { email: relayBody.from, name: relayBody.fromName }
                });
                return true;
            }
            return false;
        } catch (error: any) {
            this.logger.error('[EmailService] Failed to send transactional email', { error: error.message });
            return false;
        }
    }

    /**
     * Send test email for campaign preview
     */
    async sendTestEmail(to: string, subject: string, html: string, text: string): Promise<boolean> {
        return this.sendTransactional({ to, subject, html, text });
    }

    /**
     * Render plain-text template with variables.
     * Values are NOT HTML-escaped — use renderHtmlTemplate for HTML emails.
     */
    renderTemplate(template: string, variables: Record<string, string>): string {
        return template.replace(/{(\w+)}/g, (match, key) => {
            return variables[key] !== undefined ? variables[key] : match;
        });
    }

    /**
     * Render HTML email template with variables.
     * Values are HTML-escaped to prevent malformed markup when customer-supplied
     * data (names, album titles) contains special characters such as < > & " '.
     */
    renderHtmlTemplate(template: string, variables: Record<string, string>): string {
        const escapeHtml = (str: string): string =>
            str
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');

        return template.replace(/{(\w+)}/g, (match, key) => {
            return variables[key] !== undefined ? escapeHtml(variables[key]) : match;
        });
    }

    /**
     * Check if service is configured
     */
    isConfigured(): boolean {
        return this.initialized;
    }
}
