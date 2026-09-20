import { RedisCacheService } from './redisCacheService';
import { logger } from '../utils/logger';

/**
 * Redis Streams Consumer Worker
 * 
 * Reads events from Redis Streams using XREADGROUP (consumer groups)
 * and processes them into the local SQLite database.
 * 
 * This is the "consumer" half of the event-driven ingestion pipeline.
 * Producers (PhotoRepo, albumService, mobileCapture) publish events
 * via redisCache.publishEvent(). This worker reads and processes them.
 * 
 * Features:
 * - Consumer group support for multi-instance deployments
 * - Automatic stream & group creation (MKSTREAM)
 * - Acknowledgement after successful processing (XACK)
 * - Dead-letter queue for failed events after max retries
 * - Graceful shutdown support
 */

interface StreamConsumerConfig {
  /** Redis stream name to consume from */
  stream: string;
  /** Consumer group name */
  group: string;
  /** Unique consumer name (typically hostname or instance ID) */
  consumer: string;
  /** Handler function for each event */
  handler: (eventId: string, fields: Record<string, string>) => Promise<void>;
  /** Max retries before sending to dead-letter queue */
  maxRetries?: number;
  /** Block timeout in milliseconds for XREADGROUP */
  blockMs?: number;
  /** Batch size per read */
  count?: number;
}

export class RedisStreamConsumer {
  private configs: StreamConsumerConfig[] = [];
  private running = false;
  private abortController: AbortController | null = null;

  constructor(
    private readonly redis: RedisCacheService,
  ) {}

  /**
   * Register a stream to consume from.
   */
  public register(config: StreamConsumerConfig): void {
    this.configs.push({
      maxRetries: 3,
      blockMs: 5000,
      count: 10,
      ...config,
    });
  }

  /**
   * Start consuming all registered streams in a loop.
   */
  public async start(): Promise<void> {
    if (this.running) {
      logger.warn('[StreamConsumer] Already running, ignoring start().');
      return;
    }

    this.running = true;
    this.abortController = new AbortController();

    // Ensure consumer groups exist
    for (const config of this.configs) {
      await this.ensureConsumerGroup(config);
    }

    logger.info(`[StreamConsumer] Started. Consuming ${this.configs.length} stream(s): ${this.configs.map(c => c.stream).join(', ')}`);

    let lastClaimTime = 0;
    // Main loop
    while (this.running) {
      const now = Date.now();
      const shouldClaim = now - lastClaimTime > 60000;
      if (shouldClaim) lastClaimTime = now;

      for (const config of this.configs) {
        try {
          if (shouldClaim) await this.claimPendingMessages(config);
          await this.consumeBatch(config);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          logger.error(`[StreamConsumer] Error consuming ${config.stream}: ${msg}`);
        }
      }

      // Small sleep to prevent tight-looping on empty streams
      await this.sleep(100);
    }

    logger.info('[StreamConsumer] Stopped gracefully.');
  }

  /**
   * Stop the consumer loop.
   */
  public stop(): void {
    this.running = false;
    this.abortController?.abort();
    logger.info('[StreamConsumer] Stop requested.');
  }

