import Logger from "../logger.js";

export interface RelayEmailOptions {
  to: string;
  from: string;
  fromName: string;
  subject: string;
  html: string;
  text: string;
  /** Extra BCC recipients (in addition to the service-level adminBccEmail). */
  bcc?: string | string[];
}

/**
 * Email Relay Service for Cloudflare Workers
 *
 * Uses MailChannels (Cloudflare's email partner) to send emails.
 * This service acts as a secure proxy for Master Nodes.
 */
export default class EmailRelayService {
  private logger: any;
  private resendApiKey: string;
  private defaultSender: string;
  /** Always BCC'd on every outgoing email so the owner stays in the loop. */
  private adminBccEmail: string | undefined;

  constructor(logger: any, resendApiKey?: string, fromEmail?: string, adminBccEmail?: string) {
    this.logger = logger;
    this.resendApiKey = resendApiKey || "";
    this.defaultSender = fromEmail || "ClickFlash Support <support@clickflash.com>";
    this.adminBccEmail = adminBccEmail;
  }

  async sendEmail(options: RelayEmailOptions): Promise<boolean> {
    try {
      if (!this.resendApiKey) {
        this.logger.warn(
          "[EmailRelay] RESEND_API_KEY is not configured! Mocking email send to:",
          options.to,
        );
        return true;
      }

      this.logger.info(
        `[EmailRelay] Sending email via Resend to ${options.to}`,
      );

      // Build BCC list: service-level admin + any per-call bcc, deduped, never == to
      const bccSet = new Set<string>();
      if (this.adminBccEmail && this.adminBccEmail !== options.to) {
        bccSet.add(this.adminBccEmail);
      }
      if (options.bcc) {
        const extra = Array.isArray(options.bcc) ? options.bcc : [options.bcc];
        extra.forEach((b) => { if (b && b !== options.to) bccSet.add(b); });
      }
      const bcc = bccSet.size ? [...bccSet] : undefined;

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: options.from || this.defaultSender,
          to: options.to,
          ...(bcc ? { bcc } : {}),
          subject: options.subject,
          html: options.html,
          text: options.text || options.html.replace(/<[^>]*>?/gm, " ").trim(),
        }),
      });

      if (response.ok) {
        this.logger.info(
          `[EmailRelay] Email sent successfully to ${options.to}`,
        );
        return true;
      } else {
        const errorText = await response.text();
        this.logger.error(
          `[EmailRelay] Failed to send email via Resend: ${response.status}`,
          { error: errorText },
        );
        return false;
      }
    } catch (error: any) {
      this.logger.error(`[EmailRelay] Exception during email send`, {
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Send a branded gallery access notification and PIN to the customer.
   */
  async sendGalleryAccessEmail(
    customerEmail: string,
    accessPin: string,
    galleryUrl: string,
    clientName: string = "Customer",
  ): Promise<boolean> {
    const subject = "Your ClickFlash Digital Gallery is Ready!";
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your ClickFlash Digital Gallery is Ready!</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 0;">
        <tr>
          <td align="center">
            <table width="100%" max-width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); max-width: 600px; margin: 0 auto;">
              <!-- Header -->
              <tr>
                <td style="background-color: #0f172a; padding: 32px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">ClickFlash</h1>
                </td>
              </tr>
              <!-- Body -->
              <tr>
                <td style="padding: 40px 32px;">
                  <h2 style="color: #0f172a; margin-top: 0; margin-bottom: 16px; font-size: 20px;">Hello ${clientName},</h2>
                  <p style="color: #475569; font-size: 16px; line-height: 1.5; margin-top: 0; margin-bottom: 24px;">Your high-resolution photos are ready to be viewed and downloaded!</p>
                  
                  <div style="background-color: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 32px;">
                    <p style="color: #64748b; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; margin-top: 0; margin-bottom: 8px; font-weight: 600;">Your Secure Access PIN</p>
                    <h1 style="color: #0f172a; font-size: 42px; letter-spacing: 8px; margin: 0; font-weight: 800;">${accessPin}</h1>
                  </div>

                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center">
                        <a href="${galleryUrl}" style="display: inline-block; background-color: #06b6d4; color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">View Digital Gallery</a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="background-color: #f8fafc; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
                  <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin: 0;">
                    Thank you for choosing ClickFlash.<br/>
                    If you need assistance, simply reply to this email.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    `;

    return this.sendEmail({
      to: customerEmail,
      from: this.defaultSender,
      fromName: "ClickFlash Support",
      subject: subject,
      html: html,
      text: `Your PIN is ${accessPin}. Access gallery at: ${galleryUrl}`,
    });
  }

  /**
   * Send a branded purchase receipt.
   */
  async sendPurchaseReceipt(
    customerEmail: string,
    orderId: string,
    amount: number,
    itemsCount: number,
  ): Promise<boolean> {
    const subject = `ClickFlash Receipt - Order #${orderId.substring(0, 8)}`;
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>ClickFlash Purchase Receipt</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 0;">
        <tr>
          <td align="center">
            <table width="100%" max-width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); max-width: 600px; margin: 0 auto;">
              <!-- Header -->
              <tr>
                <td style="background-color: #0f172a; padding: 32px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">ClickFlash Receipt</h1>
                </td>
              </tr>
              <!-- Body -->
              <tr>
                <td style="padding: 40px 32px;">
                  <h2 style="color: #0f172a; margin-top: 0; margin-bottom: 24px; font-size: 20px;">Thank you for your purchase!</h2>
                  
                  <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-bottom: 12px; color: #64748b; font-size: 14px;">Order Number</td>
                        <td align="right" style="padding-bottom: 12px; color: #0f172a; font-size: 14px; font-weight: 600;">#${orderId.substring(0, 8)}</td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 12px; color: #64748b; font-size: 14px;">Items</td>
                        <td align="right" style="padding-bottom: 12px; color: #0f172a; font-size: 14px; font-weight: 600;">${itemsCount} digital photo(s)</td>
                      </tr>
                      <tr>
                        <td style="padding-top: 12px; border-top: 1px solid #e2e8f0; color: #0f172a; font-size: 16px; font-weight: 700;">Total Paid</td>
                        <td align="right" style="padding-top: 12px; border-top: 1px solid #e2e8f0; color: #06b6d4; font-size: 18px; font-weight: 800;">€${amount.toFixed(2)}</td>
                      </tr>
                    </table>
                  </div>

                  <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0;">
                    Your high-resolution photos are now unlocked. You can download them immediately from your secure digital gallery.
                  </p>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="background-color: #f8fafc; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
                  <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin: 0;">
                    ClickFlash Photography &copy; ${new Date().getFullYear()}<br/>
                    Keep this receipt for your records.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    `;

    return this.sendEmail({
      to: customerEmail,
      from: this.defaultSender,
      fromName: "ClickFlash Support",
      subject: subject,
      html: html,
      text: `Receipt for Order ${orderId}: ${itemsCount} items. Total: $${amount.toFixed(2)}`,
    });
  }

  /**
   * Send a branded booking confirmation.
   */
  async sendBookingConfirmationEmail(booking: any): Promise<boolean> {
    const subject = "Booking Confirmed: Your Photo Session with ClickFlash";
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #0f172a;">
        <div style="background: #0f172a; padding: 20px; text-align: center; color: white;">
          <h1>ClickFlash</h1>
        </div>
        <div style="padding: 30px; border: 1px solid #e2e8f0; border-top: none;">
          <h2>Your session is booked!</h2>
          <p>Hi ${booking.clientName},</p>
          <p>We've confirmed your photo session at <strong>${booking.location || "the resort"}</strong>.</p>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Date:</strong> ${booking.bookingDate}</p>
            <p style="margin: 5px 0;"><strong>Time:</strong> ${booking.bookingTime || "Scheduled"}</p>
            <p style="margin: 5px 0;"><strong>Type:</strong> ${booking.service_type || "Photography"}</p>
          </div>

          <p>Our photographer will meet you at the designated location. Please arrive 5 minutes early.</p>
          <p>Need to reschedule? Reply to this email or visit our desk.</p>
        </div>
      </div>
    `;

    return this.sendEmail({
      to: booking.clientEmail,
      from: this.defaultSender,
      fromName: "ClickFlash Booking",
      subject: subject,
      html: html,
      text: `Your booking for ${booking.bookingDate} is confirmed. Location: ${booking.location}`,
    });
  }
}
