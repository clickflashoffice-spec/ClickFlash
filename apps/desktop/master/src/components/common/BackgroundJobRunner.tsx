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
  const isMountedRef = useRef(true);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    isMountedRef.current = true;

    const runLoop = async () => {
      if (!isMountedRef.current || isProcessingRef.current) return;

      let processedJobs = false;
      try {
        isProcessingRef.current = true;
        // backgroundJobService.processNext() returns true if any jobs were processed
        processedJobs = await backgroundJobService.processNext(4); // limit concurrency to 4
      } catch (error) {
        logger.error(
          "[BackgroundJobRunner] Loop error",
          error instanceof Error ? error : undefined,
        );
      } finally {
        isProcessingRef.current = false;
        if (isMountedRef.current) {
          // Poll much faster if we are actively working on a queue
          const delay = processedJobs ? 500 : 5000;
          timer = setTimeout(runLoop, delay);
        }
      }
    };

    timer = setTimeout(runLoop, 2000);
    return () => {
      isMountedRef.current = false;
      clearTimeout(timer);
    };
  }, []);

  return null;
};
