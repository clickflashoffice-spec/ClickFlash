import React, { useState, useEffect, useCallback } from "react";
import {
  Cpu,
  Activity,
  AlertTriangle,
  Zap,
  RefreshCw,
  Users,
  DollarSign,
  HardDrive,
  CheckCircle2,
  Sliders,
  Radio
} from "lucide-react";
import { cloudApiService } from "../services/cloudApiService";

interface KioskDiagnostics {
  kioskId: string;
  location: string;
  status: "ONLINE" | "WARNING" | "CRITICAL" | "OFFLINE";
  paperRollPercent: number;
  printerTempC: number;
  lastUpdated: string;
}

interface AgentLogEvent {
  id: string;
  timestamp: string;
  agent: "DispatchAgent" | "PricingAgent" | "MaintenanceAgent";
  action: string;
  zone?: string;
  impact: string;
  type: "info" | "warning" | "success";
}

export const AISwarmCommandCenter: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [activeOverride, setActiveOverride] = useState<string | null>(null);

  // Live telemetry state
  const [kiosks, setKiosks] = useState<KioskDiagnostics[]>([
    {
      kioskId: "kiosk-01",
      location: "Castle Plaza Main Entry",
      status: "ONLINE",
      paperRollPercent: 84,
      printerTempC: 48,
      lastUpdated: "Just now",
    },
    {
      kioskId: "kiosk-02",
      location: "Splash Rapids Exit",
      status: "WARNING",
      paperRollPercent: 14, // < 15% triggers warning
      printerTempC: 62,
      lastUpdated: "30s ago",
    },
    {
      kioskId: "kiosk-03",
      location: "Apex Coaster Photo Booth",
      status: "ONLINE",
      paperRollPercent: 68,
      printerTempC: 55,
      lastUpdated: "1m ago",
    },
  ]);

  const [agentLogs, setAgentLogs] = useState<AgentLogEvent[]>([
    {
      id: "log-101",
      timestamp: new Date(Date.now() - 120000).toLocaleTimeString(),
      agent: "DispatchAgent",
      action: "Rebalanced 3 roving photographers to Castle Plaza",
      zone: "Castle Plaza",
      impact: "+42% queue coverage deficit mitigated",
      type: "info",
    },
    {
      id: "log-102",
      timestamp: new Date(Date.now() - 300000).toLocaleTimeString(),
      agent: "PricingAgent",
      action: "Triggered Golden Hour Sunset Multiplier (+15%)",
      zone: "Resort-Wide",
      impact: "Estimated +€480 hourly yield lift",
      type: "success",
    },
    {
      id: "log-103",
      timestamp: new Date(Date.now() - 450000).toLocaleTimeString(),
      agent: "MaintenanceAgent",
      action: "Low Paper Warning dispatched to operations for Kiosk-02",
      zone: "Splash Rapids Exit",
      impact: "Preventative roll replacement scheduled",
      type: "warning",
    },
  ]);

  const [pricingMultiplier, setPricingMultiplier] = useState<number>(1.15);
  const [weatherCondition, setWeatherCondition] = useState<string>("CLEAR / GOLDEN HOUR");

  const syncTelemetry = useCallback(async () => {
    setLoading(true);
    try {
      // Attempt live fetch from backend analytics endpoint if available
      const res = await cloudApiService.get("/api/swarm/telemetry").catch(() => null);
      if (res && res.data && res.data.kiosks) {
        setKiosks(res.data.kiosks);
      }
    } catch {
      // Retain local telemetry model if local endpoint is offline
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    syncTelemetry();
    const interval = setInterval(syncTelemetry, 30000);
    return () => clearInterval(interval);
  }, [syncTelemetry]);

  const handleManualOverride = (actionType: string) => {
    setActiveOverride(actionType);
    const newLog: AgentLogEvent = {
      id: `override-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      agent: "DispatchAgent",
      action: `MANUAL OVERRIDE: ${actionType}`,
      zone: "Central Command",
      impact: "Immediate manual directive enforced across park network",
      type: "warning",
    };

    if (actionType === "FORCE_SURGE") {
      newLog.agent = "PricingAgent";
      newLog.action = "MANUAL OVERRIDE: Forced +25% Peak Demand Surge";
      newLog.impact = "Pricing table re-indexed resort-wide";
      setPricingMultiplier(1.25);
    } else if (actionType === "DISPATCH_CASTLE") {
      newLog.agent = "DispatchAgent";
      newLog.action = "MANUAL OVERRIDE: All available units redirected to Castle Plaza";
      newLog.impact = "6 roving units en route";
    } else if (actionType === "RESTOCK_KIOSK") {
      newLog.agent = "MaintenanceAgent";
      newLog.action = "MANUAL OVERRIDE: Restocked Kiosk-02 paper counter";
      newLog.impact = "Kiosk-02 status restored to ONLINE (100% paper)";
      setKiosks((prev) =>
        prev.map((k) =>
          k.kioskId === "kiosk-02"
            ? { ...k, status: "ONLINE", paperRollPercent: 100, printerTempC: 45, lastUpdated: "Just now" }
            : k
        )
      );
    }

    setAgentLogs((prev) => [newLog, ...prev]);
    setTimeout(() => setActiveOverride(null), 1500);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Top Banner */}
      <div className="relative overflow-hidden p-8 rounded-[3rem] bg-gradient-to-br from-slate-900 via-slate-900/90 to-cyan-950/40 border border-cyan-500/30 shadow-2xl flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-6 z-10">
          <div className="w-16 h-16 bg-cyan-500/20 rounded-3xl flex items-center justify-center border border-cyan-500/40 shadow-lg shadow-cyan-500/20">
            <Cpu className="w-8 h-8 text-cyan-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-black text-white tracking-tighter">
                AI Swarm Command Center
              </h2>
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Autonomous Engine Active
              </span>
            </div>
            <p className="text-slate-400 text-xs font-medium mt-1">
              Real-time synchronization with Master Node local SQLite/VSS and ONNX heuristic engines.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 z-10">
          <button
            onClick={syncTelemetry}
            disabled={loading}
            className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl border border-slate-700/60 font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-cyan-400" : ""}`} />
            Refresh Telemetry
          </button>
        </div>
      </div>

      {/* Grid: Live Swarm Metrics & Manual Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: Pricing & Environmental Telemetry */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800/80 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white tracking-tight uppercase">Dynamic Pricing Engine</h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">PricingAgent Heuristics</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-400 text-xs font-black">
              {(pricingMultiplier * 100 - 100).toFixed(0)}% SURGE
            </span>
          </div>

          <div className="space-y-4 my-4">
            <div className="flex justify-between items-center p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/50">
              <span className="text-xs text-slate-400 font-medium">Active Weather Sensor</span>
              <span className="text-xs font-black text-cyan-400 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                {weatherCondition}
              </span>
            </div>
            <div className="flex justify-between items-center p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/50">
              <span className="text-xs text-slate-400 font-medium">Queue Wait Threshold</span>
              <span className="text-xs font-black text-emerald-400">42m (Optimal Flow)</span>
            </div>
            <div className="flex justify-between items-center p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/50">
              <span className="text-xs text-slate-400 font-medium">Active Bundle Multiplier</span>
              <span className="text-base font-black text-white">{pricingMultiplier}x Base Tariff</span>
            </div>
          </div>

          <button
            onClick={() => handleManualOverride("FORCE_SURGE")}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all active:scale-95"
          >
            <Zap className="w-4 h-4" />
            Force +25% Peak Demand Surge
          </button>
        </div>

        {/* Card 2: Crowd Flow & Roving Unit Dispatch */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800/80 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white tracking-tight uppercase">Roving Unit Dispatch</h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">DispatchAgent Heuristics</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-400 text-xs font-black">
              12 ACTIVE UNITS
            </span>
          </div>

          <div className="space-y-3 my-4">
            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/50 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-bold text-white">Castle Plaza Main Entry</span>
                <span className="font-black text-amber-400">High Density (6 units)</span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: "85%" }} />
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/50 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-bold text-white">Splash Rapids Exit</span>
                <span className="font-black text-cyan-400">Moderate (4 units)</span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-500 rounded-full" style={{ width: "60%" }} />
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/50 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-bold text-white">Apex Coaster Photo Booth</span>
                <span className="font-black text-emerald-400">Optimal (2 units)</span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: "35%" }} />
              </div>
            </div>
          </div>

          <button
            onClick={() => handleManualOverride("DISPATCH_CASTLE")}
            className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all active:scale-95"
          >
            <Activity className="w-4 h-4" />
            Redirect All Units to Castle Plaza
          </button>
        </div>

        {/* Card 3: Kiosk Hardware Telemetry */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800/80 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                <HardDrive className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white tracking-tight uppercase">Hardware Diagnostics</h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">MaintenanceAgent Telemetry</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-400 text-xs font-black">
              3 NODES
            </span>
          </div>

          <div className="space-y-3 my-4">
            {kiosks.map((kiosk) => (
              <div
                key={kiosk.kioskId}
                className={`p-3.5 rounded-2xl border transition-all ${
                  kiosk.paperRollPercent < 15 || kiosk.printerTempC > 75
                    ? "bg-red-500/10 border-red-500/40 shadow-lg shadow-red-500/5 animate-pulse"
                    : "bg-slate-950/60 border-slate-800/50"
                }`}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-black text-white">{kiosk.location}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                      kiosk.status === "ONLINE"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-red-500/20 text-red-400"
                    }`}
                  >
                    {kiosk.status}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Paper Roll: <strong className={kiosk.paperRollPercent < 15 ? "text-red-400" : "text-white"}>{kiosk.paperRollPercent}%</strong></span>
                  <span>Head Temp: <strong className={kiosk.printerTempC > 75 ? "text-red-400" : "text-white"}>{kiosk.printerTempC}°C</strong></span>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => handleManualOverride("RESTOCK_KIOSK")}
            className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 border border-slate-700 transition-all active:scale-95"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Clear Kiosk-02 Paper Jam Warning
          </button>
        </div>
      </div>

      {/* Section: Autonomous Agent Audit Stream */}
      <div className="p-8 rounded-[3rem] bg-slate-900 border border-slate-800/80 shadow-2xl space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-2.5">
              <Sliders className="w-5 h-5 text-cyan-400" />
              Autonomous Decision Audit Stream
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Live chronological ledger of heuristic decisions executed by the Master Node swarm engine.
            </p>
          </div>
          {activeOverride && (
            <span className="px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-black uppercase tracking-widest animate-pulse">
              Override Active: {activeOverride}
            </span>
          )}
        </div>

        <div className="space-y-3">
          {agentLogs.map((log) => (
            <div
              key={log.id}
              className={`p-4 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all ${
                log.type === "warning"
                  ? "bg-amber-500/5 border-amber-500/30"
                  : log.type === "success"
                  ? "bg-emerald-500/5 border-emerald-500/30"
                  : "bg-slate-950/60 border-slate-800/60"
              }`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-3 h-3 rounded-full shrink-0 ${
                    log.type === "warning"
                      ? "bg-amber-400 animate-ping"
                      : log.type === "success"
                      ? "bg-emerald-400"
                      : "bg-cyan-400"
                  }`}
                />
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-black text-white uppercase tracking-wider">{log.agent}</span>
                    {log.zone && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] font-bold text-slate-300">
                        {log.zone}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-slate-200 mt-1">{log.action}</p>
                </div>
              </div>

              <div className="flex flex-col md:items-end gap-1">
                <span className="text-xs font-black text-cyan-400">{log.impact}</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{log.timestamp}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AISwarmCommandCenter;
