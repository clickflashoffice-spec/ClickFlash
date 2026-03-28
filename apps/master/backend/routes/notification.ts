import { Router, Request, Response } from 'express';
import nodemailer from 'nodemailer';
import { Logger } from '../shared/logger';

// Extend context type if needed or just accept any
export default function notificationRoutes(context: any) {
    const router = Router();
    const logger: Logger = context.logger;

    // Initialize Transporter
    let transporter: nodemailer.Transporter | null = null;
    try {
        transporter = nodemailer.createTransport({
            service: 'gmail', // Placeholder: Update with real SMTP config or env vars
            auth: {
                user: process.env.SMTP_USER || 'notifications@star-master.com',
                pass: process.env.SMTP_PASS || 'your-app-password'
            }
        });
        logger.info('[Email] Service initialized');
    } catch (e: any) {
        logger.warn(`[Email] Failed to initialize: ${e.message}`);
    }

    router.post('/notify/customer', async (req: Request, res: Response): Promise<void> => {
        try {
            const { email, customerName, albumName, accessCode, url } = req.body;

            if (!email) {
                res.status(400).json({ success: false, message: 'Missing recipient email' });
                return;
            }

            if (!transporter) {
                res.status(503).json({ success: false, message: 'Email service not configured' });
                return;
            }

            // Send mail
            const info = await transporter.sendMail({
                from: '"Star Master Photography" <notifications@star-master.com>',
                to: email,
                subject: `Your Photos are Ready! - ${albumName}`,
                text: `Hello ${customerName || 'Customer'},\n\nYour photos from ${albumName} are now ready to view!\n\nYou can access your gallery here:\n${url}\n\nAccess Code: ${accessCode}\n\nThank you,\nStar Master Photography`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h1 style="color: #d4af37;">Your Gallery is Ready</h1>
                        <p>Hello <strong>${customerName || 'Customer'}</strong>,</p>
                        <p>We are excited to share your photos from <strong>${albumName}</strong>!</p>
                        <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                            <p style="margin-bottom: 10px;">Click the button below to view your photos:</p>
                            <a href="${url}" style="background-color: #000; color: #d4af37; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">View Gallery</a>
                            <p style="margin-top: 20px; font-size: 14px; color: #666;">Access Code: <strong>${accessCode}</strong></p>
                        </div>
                        <p>Thank you for choosing Star Master Photography.</p>
                    </div>
                `,
            });

            logger.info('Email sent', { messageId: info.messageId, recipient: email });
            res.json({ success: true, message: 'Notification sent successfully', messageId: info.messageId });

        } catch (error: any) {
            logger.error('Email sending failed', { error: error.message });
            res.status(500).json({ success: false, message: 'Failed to send email', error: error.message });
        }
    });

    return router;
}
