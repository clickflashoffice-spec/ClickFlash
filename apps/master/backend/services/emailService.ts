import { Logger } from '../utils/logger';
import nodemailer from 'nodemailer';

export interface EmailAttachment {
    filename: string;
    content: string;  // base64-encoded file content
    type?: string;    // MIME type, e.g. "application/pdf"
}

export interface EmailOptions {
    to: string;
    subject: string;
    html: string;
    text: string;
    trackingId?: string;
    attachments?: EmailAttachment[];
}

export interface CampaignEmail extends EmailOptions {
    campaignId: string;
    customerId: string;
}

/**
 * Backend Email Service
 *
 * All email is routed through the Cloudflare Management Hub Worker
 * (POST /api/email/relay → Nodemailer).  A direct SMTP fallback
 * is available when SMTP_HOST is set and the hub is not configured.
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

    /** Direct SMTP fallback — used when hub is not yet configured (local dev). */
    private async sendViaSmtp(payload: {
        to: string; subject: string; html: string; text: string;
        attachments?: EmailAttachment[];
    }): Promise<string | null> {
        const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
        if (!SMTP_HOST || !SMTP_PORT) return null;

        const transporter = nodemailer.createTransport({
            host: SMTP_HOST,
            port: Number(SMTP_PORT),
            secure: Number(SMTP_PORT) === 465,
            auth: (SMTP_USER && SMTP_PASS) ? {
                user: SMTP_USER,
                pass: SMTP_PASS,
            } : undefined,
        });

        const mailOptions: nodemailer.SendMailOptions = {
            from: `${this.fromName} <${this.fromEmail}>`,
            to: payload.to,
            subject: payload.subject,
            text: payload.text,
            html: payload.html,
        };

        if (payload.attachments?.length) {
            mailOptions.attachments = payload.attachments.map((a) => ({
                filename: a.filename,
                content: Buffer.from(a.content, 'base64'),
                ...(a.type ? { contentType: a.type } : {}),
            }));
        }

        try {
            const info = await transporter.sendMail(mailOptions);
            return info.messageId || 'SENT_VIA_SMTP';
        } catch (err: any) {
            throw new Error(`SMTP direct failed: ${err.message}`);
        }
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

            const fallback = await this.sendViaSmtp({
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

            const fallback = await this.sendViaSmtp({
                to: options.to, subject: options.subject,
                html: options.html, text: options.text,
                attachments: options.attachments,
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
        return this.isHubConfigured || !!process.env.SMTP_HOST;
    }
}
