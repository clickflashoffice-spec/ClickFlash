import { DatabaseManager } from '../database/db';
import { Logger } from '../utils/logger';

export class OperationsAgent {
  private dbManager: DatabaseManager;
  private logger: Logger;

  constructor(dbManager: DatabaseManager, logger: Logger) {
    this.dbManager = dbManager;
    this.logger = logger;
  }

  /**
   * Monitor the database for pending payments or finalized albums 
   * and flag them for follow-ups (CRM integration).
   * This agent runs continuously or on a cron to automate the business busywork.
   */
  public async monitorAndFlagFollowUps(): Promise<void> {
      this.logger.info(`[OperationsAgent] Running routine CRM check...`);

      try {
        // 1. Check for unpaid orders older than 24 hours
        // Assumes orders table has: id, customerEmail, albumId, status, created_at
        const unpaidOrders = this.dbManager.all<{ id: string, customerEmail: string, albumId: string, created_at: string }>(
            `SELECT id, customerEmail, albumId, created_at FROM orders WHERE status = 'pending_payment'`
        );

        const now = new Date().getTime();
        const DAY_IN_MS = 24 * 60 * 60 * 1000;

        for (const order of unpaidOrders) {
            if (!order.customerEmail) continue;

            const orderTime = new Date(order.created_at).getTime();
            if (now - orderTime > DAY_IN_MS) {
                this.logger.info(`[OperationsAgent] Flagging unpaid order ${order.id} for email follow-up to ${order.customerEmail}`);
                
                // Flagging logic: insert into an email_queue for the emailService to process
                this.dbManager.run(
                    `INSERT OR IGNORE INTO email_queue (targetEmail, templateType, referenceId, status) VALUES (?, ?, ?, ?)`,
                    [order.customerEmail, 'payment_reminder', order.id, 'pending']
                );
            }
        }

        // 2. Check for finalized albums that might need gallery delivery reminders
        // Assumes albums table has status='finalized'
        const unviewedAlbums = this.dbManager.all<{ id: string, customerEmail: string }>(
            `SELECT id, customerEmail FROM albums WHERE status = 'finalized' AND customerEmail IS NOT NULL AND customerEmail != ''`
        );

        for (const album of unviewedAlbums) {
            // Check if we already queued a reminder for this album
            const existingReminder = this.dbManager.get(
                `SELECT id FROM email_queue WHERE targetEmail = ? AND templateType = 'gallery_reminder' AND referenceId = ?`,
                [album.customerEmail, album.id]
            );

            if (!existingReminder) {
                this.logger.info(`[OperationsAgent] Flagging finalized album ${album.id} for gallery reminder to ${album.customerEmail}`);
                this.dbManager.run(
                    `INSERT OR IGNORE INTO email_queue (targetEmail, templateType, referenceId, status) VALUES (?, ?, ?, ?)`,
                    [album.customerEmail, 'gallery_reminder', album.id, 'pending']
                );
            }
        }
        
        this.logger.info(`[OperationsAgent] Routine CRM check completed successfully.`);
      } catch (err) {
        this.logger.error(`[OperationsAgent] Error running routine CRM check`, { error: err instanceof Error ? err.message : String(err) });
      }
  }
}
