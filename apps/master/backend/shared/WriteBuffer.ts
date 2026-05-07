/**
 * Generic WriteBuffer for batching high-frequency DB updates.
 * Reduces SQLite locking contention by grouping writes into transactions.
 */
export class WriteBuffer<T> {
    private buffer: T[] = [];
    private readonly batchSize: number;
    private readonly flushIntervalMs: number;
    private flushTimer: NodeJS.Timeout | null = null;
    private readonly onFlush: (items: T[]) => Promise<void>;
    private readonly logger: any;
    private readonly name: string;

    constructor(
        name: string,
        batchSize: number,
        flushIntervalMs: number,
        onFlush: (items: T[]) => Promise<void>,
        logger: any
    ) {
        this.name = name;
        this.batchSize = batchSize;
        this.flushIntervalMs = flushIntervalMs;
        this.onFlush = onFlush;
        this.logger = logger;
    }

    /**
     * Add an item to the buffer.
     * Triggers flush if batch size is reached.
     */
    public add(item: T): void {
        this.buffer.push(item);

        if (this.buffer.length >= this.batchSize) {
            this.flush();
        } else {
            this.startTimer();
        }
    }

    /**
     * Force flush the current buffer.
     */
    public async flush(): Promise<void> {
        this.stopTimer();

        if (this.buffer.length === 0) return;

        const itemsToFlush = [...this.buffer];
        this.buffer = [];

        try {
            await this.onFlush(itemsToFlush);
            // this.logger.debug(`[WriteBuffer:${this.name}] Flushed ${itemsToFlush.length} items`);
        } catch (error: any) {
            this.logger.error(`[WriteBuffer:${this.name}] Flush failed`, error);
            // Optional: Strategy to retry or drop? For heartbeats, dropping is usually safer than indefinite retry loop.
        }
    }

    private startTimer(): void {
        if (!this.flushTimer) {
            this.flushTimer = setTimeout(() => this.flush(), this.flushIntervalMs);
        }
    }

    private stopTimer(): void {
        if (this.flushTimer) {
            clearTimeout(this.flushTimer);
            this.flushTimer = null;
        }
    }
}
