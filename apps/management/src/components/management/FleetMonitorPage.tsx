import React, { useState, useEffect, useCallback } from "react";
import {Server,
  Activity,
  Clock,
  Database,
  AlertTriangle,
  RefreshCw,
  MapPin,
  HardDrive,
  Search,
  Terminal,
  Sparkles} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from "recharts";
import {
  fleetService,
  MasterStation,
} from "../../services/fleetService";
import { orchestrationService } from "../../services/orchestrationService";
import { useManagement } from "../../context/ManagementContext";
import { matchesHotelContext } from "../../utils/contextMatcher";
import { logger } from "../../utils/logger";
import { Spinner } from "@clickflash/ui";

// ─── Status Badge ────────────────────────────────────────────────────────────
const StatusBadge: React.FC<{ status: MasterStation["status"] }> = ({ status }) => {
  const config: Record<
    MasterStation["status"],
    { dot: string; text: string; bg: string; label: string }
  > = {
    online:       { dot: "bg-emerald-400", text: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/20", label: "Online" },
    offline:      { dot: "bg-rose-400",    text: "text-rose-400",    bg: "bg-rose-400/10 border-rose-400/20",       label: "Offline" },
    warning:      { dot: "bg-amber-400",   text: "text-amber-400",   bg: "bg-amber-400/10 border-amber-400/20",     label: "Warning" },
    syncing:      { dot: "bg-blue-400",    text: "text-blue-400",    bg: "bg-blue-400/10 border-blue-400/20",       label: "Syncing" },
    degraded:     { dot: "bg-amber-400",   text: "text-amber-400",   bg: "bg-amber-400/10 border-amber-400/20",     label: "Degraded" },
    disconnected: { dot: "bg-rose-400",    text: "text-rose-400",    bg: "bg-rose-400/10 border-rose-400/20",       label: "Disconnected" },
  };
  const { dot, text, bg, label } = config[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${bg} ${text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot} ${status === "syncing" ? "animate-pulse" : ""}`} />
      {label}
    </span>
  );
};

// ─── Metric Bar ──────────────────────────────────────────────────────────────
const MetricBar: React.FC<{ label: string; value: number; color: string; warning?: number }> = (
  { label, value, color, warning = 80 }
) => {
  const clampedWidth = `${Math.min(100, Math.max(0, value))}%`;
  const isWarning = value > warning;
  return (
    <div className="flex items-center gap-3 group/metric">
      <span className="text-[10px] font-bold text-slate-500 uppercase w-10 tracking-widest">{label}</span>
      <div
        className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden relative shadow-inner"
        style={{ ["--bar-w" as string]: clampedWidth }}
      >
        <div className={`absolute top-0 left-0 h-full rounded-full transition-all duration-700 ease-out w-[var(--bar-w)] ${isWarning ? "bg-rose-500" : color}`} />
      </div>
      <span className={`text-xs font-black w-8 text-right transition-colors ${isWarning ? "text-rose-400" : "text-slate-400 group-hover/metric:text-white"}`}>
        {value}%
      </span>
    </div>
  );
};

// ─── Station Card ─────────────────────────────────────────────────────────────
const StationCard: React.FC<{
  station: MasterStation;
  onSelect: () => void;
  isSelected: boolean;
  onForceSync: (e: React.MouseEvent) => void;
  onPing: (e: React.MouseEvent) => void;
  isPinging?: boolean;
  pingLatency?: number;
}> = ({ station, onSelect, isSelected, onForceSync, onPing, isPinging, pingLatency }) => {
  const accentColor = station.status === "online"
    ? "border-l-emerald-500"
    : station.status === "offline"
      ? "border-l-rose-500"
      : "border-l-amber-500";

  return (
    <div
      className={`relative p-5 rounded-2xl border-l-4 cursor-pointer transition-all duration-200 group ${accentColor} ${
        isSelected
          ? "bg-white/8 border border-white/15 shadow-[0_0_24px_rgba(59,130,246,0.12)]"
          : "bg-white/4 border border-white/8 hover:bg-white/7 hover:border-white/12"
      }`}
      onClick={onSelect}
    >
      {/* Asset Tag */}
      <div className="absolute top-3 right-3 px-2 py-0.5 bg-white/5 border border-white/10 rounded-md">
        <span className="text-[8px] font-black text-slate-600 uppercase tracking-[0.2em]">
          CF-{station.id.slice(0, 4).toUpperCase()}
        </span>
      </div>

      <div className="flex items-start justify-between mb-3 pr-16">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl border ${
            station.status === "online"  ? "bg-emerald-500/10 border-emerald-500/20" :
            station.status === "offline" ? "bg-rose-500/10 border-rose-500/20" :
                                           "bg-amber-500/10 border-amber-500/20"
          }`}>
            <Server className={`w-4 h-4 ${
              station.status === "online"  ? "text-emerald-400" :
              station.status === "offline" ? "text-rose-400" : "text-amber-400"
            }`} />
          </div>
          <div>
            <h3 className="font-black text-white text-sm tracking-tight leading-tight group-hover:text-blue-300 transition-colors">
              {station.name}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">
                v{station.version}
              </p>
              {orchestrationService.getMaster(station.id) && (
                <span
                  className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse shadow-[0_0_6px_rgba(96,165,250,0.8)]"
                  title="Live Heartbeat"
                />
              )}
            </div>
          </div>
        </div>
        <StatusBadge status={station.status} />
      </div>

      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600 mb-4">
        <MapPin className="w-3 h-3" />
        <span>{station.location}</span>
      </div>

      {station.status !== "offline" && (
        <div className="space-y-2.5 mb-4 p-3 bg-black/20 rounded-xl border border-white/5">
          <MetricBar label="CPU"  value={station.metrics?.cpuUsage    || 0} color="bg-blue-500"   warning={85} />
          <MetricBar label="RAM"  value={station.metrics?.memoryUsage || 0} color="bg-violet-500" warning={90} />
          <MetricBar label="DISK" value={station.metrics?.diskUsage   || 0} color="bg-slate-500"  warning={85} />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-white/4 rounded-xl border border-white/8">
          <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">ORDERS</p>
          <p className="text-lg font-black text-white">
            {station.orders?.today || 0}
            <span className="text-[10px] text-slate-600 ml-1 font-bold">today</span>
          </p>
        </div>
        <div className="p-3 bg-white/4 rounded-xl border border-white/8">
          <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">PHOTOS</p>
          <p className="text-lg font-black text-white">
            {station.photos?.today || 0}
            <span className="text-[10px] text-slate-600 ml-1 font-bold">RAW</span>
          </p>
        </div>
      </div>

      {station.status !== "offline" && (
        <div className="mt-4 pt-3 border-t border-white/5 flex items-center gap-2">
          <button
            onClick={onPing}
            disabled={isPinging}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl hover:bg-emerald-500/20 transition-all text-[10px] font-black uppercase tracking-[0.08em] disabled:opacity-50"
          >
            <Activity className={`w-3 h-3 ${isPinging ? "animate-spin" : ""}`} />
            {isPinging ? "Pinging..." : pingLatency !== undefined ? `${pingLatency}ms` : "Ping"}
          </button>
          <button
            onClick={onForceSync}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl hover:bg-blue-500/20 transition-all text-[10px] font-black uppercase tracking-[0.08em]"
          >
            <RefreshCw className="w-3 h-3" />
            Force Sync
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Station Details Panel ────────────────────────────────────────────────────
const StationDetails: React.FC<{
  station: MasterStation;
  onNavigateToStation?: (id: string) => void;
  onCommand?: (id: string, cmd: "START_TUNNEL" | "STOP_TUNNEL" | "RESTART") => Promise<void>;
  commandLoading?: boolean;
}> = ({ station, onNavigateToStation: onNavigateToStation, onCommand, commandLoading }) => {
  const panel = "bg-white/4 rounded-2xl border border-white/8 p-5";
  const metricRow = "flex items-center justify-between p-3 bg-black/20 rounded-xl border border-white/5";

  return (
    <div className="space-y-6">
      {/* Visual Performance Charts (Mocked history for demo) */}
      <div className={panel}>
        <h3 className="font-black text-white text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4 text-sky-400" /> Real-time Performance
        </h3>
        <div className="h-32 -ml-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={[
              { time: "10m ago", cpu: Math.max(0, (station.metrics?.cpuUsage || 0) - 20), ram: Math.max(0, (station.metrics?.memoryUsage || 0) - 10) },
              { time: "8m ago", cpu: Math.max(0, (station.metrics?.cpuUsage || 0) - 10), ram: Math.max(0, (station.metrics?.memoryUsage || 0) - 5) },
              { time: "6m ago", cpu: Math.max(0, (station.metrics?.cpuUsage || 0) + 10), ram: Math.max(0, (station.metrics?.memoryUsage || 0) + 5) },
              { time: "4m ago", cpu: Math.max(0, (station.metrics?.cpuUsage || 0) - 5), ram: Math.max(0, (station.metrics?.memoryUsage || 0) + 2) },
              { time: "2m ago", cpu: Math.max(0, (station.metrics?.cpuUsage || 0) + 5), ram: (station.metrics?.memoryUsage || 0) },
              { time: "Now", cpu: station.metrics?.cpuUsage || 0, ram: station.metrics?.memoryUsage || 0 },
            ]}>
              <defs>
                <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorRam" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
              <XAxis dataKey="time" stroke="#ffffff40" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#ffffff40" fontSize={10} tickLine={false} axisLine={false} width={30} />
              <RechartsTooltip
                contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #ffffff20", borderRadius: "12px", fontSize: "12px", color: "#fff" }}
                itemStyle={{ fontWeight: "bold" }}
              />
              <Area type="monotone" dataKey="cpu" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorCpu)" name="CPU Usage (%)" />
              <Area type="monotone" dataKey="ram" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorRam)" name="RAM Usage (%)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Sync Status */}
      <div className={panel}>
        <h3 className="font-black text-white text-sm uppercase tracking-widest mb-4">Sync Status</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Last Sync",   val: station.syncStatus?.lastSync || "Never",               warn: false },
            { label: "Sync Lag",    val: `${station.syncStatus?.syncLag || 0} min`,              warn: (station.syncStatus?.syncLag || 0) > 5 },
            { label: "Pending Ops", val: station.syncStatus?.pendingOperations || 0,             warn: false },
            { label: "Failed Ops",  val: station.syncStatus?.failedOperations || 0,              warn: (station.syncStatus?.failedOperations || 0) > 0 },
          ].map(({ label, val, warn }) => (
            <div key={label} className="p-3 bg-black/20 rounded-xl border border-white/5">
              <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-1">{label}</p>
              <p className={`text-base font-black ${warn ? "text-amber-400" : "text-white"}`}>{String(val)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Performance */}
      <div className={panel}>
        <h3 className="font-black text-white text-sm uppercase tracking-widest mb-4">Performance</h3>
        <div className="space-y-2">
          <div className={metricRow}>
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-slate-600" />
              <span className="text-sm text-slate-400">Uptime</span>
            </div>
            <span className="font-bold text-white text-sm">{station.metrics?.uptime || "0h"}</span>
          </div>
          <div className={metricRow}>
            <div className="flex items-center gap-3">
              <Database className="w-4 h-4 text-slate-600" />
              <span className="text-sm text-slate-400">Queue Size</span>
            </div>
            <span className={`font-bold text-sm ${(station.metrics?.queueSize || 0) > 100 ? "text-amber-400" : "text-white"}`}>
              {station.metrics?.queueSize || 0} ops
            </span>
          </div>
          <div className={metricRow}>
            <div className="flex items-center gap-3">
              <HardDrive className="w-4 h-4 text-slate-600" />
              <span className="text-sm text-slate-400">Disk Usage</span>
            </div>
            <span className={`font-bold text-sm ${(station.metrics?.diskUsage || 0) > 85 ? "text-rose-400" : "text-white"}`}>
              {station.metrics?.diskUsage || 0}%
            </span>
          </div>
        </div>
      </div>

      {/* Activity */}
      <div className={panel}>
        <h3 className="font-black text-white text-sm uppercase tracking-widest mb-4">Activity Volume</h3>
        <div className="h-28 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={[
              { day: "Mon", orders: (station.orders?.today || 0) * 0.5, photos: (station.photos?.today || 0) * 0.4 },
              { day: "Tue", orders: (station.orders?.today || 0) * 0.7, photos: (station.photos?.today || 0) * 0.6 },
              { day: "Wed", orders: (station.orders?.today || 0) * 0.6, photos: (station.photos?.today || 0) * 0.5 },
              { day: "Thu", orders: (station.orders?.today || 0) * 0.9, photos: (station.photos?.today || 0) * 0.8 },
              { day: "Fri", orders: (station.orders?.today || 0) * 1.2, photos: (station.photos?.today || 0) * 1.1 },
              { day: "Sat", orders: (station.orders?.today || 0) * 1.5, photos: (station.photos?.today || 0) * 1.3 },
              { day: "Today", orders: station.orders?.today || 0, photos: station.photos?.today || 0 },
            ]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
              <XAxis dataKey="day" stroke="#ffffff40" fontSize={10} tickLine={false} axisLine={false} />
              <RechartsTooltip
                cursor={{ fill: '#ffffff05' }}
                contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #ffffff20", borderRadius: "12px", fontSize: "12px", color: "#fff" }}
              />
              <Bar dataKey="orders" fill="#38bdf8" radius={[4, 4, 0, 0]} name="Orders" />
              <Bar dataKey="photos" fill="#a78bfa" radius={[4, 4, 0, 0]} name="Photos" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-2">
          {[
            { label: "Orders Today",     val: station.orders?.today || 0,                   accent: false },
            { label: "Orders This Week", val: station.orders?.week || 0,                    accent: false },
            { label: "Pending Orders",   val: station.orders?.pending || 0,                 accent: true  },
            { label: "Photos Today",     val: station.photos?.today || 0,                   accent: false },
            { label: "Total Photos",     val: (station.photos?.total || 0).toLocaleString(), accent: false },
          ].map(({ label, val, accent }) => (
            <div key={label} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0 group">
              <span className="text-sm text-slate-500 group-hover:text-slate-300 transition-colors">{label}</span>
              <span className={`font-bold text-sm ${accent ? "text-amber-400" : "text-white"}`}>{val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Remote Support */}
      <div className={panel}>
        <h3 className="font-black text-white text-sm uppercase tracking-widest mb-2">Remote Support</h3>
        <p className="text-xs text-slate-600 mb-4 leading-relaxed">
          Emergency RDP tunnel via cloudflared. Auto-closes after 1 hour.
        </p>
        {station.metrics?.tunnel_url ? (
          <div className="space-y-3">
            <div className="p-3 bg-blue-500/5 rounded-xl border border-blue-500/20 break-all select-all">
              <span className="font-mono text-blue-400 text-xs whitespace-pre-wrap">{station.metrics.tunnel_url}</span>
            </div>
            <button
              onClick={() => onCommand?.(station.id, "STOP_TUNNEL")}
              disabled={commandLoading}
              className="w-full px-4 py-2.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl hover:bg-rose-500/20 transition-all text-xs font-black uppercase tracking-wider disabled:opacity-50"
            >
              Close Tunnel
            </button>
          </div>
        ) : (
          <button
            onClick={() => onCommand?.(station.id, "START_TUNNEL")}
            disabled={commandLoading}
            className="w-full flex justify-center items-center gap-2 px-4 py-2.5 bg-white/8 text-white border border-white/10 rounded-xl hover:bg-white/12 transition-all text-xs font-black uppercase tracking-wider disabled:opacity-50"
          >
            {commandLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Terminal className="w-4 h-4" />}
            Start RDP Tunnel
          </button>
        )}
      </div>
    </div>
  );
};

// ─── Fleet Monitor Page ───────────────────────────────────────────────────────
export const FleetMonitorPage: React.FC<{
  onNavigateToStation?: (id: string) => void;
}> = ({ onNavigateToStation }) => {
  const { selectedContext } = useManagement();
  const [stations, setStations] = useState<MasterStation[]>([]);
  const [selectedStation, setSelectedStation] = useState<MasterStation | null>(null);
  const [filter, setFilter] = useState<"all" | "online" | "offline" | "warning">("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [commandLoading, setCommandLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [_syncingStation, setSyncingStation] = useState<string | null>(null);
  const [pingingStation, setPingingStation] = useState<string | null>(null);
  const [pingLatency, setPingLatency] = useState<Record<string, number>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const fetchStations = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fleetService.getStations();
      setStations(data);
      if (!selectedStation && data.length > 0) setSelectedStation(data[0]);
      setError(null);
    } catch {
      setError("Failed to fetch fleet status");
    } finally {
      setLoading(false);
    }
  }, [selectedStation]);

  useEffect(() => {
    fetchStations();
    orchestrationService.on("master:registered", fetchStations);
    orchestrationService.on("master:online", fetchStations);
    const interval = setInterval(fetchStations, 10000);
    return () => {
      clearInterval(interval);
      orchestrationService.off("master:registered", fetchStations);
      orchestrationService.off("master:online", fetchStations);
    };
  }, [fetchStations]);

  const handleForceSync = async (e: React.MouseEvent, deskId: string) => {
    e.stopPropagation();
    try {
      setSyncingStation(deskId);
      await fleetService.forceSync(deskId);
      await fetchStations();
    } catch (err) {
      logger.error("Failed to force sync:", { error: err });
    } finally {
      setSyncingStation(null);
    }
  };

  const handlePingStation = async (e: React.MouseEvent, deskId: string) => {
    e.stopPropagation();
    setPingingStation(deskId);
    const start = performance.now();
    try {
      await fleetService.sendHeartbeat(deskId);
      const rtt = Math.round(performance.now() - start);
      setPingLatency((prev) => ({ ...prev, [deskId]: rtt }));
      logger.info(`Ping to ${deskId} successful (${rtt}ms)`);
    } catch (err) {
      logger.error(`Ping to ${deskId} failed`, { error: err });
    } finally {
      setPingingStation(null);
    }
  };

  const handleSupportCommand = async (
    deskId: string,
    cmd: "START_TUNNEL" | "STOP_TUNNEL" | "RESTART"
  ) => {
    try {
      setCommandLoading(deskId);
      await fleetService.sendCommand(deskId, cmd);
      setError(null);
    } catch {
      setError(`Failed to queue command ${cmd}`);
    } finally {
      setCommandLoading(null);
    }
  };

  const handleForceSyncAll = async () => {
    try {
      setLoading(true);
      await fleetService.forceSync();
      await fetchStations();
    } finally {
      setLoading(false);
    }
  };

  const filteredStations = stations.filter((s) => {
    if (!matchesHotelContext(selectedContext, s)) return false;
    if (filter !== "all" && s.status !== filter) return false;
    if (
      search &&
      !s.name.toLowerCase().includes(search.toLowerCase()) &&
      !s.id.toLowerCase().includes(search.toLowerCase()) &&
      !s.location.toLowerCase().includes(search.toLowerCase())
    ) return false;
    return true;
  });

  const totalPages = Math.ceil(filteredStations.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedStations = filteredStations.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const stats = {
    total: stations.length,
    online:  stations.filter((s) => s.status === "online").length,
    offline: stations.filter((s) => s.status === "offline").length,
    warning: stations.filter((s) => s.status === "warning").length,
    totalOrders: stations.reduce((acc, s) => acc + (s.orders?.today || 0), 0),
    totalPhotos: stations.reduce((acc, s) => acc + (s.photos?.today || 0), 0),
  };

  const statCards = [
    { label: "Online",         val: `${stats.online}/${stats.total}`,     Icon: Server,        color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/20" },
    { label: "Warnings",       val: String(stats.warning),                 Icon: AlertTriangle,  color: "text-amber-400",   bg: "bg-amber-400/10 border-amber-400/20"   },
    { label: "Today's Orders", val: String(stats.totalOrders),             Icon: Activity,       color: "text-blue-400",    bg: "bg-blue-400/10 border-blue-400/20"     },
    { label: "Today's Photos", val: stats.totalPhotos.toLocaleString(),    Icon: Database,       color: "text-violet-400",  bg: "bg-violet-400/10 border-violet-400/20" },
  ];

  const filterBtns = ["all", "online", "warning", "offline"] as const;

  if (loading && stations.length === 0) {
    return <div className="flex items-center justify-center h-96"><Spinner /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Operations</p>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-widest">
              <Sparkles className="w-3 h-3" />
              Autopilot Active
            </span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Fleet Monitor</h1>
          <p className="text-sm text-slate-500 mt-0.5">PixelFounder AI is autonomously monitoring and routing workloads</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleForceSyncAll}
            disabled={loading}
            title="Force Sync All Stations"
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl hover:bg-blue-500/20 transition-all text-xs font-black uppercase tracking-wider disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Sync All
          </button>
          <button
            onClick={fetchStations}
            disabled={loading}
            title="Refresh Fleet Status"
            className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-slate-500 hover:text-white hover:bg-white/10 transition-all disabled:opacity-50"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm font-medium">
          {error}
        </div>
      )}

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map(({ label, val, Icon, color, bg }) => (
          <div key={label} className="p-4 bg-white/4 rounded-2xl border border-white/8">
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-1.5 rounded-lg border ${bg}`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <span className="text-xs text-slate-500 font-medium">{label}</span>
            </div>
            <p className="text-2xl font-black text-white">{val}</p>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Station List */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
              <input
                type="text"
                placeholder="Search stations..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 transition-all"
              />
            </div>
            <div className="flex gap-1.5 p-1 bg-white/5 border border-white/8 rounded-xl">
              {filterBtns.map((f) => (
                <button
                  key={f}
                  onClick={() => { setFilter(f); setCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                    filter === f ? "bg-blue-500 text-white shadow-sm" : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Station Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {paginatedStations.map((station) => (
              <StationCard
                key={station.id}
                station={station}
                onSelect={() => setSelectedStation(station)}
                isSelected={selectedStation?.id === station.id}
                onForceSync={(e) => handleForceSync(e, station.id)}
                onPing={(e) => handlePingStation(e, station.id)}
                isPinging={pingingStation === station.id}
                pingLatency={pingLatency[station.id]}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-3 border-t border-white/5">
              <span className="text-xs text-slate-600">
                Showing {startIndex + 1}–{Math.min(startIndex + ITEMS_PER_PAGE, filteredStations.length)} of {filteredStations.length}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs font-bold text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  Prev
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs font-bold text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Station Details */}
        <div className="custom-scrollbar">
          {selectedStation ? (
            <StationDetails
              station={selectedStation}
              onNavigateToStation={onNavigateToStation}
              onCommand={handleSupportCommand}
              commandLoading={commandLoading === selectedStation.id}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center p-6 bg-white/4 rounded-2xl border border-dashed border-white/8">
              <Server className="w-10 h-10 text-slate-700 mb-3" />
              <p className="text-slate-500 text-sm font-medium">Select a station to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FleetMonitorPage;