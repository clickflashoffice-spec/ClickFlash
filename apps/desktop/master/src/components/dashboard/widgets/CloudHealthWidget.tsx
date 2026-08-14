import React, { useMemo } from "react";
import { SystemHealthStats } from "../../../types";
import { motion } from "framer-motion";

interface CloudHealthWidgetProps {
  stats: SystemHealthStats | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export const CloudHealthWidget: React.FC<CloudHealthWidgetProps> = ({
  stats,
  isLoading,
  onRefresh,
}) => {
  // Determine status color and text
  const statusConfig = useMemo(() => {
    if (!stats) return { color: "slate", text: "Checking...", icon: null };
    if (!stats.enabled)
      return { color: "slate", text: "Disabled", icon: "off" };
    if (stats.cloudConnection === "offline")
      return { color: "red", text: "Offline", icon: "wifi-off" };
    if (stats.status === "syncing")
      return { color: "blue", text: "Syncing...", icon: "refresh" };
    if (stats.status === "paused")
      return { color: "yellow", text: "Paused", icon: "pause" };
    return { color: "emerald", text: "Online", icon: "check" };
  }, [stats]);

  return (
    <div className="glass-card p-4 rounded-xl hover:shadow-lg transition-shadow duration-300 relative overflow-hidden group">
      {/* Background Gradient */}
      <div
        className={`absolute inset-0 bg-gradient-to-br from-${statusConfig.color}-500/5 to-transparent pointer-events-none transition-colors duration-500`}
      />

      <div className="flex justify-between items-start mb-2 relative z-10">
        <div className="flex items-center space-x-2">
          <div
            className={`p-2 rounded-lg bg-${statusConfig.color}-500/10 text-${statusConfig.color}-600 dark:text-${statusConfig.color}-400`}
          >
            {/* Icon based on status */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {statusConfig.icon === "refresh" && (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              )}
              {statusConfig.icon === "check" && (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              )}
              {statusConfig.icon === "wifi-off" && (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 3l18 18M12 18.65c-2.27 0-4.38-.64-6.2-1.74M16.14 16.14A9.92 9.92 0 0021 12.35m-15.9-2.5C4.24 10.7 4 11.52 4 12.35a9.95 9.95 0 005.15 8.65m1.9-1.9A6 6 0 016 12.35c0-.53.07-1.04.2-1.53m11.6 3.06A5.99 5.99 0 0112 16.35c-1.35 0-2.61-.41-3.66-1.12"
                />
              )}
              {statusConfig.icon === "pause" && (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              )}
              {statusConfig.icon === "off" && (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                />
              )}
              {!statusConfig.icon && (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              )}
            </svg>
          </div>
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">
              Cloud Sync
            </p>
            <h3
              className={`text-lg font-bold text-${statusConfig.color}-600 dark:text-${statusConfig.color}-400`}
            >
              {statusConfig.text}
            </h3>
          </div>
        </div>

        {/* Refresh Action */}
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className={`p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${isLoading ? "animate-spin" : ""}`}
          title="Refresh Status"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span className="sr-only">Refresh</span>
        </button>
      </div>

      {/* Last Sync Info */}
      <div className="mt-3 relative z-10">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
          <span>Last Sync:</span>
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {stats?.lastSuccessfulSync
              ? new Date(stats.lastSuccessfulSync).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Never"}
          </span>
        </div>

        {/* Queue Progress Bar */}
        {stats && stats.queues && (
          <div className="mt-2">
            <div className="flex justify-between text-[10px] text-slate-400 mb-1 uppercase font-semibold">
              <span>Pending Uploads</span>
              <span>{stats.queues.fulfillment} Items</span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-blue-500 rounded-full"
                initial={{ width: 0 }}
                animate={{
                  width: stats.queues.fulfillment > 0 ? "100%" : "0%",
                }}
                // Simple logic: if pending > 0 make it full or maybe indeterminate if syncing
                transition={{ duration: 1 }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
