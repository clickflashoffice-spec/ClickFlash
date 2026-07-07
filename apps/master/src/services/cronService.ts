import { logger } from "../utils/logger";

export class CronService {
    private intervalId?: NodeJS.Timeout;

    /**
     * Start the automated busywork cron runner
     * In a real app this would use node-cron or Agenda, 
     * but we use a simple interval for parity.
     */
    start() {
        logger.info('Starting Automated Busywork Cron Service');
        
        // Run checks every hour (simulating the 2:00 AM nightly cron)
        const ONE_HOUR = 60 * 60 * 1000;
        
        this.intervalId = setInterval(async () => {
            await this.chasePayments();
            await this.sendGalleryReminders();
        }, ONE_HOUR);
        
        // Execute once on startup for immediate processing
        this.chasePayments();
        this.sendGalleryReminders();
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            logger.info('Stopped Cron Service');
        }
    }

    private async chasePayments() {
        logger.info('Cron: Scanning for unpaid orders > 48h to chase payments...');
        // Logic to scan DB for pending orders and email clients
        // e.g., const overdue = await db.orders.find({ status: 'PENDING', date: { $lt: 48h_ago }})
        // await emailService.sendPaymentReminder(overdue);
    }

    private async sendGalleryReminders() {
        logger.info('Cron: Scanning for unviewed galleries to send reminders...');
        // Logic to scan DB for unviewed galleries and email clients
        // e.g., const unviewed = await db.galleries.find({ views: 0, date: { $lt: 48h_ago }})
        // await emailService.sendGalleryReminder(unviewed);
    }
}

export default new CronService();
