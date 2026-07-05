import { Logger } from '../utils/logger';

/**
 * Enterprise Time Service
 * Handles NTP drift correction by comparing local system clock with 
 * authoritative Hub responses.
 */
export class TimeService {
  private static instance: TimeService;
  private driftOffset: number = 0; // ms: HubTime - LocalTime
  private logger: Logger;

  private constructor() {
    this.logger = new Logger(process.env.DATA_DIR || './pb_data');
  }

  public static getInstance(): TimeService {
    if (!TimeService.instance) {
      TimeService.instance = new TimeService();
    }
    return TimeService.instance;
  }

  /**
   * Updates the global drift offset based on a trusted server timestamp.
   * @param serverDateString The 'Date' header from a Hub response.
   */
  public updateDrift(serverDateString: string | null): void {
    if (!serverDateString) return;

    try {
      const serverTime = new Date(serverDateString).getTime();
      const localTime = Date.now();
      const skew = serverTime - localTime;

      // Only update if drift is significant (> 1s) to avoid jitter
      if (Math.abs(skew) > 1000) {
        this.driftOffset = skew;
        
        if (Math.abs(skew) > 300000) { // 5 minutes
          this.logger.error(`[TimeService] CRITICAL CLOCK SKEW DETECTED: ${Math.round(skew / 1000)}s. Correction applied.`);
        } else {
          this.logger.info(`[TimeService] Clock drift corrected: ${skew}ms`);
        }
      }
    } catch (e) {
      this.logger.warn(`[TimeService] Failed to parse server date: ${serverDateString}`);
    }
  }

  /**
   * Returns the drift-corrected ISO timestamp.
   */
  public nowISO(): string {
    return new Date(Date.now() + this.driftOffset).toISOString();
  }

  /**
   * Returns the current timestamp in milliseconds, corrected for drift.
   */
  public now(): number {
    return Date.now() + this.driftOffset;
  }

  public getSkew(): number {
    return this.driftOffset;
  }
}

export const timeService = TimeService.getInstance();
