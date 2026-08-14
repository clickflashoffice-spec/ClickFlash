import { Card } from "@clickflash/ui";
import React, { useState, useEffect, useMemo } from "react";
import {
  Activity,
  Shield,
  ShieldAlert,
  ShieldCheck,
  HardDrive,
  Database,
  Cpu,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Zap,
} from "lucide-react";

import { apiService } from "../../services/apiService";
import { logger } from "../../utils/logger";

interface ProbeResult {
  name: string;
  status: "PASS" | "FAIL" | "WARN";
  message: string;
  durationMs: number;
  critical: boolean;
}

interface HealthSnapshot {
  state: "NOMINAL" | "DEGRADED" | "CRITICAL";
  timestamp: string;
  reasons: string[];
  metrics: {
    diskUsedPercent: number;
    diskFreeGb: number;
    memoryUsedPercent: number;
    dbResponsive: boolean;
    thermalStatus: string;
  };
}

interface HealthLogEntry {
  id: number;
  timestamp: string;
  event_type: string;
  verdict: string;
  probes_json: string;
  boot_duration_ms: number | null;
  metadata: string;
}

const STATE_CONFIG = {
  NOMINAL: {
    icon: ShieldCheck,
    color: "text-emerald-500",
    bg: "bg-emerald-50 dark:bg-emerald-950/20",
    border: "border-emerald-200 dark:border-emerald-900/30",
    label: "NOMINAL",
    pulse: "",
  },
  DEGRADED: {
    icon: ShieldAlert,
    color: "text-amber-500",
    bg: "bg-amber-50 dark:bg-amber-950/20",
    border: "border-amber-200 dark:border-amber-900/30",
    label: "DEGRADED",
    pulse: "animate-pulse",
  },
  CRITICAL: {
    icon: XCircle,
    color: "text-red-500",
    bg: "bg-red-50 dark:bg-red-950/20",
    border: "border-red-200 dark:border-red-900/30",
    label: "CRITICAL",
    pulse: "animate-pulse",
  },
};

const PROBE_ICONS: Record<string, React.ReactNode> = {
  database: <Database className="w-4 h-4" />,
  filesystem: <HardDrive className="w-4 h-4" />,
  disk: <HardDrive className="w-4 h-4" />,
  services: <Cpu className="w-4 h-4" />,
};

