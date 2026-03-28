import React from "react";

interface SystemHealth {
  status: "healthy" | "degraded" | "critical";
  timestamp: string;
  services: {
    database: "connected" | "disconnected";
    api: "operational" | "degraded" | "down";
    websocket: "connected" | "disconnected";
    storage: "healthy" | "low" | "critical";
  };
  metrics: {
    uptime: number;
    responseTime: number;
    activeConnections: number;
    errorRate: number;
  };
  masters?: Array<{
    id: string;
    name: string;
    status: "online" | "offline";
    lastSeen: string;
    version: string;
  }>;
}

interface SystemHealthWidgetProps {
  health?: SystemHealth;
  isLoading?: boolean;
  detailed?: boolean;
}

/**
 * SystemHealthWidget Component
 *
 * Displays comprehensive system health status across all services.
 *
 * @param {SystemHealthWidgetProps} props - Component props
 */
const SystemHealthWidget: React.FC<SystemHealthWidgetProps> = ({
  health,
  isLoading = false,
  detailed = false,
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
      case "connected":
      case "operational":
      case "online":
        return "text-green-600 bg-green-50 border border-green-200";
      case "degraded":
      case "low":
        return "text-amber-600 bg-amber-50 border border-amber-200";
      case "critical":
      case "disconnected":
      case "down":
      case "offline":
        return "text-red-600 bg-red-50 border border-red-200";
      default:
        return "text-slate-500 bg-slate-50 border border-slate-200";
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">System Health</h3>
          <div className="animate-pulse w-20 h-6 bg-slate-100 rounded" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between animate-pulse"
            >
              <div className="w-24 h-4 bg-slate-100 rounded" />
              <div className="w-16 h-4 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!health) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 mb-4">System Health</h3>
        <div className="text-center py-8 text-slate-500">
          <svg
            className="w-12 h-12 mx-auto mb-3 opacity-50"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p>Health data unavailable</p>
        </div>
      </div>
    );
  }

  const overallStatus = health.status || "healthy";
  const statusText =
    overallStatus.charAt(0).toUpperCase() + overallStatus.slice(1);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900">System Health</h3>
          <p className="text-sm text-slate-500">
            Last updated: {new Date(health.timestamp).toLocaleTimeString()}
          </p>
        </div>
        <div
          className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${getStatusColor(overallStatus)}`}
        >
          {statusText}
        </div>
      </div>

      {/* Service Status Grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div
          className={`p-3 rounded-lg ${getStatusColor(health.services?.database || "unknown")}`}
        >
          <div className="flex items-center space-x-2">
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
              />
            </svg>
            <span className="text-xs font-semibold">Database</span>
          </div>
        </div>

        <div
          className={`p-3 rounded-lg ${getStatusColor(health.services?.api || "unknown")}`}
        >
          <div className="flex items-center space-x-2">
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
              />
            </svg>
            <span className="text-xs font-semibold">API Server</span>
          </div>
        </div>

        <div
          className={`p-3 rounded-lg ${getStatusColor(health.services?.websocket || "unknown")}`}
        >
          <div className="flex items-center space-x-2">
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            <span className="text-xs font-semibold">WebSocket</span>
          </div>
        </div>

        <div
          className={`p-3 rounded-lg ${getStatusColor(health.services?.storage || "unknown")}`}
        >
          <div className="flex items-center space-x-2">
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
              />
            </svg>
            <span className="text-xs font-semibold">Storage</span>
          </div>
        </div>
      </div>

      {/* Metrics */}
      {health.metrics && (
        <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
          <div>
            <p className="text-xs text-slate-500">Uptime</p>
            <p className="text-sm font-bold text-slate-900">
              {(health.metrics?.uptime || 0).toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Response Time</p>
            <p className="text-sm font-bold text-slate-900">
              {health.metrics?.responseTime || 0}ms
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Active Connections</p>
            <p className="text-sm font-bold text-slate-900">
              {health.metrics?.activeConnections || 0}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Error Rate</p>
            <p
              className={`text-sm font-bold ${(health.metrics?.errorRate || 0) > 5 ? "text-red-600" : "text-slate-900"}`}
            >
              {health.metrics?.errorRate || 0}%
            </p>
          </div>
        </div>
      )}

      {/* Master Stations Status */}
      {detailed && health.masters && health.masters.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-slate-700 mb-3">
            Master Stations
          </h4>
          <div className="space-y-2">
            {health.masters.map((master) => (
              <div
                key={master.id}
                className="flex items-center justify-between p-2 bg-slate-50 rounded-lg"
              >
                <div className="flex items-center space-x-2">
                  <div
                    className={`w-2 h-2 rounded-full ${master.status === "online" ? "bg-green-500" : "bg-red-500"}`}
                  />
                  <span className="text-sm text-slate-700">{master.name}</span>
                </div>
                <div className="text-xs text-slate-500">v{master.version}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(SystemHealthWidget);

