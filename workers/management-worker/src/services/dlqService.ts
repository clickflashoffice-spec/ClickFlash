import DatabaseManager from "../db.js";

export interface DLQEvent {
    id: string;
    queue_name: string;
    payload: string;
    retry_count: number;
    max_retries: number;
    error_reason: string | null;
    next_retry_at: string;
    status: 'pending' | 'processed' | 'failed_permanently';
    created_at: string;
}

export class DLQService {
    constructor(private db: DatabaseManager) {}

    /**
     * Enqueue a failed operation to the DLQ.
     */
    async enqueue(queueName: string, payload: any, errorReason: string, maxRetries: number = 5): Promise<void> {
        const id = crypto.randomUUID();
        const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
        const nextRetryAt = new Date(Date.now() + 60 * 1000).toISOString(); // 1 minute backoff for first retry

        await this.db.run(
            `INSERT INTO dlq_events (id, queue_name, payload, max_retries, error_reason, next_retry_at, status)
             VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
            [id, queueName, payloadStr, maxRetries, errorReason, nextRetryAt]
        );
    }

    /**
     * Process pending DLQ events whose next_retry_at <= now
     */
    async processDLQ(processorFn: (queueName: string, payload: any) => Promise<void>): Promise<{ processed: number, failed: number }> {
        const now = new Date().toISOString();
        const pendingEvents = await this.db.query(
            `SELECT * FROM dlq_events 
             WHERE status = 'pending' AND next_retry_at <= ? 
             ORDER BY next_retry_at ASC LIMIT 50`,
            [now]
        ) as DLQEvent[];

        if (!pendingEvents || pendingEvents.length === 0) {
            return { processed: 0, failed: 0 };
        }

        let processedCount = 0;
        let failedCount = 0;

        for (const event of pendingEvents) {
            try {
                let payloadObj = event.payload;
                try {
                    payloadObj = JSON.parse(event.payload);
                } catch (e) {
                    // keep as string if not valid JSON
                }

                await processorFn(event.queue_name, payloadObj);

                // If successful, mark as processed
                await this.db.run(
                    `UPDATE dlq_events SET status = 'processed', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                    [event.id]
                );
                processedCount++;
            } catch (err: any) {
                const newRetryCount = event.retry_count + 1;
                if (newRetryCount >= event.max_retries) {
                    // Mark as permanently failed
                    await this.db.run(
                        `UPDATE dlq_events 
                         SET status = 'failed_permanently', error_reason = ?, retry_count = ?, updated_at = CURRENT_TIMESTAMP 
                         WHERE id = ?`,
                        [err.message || 'Unknown error', newRetryCount, event.id]
                    );
                } else {
                    // Exponential backoff: base 1 minute * 2^retry_count
                    const backoffMs = (60 * 1000) * Math.pow(2, newRetryCount);
                    const nextRetryAt = new Date(Date.now() + backoffMs).toISOString();
                    await this.db.run(
                        `UPDATE dlq_events 
                         SET error_reason = ?, retry_count = ?, next_retry_at = ?, updated_at = CURRENT_TIMESTAMP 
                         WHERE id = ?`,
                        [err.message || 'Unknown error', newRetryCount, nextRetryAt, event.id]
                    );
                }
                failedCount++;
            }
        }

        return { processed: processedCount, failed: failedCount };
    }
}
