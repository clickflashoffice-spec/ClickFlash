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
 * All email is routed through the Cloudflare Management Hub Worker
 * (POST /api/email/relay → Resend API).  A direct Resend fallback
 * is available when RESEND_API_KEY is set and the hub is not configured.
 */
export class EmailService {
    private fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@clickflash.com';
    private fromName  = process.env.SENDGRID_FROM_NAME  || 'ClickFlash Photography';
    private cloudApiUrl: string | null = null;
    private cloudToken: string | null = null;
    private logger: Logger;

    constructor(logger: Logger) {
        this.logger = logger;
    }

    /** Configure the Cloudflare Hub Relay. Called from server.ts after construction. */
    public setCloudConfig(apiUrl: string, token: string): void {
        if (!apiUrl || !token) return;
        this.cloudApiUrl = apiUrl;
        this.cloudToken  = token;
        this.logger.info('[EmailService] Cloudflare Hub relay configured');
    }

    private get isHubConfigured(): boolean {
        return !!(this.cloudApiUrl && this.cloudToken);
    }

    /** Send via the Management Hub Worker → Resend. Returns the message ID or null. */
    private async sendViaHub(payload: {
        to: string; from: string; fromName: string;
        subject: string; html: string; text: string;
    }): Promise<string | null> {
        const response = await fetch(`${this.cloudApiUrl}/api/email/relay`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.cloudToken}`,
            },
            body: JSON.stringify(payload),
        });
        if (response.ok) return 'SENT_VIA_HUB';
        const err = await response.text();
        throw new Error(`Hub relay failed (${response.status}): ${err}`);
    }

    /** Direct Resend fallback — used when hub is not yet configured (local dev). */
    private async sendViaResendDirect(payload: {
        to: string; subject: string; html: string; text: string;
    }): Promise<string | null> {
        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) return null;

        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: `${this.fromName} <${this.fromEmail}>`,
                to:   [payload.to],
                subject: payload.subject,
                html: payload.html,
                text: payload.text,
            }),
        });
        if (response.ok) {
            const data = await response.json() as { id?: string };
            return data.id || 'SENT_VIA_RESEND';
        }
        const err = await response.text();
        throw new Error(`Resend direct failed (${response.status}): ${err}`);
    }

    /** Send campaign email with open-tracking pixel and unsubscribe footer. */
    async sendCampaignEmail(options: CampaignEmail): Promise<string | null> {
        try {
            const backendUrl  = process.env.BACKEND_URL || 'http://localhost:8090';
            const trackingUrl = `${backendUrl}/api/marketing/track-open/${options.trackingId}`;
            const unsubUrl    = `${backendUrl}/api/marketing/unsubscribe?email=${encodeURIComponent(options.to)}`;

            const htmlWithExtras = options.html
                + `<img src="${trackingUrl}" width="1" height="1" alt="" />`
                + `<div style="margin-top:30px;padding-top:20px;border-top:1px solid #ddd;font-size:12px;color:#999;text-align:center;">
                     <a href="${unsubUrl}" style="color:#999;">Unsubscribe</a>
                   </div>`;

            const payload = {
                to: options.to,
                from: this.fromEmail,
                fromName: this.fromName,
                subject: options.subject,
                html: htmlWithExtras,
                text: options.text,
            };

            if (this.isHubConfigured) {
                return this.sendViaHub(payload);
            }

            const fallback = await this.sendViaResendDirect({
                to: options.to, subject: options.subject,
                html: htmlWithExtras, text: options.text,
            });
            if (!fallback) this.logger.warn('[EmailService] No transport configured — campaign email dropped');
            return fallback;
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : String(error);
            this.logger.error('[EmailService] Failed to send campaign email', { error: msg });
            return null;
        }
    }

    /** Send a transactional email (order confirmations, alerts, gallery access, etc.). */
    async sendTransactional(options: EmailOptions): Promise<boolean> {
        try {
            const payload = {
                to: options.to,
                from: this.fromEmail,
                fromName: this.fromName,
                subject: options.subject,
                html: options.html,
                text: options.text,
            };

            if (this.isHubConfigured) {
                await this.sendViaHub(payload);
                return true;
            }

            const fallback = await this.sendViaResendDirect({
                to: options.to, subject: options.subject,
                html: options.html, text: options.text,
            });
            if (!fallback) {
                this.logger.warn('[EmailService] No transport configured — transactional email dropped');
                return false;
            }
            return true;
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : String(error);
            this.logger.error('[EmailService] Failed to send transactional email', { error: msg });
            return false;
        }
    }

    /** Convenience wrapper used by campaign routes. */
    async sendTestEmail(to: string, subject: string, html: string, text: string): Promise<boolean> {
        return this.sendTransactional({ to, subject, html, text });
    }

    /** Render plain-text template — values NOT HTML-escaped. */
    renderTemplate(template: string, variables: Record<string, string>): string {
        return template.replace(/{(\w+)}/g, (match, key) =>
            variables[key] !== undefined ? variables[key] : match
        );
    }

    /** Render HTML template — values are HTML-escaped to prevent markup injection. */
    renderHtmlTemplate(template: string, variables: Record<string, string>): string {
        const escape = (s: string) =>
            s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
             .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

        return template.replace(/{(\w+)}/g, (match, key) =>
            variables[key] !== undefined ? escape(variables[key]) : match
        );
    }

    isConfigured(): boolean {
        return this.isHubConfigured || !!process.env.RESEND_API_KEY;
    }
}
