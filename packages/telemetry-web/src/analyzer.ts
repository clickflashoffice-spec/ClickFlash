import { WebLogger } from './index';

export interface TelemetryEvent {
  eventName: string;
  category: string;
  properties?: Record<string, unknown>;
}

export class TelemetryAnalyzer {
  private logger: WebLogger;

  constructor(logger: WebLogger) {
    this.logger = logger;
  }

  public trackEvent(event: TelemetryEvent) {
    this.logger.info(`[EVENT] ${event.eventName}`, {
      category: event.category,
      ...event.properties,
    });
  }

  public trackUserFlow(flowId: string, step: string, properties?: Record<string, unknown>) {
    this.logger.info(`[FLOW] ${flowId}`, { step, ...properties });
  }

  public trackError(error: Error, context?: string) {
    this.logger.error(`[ERROR] ${error.name} - ${context || 'Unknown context'}`, {
      message: error.message,
      stack: error.stack,
    });
  }

  public trackTiming(category: string, name: string, durationMs: number) {
    this.logger.info(`[TIMING] ${category}:${name}`, { durationMs });
  }
}
