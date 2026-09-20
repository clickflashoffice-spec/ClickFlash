
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
    private isFlushing = false;

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
            // We call flush(), but don't await it to keep add() sync.
            // If already flushing, it will return early and the existing loop will pick up the items.
            this.flush().catch(err => this.logger.error(`[WriteBuffer] Unhandled flush error`, err));
        } else {
            this.startTimer();
        }
    }

    /**
     * Force flush the current buffer.
     */
    public async flush(): Promise<void> {
        this.stopTimer();

        if (this.buffer.length === 0 || this.isFlushing) return;

        this.isFlushing = true;

        try {
            while (this.buffer.length > 0) {
                // Take up to batchSize items to avoid excessively large single queries
                const itemsToFlush = this.buffer.splice(0, this.batchSize);

                try {
                    await this.onFlush(itemsToFlush);
                } catch (error: any) {
                    this.logger.error(`[WriteBuffer:${this.name}] Flush failed`, error);
                }
            }
        } finally {
            this.isFlushing = false;
        }
    }

    private startTimer(): void {
        if (!this.flushTimer && !this.isFlushing) {
            this.flushTimer = setTimeout(() => this.flush().catch(console.error), this.flushIntervalMs);
        }
    }

    private stopTimer(): void {
        if (this.flushTimer) {
            clearTimeout(this.flushTimer);
            this.flushTimer = null;
        }
    }
}
