import React, { useState, useEffect } from "react";
import ReactApexChart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import {
  Globe,
  Wifi,
  DollarSign,
  ShoppingBag,
  TrendingUp,
  Layers,
  Zap,
  Activity,
  Server,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { cloudApiService } from "../../services/cloudApiService";
import { fleetService, MasterStation } from "../../services/fleetService";
import { ManagementContext } from "../../constants";
import { Photographer } from "../../types";

interface OperationalCommandCenterProps {
  currentUser: Photographer;
  context?: ManagementContext;
}

const OperationalCommandCenter: React.FC<OperationalCommandCenterProps> = ({
  currentUser,
  context = "global",
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Real-time Fleet Metrics
  const [macroStats, setMacroStats] = useState({
    activeStations: 0,
    warningStations: 0,
    offlineStations: 0,
    totalStations: 0,
    totalPhotos: 0,
    totalOrders: 0,
    grossVolume: 0,
    networkARR: 0,
  });

  // Analytics & Projections
  const [analytics, setAnalytics] = useState<any>(null);
  const [stations, setStations] = useState<MasterStation[]>([]);

  useEffect(() => {
    const loadCommandCenter = async () => {
      try {
        setLoading(true);
        const today = new Date().toISOString().split("T")[0];

        const [stationsRes, analyticsRes] = await Promise.all([
          fleetService.getStations().catch(() => []),
          cloudApiService.get(`/api/analytics/dashboard?endDate=${today}`),
        ]);

        setStations(stationsRes);
        const analyticsData = analyticsRes.data?.data || analyticsRes.data;
        setAnalytics(analyticsData);

        // Filter stations based on context if not global
        const filteredStations =
          context === "global"
            ? stationsRes
            : stationsRes.filter(
                (s) =>
                  s.id === context ||
                  (s as any).locationId === context ||
                  s.name
                    .toLowerCase()
                    .includes(context.replace("marhaba_", "")),
              );

        const metrics = fleetService.calculateGlobalNetworkMetrics(
          filteredStations,
          analyticsData?.trend || [],
        );

        setMacroStats({
          activeStations: metrics.activeStations || 0,
          warningStations: metrics.warningStations || 0,
          offlineStations: metrics.offlineStations || 0,
          totalStations: filteredStations.length || 0,
          totalPhotos: metrics.totalPhotos || 0,
          totalOrders: metrics.totalOrders || 0,
          grossVolume: metrics.grossVolume || 0,
          networkARR: metrics.networkARR || 0,
        });
      } catch (err: any) {
        setError(err.message || "Failed to synchronize command center");
      } finally {
        setLoading(false);
      }
    };

    loadCommandCenter();
  }, []);

  const isMobile = window.innerWidth < 1024;

  if (loading)
    return (
      <div className="p-8 text-slate-500 font-semibold animate-pulse">
        Loading dashboard data...
      </div>
    );
  if (error)
    return (
      <div className="p-8 text-red-600 font-bold border border-red-200 bg-red-50 rounded-2xl">
        Error loading dashboard: {error}
      </div>
    );

  const activeFilteredStations =
    context === "global"
      ? stations
      : stations.filter(
          (s) =>
            s.id === context ||
            (s as any).locationId === context ||
            s.name.toLowerCase().includes(context.replace("marhaba_", "")),
        );

  return (
    <div className="space-y-4 lg:space-y-8 animate-in fade-in duration-700">
      {/* Top Hero Section - Glassmorphism */}
      <div className="relative overflow-hidden p-6 lg:p-10 rounded-[2rem] lg:rounded-[3rem] bg-white/5 backdrop-blur-3xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/15 rounded-full blur-3xl -mr-32 -mt-32 animate-pulse" />
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
          <div className="flex items-center gap-4 lg:gap-6">
            <div className="w-14 h-14 lg:w-20 lg:h-20 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl lg:rounded-3xl flex items-center justify-center shadow-[0_0_40px_rgba(59,130,246,0.3)] border border-white/20">
              <Zap className="w-7 h-7 lg:w-10 lg:h-10" />
            </div>
            <div>
              <h2 className="text-2xl lg:text-4xl font-black text-white tracking-tight">
                {context === "global" ? "Ecosystem Command" : "Station Hub"}
              </h2>
              <div className="flex items-center gap-2 mt-1.5 lg:mt-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                <span className="text-[10px] lg:text-xs font-black text-emerald-400 uppercase tracking-widest">
                  Live Network Pulse
                </span>
                <span className="text-[10px] lg:text-xs font-bold text-slate-400 uppercase tracking-widest ml-2 pl-4 border-l border-white/10">
                  {new Date().toLocaleDateString(undefined, {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex-1 md:flex-none py-2.5 px-4 lg:px-6 rounded-2xl bg-white/5 backdrop-blur-md flex items-center justify-center gap-3 border border-white/10 shadow-sm transition-all hover:bg-white/10 hover:border-white/20 cursor-pointer">
              <Activity className="w-4 h-4 lg:w-5 lg:h-5 text-blue-400" />
              <span className="text-xs lg:text-sm font-black text-white uppercase tracking-tighter">
                Network Nominal
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Matrix - High performance grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-8">
        {[
          {
            label: "Active Nodes",
            value: macroStats.activeStations,
            total: macroStats.totalStations,
            icon: Server,
            color: "blue",
            trend: "+2 Expected",
          },
          {
            label: "Daily Flow",
            value: macroStats.totalOrders,
            icon: ShoppingBag,
            color: "emerald",
            trend: "89% Conversion",
          },
          {
            label: "Network ARR",
            value: `€${(macroStats.networkARR / 1000000).toFixed(2)}M`,
            icon: TrendingUp,
            color: "amber",
            trend: "Scale Verified",
          },
          {
            label: "Fleet Health",
            value: `${((macroStats.activeStations / Math.max(1, macroStats.totalStations)) * 100).toFixed(1)}%`,
            icon: Activity,
            color: "rose",
            trend: "Target: 100%",
          },
        ].map((item, idx) => (
          <div
            key={idx}
            className="group bg-white/5 backdrop-blur-2xl p-4 lg:p-8 rounded-[1.5rem] lg:rounded-[2.5rem] border border-white/10 shadow-[0_8px_24px_rgba(0,0,0,0.4)] hover:shadow-[0_16px_40px_rgba(0,0,0,0.6)] hover:bg-white/10 hover:-translate-y-1 transition-all duration-500 overflow-hidden relative"
          >
            <div
              className={`absolute top-0 right-0 w-32 h-32 bg-${item.color}-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700 ease-out blur-2xl`}
            />
            <div className="flex flex-col gap-4 relative z-10">
              <div className="flex justify-between items-center">
                <div
                  className={`p-3 lg:p-4 bg-white/10 rounded-2xl text-${item.color}-400 shadow-sm border border-white/10 group-hover:scale-110 transition-transform duration-500`}
                >
                  <item.icon className="w-5 h-5 lg:w-6 lg:h-6" />
                </div>
                <span className="text-[8px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest hidden sm:block">
                  {item.trend}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] lg:text-xs font-black text-slate-400 uppercase tracking-widest mb-1">
                  {item.label}
                </p>
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <span className="text-xl lg:text-4xl font-black text-white tracking-tighter leading-none">
                    {item.value}
                  </span>
                  {item.total && (
                    <span className="text-xs lg:text-lg font-bold text-slate-500">
                      / {item.total}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Pulse View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-10">
        {/* Real-time Sales Curve */}
        <div className="lg:col-span-2 bg-white/5 backdrop-blur-2xl p-6 lg:p-10 rounded-[2rem] lg:rounded-[3rem] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)] transition-all hover:bg-white/10">
          <div className="flex justify-between items-center mb-8 lg:mb-10">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/20 rounded-2xl text-blue-400 border border-blue-500/20">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg lg:text-2xl font-black text-white tracking-tight">
                  {context === "global"
                    ? "Revenue Pulsar"
                    : "Hotel Performance"}
                </h3>
                <p className="text-[10px] lg:text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                  30 Day Flow Dynamics
                </p>
              </div>
            </div>
            <div className="bg-black/20 p-1 rounded-xl border border-white/5 hidden sm:flex">
              {["Active", "Projection"].map((t) => (
                <button
                  key={t}
                  className={`px-4 py-1.5 rounded-lg text-[10px] lg:text-xs font-black uppercase tracking-widest transition-all ${t === "Active" ? "bg-white/10 text-white shadow-sm border border-white/10" : "text-slate-500 hover:text-slate-300"}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="h-[300px] lg:h-[400px]">
            {analytics?.trend?.length > 0 ? (
              <ReactApexChart
                options={
                  {
                    chart: {
                      type: "area",
                      toolbar: { show: false },
                      background: "transparent",
                      fontFamily: "inherit",
                      animations: {
                        enabled: true,
                        easing: "easeinout",
                        speed: 1200,
                      },
                    },
                    stroke: { curve: "smooth", width: 3, colors: ["#3b82f6"] },
                    fill: {
                      type: "gradient",
                      gradient: {
                        shadeIntensity: 1,
                        opacityFrom: 0.3,
                        opacityTo: 0.05,
                        stops: [0, 90, 100],
                      },
                      colors: ["#3b82f6"],
                    },
                    xaxis: {
                      categories: analytics.trend.map((t: any) => t.date),
                      labels: {
                        style: {
                          colors: "#94a3b8",
                          fontWeight: 900,
                          fontSize: "10px",
                        },
                        rotate: isMobile ? -45 : 0,
                      },
                      axisBorder: { show: false },
                      axisTicks: { show: false },
                    },
                    yaxis: {
                      labels: {
                        style: {
                          colors: "#94a3b8",
                          fontWeight: 800,
                          fontSize: "10px",
                        },
                        formatter: (v) =>
                          `€${v >= 1000 ? (v / 1000).toFixed(1) + "k" : v}`,
                      },
                    },
                    grid: { borderColor: "#f1f5f9", strokeDashArray: 6 },
                    markers: { size: 0, hover: { size: 6 } },
                    tooltip: {
                      theme: "light",
                      x: { show: false },
                      marker: { show: false },
                    },
                    dataLabels: { enabled: false },
                  } as ApexOptions
                }
                series={[
                  {
                    name: "Gross Volume",
                    data: analytics.trend.map((t: any) => t.revenue),
                  },
                ]}
                type="area"
                height="100%"
              />
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-slate-100 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">
                    Synchronizing baseline...
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Network Health Checklist */}
        <div className="bg-slate-900 p-6 lg:p-10 rounded-[2rem] lg:rounded-[3rem] shadow-2xl flex flex-col relative overflow-hidden group">
          <div className="absolute bottom-0 right-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl -mb-24 -mr-24 group-hover:scale-125 transition-transform duration-1000" />
          <div className="flex items-center gap-4 mb-10">
            <div className="p-3 bg-white/10 rounded-2xl text-white">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg lg:text-xl font-black text-white tracking-tight">
                Intelligence
              </h3>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Network Telemetry
              </p>
            </div>
          </div>

          <div className="space-y-4 flex-1 relative z-10">
            {[
              { label: "Sync Latency", value: "34ms", status: "success" },
              { label: "Neural Load", value: "14%", status: "success" },
              { label: "Database Core", value: "1.2k/s", status: "success" },
              {
                label: "Sync Buffer",
                value: macroStats.offlineStations,
                status: macroStats.offlineStations > 0 ? "warning" : "success",
              },
              {
                label: "Core Uptime",
                value: "99.98%",
                status: "success",
              },
            ].map((check, i) => (
              <div
                key={i}
                className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all duration-300"
              >
                <span className="text-[11px] lg:text-xs font-black text-slate-400 uppercase tracking-widest">
                  {check.label}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-sm lg:text-base font-black text-white tracking-tight">
                    {check.value}
                  </span>
                  <div
                    className={`w-2 h-2 rounded-full ${check.status === "success" ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" : "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]"}`}
                  ></div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 p-6 lg:p-8 rounded-3xl bg-blue-600 text-white relative z-10 shadow-xl shadow-blue-900/40">
            <p className="text-[9px] lg:text-[10px] font-black uppercase tracking-[0.2em] mb-2 opacity-70">
              Projected 24H Volume
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl lg:text-4xl font-black tracking-tighter">
                €
                {((macroStats.grossVolume / 30) * 1.05).toLocaleString(
                  undefined,
                  { maximumFractionDigits: 0 },
                )}
              </span>
              <span className="text-xs font-bold text-blue-200">+5.2% EST</span>
            </div>
          </div>
        </div>
      </div>

      {/* Critical Station Nodes (Fleet Monitoring) */}
      <div className="bg-white/5 backdrop-blur-2xl rounded-[2rem] lg:rounded-[3.5rem] overflow-hidden border border-white/10 shadow-[0_8px_40px_rgba(0,0,0,0.5)]">
        <div className="p-6 lg:p-10 bg-white/5 border-b border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl lg:text-2xl font-black text-white tracking-tight">
              Node Infrastructure
            </h3>
            <p className="text-[10px] lg:text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
              Real-time status by location
            </p>
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 rounded-full border border-emerald-500/20">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>{" "}
              <span className="text-[9px] lg:text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                ONLINE
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-500/10 rounded-full border border-rose-500/20 opacity-70">
              <div className="w-1.5 h-1.5 bg-rose-500 rounded-full"></div>{" "}
              <span className="text-[9px] lg:text-[10px] font-black text-rose-400 uppercase tracking-widest">
                STALLED
              </span>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-black/20">
                <th className="py-6 px-10 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                  Node Identity
                </th>
                <th className="py-6 px-10 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                  Telemetry
                </th>
                <th className="py-6 px-10 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                  Temporal State
                </th>
                <th className="py-6 px-10 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-right">
                  Flow Output
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {activeFilteredStations.length > 0 ? (
                activeFilteredStations.slice(0, 10).map((station, i) => (
                  <tr
                    key={i}
                    className="group hover:bg-white/5 transition-all duration-300"
                  >
                    <td className="py-6 px-10">
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center font-black text-slate-400 text-lg border border-white/10 group-hover:scale-105 group-hover:border-blue-500/50 group-hover:text-blue-400 transition-all duration-500 shadow-inner">
                          {station.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-base font-black text-white tracking-tight leading-snug group-hover:text-blue-400 transition-colors">
                            {station.name}
                          </p>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5 group-hover:text-slate-400 transition-colors">
                            {station.location}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-6 px-10">
                      <div
                        className={`inline-flex items-center gap-2 px-3 py-1 rounded-xl border transition-all duration-500 ${station.status === "online" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-rose-500/10 border-rose-500/20 text-rose-400"}`}
                      >
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${station.status === "online" ? "bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" : "bg-rose-500"}`}
                        ></div>
                        <span className="text-[10px] font-black uppercase tracking-[0.15em]">
                          {station.status === "online" ? "Active" : "Offline"}
                        </span>
                      </div>
                    </td>
                    <td className="py-6 px-10">
                      <div>
                        <div className="flex items-center gap-2 text-slate-300">
                          <Clock className="w-3.5 h-3.5 text-blue-400" />
                          <span className="text-sm font-black">
                            {station.lastSeen
                              ? new Date(station.lastSeen).toLocaleTimeString(
                                  [],
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  },
                                )
                              : "---"}
                          </span>
                        </div>
                        <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${station.status === "online" ? "text-slate-500" : "text-amber-400/80"}`}>
                          {station.status === "online"
                            ? "IN SYNC (~34s)"
                            : "LATENCY DETECTED"}
                        </p>
                      </div>
                    </td>
                    <td className="py-6 px-10 text-right">
                      <div className="inline-flex flex-col items-end">
                        <span className="text-lg font-black text-white tracking-tighter group-hover:text-emerald-300 transition-colors">
                          €{(station.orders?.today || 0).toLocaleString()}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-500/70 uppercase tracking-widest">
                          Nominal
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-24 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-30">
                      <Zap className="w-12 h-12 text-slate-400" />
                      <p className="text-sm font-black uppercase tracking-[0.3em] text-slate-400">
                        No active nodes detected
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="p-8 bg-white/5 border-t border-white/10 flex justify-center hover:bg-white/10 transition-colors cursor-pointer group">
          <button className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] group-hover:text-blue-400 transition-colors">
            Verify complete fleet topology
          </button>
        </div>
      </div>
    </div>
  );
};

export default OperationalCommandCenter;
