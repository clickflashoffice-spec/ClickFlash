import axios from "axios";
import FormData from "form-data";
import { logger } from "../utils/logger";
import { PhotoInsuranceResult, SentinelTelemetry } from "@clickflash/ai-core";

class AIInsuranceService {
  private workerUrl: string = process.env.AI_WORKER_URL || "http://localhost:8000";
  private isConnected: boolean = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  public lastTelemetry: SentinelTelemetry | null = null;
  private alertListeners: Array<(alert: PhotoInsuranceResult) => void> = [];

  constructor() {
    this.startHeartbeat();
  }

  /**
   * Starts periodic heartbeat loop to the local Python AI Sentinel.
   */
  public startHeartbeat() {
    if (this.heartbeatInterval) return;

    this.heartbeatInterval = setInterval(async () => {
      try {
        const mem = process.memoryUsage();
        const payload = {
          station_id: "master-station-01",
          tether_active: true,
          memory_used_mb: Math.round(mem.heapUsed / (1024 * 1024)),
          request_throttle: false
        };

        const res = await axios.post(`${this.workerUrl}/api/insurance/heartbeat`, payload, {
          timeout: 2000
        });

        if (res.status === 200) {
          if (!this.isConnected) {
            logger.info("[AIInsuranceService] 🛡️ Sentinel connected to Master App.");
            this.isConnected = true;
          }
        }
      } catch (err: any) {
        if (this.isConnected) {
          logger.warn("[AIInsuranceService] ⚠️ Sentinel heartbeat missed. AI Worker may be offline.");
          this.isConnected = false;
        }
      }
    }, 3000);
  }

  /**
   * Fast-path photo quality insurance check (<50ms).
   */
  public async insurePhoto(photoId: string, imageBuffer: Buffer): Promise<PhotoInsuranceResult> {
    if (!this.isConnected) {
      // Fail-open default pass if sentinel is unreachable
      return {
        photoId,
        verdict: "PASS",
        isInsured: false,
        laplacianScore: 100.0,
        earBlinkRatio: 0.9,
        exposureScore: 0.95,
        overallConfidence: 90.0,
        recommendedAction: "Local insurance bypass (Worker offline)",
        timestamp: Date.now()
      };
    }

    try {
      const form = new FormData();
      form.append("file", imageBuffer, { filename: `${photoId}.jpg`, contentType: "image/jpeg" });
      form.append("photo_id", photoId);

      const res = await axios.post<PhotoInsuranceResult>(
        `${this.workerUrl}/api/insurance/insure-photo`,
        form,
        {
          headers: form.getHeaders(),
          timeout: 2500
        }
      );

      const result = res.data;

      // Broadcast warning if photo quality is compromised
      if (result.verdict !== "PASS") {
        logger.warn(`[AIInsuranceService] ⚠️ Quality warning on photo ${photoId}: ${result.verdict} - ${result.recommendedAction}`);
        this.notifyAlert(result);
      }

      return result;
    } catch (err: any) {
      logger.error(`[AIInsuranceService] Error insuring photo ${photoId}`, { args: [err.message] });
      return {
        photoId,
        verdict: "PASS",
        isInsured: false,
        laplacianScore: 100.0,
        earBlinkRatio: 0.9,
        exposureScore: 0.95,
        overallConfidence: 85.0,
        recommendedAction: "Fallback pass",
        timestamp: Date.now()
      };
    }
  }

  /**
   * Gets real-time sentinel and hardware telemetry.
   */
  public async getTelemetry(): Promise<SentinelTelemetry | null> {
    try {
      const res = await axios.get<SentinelTelemetry>(`${this.workerUrl}/api/insurance/status`, {
        timeout: 1500
      });
      this.lastTelemetry = res.data;
      return res.data;
    } catch (err: any) {
      return {
        masterOnline: true,
        lastHeartbeat: Date.now(),
        bufferedPhotosCount: 0,
        journalEntriesCount: 0,
        isThrottled: false,
        uptimeSeconds: 0
      };
    }
  }

  /**
   * Sets AI throttling state to protect UI frame rate.
   */
  public async setThrottling(isThrottled: boolean): Promise<boolean> {
    try {
      await axios.post(`${this.workerUrl}/api/insurance/throttle`, { is_throttled: isThrottled }, {
        timeout: 1000
      });
      return true;
    } catch {
      return false;
    }
  }

  public onQualityAlert(listener: (alert: PhotoInsuranceResult) => void) {
    this.alertListeners.push(listener);
  }

  private notifyAlert(alert: PhotoInsuranceResult) {
    this.alertListeners.forEach((fn) => {
      try {
        fn(alert);
      } catch (e) {
        // ignore listener errors
      }
    });
  }
}

export const aiInsuranceService = new AIInsuranceService();
