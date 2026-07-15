// apps/management/src/services/EmailService.ts

export class EmailService {
  private apiUrl: string;

  constructor() {
    this.apiUrl = import.meta.env.VITE_CLOUD_API_URL || 'http://127.0.0.1:8787';
  }

  async sendReceipt(to: string | string[], orderId: string, amount: number, fromOverride?: string) {
    const html = `
      <div style="font-family: sans-serif; padding: 20px;">
        <h2>Thank you for your order!</h2>
        <p>Your receipt for order <strong>#${orderId}</strong> is below.</p>
        <p>Total amount: <strong>$${(amount / 100).toFixed(2)}</strong></p>
        <br/>
        <p>The ClickFlash Team</p>
      </div>
    `;

    return this.sendEmail(to, `Your ClickFlash Receipt #${orderId}`, html, fromOverride);
  }

  async sendCampaign(to: string[], subject: string, html: string, fromOverride?: string) {
    return this.sendEmail(to, subject, html, fromOverride);
  }

  private async sendEmail(to: string | string[], subject: string, html: string, fromOverride?: string) {
    try {
      const response = await fetch(`${this.apiUrl}/api/email/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to,
          subject,
          html,
          fromOverride
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send email');
      }

      return data;
    } catch (error: any) {
      console.error('EmailService Error:', error);
      throw error;
    }
  }
}

export const emailService = new EmailService();
