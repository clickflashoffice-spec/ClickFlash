import { Logger } from "../shared/logger";
import { EmailService } from "./emailService";

export interface BookingInviteOptions {
  email: string;
  albumTitle: string;
  bookingUrl: string;
}

export class BookingService {
  private logger: Logger;
  private emailService: EmailService;

  constructor(logger: Logger, emailService: EmailService) {
    this.logger = logger;
    this.emailService = emailService;
  }

  /**
   * Send an automated invitation to book a Kiosk Viewing & Purchase Session.
   * Routed through the Cloudflare Hub Worker → Resend.
   */
  public async sendBookingInvite(options: BookingInviteOptions): Promise<boolean> {
    if (!options.email) {
      this.logger.warn("[BookingService] No email provided, skipping invite");
      return false;
    }

    const html = `
      <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; color: #f8fafc; background-color: #0f172a; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5);">

        <div style="text-align: center; padding: 40px 20px; border-bottom: 1px solid #1e293b; background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);">
          <h1 style="margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.025em;">
            <span style="color: #f8fafc;">Click</span><span style="color: #06b6d4;">Flash</span>
          </h1>
        </div>

        <div style="padding: 40px 30px; line-height: 1.7; background-color: #0f172a;">
          <h2 style="color: #f8fafc; font-size: 22px; font-weight: 700; margin-top: 0; margin-bottom: 20px;">Your Memories Are Ready</h2>

          <p style="color: #cbd5e1; font-size: 16px;">Hello,</p>

          <p style="color: #cbd5e1; font-size: 16px;">The moment you've been waiting for is here. Your exclusive photos from <strong>${options.albumTitle}</strong> have been beautifully processed and are now ready for your private viewing.</p>

          <p style="color: #cbd5e1; font-size: 16px;">To ensure you get the best experience and dedicated assistance, please schedule a time to visit our premium viewing kiosk.</p>

          <div style="text-align: center; margin: 45px 0;">
            <a href="${options.bookingUrl}"
               style="background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%); color: #ffffff; padding: 16px 36px; text-decoration: none; border-radius: 999px; font-weight: 700; font-size: 16px; letter-spacing: 0.05em; text-transform: uppercase; display: inline-block; box-shadow: 0 10px 15px -3px rgba(6, 182, 212, 0.4);">
               Secure Your Session
            </a>
          </div>

          <p style="font-size: 13px; color: #64748b; text-align: center; margin-bottom: 40px;">If the button doesn't work, copy and paste this link:<br/> <a href="${options.bookingUrl}" style="color: #06b6d4;">${options.bookingUrl}</a></p>

          <hr style="border: 0; height: 1px; background-color: #1e293b; margin: 30px 0;" />

          <p style="color: #94a3b8; font-size: 15px; margin-bottom: 0;">We look forward to reliving these moments with you.</p>
          <p style="color: #f8fafc; font-size: 16px; font-weight: 600; margin-top: 5px;">The ClickFlash Team</p>
        </div>

        <div style="background-color: #020617; padding: 24px; text-align: center; font-size: 12px; color: #475569; letter-spacing: 0.05em;">
          &copy; ${new Date().getFullYear()} CLICKFLASH PHOTOGRAPHY. POWERED BY PIXELHOLIDAY.
        </div>
      </div>
    `;

    const text = `Hello,\n\nYour photos from "${options.albumTitle}" are ready!\n\nSchedule your kiosk viewing session here:\n${options.bookingUrl}\n\nThe ClickFlash Team`;

    const ok = await this.emailService.sendTransactional({
      to: options.email,
      subject: `Your Photos are Ready! Schedule your Kiosk Viewing Session — ${options.albumTitle}`,
      html,
      text,
    });

    if (ok) {
      this.logger.info(`[BookingService] Booking invitation sent to ${options.email}`);
    } else {
      this.logger.error(`[BookingService] Failed to send booking invitation to ${options.email}`);
    }
    return ok;
  }
}
