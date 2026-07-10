import { useState, useEffect, useCallback, useRef } from "react";
import { logger } from "@/utils/logger";

interface UseKioskInactivityGuardOptions {
  idleTimeoutMs?: number;
  warningWindowMs?: number;
  onTimeout: () => void;
  enabled?: boolean;
}

export const useKioskInactivityGuard = ({
  idleTimeoutMs = 90000, // 90 seconds
  warningWindowMs = 15000, // 15 seconds warning before wipe
  onTimeout,
  enabled = true,
}: UseKioskInactivityGuardOptions) => {
  const [showWarning, setShowWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  const idleTimerRef = useRef<number | null>(null);
  const warningTimerRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);

  const clearAllTimers = useCallback(() => {
    if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
    if (warningTimerRef.current) window.clearTimeout(warningTimerRef.current);
    if (countdownIntervalRef.current) window.clearInterval(countdownIntervalRef.current);
    idleTimerRef.current = null;
    warningTimerRef.current = null;
    countdownIntervalRef.current = null;
  }, []);

  const resetActivity = useCallback(() => {
    if (!enabled) return;
    clearAllTimers();
    setShowWarning(false);

    const warningStartDelay = Math.max(0, idleTimeoutMs - warningWindowMs);

    warningTimerRef.current = window.setTimeout(() => {
      setShowWarning(true);
      setRemainingSeconds(Math.ceil(warningWindowMs / 1000));

      countdownIntervalRef.current = window.setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            clearAllTimers();
            setShowWarning(false);
            logger.info("[useKioskInactivityGuard] Kiosk session timed out due to inactivity. Wiping session.");
            onTimeout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, warningStartDelay);
  }, [enabled, idleTimeoutMs, warningWindowMs, clearAllTimers, onTimeout]);

  const showWarningRef = useRef(showWarning);
  showWarningRef.current = showWarning;

  useEffect(() => {
    if (!enabled) {
      clearAllTimers();
      setShowWarning(false);
      return;
    }

    const events = [
      "mousedown",
      "mousemove",
      "keydown",
      "touchstart",
      "pointerdown",
    ];

    const handleUserInteraction = () => {
      if (!showWarningRef.current) {
        resetActivity();
      }
    };

    events.forEach((event) => window.addEventListener(event, handleUserInteraction, { passive: true }));
    resetActivity();

    return () => {
      events.forEach((event) => window.removeEventListener(event, handleUserInteraction));
      clearAllTimers();
    };
  }, [enabled, resetActivity, clearAllTimers]);

  return {
    showWarning,
    remainingSeconds,
    keepSessionAlive: resetActivity,
  };
};

export default useKioskInactivityGuard;
