import React, { useState, useEffect } from "react";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
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

  // --- Radial Gauge ---
  const getGaugeOptions = (
    label: string,
    max: number,
    color: string,
    prefix = "€",
  ): ApexOptions => ({
    chart: { type: "radialBar", sparkline: { enabled: true } },
    plotOptions: {
      radialBar: {
        startAngle: -90,
        endAngle: 90,
        track: { background: "#f1f5f9", strokeWidth: "97%" },
        dataLabels: {
          name: {
            show: true,
            offsetY: 20,
            color: "#64748b",
            fontSize: "11px",
            fontWeight: "bold",
          },
          value: {
            offsetY: -5,
            fontSize: "22px",
            fontWeight: 900,
            color: "#1e293b",
            formatter: (val) => prefix + ((val * max) / 100).toFixed(0),
          },
        },
      },
    },
    fill: {
      type: "gradient",
      gradient: {
        type: "horizontal",
        gradientToColors: [color],
        stops: [0, 100],
      },
    },
    stroke: { lineCap: "round" },
    labels: [label],
    colors: [color],
    theme: { mode: "light" },
  });

  // --- Trend Area Chart ---
  const trendOptions: ApexOptions = {
    chart: {
      type: "area",
      toolbar: { show: false },
      background: "transparent",
    },
    stroke: { curve: "smooth", width: 2, colors: ["#06b6d4"] },
    fill: {
      type: "gradient",
      gradient: { opacityFrom: 0.4, opacityTo: 0.02, stops: [20, 100] },
    },
    xaxis: {
      categories: trend.map((t) => (t.date || "").slice(5)),
      labels: { style: { colors: "#64748b" } },
    },
    yaxis: { labels: { show: false } },
    grid: { show: false },
    dataLabels: { enabled: false },
    theme: { mode: "light" },
    tooltip: { theme: "light" },
  };

  // --- Bar: Hour Distribution ---
  const hourBarOptions: ApexOptions = {
    chart: { type: "bar", toolbar: { show: false }, background: "transparent" },
    plotOptions: { bar: { borderRadius: 3, columnWidth: "70%" } },
    dataLabels: { enabled: false },
    xaxis: {
      categories: distribution.map((d) => `${d.hour || 0}h`),
      labels: { style: { colors: "#64748b" } },
    },
    yaxis: {
      labels: { style: { colors: "#64748b" } },
    },
    grid: {
      borderColor: "#f1f5f9",
    },
    colors: ["#6366f1"],
    theme: { mode: "light" },
    tooltip: { theme: "light" },
  };

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

  return (
    <div className="space-y-8 animate-fadeIn pb-20 p-2 sm:p-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="relative overflow-hidden p-8 rounded-3xl bg-white/70 backdrop-blur-xl border border-slate-200/60 shadow-lg flex justify-between items-center group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="flex items-center gap-5 relative z-10">
          <div className="w-14 h-14 bg-cyan-500/10 rounded-2xl flex items-center justify-center border border-cyan-500/20 shadow-lg group-hover:scale-110 transition-transform duration-500">
            <Layers className="w-7 h-7 text-cyan-600" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter">
              Resort Intelligence
            </h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2 mt-1">
              <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.8)]"></span>
              Live Analytical Node
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 relative z-10">
          {lastRefresh && (
            <div className="hidden md:flex flex-col items-end">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                Status Active
              </span>
              <span className="text-[10px] font-bold text-slate-500 mt-0.5">
                Updated: {lastRefresh}
              </span>
            </div>
          )}
          <button
            onClick={fetchAll}
            title="Force Synchronize"
            className="p-3 rounded-2xl bg-white border border-slate-200 text-slate-400 hover:text-cyan-500 hover:border-cyan-200 hover:shadow-lg transition-all active:scale-95"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            label: "Total Revenue",
            value: totalIncome,
            icon: <DollarSign />,
            color: "text-emerald-600",
            trend: "+12%",
          },
          {
            label: "Active Sessions",
            value: 3,
            icon: <Monitor />,
            color: "text-blue-600",
            trend: "Live",
          },
          {
            label: "New Orders",
            value: totalOrders,
            icon: <ShoppingBag />,
            color: "text-indigo-600",
            trend: "Today",
          },
          {
            label: "Photos Processed",
            value: processedPhotos,
            icon: <Camera />,
            color: "text-orange-600",
            trend: "Live",
          },
        ].map((item, i) => (
          <div
            key={item.label}
            className="bg-white/70 backdrop-blur-md rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all"
          >
            <div className="flex justify-between items-start mb-4">
              <div
                className={`p-3 rounded-xl ${item.color.replace("text", "bg").replace("600", "100")} ${item.color}`}
              >
                {item.icon}
              </div>
              <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
                {item.trend}
              </span>
            </div>
            <h3 className="text-slate-500 text-sm font-medium">{item.label}</h3>
            <p className={`text-2xl font-bold mt-1 text-slate-800`}>
              {item.label.includes("Revenue")
                ? `€${item.value.toLocaleString()}`
                : item.value}
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
              <Chart
                options={hourBarOptions}
                series={[
                  { name: "Meetings", data: distribution.map((d) => d.count || 0) },
                ]}
                type="bar"
                height="100%"
              />
            </div>
          )}
        </div>

        <div className="bg-white/70 backdrop-blur-md rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-center">
          <h3 className="text-slate-800 font-bold text-lg mb-6 flex items-center gap-2">
            <Target className="text-orange-500" /> Conversion Funnel
          </h3>
          {isMounted && (
            <Chart
              options={getGaugeOptions("Capture Rate", 100, "#f59e0b", "%")}
              series={[captureRate]}
              type="radialBar"
              height={280}
            />
          )}
          <div className="text-center mt-2">
            <p className="text-slate-500 text-sm">Target vs Actual</p>
            <p className="text-slate-800 font-extrabold text-2xl">
              {captureRate.toFixed(1)}%
            </p>
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
            <Chart
              options={trendOptions}
              series={[
                { name: "Income", data: trend.map((t) => t.income || 0) },
              ]}
              type="area"
              height="100%"
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
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80">
                  <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Session Protocol
                  </th>
                  <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                    Capture Density
                  </th>
                  <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                    Yield Average
                  </th>
                  <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                    Volume
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr className="hover:bg-slate-50/50 transition-colors group/row">
                  <td className="py-5 px-6">
                    <span className="text-[10px] font-black text-blue-600 uppercase bg-blue-50 py-1.5 px-4 rounded-xl border border-blue-100">
                      Single Site
                    </span>
                  </td>
                  <td className="py-5 px-6 text-right text-sm font-bold text-slate-600">
                    {comparison.avg_photos_simple?.toFixed(1) || "—"}{" "}
                    <span className="text-[10px] opacity-40 ml-1">
                      avg/photos
                    </span>
                  </td>
                  <td className="py-5 px-6 text-right text-lg font-black text-slate-900 tracking-tighter">
                    €{comparison.avg_income_simple?.toFixed(2) || "0.00"}
                  </td>
                  <td className="py-5 px-6 text-right text-sm font-black text-slate-500">
                    {comparison.count_simple || 0}
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/50 transition-colors group/row">
                  <td className="py-5 px-6">
                    <span className="text-[10px] font-black text-teal-600 uppercase bg-teal-50 py-1.5 px-4 rounded-xl border border-teal-100">
                      Multi Site
                    </span>
                  </td>
                  <td className="py-5 px-6 text-right text-sm font-bold text-slate-600">
                    {comparison.avg_photos_multiple?.toFixed(1) || "—"}{" "}
                    <span className="text-[10px] opacity-40 ml-1">
                      avg/photos
                    </span>
                  </td>
                  <td className="py-5 px-6 text-right text-lg font-black text-slate-900 tracking-tighter">
                    €{comparison.avg_income_multiple?.toFixed(2) || "0.00"}
                  </td>
                  <td className="py-5 px-6 text-right text-sm font-black text-slate-500">
                    {comparison.count_multiple || 0}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default LocalResortDashboard;
