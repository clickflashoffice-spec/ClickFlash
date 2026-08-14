import React, { useState, useEffect } from "react";
import { AreaChart, BarChart, ProgressBar } from "@tremor/react";
import {
  Layers,
  RefreshCw,
  TrendingUp,
  DollarSign,
  Monitor,
  ShoppingBag,
  Camera,
  Activity,
  Target,
} from "lucide-react";
import { StationStatus } from "../types/shared";
import { FleetHealthWidget } from "./dashboard/widgets/FleetHealthWidget";
import { logger } from '@/utils/logger';

/**
 * LocalResortDashboard
 * Phase 86: Master App Dashboard Polish - High-Density Premium Light Theme
 */

interface TrendPoint {
  date: string;
  income: number;
  orders: number;
}

interface MonthlyStatus {
  income: number;
  orders: number;
  guests: number;
  departures: number;
}

interface Comparison {
  avg_photos_simple: number;
  avg_photos_multiple: number;
  avg_income_simple: number;
  avg_income_multiple: number;
  count_simple: number;
  count_multiple: number;
}

interface DistributionPoint {
  hour: number;
  count: number;
}

const LocalResortDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<string>("");
  const [isMounted, setIsMounted] = useState(false);

  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [monthly, setMonthly] = useState<MonthlyStatus | null>(null);
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [distribution, setDistribution] = useState<DistributionPoint[]>([]);
  const [stationStatus, setStationStatus] = useState<StationStatus | null>(null);
  const [isStatusLoading, setIsStatusLoading] = useState(false);

  const fetchStatus = async () => {
    setIsStatusLoading(true);
    try {
      const res = await fetch("/api/resort-analytics/status");
      const data = await res.json();
      setStationStatus(data);
    } catch (err) {
      logger.error("Failed to fetch station status:", err);
    } finally {
      setIsStatusLoading(false);
    }
  };

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const today = new Date().toISOString().split("T")[0];
      const [trendRes, monthlyRes, compRes, distRes] = await Promise.all([
        fetch("/api/resort-analytics/trend?days=30").then((r) => r.json()),
        fetch("/api/resort-analytics/monthly-status").then((r) => r.json()),
        fetch(`/api/resort-analytics/comparison?date=${today}`).then((r) =>
          r.json(),
        ),
        fetch(`/api/resort-analytics/meeting-distribution?date=${today}`).then(
          (r) => r.json(),
        ),
      ]);
      setTrend(Array.isArray(trendRes) ? trendRes : []);
      setMonthly(monthlyRes || null);
      setComparison(compRes || null);
      setDistribution(Array.isArray(distRes) ? distRes : []);
      setLastRefresh(new Date().toLocaleTimeString());
      
      fetchStatus();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to load local analytics";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    fetchAll();

    const statusInterval = setInterval(() => {
      fetchStatus();
    }, 30000);

    return () => clearInterval(statusInterval);
  }, []);

  // --- Derived KPIs ---
  const totalIncome = trend.reduce((s, t) => s + (t.income || 0), 0);
  const totalOrders = trend.reduce((s, t) => s + (t.orders || 0), 0);
  const processedPhotos = distribution.reduce((s, d) => s + (d.count || 0), 0);
  const basketAverage = totalOrders > 0 ? totalIncome / totalOrders : 0;
  const incomePerGuest =
    monthly?.guests && monthly.guests > 0 ? totalIncome / monthly.guests : 0;
  const captureRate =
    monthly?.guests && monthly.guests > 0
      ? Math.min(100, ((monthly.orders || totalOrders) / monthly.guests) * 100)
      : 0;

  const hourlyChartData = distribution.map((d) => ({
    Hour: `${d.hour || 0}:00`,
    Meetings: d.count || 0,
  }));

  const trendChartData = trend.map((t) => ({
    Date: (t.date || "").slice(5),
    Income: t.income || 0,
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Loading Local BI Dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
        <p className="text-red-600 font-semibold">Failed to load resort data</p>
        <p className="text-red-500 text-sm mt-1">{error}</p>
        <button
          onClick={fetchAll}
          className="mt-4 text-sm text-red-600 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  const kpis = [
    {
      label: "30-Day Revenue",
      value: `€${totalIncome.toLocaleString()}`,
      sub: `${totalOrders} orders completed`,
      icon: DollarSign,
      color: "from-blue-500 to-indigo-600",
      textColor: "text-blue-600",
    },
    {
      label: "Monthly Orders",
      value: (monthly?.orders || totalOrders).toString(),
      sub: `${monthly?.guests ? `${monthly.guests} resort guests` : "Active period"}`,
      icon: ShoppingBag,
      color: "from-emerald-500 to-teal-600",
      textColor: "text-emerald-600",
    },
    {
      label: "Active Stations",
      value: "Fleet Online",
      sub: "Kiosks & Gateways",
      icon: Monitor,
      color: "from-purple-500 to-pink-600",
      textColor: "text-purple-600",
    },
    {
      label: "Photos Analyzed",
      value: processedPhotos.toLocaleString(),
      sub: "Today's sessions",
      icon: Camera,
      color: "from-amber-500 to-orange-600",
      textColor: "text-amber-600",
    },
  ];

  return (
    <div className="space-y-6 pb-8">
      {/* Top Bar */}
      <div className="flex justify-between items-center bg-white/70 backdrop-blur-md rounded-2xl p-4 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-slate-800 font-extrabold text-xl tracking-tight">
              Executive Resort Operations
            </h2>
            <p className="text-slate-500 text-xs font-medium">
              Local telemetry & transaction hub
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {lastRefresh && (
            <span className="text-xs text-slate-400 font-mono">
              Updated: {lastRefresh}
            </span>
          )}
          <button
            onClick={fetchAll}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* Fleet Health Widget */}
      <FleetHealthWidget
        status={stationStatus}
        isLoading={isStatusLoading}
        onRefresh={fetchStatus}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <div
            key={i}
            className="bg-white/70 backdrop-blur-md rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">
                  {kpi.label}
                </p>
                <h3 className="text-2xl font-black text-slate-800 mt-1 tracking-tight">
                  {kpi.value}
                </h3>
              </div>
              <div
                className={`p-2.5 rounded-xl bg-gradient-to-br ${kpi.color} text-white shadow-sm`}
              >
                <kpi.icon className="w-5 h-5" />
              </div>
            </div>
            <p className="text-slate-400 text-xs mt-3 flex items-center gap-1 font-medium">
              {kpi.sub}
            </p>
          </div>
        ))}
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white/70 backdrop-blur-md rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-slate-800 font-bold text-lg flex items-center gap-2">
              <Activity className="text-blue-500" /> Hourly Activity
            </h3>
          </div>
          {isMounted && (
            <div className="h-64">
              <BarChart
                className="h-full"
                data={hourlyChartData}
                index="Hour"
                categories={["Meetings"]}
                colors={["indigo"]}
                showLegend={false}
              />
            </div>
          )}
        </div>

        <div className="bg-white/70 backdrop-blur-md rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-center">
          <h3 className="text-slate-800 font-bold text-lg mb-6 flex items-center gap-2">
            <Target className="text-orange-500" /> Conversion Funnel
          </h3>
          <div className="space-y-4 my-auto">
            <div className="flex justify-between items-center text-sm font-semibold">
              <span className="text-slate-600">Capture Rate</span>
              <span className="text-slate-900 font-bold">{captureRate.toFixed(1)}%</span>
            </div>
            <ProgressBar value={captureRate} color="amber" />
            <div className="text-center pt-2">
              <p className="text-slate-500 text-xs">Target: 80% • Actual: {captureRate.toFixed(1)}%</p>
              <p className="text-slate-800 font-extrabold text-2xl mt-1">
                {captureRate >= 80 ? "🎯 Target Achieved" : "📈 Pacing Up"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Detail Strip */}
      <div className="bg-white/80 backdrop-blur-xl border border-slate-200/60 rounded-[2.5rem] p-7 shadow-xl shadow-slate-200/10">
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-slate-100">
          <div className="px-6 text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
              Portfolio Yield
            </p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <p className="text-3xl font-black text-slate-900 tracking-tighter">
                €{totalIncome.toLocaleString()}
              </p>
              <TrendingUp className="w-5 h-5 text-emerald-500" />
            </div>
            <p className="text-[10px] font-bold mt-1 uppercase tracking-widest text-emerald-500">
              On Pace
            </p>
          </div>
          <div className="px-6 text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
              Avg Order Val
            </p>
            <p
              className={`text-3xl font-black mt-2 tracking-tighter ${basketAverage >= 40 ? "text-slate-900" : "text-amber-500"}`}
            >
              €{basketAverage.toFixed(0)}
            </p>
            <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest">
              Tgt €40
            </p>
          </div>
          <div className="px-6 text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
              Income/Guest
            </p>
            <p className="text-3xl font-black text-slate-900 mt-2 tracking-tighter">
              €{incomePerGuest.toFixed(2)}
            </p>
            <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest">
              LTV Metric
            </p>
          </div>
          <div className="px-6 text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
              Guests Logged
            </p>
            <p className="text-3xl font-black text-cyan-600 mt-2 tracking-tighter">
              {monthly?.guests || 0}
            </p>
            <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest">
              Population
            </p>
          </div>
        </div>
      </div>

      {/* Trend Analysis */}
      <div className="bg-white/70 backdrop-blur-md rounded-2xl p-6 border border-slate-200 shadow-sm">
        <h3 className="text-slate-800 font-bold text-lg mb-6 flex items-center gap-2">
          <TrendingUp className="text-cyan-500" /> Revenue Momentum (30D)
        </h3>
        {isMounted && (
          <div className="h-64">
            <AreaChart
              className="h-full"
              data={trendChartData}
              index="Date"
              categories={["Income"]}
              colors={["cyan"]}
              valueFormatter={(number: number) => `€${number.toLocaleString()}`}
              showLegend={false}
            />
          </div>
        )}
      </div>

      {/* Comparison Table */}
      {comparison && (
        <div className="bg-white/60 backdrop-blur-md border border-slate-200/60 rounded-[2.5rem] p-8 shadow-lg overflow-hidden">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mb-8">
            Comparative Performance Analysis
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-6 rounded-2xl bg-white/80 border border-slate-200/50 shadow-sm">
              <h4 className="font-bold text-slate-800 text-sm mb-4">
                Single vs Multi-Pose Sessions
              </h4>
              <div className="space-y-4 text-xs">
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Single Pose Count</span>
                  <span className="font-bold text-slate-800">
                    {comparison.count_simple}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Multi-Pose Count</span>
                  <span className="font-bold text-slate-800">
                    {comparison.count_multiple}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Avg Revenue (Single)</span>
                  <span className="font-bold text-emerald-600">
                    €{comparison.avg_income_simple.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-500">Avg Revenue (Multi)</span>
                  <span className="font-bold text-emerald-600">
                    €{comparison.avg_income_multiple.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white/80 border border-slate-200/50 shadow-sm flex flex-col justify-center">
              <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-2">
                Multi-Pose Revenue Lift
              </p>
              <p className="text-4xl font-black text-indigo-600 tracking-tight">
                +{comparison.avg_income_simple > 0
                  ? (
                      ((comparison.avg_income_multiple -
                        comparison.avg_income_simple) /
                        comparison.avg_income_simple) *
                      100
                    ).toFixed(0)
                  : 0}
                %
              </p>
              <p className="text-xs text-slate-400 mt-2">
                Higher yield achieved when photographers capture multiple session poses.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LocalResortDashboard;
