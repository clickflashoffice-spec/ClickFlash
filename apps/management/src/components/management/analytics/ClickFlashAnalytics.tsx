import React, { useState, useEffect, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";
import {TrendingUp,
  Users,
  ShoppingBag,
  Target,
  Activity,
  Clock,
  ChevronUp,
  ChevronDown,
  Globe,
  Hotel,
  Trophy,
  PieChart,
  BarChart3,
  LayoutDashboard} from "lucide-react";
import Gauge from "../../common/Gauge.tsx";
import { apiService } from "../../../services/apiService";
import { cloudApiService } from "../../../services/cloudApiService";
import { ManagementContext } from "../../../constants.ts";
import { GlobalReportView } from "../reports/GlobalReportView.tsx";
import DashboardProfitability from "../../dashboard/widgets/DashboardProfitability.tsx";
import DashboardIncomeAnalytics from "../../dashboard/widgets/DashboardIncomeAnalytics.tsx";
import type { Order, Booking, Expense, Destination } from "../../../types";

interface ClickFlashAnalyticsProps {
  context?: ManagementContext;
}

type AnalyticsTab = "overview" | "profitability" | "income_analytics";

const ClickFlashAnalytics: React.FC<ClickFlashAnalyticsProps> = ({
  context = "global",
}) => {
  const [loading, setLoading] = useState(true);
  interface AnalyticsData {
    orders: Order[];
    bookings: Booking[];
    expenses: Expense[];
    analytics: Record<string, unknown>;
    destinations: Destination[];
  }

  const [data, setData] = useState<AnalyticsData | null>(null);
  const [timeframe, setTimeframe] = useState("today");
  const [activeTab, setActiveTab] = useState<AnalyticsTab>("overview");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Simulate high-performance data fetching
        // In production, this would hit /api/analytics/pixel-holiday?context=[hotel_id]
        const [orders, bookings, analytics, destinations, expenses] =
          await Promise.all([
            apiService.getOrders(),
            apiService.getBookings(),
            cloudApiService.get("/api/analytics/dashboard"),
            apiService.getDestinations(),
            apiService.getExpenses(),
          ]);

        // Filter data based on context
        const filteredOrders =
          context === "global"
            ? orders
            : orders.filter((o: Order) => o.destinationId === context);

        const filteredBookings =
          context === "global"
            ? bookings
            : bookings.filter((b: Booking) => (b as Booking & { destinationId?: string }).destinationId === context);

        const filteredExpenses =
          context === "global"
            ? expenses
            : expenses.filter((e: Expense) => e.destinationId === context);

        setData({
          orders: filteredOrders,
          bookings: filteredBookings,
          expenses: filteredExpenses,
          analytics: analytics.data,
          destinations: destinations, // Store destinations for leaderboard
        });
      } catch (err) {
        console.error("Dashboard Sync Failed", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [context, timeframe]);

  const stats = useMemo(() => {
    if (!data) return null;

    const income = data.orders.reduce(
      (acc: number, o: Order) => acc + o.total,
      0,
    );
    const target = 18800.0; // Mock target for demonstration
    const ordersCount = data.orders.length;
    const basketAvg = ordersCount > 0 ? income / ordersCount : 0;
    const guests = 2979; // Mock guest count for market penetration
    const incomePerGuest = guests > 0 ? income / guests : 0;
    const meetingsCount = data.bookings.length;
    const meetingsTarget = 5.25; // Target meetings per day

    const totalViewingSessions =
      (data.analytics?.totalViewingSessions as number | undefined) || ordersCount * 1.8; // Realistic fallback
    const conversionRate =
      totalViewingSessions > 0 ? (ordersCount / totalViewingSessions) * 100 : 0;

    return {
      income,
      target,
      incomeProgress: (income / target) * 100,
      basketAvg,
      incomePerGuest,
      meetingsCount,
      meetingsTarget,
      meetingsPerDay: meetingsCount / 30, // Mocked 30-day average
      conversionRate,
    };
  }, [data]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const isMobile = window.innerWidth < 1024;

  if (loading)
    return (
      <div className="p-8 flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div data-testid="spinner" className="w-12 h-12 border-4 border-white/10 border-t-blue-500 rounded-full animate-spin"></div>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">
            Syncing ClickFlash Analytics...
          </p>
        </div>
      </div>
    );

  if (!data) return null;

  const tabs = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "profitability", label: "Profitability", icon: PieChart },
    { id: "income_analytics", label: "Income Deep Dive", icon: BarChart3 },
  ];

  return (
    <div className="space-y-4 lg:space-y-8 animate-in fade-in duration-700">
      {/* Dynamic Header & Tab Navigation */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center p-4 lg:p-6 bg-[#0f172a]/40 backdrop-blur-2xl rounded-2xl lg:rounded-3xl border border-white/10 shadow-2xl shadow-black/50 gap-4 lg:gap-6">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 w-full xl:w-auto">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.3)] shrink-0 border border-white/10">
            {context === "global" ? (
              <Globe className="w-6 h-6" />
            ) : (
              <Hotel className="w-6 h-6" />
            )}
          </div>
          <div className="min-w-0 w-full md:w-auto">
            <h1 className="text-xl lg:text-3xl font-black text-white tracking-tight flex items-center gap-2 truncate">
              {context === "global" ? "Global Network" : "Resort Analytics"}
              <span className="shrink-0 text-[9px] bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-full font-black uppercase tracking-widest border border-emerald-500/30">
                Live
              </span>
            </h1>

            {/* Scrollable Tabs */}
            <div className="flex items-center gap-4 lg:gap-6 mt-3 lg:mt-4 overflow-x-auto pb-1 no-scrollbar -mx-1 px-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as AnalyticsTab)}
                    className={`flex items-center gap-2 text-[10px] lg:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap shrink-0 ${
                      isActive
                        ? "text-blue-600 border-b-2 border-blue-600 pb-1.5"
                        : "text-slate-400 hover:text-slate-600 pb-1.5 border-b-2 border-transparent"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between w-full xl:w-auto gap-4">
          <div className="bg-black/40 backdrop-blur-md p-1 rounded-xl border border-white/10 flex shadow-inner">
            {["today", "7d", "30d"].map((t) => (
              <button
                key={t}
                onClick={() => setTimeframe(t)}
                className={`px-3 lg:px-5 py-1.5 rounded-lg text-[10px] lg:text-xs font-black uppercase tracking-widest transition-all ${timeframe === t ? "bg-white/10 text-blue-400 shadow-sm border border-white/5" : "text-slate-400 hover:text-white"}`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="xl:hidden flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
              +12%
            </span>
          </div>
        </div>
      </div>

      {/* Conditional View Rendering */}
      {activeTab === "overview" && (
        <>
          {/* Top Gauges Matrix - Optimized for all screen sizes */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 lg:gap-6">
            <div className="bg-[#0f172a]/40 backdrop-blur-2xl p-4 lg:p-6 rounded-2xl lg:rounded-3xl border border-white/10 shadow-2xl flex flex-col items-center group hover:bg-[#0f172a]/60 transition-all duration-500 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform" />
              <div className="flex justify-between w-full mb-4 items-center relative z-10">
                <span className="text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Total Income
                </span>
                <Target className="w-4 h-4 text-blue-500/50" />
              </div>
              <div className="scale-90 lg:scale-100 origin-center">
                <Gauge
                  value={stats?.incomeProgress || 0}
                  target={100}
                  label={`${formatCurrency(stats?.income || 0)}`}
                  subLabel="Income / Goal"
                  color={
                    (stats?.incomeProgress || 0) < 90 ? "#eab308" : "#3b82f6"
                  }
                  size={isMobile ? 140 : 180}
                />
              </div>
              <div className="mt-2 lg:mt-4 flex items-center gap-2 text-rose-500 font-bold text-[10px] lg:text-xs bg-rose-50 px-3 py-1 rounded-full border border-rose-100 relative z-10">
                <ChevronDown className="w-3 h-3" />
                6.8% Target Gap
              </div>
            </div>

            <div className="bg-[#0f172a]/40 backdrop-blur-2xl p-4 lg:p-6 rounded-2xl lg:rounded-3xl border border-white/10 shadow-2xl flex flex-col items-center group hover:bg-[#0f172a]/60 transition-all duration-500 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform" />
              <div className="flex justify-between w-full mb-4 items-center relative z-10">
                <span className="text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Order Basket
                </span>
                <ShoppingBag className="w-4 h-4 text-emerald-500/50" />
              </div>
              <div className="scale-90 lg:scale-100 origin-center">
                <Gauge
                  value={((stats?.basketAvg || 0) / 160) * 100}
                  target={81}
                  label={`${formatCurrency(stats?.basketAvg || 0)}`}
                  subLabel="Average Order"
                  color="#10b981"
                  size={isMobile ? 140 : 180}
                />
              </div>
              <div className="mt-2 lg:mt-4 flex items-center gap-2 text-emerald-500 font-bold text-[10px] lg:text-xs bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 relative z-10">
                <ChevronUp className="w-3 h-3" />
                +€1.22 Trend
              </div>
            </div>

            <div className="bg-[#0f172a]/40 backdrop-blur-2xl p-4 lg:p-6 rounded-2xl lg:rounded-3xl border border-white/10 shadow-2xl flex flex-col items-center group hover:bg-[#0f172a]/60 transition-all duration-500 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/10 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform" />
              <div className="flex justify-between w-full mb-4 items-center relative z-10">
                <span className="text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Conversion
                </span>
                <Activity className="w-4 h-4 text-violet-500/50" />
              </div>
              <div className="scale-90 lg:scale-100 origin-center">
                <Gauge
                  value={stats?.conversionRate || 0}
                  target={65}
                  label={`${(stats?.conversionRate || 0).toFixed(1)}%`}
                  subLabel="Success Rate"
                  color="#8b5cf6"
                  size={isMobile ? 140 : 180}
                />
              </div>
              <div className="mt-2 lg:mt-4 flex items-center gap-2 text-violet-500 font-bold text-[10px] lg:text-xs bg-violet-50 px-3 py-1 rounded-full border border-violet-100 relative z-10">
                BEATING AVG
              </div>
            </div>

            <div className="bg-[#0f172a]/40 backdrop-blur-2xl p-4 lg:p-6 rounded-2xl lg:rounded-3xl border border-white/10 shadow-2xl flex flex-col items-center group hover:bg-[#0f172a]/60 transition-all duration-500 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform" />
              <div className="flex justify-between w-full mb-4 items-center relative z-10">
                <span className="text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Per Customer
                </span>
                <Users className="w-4 h-4 text-amber-500/50" />
              </div>
              <div className="scale-90 lg:scale-100 origin-center">
                <Gauge
                  value={((stats?.incomePerGuest || 0) / 10) * 100}
                  label={`${formatCurrency(stats?.incomePerGuest || 0)}`}
                  subLabel="Market Yield"
                  color="#f59e0b"
                  size={isMobile ? 140 : 180}
                />
              </div>
              <div className="mt-2 lg:mt-4 flex items-center gap-2 text-slate-500 font-black text-[9px] lg:text-[10px] uppercase tracking-tighter opacity-70 relative z-10">
                Data from 965 Logged
              </div>
            </div>

            <div className="bg-[#0f172a]/40 backdrop-blur-2xl p-4 lg:p-6 rounded-2xl lg:rounded-3xl border border-white/10 shadow-2xl flex flex-col items-center group hover:bg-[#0f172a]/60 transition-all duration-500 col-span-2 md:col-span-1 md:col-start-2 lg:col-start-auto relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform" />
              <div className="flex justify-between w-full mb-4 items-center relative z-10">
                <span className="text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Daily Pacing
                </span>
                <Clock className="w-4 h-4 text-cyan-500/50" />
              </div>
              <div className="scale-90 lg:scale-100 origin-center">
                <Gauge
                  value={((stats?.meetingsPerDay || 0) / 10) * 100}
                  target={52.5}
                  label={`${stats?.meetingsPerDay.toFixed(2)}`}
                  subLabel="Volume / Day"
                  color="#06b6d4"
                  size={isMobile ? 140 : 180}
                />
              </div>
              <div className="mt-2 lg:mt-4 flex items-center gap-2 text-emerald-500 font-bold text-[10px] lg:text-xs bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 relative z-10">
                Optimal Pace
              </div>
            </div>
          </div>

          {/* Conversion & Theme Core */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Lead-to-Close Matrix */}
            <div
              className={`${context === "global" ? "lg:col-span-1" : "lg:col-span-2"} bg-[#0f172a]/60 backdrop-blur-md p-4 lg:p-6 rounded-3xl border border-white/10 shadow-2xl transition-all hover:shadow-[0_0_30px_rgba(0,0,0,0.5)] hover:border-white/20`}
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg lg:text-xl font-black text-white tracking-tight">
                    Conversion Performance
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Sales Funnel by Photographer
                  </p>
                </div>
                <div className="p-2 bg-white/5 rounded-xl border border-white/10">
                  <PieChart className="w-4 h-4 text-slate-400" />
                </div>
              </div>
              <div className="h-[250px] lg:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: "Seb", Leads: 130, Closings: 28 },
                      { name: "Mih", Leads: 80, Closings: 48 },
                      { name: "Deb", Leads: 25, Closings: 32 },
                      { name: "Mar", Leads: 60, Closings: 45 },
                      { name: "Luc", Leads: 95, Closings: 78 },
                    ]}
                    margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid
                      vertical={false}
                      stroke="#f1f5f9"
                      strokeDasharray="4 4"
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "#64748b", fontSize: 10, fontWeight: 900 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 600 }}
                      tickLine={false}
                      axisLine={false}
                      width={28}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(59,130,246,0.04)" }}
                    />
                    <Legend
                      wrapperStyle={{
                        fontSize: "10px",
                        fontWeight: 900,
                        textAlign: "right",
                      }}
                    />
                    <Bar dataKey="Leads" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={20} />
                    <Bar dataKey="Closings" fill="#1e293b" radius={[6, 6, 0, 0]} maxBarSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {context === "global" ? (
              <div className="lg:col-span-2">
                <GlobalReportView
                  destinations={data.destinations}
                  orders={data.orders}
                />
              </div>
            ) : (
              <>
                {/* Theme Heatmap / Analytics */}
                <div className="bg-[#0f172a]/60 backdrop-blur-md p-4 lg:p-6 rounded-3xl border border-white/10 shadow-2xl flex flex-col transition-all hover:shadow-[0_0_30px_rgba(0,0,0,0.5)] hover:border-white/20">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg lg:text-xl font-black text-white tracking-tight">
                        Theme Insights
                      </h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Revenue Allocation by Style
                      </p>
                    </div>
                    <div className="p-2 bg-amber-500/10 rounded-xl border border-amber-500/20">
                      <Trophy className="w-4 h-4 text-amber-500" />
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col items-center justify-center min-h-[300px]">
                    <ResponsiveContainer width="100%" height={280}>
                      <RechartsPieChart>
                        <Pie
                          data={[
                            { name: "Poolside", value: 30 },
                            { name: "Ocean Front", value: 20 },
                            { name: "Golden Hour", value: 40 },
                            { name: "After Dark", value: 60 },
                            { name: "Studio Session", value: 10 },
                          ]}
                          cx="50%"
                          cy="42%"
                          innerRadius="52%"
                          outerRadius="70%"
                          dataKey="value"
                          nameKey="name"
                          strokeWidth={0}
                        >
                          {["#3b82f6", "#06b6d4", "#f59e0b", "#1e293b", "#ec4899"].map(
                            (color, index) => (
                              <Cell key={`cell-${index}`} fill={color} />
                            ),
                          )}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#0f172a",
                            border: "1px solid #1e293b",
                            borderRadius: "8px",
                          }}
                          labelStyle={{ color: "#94a3b8" }}
                          itemStyle={{ color: "#e2e8f0" }}
                        />
                        <Legend
                          iconType="circle"
                          iconSize={10}
                          wrapperStyle={{
                            fontSize: "10px",
                            fontWeight: 900,
                            color: "#94a3b8",
                          }}
                        />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                      Total:{" "}
                      <span className="text-white font-black">160</span>
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {activeTab === "profitability" && (
        <DashboardProfitability
          orders={data.orders}
          expenses={data.expenses}
          destinations={data.destinations}
          formatCurrency={formatCurrency}
        />
      )}

      {activeTab === "income_analytics" && (
        <DashboardIncomeAnalytics
          orders={data.orders}
          formatCurrency={formatCurrency}
        />
      )}
    </div>
  );
};

export default ClickFlashAnalytics;
