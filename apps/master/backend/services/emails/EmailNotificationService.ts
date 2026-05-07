/**
 * Email Notification Service
 * 
 * Handles sending transactional emails for orders, alerts, and admin notifications
 */

import { Logger } from '../../shared/logger';
import { z } from 'zod';

export const EmailConfigSchema = z.object({
  smtpHost: z.string().optional(),
  smtpPort: z.number().optional(),
  smtpUser: z.string().optional(),
  smtpPassword: z.string().optional(),
  fromEmail: z.string().email(),
  fromName: z.string(),
  useCloudflareEmail: z.boolean().default(true),
});

export type EmailConfig = z.infer<typeof EmailConfigSchema>;

export interface EmailRecipient {
  name: string;
  email: string;
}

export interface OrderNotification {
  orderId: string;
  clientName: string;
  clientEmail: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  total: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface AlertNotification {
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export class EmailNotificationService {
  private logger: Logger;
  private config: EmailConfig;

  constructor(logger: Logger, config: EmailConfig) {
    this.logger = logger;
    this.config = config;
  }

  async sendOrderConfirmation(recipient: EmailRecipient, order: OrderNotification): Promise<boolean> {
    const subject = `Order Confirmed - #${order.orderId}`;
    const html = this.getOrderEmailTemplate(order);

    return this.sendEmail({
      to: recipient,
      subject,
      html,
    });
  }

  async sendOrderStatusUpdate(recipient: EmailRecipient, order: OrderNotification): Promise<boolean> {
    const statusMessages = {
      pending: 'Your order is being processed.',
      processing: 'Your order is being prepared.',
      completed: 'Your order has been completed and is ready for pickup/shipping.',
      failed: 'There was an issue with your order. Please contact support.',
    };

    const subject = `Order Update - #${order.orderId}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Order ${order.status.charAt(0).toUpperCase() + order.status.slice(1)}</h2>
        <p>${statusMessages[order.status]}</p>
        <p>Order ID: ${order.orderId}</p>
        <p>Total: $${order.total.toFixed(2)}</p>
      </div>
    `;

    return this.sendEmail({
      to: recipient,
      subject,
      html,
    });
  }

  async sendAlertNotification(recipient: EmailRecipient, alert: AlertNotification): Promise<boolean> {
    const severityColors = {
      info: '#3B82F6',
      warning: '#F59E0B',
      error: '#EF4444',
      critical: '#DC2626',
    };

    const subject = `[${alert.severity.toUpperCase()}] ${alert.title}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="border-left: 4px solid ${severityColors[alert.severity]}; padding-left: 16px;">
          <h2 style="color: #333;">${alert.title}</h2>
          <p style="color: #666;">${alert.message}</p>
          <p style="color: #999; font-size: 12px;">Timestamp: ${alert.timestamp.toISOString()}</p>
          ${alert.metadata ? `<pre style="background: #f5f5f5; padding: 12px;">${JSON.stringify(alert.metadata, null, 2)}</pre>` : ''}
        </div>
      </div>
    `;

    return this.sendEmail({
      to: recipient,
      subject,
      html,
    });
  }

  async sendAdminWelcome(recipient: EmailRecipient, locationName: string, tempPassword?: string): Promise<boolean> {
    const subject = `Welcome to ClickFlash - ${locationName}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to ClickFlash!</h2>
        <p>Your ${locationName} installation is now configured and ready to use.</p>
        ${tempPassword ? `<p><strong>Temporary Password:</strong> ${tempPassword}</p>` : ''}
        <p>Access your portal at: <a href="https://master.${locationName}.com">Portal Link</a></p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #666; font-size: 12px;">
          This is an automated message from ClickFlash.<br />
          Please change your password after first login.
        </p>
      </div>
    `;

    return this.sendEmail({
      to: recipient,
      subject,
      html,
    });
  }

  private async sendEmail(params: {
    to: EmailRecipient;
    subject: string;
    html: string;
    cc?: EmailRecipient[];
  }): Promise<boolean> {
    try {
      this.logger.info('[EmailService] Sending email', {
        to: params.to.email,
        subject: params.subject,
      });

      if (this.config.useCloudflareEmail) {
        return this.sendViaCloudflare(params);
      } else {
        return this.sendViaSMTP(params);
      }
    } catch (error) {
      this.logger.error('[EmailService] Failed to send email', error as Error);
      return false;
    }
  }

  private async sendViaCloudflare(params: {
    to: EmailRecipient;
    subject: string;
    html: string;
  }): Promise<boolean> {
    // Cloudflare Email uses Mailchannels API
    const mailchannelsEndpoint = 'https://api.mailchannels.net/tx/v1/send';

    const response = await fetch(mailchannelsEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: {
          name: this.config.fromName,
          address: this.config.fromEmail,
        },
        to: [
          {
            name: params.to.name,
            address: params.to.email,
          },
        ],
        subject: params.subject,
        html: params.html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error('[EmailService] Cloudflare email failed', { error });
      return false;
    }

    return true;
  }

  private async sendViaSMTP(_params: {
    to: EmailRecipient;
    subject: string;
    html: string;
  }): Promise<boolean> {
    // Fallback SMTP implementation would go here
    this.logger.warn('[EmailService] SMTP not fully implemented, use Cloudflare Email');
    return false;
  }

  private getOrderEmailTemplate(order: OrderNotification): string {
    const itemsHtml = order.items
      .map(
        (item) => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #eee;">${item.name}</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">$${item.price.toFixed(2)}</td>
        </tr>
      `
      )
      .join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 32px;">
          <h1 style="color: #333; margin: 0 0 24px 0; font-size: 24px;">Order Confirmation</h1>
          
          <p style="color: #666; font-size: 16px; line-height: 1.5;">
            Thank you for your order, ${order.clientName}!
          </p>
          
          <p style="color: #666; font-size: 14px;">
            <strong>Order ID:</strong> ${order.orderId}<br />
            <strong>Status:</strong> ${order.status.charAt(0).toUpperCase() + order.status.slice(1)}
          </p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
            <thead>
              <tr style="background-color: #f9f9f9;">
                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Item</th>
                <th style="padding: 12px; text-align: center; border-bottom: 2px solid #ddd;">Qty</th>
                <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2" style="padding: 12px; text-align: right; font-weight: bold;">Total:</td>
                <td style="padding: 12px; text-align: right; font-weight: bold;">$${order.total.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
          
          <div style="margin-top: 32px; padding: 16px; background-color: #f5f5f5; border-radius: 8px;">
            <p style="color: #666; font-size: 12px; margin: 0;">
              Questions? Contact us at <a href="mailto:support@clickflash.photo">support@clickflash.photo</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

export default EmailNotificationService;