  /**
   * Create the consumer group if it doesn't exist.
   */
  private async ensureConsumerGroup(config: StreamConsumerConfig): Promise<void> {
    const ping = await this.redis.ping();
    if (ping.mode !== 'redis') {
      logger.warn(`[StreamConsumer] Redis not connected. Stream ${config.stream} will operate in no-op mode.`);
      return;
    }

    try {
      // XGROUP CREATE stream group $ MKSTREAM
      // The '$' means only read new messages (not old ones)
      const client = (this.redis as any).client;
      if (client) {
        await client.xgroup('CREATE', config.stream, config.group, '$', 'MKSTREAM').catch((err: any) => {
          // BUSYGROUP = group already exists, which is fine
          if (!err.message?.includes('BUSYGROUP')) {
            throw err;
          }
        });
        logger.info(`[StreamConsumer] Consumer group '${config.group}' ready on stream '${config.stream}'.`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`[StreamConsumer] Failed to create consumer group: ${msg}`);
    }
  }

  /**
   * Read and process a batch of messages from a stream.
   */
  private async consumeBatch(config: StreamConsumerConfig): Promise<void> {
    const ping = await this.redis.ping();
    if (ping.mode !== 'redis') return;

    const client = (this.redis as any).client;
    if (!client) return;

    try {
      // XREADGROUP GROUP group consumer COUNT count BLOCK blockMs STREAMS stream >
      const results = await client.xreadgroup(
        'GROUP', config.group, config.consumer,
        'COUNT', config.count,
        'BLOCK', config.blockMs,
        'STREAMS', config.stream, '>'
      );

      if (!results) return; // No new messages

      for (const [, messages] of results) {
        for (const [messageId, fieldsArray] of messages) {
          // Convert flat array [k1, v1, k2, v2, ...] to Record
          const fields: Record<string, string> = {};
          for (let i = 0; i < fieldsArray.length; i += 2) {
            fields[fieldsArray[i]] = fieldsArray[i + 1];
          }

          try {
            await config.handler(messageId, fields);
            // Acknowledge successful processing
            await client.xack(config.stream, config.group, messageId);
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            logger.error(`[StreamConsumer] Handler failed for ${config.stream}/${messageId}: ${msg}`);

            // Check retry count via XPENDING and move to DLQ if exceeded
            await this.handleFailedMessage(client, config, messageId, fields, msg);
          }
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes('NOGROUP')) {
        logger.error(`[StreamConsumer] XREADGROUP failed on ${config.stream}: ${msg}`);
      }
    }
  }

  /**
   * Handle a failed message — retry or send to dead-letter queue.
   */
  private async handleFailedMessage(
    client: any,
    config: StreamConsumerConfig,
    messageId: string,
    fields: Record<string, string>,
    errorMsg: string,
  ): Promise<void> {
    try {
      // Check how many times this message has been delivered
      const pending = await client.xpending(config.stream, config.group, messageId, messageId, 1);
      const deliveryCount = pending?.[0]?.[3] || 0;

      if (deliveryCount >= (config.maxRetries || 3)) {
        // Move to dead-letter queue
        const dlqStream = `${config.stream}:dlq`;
        await client.xadd(dlqStream, 'MAXLEN', '~', 1000, '*',
          ...Object.entries({ ...fields, _error: errorMsg, _original_id: messageId, _original_stream: config.stream }).flat()
        );
        // Acknowledge to remove from pending
        await client.xack(config.stream, config.group, messageId);
        logger.warn(`[StreamConsumer] Message ${messageId} moved to DLQ after ${deliveryCount} retries.`);
      }
    } catch (dlqErr: unknown) {
      const msg = dlqErr instanceof Error ? dlqErr.message : String(dlqErr);
      logger.error(`[StreamConsumer] DLQ handling failed: ${msg}`);
    }
  }

  /**
   * Periodically claim and process messages stuck in the Pending Entries List (PEL)
   */
  private async claimPendingMessages(config: StreamConsumerConfig): Promise<void> {
    const ping = await this.redis.ping();
    if (ping.mode !== 'redis') return;
    const client = (this.redis as any).client;
    if (!client) return;

    try {
      let startId = '0-0';
      while (true) {
        // XAUTOCLAIM stream group consumer min-idle-time start COUNT count
        // 60000ms = 1 minute idle time before a message can be claimed
        const result = await client.xautoclaim(
          config.stream, config.group, config.consumer,
          60000, startId, 'COUNT', 100
        );
        if (!result) break;

        const [nextId, messages] = result;
        if (messages && messages.length > 0) {
          logger.info(`[StreamConsumer] Auto-claimed ${messages.length} abandoned messages from PEL on ${config.stream}`);
        }

        for (const [messageId, fieldsArray] of messages) {
          const fields: Record<string, string> = {};
          for (let i = 0; i < fieldsArray.length; i += 2) {
            fields[fieldsArray[i]] = fieldsArray[i + 1];
          }

          try {
            await config.handler(messageId, fields);
            await client.xack(config.stream, config.group, messageId);
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            logger.error(`[StreamConsumer] Handler failed for claimed message ${config.stream}/${messageId}: ${msg}`);
            await this.handleFailedMessage(client, config, messageId, fields, msg);
          }
        }

        if (nextId === '0-0') break;
        startId = nextId;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes('NOGROUP')) {
        logger.error(`[StreamConsumer] XAUTOCLAIM failed on ${config.stream}: ${msg}`);
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
