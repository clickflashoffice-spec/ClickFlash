import { Router, Request, Response } from 'express';
import { Logger } from '../utils/logger';
import { EmailService } from '../services/emailService';
import { strictRateLimiter } from '../middleware/rateLimiter';
import { customRoutesSchemas } from '../utils/validation';

export default function notificationRoutes(context: { logger: Logger; emailService: EmailService }) {
    const router = Router();
    const { logger, emailService } = context;

    /**
     * POST /notify/customer
     * Sends a gallery-ready notification to a customer.
     * Routed through the Cloudflare Hub Worker → Resend.
     */
    router.post('/notify/customer', strictRateLimiter, async (req: Request, res: Response): Promise<void> => {
        try {
            const parsed = customRoutesSchemas.notificationCustomer.safeParse(req.body);

            if (!parsed.success) {
                res.status(400).json({ success: false, message: 'Missing recipient email or invalid data' });
                return;
            }
            const { email, customerName, albumName, accessCode, url } = parsed.data;

            const html = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #d4af37;">Your Gallery is Ready</h1>
                    <p>Hello <strong>${customerName || 'Customer'}</strong>,</p>
                    <p>We are excited to share your photos from <strong>${albumName}</strong>!</p>
                    <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                        <p style="margin-bottom: 10px;">Click the button below to view your photos:</p>
                        <a href="${url}" style="background-color: #000; color: #d4af37; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">View Gallery</a>
                        <p style="margin-top: 20px; font-size: 14px; color: #666;">Access Code: <strong>${accessCode}</strong></p>
                    </div>
                    <p>Thank you for choosing ClickFlash Photography.</p>
                </div>
            `;

            const text = `Hello ${customerName || 'Customer'},\n\nYour photos from ${albumName} are now ready to view!\n\nView your gallery here:\n${url}\n\nAccess Code: ${accessCode}\n\nThank you,\nClickFlash Photography`;

            const ok = await emailService.sendTransactional({
                to: email,
                subject: `Your Photos are Ready! — ${albumName}`,
                html,
                text,
            });

            if (ok) {
                logger.info('[Notification] Gallery-ready email sent', { recipient: email });
                res.json({ success: true, message: 'Notification sent successfully' });
            } else {
                res.status(500).json({ success: false, message: 'Failed to send notification' });
            }
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : String(error);
            logger.error('[Notification] Email sending failed', { error: msg });
            res.status(500).json({ success: false, message: 'Failed to send email', error: msg });
        }
    });

    return router;
}
