import { AnalyticsEvent, AnalyticsEventSchema } from "./schema";

export interface AnalyticsTransport {
  queueEvent(event: AnalyticsEvent): Promise<void>;
  sync(): Promise<void>;
}

export class AnalyticsClient {
  private transport: AnalyticsTransport;

  constructor(transport: AnalyticsTransport) {
    this.transport = transport;
  }

  public track(event: AnalyticsEvent) {
    try {
      const validated = AnalyticsEventSchema.parse(event);
      // In production, we don't await queueEvent to avoid blocking the main thread
      this.transport.queueEvent(validated).catch(err => {
        console.error("[Analytics] Failed to queue event", err);
      });
    } catch (err) {
      console.error("[Analytics] Validation failed", err);
    }
  }

  public async forceSync() {
    await this.transport.sync();
  }
}
