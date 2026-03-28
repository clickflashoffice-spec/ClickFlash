import React, { useEffect, useRef } from "react";
import { backgroundJobService } from "../../services/backgroundJobService";
import { logger } from "../../utils/logger";

/**
 * BackgroundJobRunner Component (Rule 13)
 *
 * Invisible runner that handles background tasks:
 * - Thumbnail generation
 * - Watermark processing
 */
export const BackgroundJobRunner: React.FC = () => {
  const isProcessingRef = useRef(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    const runLoop = async () => {
      if (isProcessingRef.current) return;

      try {
        isProcessingRef.current = true;
        await backgroundJobService.processNext();
      } catch (error) {
        logger.error(
          "[BackgroundJobRunner] Loop error",
          error instanceof Error ? error : undefined,
        );
      } finally {
        isProcessingRef.current = false;
        timer = setTimeout(runLoop, 10000); // Check every 10 seconds
      }
    };

    timer = setTimeout(runLoop, 2000);
    return () => clearTimeout(timer);
  }, []);

  return null;
};
