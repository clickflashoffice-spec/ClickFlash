import { useState, useCallback, useRef } from "react";
import { pb } from "../services/pb";
import { logger } from "../utils/logger";

/**
 * Hook to track interaction duration for Mean Session Time analytics.
 */
export const useSessionTiming = (photographerId?: number) => {
  const [startTime, setStartTime] = useState<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const startSession = useCallback(() => {
    const now = Date.now();
    setStartTime(now);
    startTimeRef.current = now;
    logger.info(`Session started for photographer ${photographerId}`);
  }, [photographerId]);

  const endSession = useCallback(async () => {
    if (!startTimeRef.current || !photographerId) return;

    const durationSeconds = Math.round(
      (Date.now() - startTimeRef.current) / 1000,
    );

    // Minimum 10 seconds to count as a session
    if (durationSeconds < 10) {
      setStartTime(null);
      startTimeRef.current = null;
      return;
    }

    try {
      await pb.request("/api/resort-analytics/log-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photographerId,
          seconds: durationSeconds,
        }),
      });
      logger.info(`Session ended. Duration: ${durationSeconds}s`);
    } catch (error) {
      logger.error("Failed to log session duration", error);
    } finally {
      setStartTime(null);
      startTimeRef.current = null;
    }
  }, [photographerId]);

  return {
    isActive: startTime !== null,
    startSession,
    endSession,
    startTime,
  };
};
