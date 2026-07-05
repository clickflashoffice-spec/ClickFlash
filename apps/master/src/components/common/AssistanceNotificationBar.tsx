import React, { useState, useCallback, useEffect } from "react";
import { AssistanceRequest } from "../../types";
import { logger } from '@/utils/logger';

interface AssistanceNotificationBarProps {
  assistanceRequests: AssistanceRequest[];
  onDismiss: (id: string) => void;
}

const AssistanceNotificationBar: React.FC<AssistanceNotificationBarProps> = ({
  assistanceRequests,
  onDismiss,
}) => {
  const [dismissingIds, setDismissingIds] = useState<Set<string>>(new Set());
  const processedIdsRef = React.useRef<Set<string>>(new Set());

  const handleDismiss = useCallback(
    async (id: string) => {
      // Prevent double-clicks or re-processing
      if (processedIdsRef.current.has(id)) return;

      processedIdsRef.current.add(id);
      setDismissingIds((prev) => new Set(prev).add(id));

      try {
        // Add a safety timeout to prevent UI freeze if the parent call hangs
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), 5000),
        );

        await Promise.race([onDismiss(id), timeoutPromise]);
      } catch (error) {
        logger.error("Failed to dismiss assistance request:", error);
      } finally {
        setDismissingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [onDismiss],
  );

  // Auto-dismiss logic to prevent "eternal" or frozen notifications
  useEffect(() => {
    if (assistanceRequests.length === 0) return;

    // We only care about the OLDEST request to start a timer
    // or we can set individual timers for each ID that doesn't have one yet
    const timers = assistanceRequests
      .map((request) => {
        // Use the timestamp to calculate remaining time if any
        const created = new Date(request.timestamp).getTime();
        const elapsed = Date.now() - created;
        const remaining = Math.max(0, 30000 - elapsed); // 30 second TTL

        // Skip if already in process
        if (processedIdsRef.current.has(request.id)) return null;

        return setTimeout(() => {
          handleDismiss(request.id);
        }, remaining);
      })
      .filter((t): t is any => t !== null);

    return () => timers.forEach(clearTimeout);
  }, [assistanceRequests, handleDismiss]);

  if (assistanceRequests.length === 0) {
    return null;
  }

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);

    if (diffSeconds < 10) return "just now";
    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    return new Date(date).toLocaleTimeString();
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {assistanceRequests.map((request) => (
        <div
          key={request.id}
          className="flex items-center gap-2 bg-yellow-500 dark:bg-yellow-600 text-white px-3 py-1.5 rounded-lg shadow-lg animate-pulse border border-yellow-400 dark:border-yellow-500"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          <div className="flex flex-col min-w-0">
            <span className="font-semibold text-sm whitespace-nowrap">
              Assistance from {request.kioskId}
            </span>
            <span className="text-xs text-yellow-100 opacity-90">
              {formatTimeAgo(request.timestamp)}
            </span>
          </div>
          <button
            onClick={() => handleDismiss(request.id)}
            disabled={dismissingIds.has(request.id)}
            className="ml-1 p-1 hover:bg-yellow-600 dark:hover:bg-yellow-700 rounded transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Dismiss notification"
          >
            {dismissingIds.has(request.id) ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            )}
          </button>
        </div>
      ))}
    </div>
  );
};

export default AssistanceNotificationBar;