const OperationalReadiness: React.FC = () => {
  const [snapshot, setSnapshot] = useState<HealthSnapshot | null>(null);
  const [timeline, setTimeline] = useState<HealthLogEntry[]>([]);
  const [bootProbes, setBootProbes] = useState<ProbeResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [uptime, setUptime] = useState(0);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [healthData, timelineData, uptimeData] = await Promise.all([
        (apiService as any).get("/health/detailed"),
        (apiService as any).get("/system/health-timeline"),
        (apiService as any).get("/health"),
      ]);

      // Build snapshot from health endpoint
      if (healthData) {
        const state: HealthSnapshot["state"] =
          healthData.status === "healthy" ? "NOMINAL" :
          healthData.status === "degraded" ? "DEGRADED" : "CRITICAL";

        setSnapshot({
          state,
          timestamp: healthData.timestamp,
          reasons: Object.entries(healthData.checks || {})
            .filter(([, v]) => !v)
            .map(([k]) => `${k} check failed`),
          metrics: {
            diskUsedPercent: healthData.metrics?.disk?.percent || 0,
            diskFreeGb: ((healthData.metrics?.disk?.totalGB || 0) - (healthData.metrics?.disk?.usedGB || 0)),
            memoryUsedPercent: healthData.metrics?.memory?.percent || 0,
            dbResponsive: healthData.checks?.database ?? true,
            thermalStatus: healthData.metrics?.thermal?.status || "NOMINAL",
          },
        });
      }

      if (timelineData?.items) {
        setTimeline(timelineData.items);
        // Extract boot probes from latest BOOT entry
        const latestBoot = timelineData.items.find((e: HealthLogEntry) => e.event_type === "BOOT");
        if (latestBoot?.probes_json) {
          try {
            setBootProbes(JSON.parse(latestBoot.probes_json));
          } catch { /* ignore parse errors */ }
        }
      }

      if (uptimeData?.uptime) {
        setUptime(uptimeData.uptime);
      }
    } catch (err) {
      logger.error("[OperationalReadiness] Failed to fetch data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const stateConfig = useMemo(
    () => STATE_CONFIG[snapshot?.state || "NOMINAL"],
    [snapshot?.state]
  );

  const StateIcon = stateConfig.icon;

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const formatTimestamp = (ts: string) => {
    try {
      const d = new Date(ts);
      return d.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" });
    } catch { return ts; }
  };

  if (loading && !snapshot) {
    return <div className="p-8 text-center text-slate-500">Initializing Health Arbiter...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${stateConfig.bg} ${stateConfig.border} border`}>
            <StateIcon className={`w-6 h-6 ${stateConfig.color} ${stateConfig.pulse}`} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Operational Readiness</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              System State: <span className={`font-bold ${stateConfig.color}`}>{stateConfig.label}</span>
              {snapshot?.reasons && snapshot.reasons.length > 0 && (
                <span className="ml-2 text-xs text-slate-400">({snapshot.reasons.length} issue{snapshot.reasons.length > 1 ? "s" : ""})</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Clock className="w-3.5 h-3.5" />
            Uptime: <span className="font-mono font-bold">{formatUptime(uptime)}</span>
          </div>
          <button
            onClick={fetchData}
            className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Active Degradation Reasons */}
      {snapshot?.reasons && snapshot.reasons.length > 0 && (
        <div className={`p-4 rounded-xl border ${stateConfig.bg} ${stateConfig.border}`}>
          <h4 className={`text-sm font-bold ${stateConfig.color} mb-2 flex items-center gap-2`}>
            <AlertTriangle className="w-4 h-4" />
            Active Issues
          </h4>
          <ul className="space-y-1">
            {snapshot.reasons.map((reason, i) => (
              <li key={i} className="text-sm text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
                {reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Live Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Disk Usage"
          value={`${snapshot?.metrics.diskUsedPercent.toFixed(1)}%`}
          sublabel={`${snapshot?.metrics.diskFreeGb.toFixed(1)}GB free`}
          icon={<HardDrive className="w-4 h-4" />}
          status={
            (snapshot?.metrics.diskUsedPercent || 0) > 95 ? "FAIL" :
            (snapshot?.metrics.diskUsedPercent || 0) > 90 ? "WARN" : "PASS"
          }
        />
        <MetricCard
          label="Memory"
          value={`${snapshot?.metrics.memoryUsedPercent.toFixed(1)}%`}
          sublabel="System RAM"
          icon={<Cpu className="w-4 h-4" />}
          status={(snapshot?.metrics.memoryUsedPercent || 0) > 90 ? "WARN" : "PASS"}
        />
        <MetricCard
          label="Database"
          value={snapshot?.metrics.dbResponsive ? "Responsive" : "Unresponsive"}
          sublabel="SQLite WAL"
          icon={<Database className="w-4 h-4" />}
          status={snapshot?.metrics.dbResponsive ? "PASS" : "FAIL"}
        />
        <MetricCard
          label="Thermal"
          value={snapshot?.metrics.thermalStatus || "N/A"}
          sublabel="CPU Temperature"
          icon={<Zap className="w-4 h-4" />}
          status={snapshot?.metrics.thermalStatus === "CRITICAL" ? "FAIL" : snapshot?.metrics.thermalStatus === "WARNING" ? "WARN" : "PASS"}
        />
      </div>

      {/* Boot Probe Results */}
      {bootProbes.length > 0 && (
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-blue-500" />
            <h3 className="font-bold text-slate-800 dark:text-white">Last Boot Report</h3>
            {timeline[0]?.boot_duration_ms && (
              <span className="ml-auto text-xs font-mono text-slate-400">
                {timeline[0].boot_duration_ms}ms boot time
              </span>
            )}
          </div>
          <div className="space-y-2">
            {bootProbes.map((probe, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <div className="text-slate-400">{PROBE_ICONS[probe.name] || <Activity className="w-4 h-4" />}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 capitalize">{probe.name}</span>
                    {probe.critical && (
                      <span className="text-[9px] font-bold uppercase tracking-wider text-red-500 bg-red-50 dark:bg-red-950/20 px-1.5 py-0.5 rounded">Critical</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 truncate">{probe.message}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono text-slate-400">{probe.durationMs}ms</span>
                  {probe.status === "PASS" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : probe.status === "WARN" ? (
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Health Transition Timeline */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-purple-500" />
          <h3 className="font-bold text-slate-800 dark:text-white">Health Timeline (Last 24h)</h3>
        </div>
        {timeline.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">No health events recorded yet.</p>
        ) : (
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {timeline.slice(0, 20).map((entry) => {
              const eventColor =
                entry.event_type === "BOOT" ? "text-blue-500" :
                entry.event_type === "NOMINAL" || entry.event_type === "RECOVERED" ? "text-emerald-500" :
                entry.event_type === "DEGRADED" ? "text-amber-500" : "text-red-500";

              return (
                <div key={entry.id} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <div className={`w-2 h-2 rounded-full ${eventColor.replace("text-", "bg-")}`} />
                  <span className="text-xs font-mono text-slate-400 w-36 shrink-0">{formatTimestamp(entry.timestamp)}</span>
                  <span className={`text-xs font-bold uppercase tracking-wider ${eventColor} w-24`}>{entry.event_type}</span>
                  <span className="text-xs text-slate-500 truncate flex-1">
                    {entry.boot_duration_ms ? `Boot: ${entry.boot_duration_ms}ms` : ""}
                    {entry.metadata && !entry.boot_duration_ms ? (() => {
                      try {
                        const meta = JSON.parse(entry.metadata);
                        return meta.reasons?.join(", ") || "";
                      } catch { return ""; }
                    })() : ""}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    entry.verdict === "READY" ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400" :
                    entry.verdict === "DEGRADED" ? "bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400" :
                    "bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400"
                  }`}>{entry.verdict}</span>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};

// Sub-component for metric cards
const MetricCard: React.FC<{
  label: string;
  value: string;
  sublabel: string;
  icon: React.ReactNode;
  status: "PASS" | "WARN" | "FAIL";
}> = ({ label, value, sublabel, icon, status }) => {
  const statusColors = {
    PASS: "border-emerald-100 dark:border-emerald-900/30 bg-gradient-to-br from-emerald-50/50 to-white dark:from-emerald-950/10 dark:to-slate-900",
    WARN: "border-amber-100 dark:border-amber-900/30 bg-gradient-to-br from-amber-50/50 to-white dark:from-amber-950/10 dark:to-slate-900",
    FAIL: "border-red-100 dark:border-red-900/30 bg-gradient-to-br from-red-50/50 to-white dark:from-red-950/10 dark:to-slate-900",
  };

  return (
    <div className={`p-4 rounded-xl border ${statusColors[status]}`}>
      <div className="flex items-center gap-2 mb-2 text-slate-400">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-xl font-bold text-slate-800 dark:text-white">{value}</div>
      <div className="text-[10px] text-slate-400 mt-1">{sublabel}</div>
    </div>
  );
};

export default OperationalReadiness;
