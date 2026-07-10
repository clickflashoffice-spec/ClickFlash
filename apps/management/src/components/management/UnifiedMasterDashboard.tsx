/**
 * UnifiedMasterDashboard
 *
 * Combines all 3 Master app dashboards into a single view:
 * 1. Main Dashboard - KPI cards, recent orders, top performers
 * 2. Resort BI Dashboard - Business intelligence, trends, guest metrics
 * 3. Marketing Dashboard - Campaign management and analytics
 *
 * Shows aggregated data from ALL Master stations worldwide,
 * with per-station drill-down capability.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useManagement } from "../../context/ManagementContext";
import {Globe,
  Hotel,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingBag,
  Camera,
  Clock,
  Users,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Activity,
  Target,
  Mail,
  BarChart3,
  PieChart,
  Image,
  AlertCircle,
  CheckCircle,
  XCircle,
  Zap,
  Eye} from "lucide-react";
import {
  unifiedDashboardService,
  UnifiedDashboardData,
  StationDashboard,
} from "../../services/unifiedDashboardService";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";

type TimeRange = "today" | "7d" | "30d" | "90d";
type ViewMode = "aggregated" | "per-station";

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: { value: string; isPositive: boolean };
  className?: string;
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  className = "",
  onClick,
}) => (
  <div
    className={`
      relative overflow-hidden rounded-2xl border border-white/10 
      bg-gradient-to-br from-white/5 to-white/0 
      hover:from-white/10 hover:to-white/5
      transition-all duration-300
      ${onClick ? "cursor-pointer hover:border-sky-500/30" : ""}
      ${className}
    `}
    onClick={onClick}
  >
    <div className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 rounded-xl bg-white/5 border border-white/5">
          {icon}
        </div>
        {trend && (
          <div
            className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${
              trend.isPositive
                ? "bg-emerald-500/10 text-emerald-400"
                : "bg-red-500/10 text-red-400"
            }`}
          >
            {trend.isPositive ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {trend.value}
          </div>
        )}
      </div>
      <div className="space-y-1">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          {title}
        </p>
        <p className="text-3xl font-black text-white">{value}</p>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>
    </div>
    <div className="absolute inset-0 bg-gradient-to-br from-sky-500/0 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />
  </div>
);

const UnifiedMasterDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<UnifiedDashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<string>("");
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [viewMode, setViewMode] = useState<ViewMode>("aggregated");
  const [selectedStation, setSelectedStation] =
    useState<StationDashboard | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>("kpi");
  
  // Get the selected context from ManagementContext
  const { selectedContext } = useManagement();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const dashboardData = await unifiedDashboardService.getDashboardData(selectedContext);
      setData(dashboardData);
      setLastRefresh(new Date().toLocaleTimeString());
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
      setError("Failed to load dashboard data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [selectedContext]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Format currency
  const formatCurrency = (value: number) => {
    return unifiedDashboardService.formatCurrency(value);
  };

  // Format percentage
  const formatPercentage = (value: number) => {
    return unifiedDashboardService.formatPercentage(value);
  };

  // Loading skeleton
  if (loading && !data) {
    return (
      <div className="w-full h-full min-h-[500px] flex flex-col p-4 animate-pulse">
        <div className="h-12 bg-white/5 rounded-xl w-64 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-40 bg-white/5 border border-white/10 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="h-96 bg-white/5 border border-white/10 rounded-2xl" />
          <div className="h-96 bg-white/5 border border-white/10 rounded-2xl" />
        </div>
      </div>
    );
  }

  // Error state
  if (error && !data) {
    return (
      <div className="w-full h-full min-h-[500px] flex items-center justify-center bg-white/4 border border-white/8 rounded-3xl p-8 backdrop-blur-xl">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-rose-400 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-white mb-2 tracking-tight">
            Failed to Load Dashboard
          </h2>
          <p className="text-slate-400 mb-6 font-medium">{error}</p>
          <button
            onClick={fetchData}
            className="px-6 py-2.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl hover:bg-blue-500/20 font-bold uppercase tracking-widest text-xs transition-all"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const kpi = data?.kpi || {
    totalRevenueToday: 0,
    totalRevenueWeek: 0,
    totalRevenueMonth: 0,
    totalOrdersToday: 0,
    totalOrdersWeek: 0,
    totalOrdersMonth: 0,
    totalPhotosToday: 0,
    albumsToProcess: 0,
    pendingOrders: 0,
    avgOrderValue: 0,
  };

  const aggregated = data?.aggregated || {
    totalStations: 0,
    onlineStations: 0,
    offlineStations: 0,
    topPerformingStation: "N/A",
    lowestPerformingStation: "N/A",
    kpi: {
      totalRevenueToday: 0,
      totalRevenueWeek: 0,
      totalRevenueMonth: 0,
      totalOrdersToday: 0,
      totalOrdersWeek: 0,
      totalOrdersMonth: 0,
      totalPhotosToday: 0,
      totalPhotosWeek: 0,
      totalPhotosMonth: 0,
      albumsToProcess: 0,
      pendingOrders: 0,
      avgOrderValue: 0,
    },
    topPhotographers: [],
    topAlbums: [],
  };

  const marketing = data?.marketing || {
    campaigns: [],
    analytics: {
      totalCampaigns: 0,
      activeCampaigns: 0,
      totalEmailsSent: 0,
      avgOpenRate: 0,
      avgClickRate: 0,
      totalRevenue: 0,
      roi: 0,
    },
  };

  return (
    <div className="flex flex-col w-full animate-in fade-in duration-500">
      {/* Dashboard Header */}
      <div className="sticky top-0 z-30 bg-[#070b14]/80 backdrop-blur-xl border-b border-white/5 -mx-4 lg:-mx-8 px-4 lg:px-8 mb-6 lg:mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="px-2 py-0.5 bg-sky-500/10 border border-sky-500/20 text-sky-400 text-[10px] font-black uppercase rounded tracking-widest">
                  {selectedContext && selectedContext !== "Global / Enterprise" ? `Hotel Context: ${selectedContext}` : "Global Oversight"}
                </span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
                  Master Station Dashboard
                </span>
              </div>
              <h1 className="text-3xl font-black text-white">
                {selectedContext && selectedContext !== "Global / Enterprise" ? `${selectedContext} Dashboard` : "Unified Dashboard"}
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                {selectedContext && selectedContext !== "Global / Enterprise"
                  ? `Filtered view for resort destination: ${selectedContext}`
                  : `Aggregated view across ${aggregated.totalStations} Master stations worldwide`}
              </p>
            </div>

            <div className="flex items-center gap-4">
              {/* Time Range Selector */}
              <div className="flex items-center gap-1 p-1 bg-white/5 rounded-xl border border-white/5">
                {(["today", "7d", "30d", "90d"] as TimeRange[]).map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                      timeRange === range
                        ? "bg-sky-500 text-white"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center gap-1 p-1 bg-white/5 rounded-xl border border-white/5">
                <button
                  onClick={() => setViewMode("aggregated")}
                  className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-2 ${
                    viewMode === "aggregated"
                      ? "bg-sky-500 text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Globe className="w-3 h-3" />
                  All
                </button>
                <button
                  onClick={() => setViewMode("per-station")}
                  className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-2 ${
                    viewMode === "per-station"
                      ? "bg-sky-500 text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Hotel className="w-3 h-3" />
                  Per Station
                </button>
              </div>

              {/* Refresh Button */}
              <button
                onClick={fetchData}
                disabled={loading}
                title="Refresh dashboard"
                className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl transition-all disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-4 h-4 text-slate-400 ${loading ? "animate-spin" : ""}`}
                />
              </button>

              {/* Last Refresh */}
              <span className="text-xs text-slate-500">
                Updated {lastRefresh}
              </span>
            </div>
          </div>
      </div>

      <div className="w-full space-y-6">
        {/* Station Status Bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-white/5 rounded-2xl border border-white/5">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-bold text-white">
                {aggregated.onlineStations} Online
              </span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-400" />
              <span className="text-sm font-bold text-white">
                {aggregated.offlineStations} Offline
              </span>
            </div>
            <div className="h-4 w-px bg-white/10" />
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-sky-400" />
              <span className="text-sm text-slate-400">
                Top:{" "}
                <span className="text-white font-bold">
                  {aggregated.topPerformingStation || "N/A"}
                </span>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-500">Live sync active</span>
          </div>
        </div>

        {/* KPI Cards Grid */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black text-white uppercase tracking-wider">
              Key Performance Indicators
            </h2>
            <button
              onClick={() =>
                setExpandedSection(expandedSection === "kpi" ? null : "kpi")
              }
              className="p-1 hover:bg-white/5 rounded transition-all"
            >
              {expandedSection === "kpi" ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>
          </div>

          {expandedSection !== "kpi" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Revenue"
                value={formatCurrency(
                  timeRange === "today"
                    ? kpi.totalRevenueToday
                    : timeRange === "7d"
                      ? kpi.totalRevenueWeek
                      : kpi.totalRevenueMonth,
                )}
                subtitle={
                  timeRange === "today"
                    ? "Today"
                    : timeRange === "7d"
                      ? "This Week"
                      : "This Month"
                }
                icon={<DollarSign className="w-5 h-5 text-emerald-400" />}
                trend={{ value: "+12%", isPositive: true }}
              />
              <StatCard
                title="Orders"
                value={unifiedDashboardService.formatNumber(
                  timeRange === "today"
                    ? kpi.totalOrdersToday
                    : timeRange === "7d"
                      ? kpi.totalOrdersWeek
                      : kpi.totalOrdersMonth,
                )}
                subtitle={
                  timeRange === "today"
                    ? "Today"
                    : timeRange === "7d"
                      ? "This Week"
                      : "This Month"
                }
                icon={<ShoppingBag className="w-5 h-5 text-sky-400" />}
                trend={{ value: "+8%", isPositive: true }}
              />
              <StatCard
                title="Photos"
                value={unifiedDashboardService.formatNumber(
                  timeRange === "today"
                    ? kpi.totalPhotosToday
                    : timeRange === "7d"
                      ? kpi.totalPhotosToday * 7
                      : kpi.totalPhotosToday * 30,
                )}
                subtitle={
                  timeRange === "today"
                    ? "Today"
                    : timeRange === "7d"
                      ? "This Week"
                      : "This Month"
                }
                icon={<Camera className="w-5 h-5 text-violet-400" />}
                trend={{ value: "+24%", isPositive: true }}
              />
              <StatCard
                title="Avg Order"
                value={formatCurrency(kpi.avgOrderValue)}
                subtitle="Per transaction"
                icon={<BarChart3 className="w-5 h-5 text-amber-400" />}
                trend={{ value: "+5%", isPositive: true }}
              />
            </div>
          )}
        </section>

        {/* Real-time Revenue Trends Chart */}
        {expandedSection !== "kpi" && (
          <section className="bg-white/5 rounded-2xl border border-white/5 overflow-hidden p-6 mt-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-400" />
                Revenue & Orders Trend
              </h3>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={data?.resortBI?.trends || []}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    stroke="#ffffff40"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    yAxisId="left"
                    stroke="#ffffff40"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `€${value / 1000}k`}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="#ffffff40"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      border: "1px solid #ffffff20",
                      borderRadius: "12px",
                      fontSize: "12px",
                      color: "#fff",
                    }}
                    itemStyle={{ fontWeight: "bold" }}
                  />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="income"
                    name="Revenue (€)"
                    stroke="#10b981"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorIncome)"
                  />
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="orders"
                    name="Orders"
                    stroke="#0ea5e9"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorOrders)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {/* SaaS Growth & Metrics */}
        <section className="mb-8">
          <h2 className="text-lg font-black text-white uppercase tracking-wider mb-4">
            SaaS Growth
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatCard
              title="MRR"
              value="$142,500"
              subtitle="Monthly Recurring Revenue"
              icon={<TrendingUp className="w-5 h-5 text-emerald-400" />}
              trend={{ value: "+12.5%", isPositive: true }}
            />
            <StatCard
              title="Active Studios"
              value="2,845"
              subtitle="Paying Subscriptions"
              icon={<Users className="w-5 h-5 text-blue-400" />}
              trend={{ value: "+4.2%", isPositive: true }}
            />
            <StatCard
              title="Trial Conversion"
              value="34.2%"
              subtitle="Free to Paid"
              icon={<Target className="w-5 h-5 text-purple-400" />}
              trend={{ value: "+1.1%", isPositive: true }}
            />
            <StatCard
              title="Churn Rate"
              value="1.8%"
              subtitle="Monthly Churn"
              icon={<TrendingDown className="w-5 h-5 text-red-400" />}
              trend={{ value: "-0.3%", isPositive: true }}
            />
          </div>
        </section>

        {/* Secondary KPIs */}
        <section>
          <h2 className="text-lg font-black text-white uppercase tracking-wider mb-4">
            Operations
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard
              title="Albums to Process"
              value={unifiedDashboardService.formatNumber(kpi.albumsToProcess)}
              subtitle="Pending processing"
              icon={<Image className="w-5 h-5 text-orange-400" />}
            />
            <StatCard
              title="Pending Orders"
              value={unifiedDashboardService.formatNumber(kpi.pendingOrders)}
              subtitle="Awaiting fulfillment"
              icon={<Clock className="w-5 h-5 text-red-400" />}
            />
            <StatCard
              title="Active Campaigns"
              value={marketing.analytics.activeCampaigns.toString()}
              subtitle={`${marketing.analytics.totalCampaigns} total campaigns`}
              icon={<Zap className="w-5 h-5 text-sky-400" />}
            />
          </div>
        </section>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Station List */}
          <div className="xl:col-span-2 space-y-6">
            {/* Station Performance */}
            <section className="bg-white/5 rounded-2xl border border-white/5 overflow-hidden">
              <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Hotel className="w-5 h-5 text-sky-400" />
                  <h3 className="font-black text-white uppercase tracking-wider">
                    {viewMode === "aggregated"
                      ? "All Stations Overview"
                      : "Station Breakdown"}
                  </h3>
                </div>
                <span className="text-xs text-slate-500">
                  {data?.stations?.length || 0} stations
                </span>
              </div>

              <div className="divide-y divide-white/5">
                {data?.stations?.map((station) => (
                  <div
                    key={station.id}
                    onClick={() => {
                      setSelectedStation(station);
                      setViewMode("per-station");
                    }}
                    className={`
                      px-6 py-4 hover:bg-white/5 cursor-pointer transition-all
                      ${selectedStation?.id === station.id ? "bg-sky-500/10" : ""}
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div
                          className={`p-2 rounded-xl ${
                            station.status === "online"
                              ? "bg-emerald-500/10"
                              : "bg-red-500/10"
                          }`}
                        >
                          {station.status === "online" ? (
                            <CheckCircle className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-400" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-bold text-white">
                            {station.name}
                          </h4>
                          <p className="text-xs text-slate-500">
                            {station.location || "Unknown Location"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-8">
                        <div className="text-right">
                          <p className="text-sm font-bold text-white">
                            {formatCurrency(station.kpi.revenueToday)}
                          </p>
                          <p className="text-xs text-slate-500">Today</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-white">
                            {unifiedDashboardService.formatNumber(
                              station.kpi.ordersToday,
                            )}
                          </p>
                          <p className="text-xs text-slate-500">Orders</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-500" />
                      </div>
                    </div>
                  </div>
                ))}

                {(!data?.stations || data.stations.length === 0) && (
                  <div className="px-6 py-12 text-center">
                    <Globe className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">No stations connected</p>
                    <p className="text-xs text-slate-600 mt-1">
                      Master stations will appear here when they come online
                    </p>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Marketing Summary */}
            <section className="bg-white/5 rounded-2xl border border-white/5 overflow-hidden">
              <div className="px-6 py-4 border-b border-white/5 flex items-center gap-3">
                <Mail className="w-5 h-5 text-violet-400" />
                <h3 className="font-black text-white uppercase tracking-wider">
                  Marketing
                </h3>
              </div>

              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">
                    Active Campaigns
                  </span>
                  <span className="font-bold text-white">
                    {marketing.analytics.activeCampaigns}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Emails Sent</span>
                  <span className="font-bold text-white">
                    {unifiedDashboardService.formatNumber(
                      marketing.analytics.totalEmailsSent,
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Avg Open Rate</span>
                  <span className="font-bold text-emerald-400">
                    {formatPercentage(marketing.analytics.avgOpenRate)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Avg Click Rate</span>
                  <span className="font-bold text-sky-400">
                    {formatPercentage(marketing.analytics.avgClickRate)}
                  </span>
                </div>
                <div className="pt-4 border-t border-white/5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">
                      Campaign Revenue
                    </span>
                    <span className="font-bold text-white">
                      {formatCurrency(marketing.analytics.totalRevenue)}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* Resort BI Summary */}
            <section className="bg-white/5 rounded-2xl border border-white/5 overflow-hidden">
              <div className="px-6 py-4 border-b border-white/5 flex items-center gap-3">
                <PieChart className="w-5 h-5 text-amber-400" />
                <h3 className="font-black text-white uppercase tracking-wider">
                  Business Intelligence
                </h3>
              </div>

              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Basket Average</span>
                  <span className="font-bold text-white">
                    {formatCurrency(data?.resortBI?.basketAverage || 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Income/Guest</span>
                  <span className="font-bold text-emerald-400">
                    {formatCurrency(data?.resortBI?.incomePerGuest || 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Total Income</span>
                  <span className="font-bold text-white">
                    {formatCurrency(data?.resortBI?.totalIncome || 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Capture Rate</span>
                  <span className="font-bold text-sky-400">
                    {formatPercentage((data?.resortBI?.captureRate || 0) * 100)}
                  </span>
                </div>
              </div>
            </section>

            {/* Top Performers */}
            <section className="bg-white/5 rounded-2xl border border-white/5 overflow-hidden">
              <div className="px-6 py-4 border-b border-white/5 flex items-center gap-3">
                <Target className="w-5 h-5 text-emerald-400" />
                <h3 className="font-black text-white uppercase tracking-wider">
                  Top Performers
                </h3>
              </div>

              <div className="divide-y divide-white/5">
                {aggregated.topPhotographers
                  .slice(0, 5)
                  .map((photographer, i) => (
                    <div
                      key={photographer.id}
                      className="px-6 py-3 flex items-center gap-4"
                    >
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          i === 0
                            ? "bg-amber-500 text-white"
                            : i === 1
                              ? "bg-slate-400 text-white"
                              : i === 2
                                ? "bg-amber-700 text-white"
                                : "bg-white/5 text-slate-400"
                        }`}
                      >
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">
                          {photographer.name}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {photographer.stationName}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-white">
                          {formatCurrency(photographer.revenue)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {photographer.orders} orders
                        </p>
                      </div>
                    </div>
                  ))}

                {aggregated.topPhotographers.length === 0 && (
                  <div className="px-6 py-8 text-center">
                    <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-xs text-slate-500">
                      No photographer data available
                    </p>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>

        {/* Station Drill-Down Panel */}
        {selectedStation && viewMode === "per-station" && (
          <section className="bg-white/5 rounded-2xl border border-white/5 overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Eye className="w-5 h-5 text-sky-400" />
                <h3 className="font-black text-white uppercase tracking-wider">
                  Station Detail: {selectedStation.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedStation(null)}
                title="Close station detail"
                className="p-1 hover:bg-white/5 rounded transition-all"
              >
                <XCircle className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="p-4 bg-white/5 rounded-xl">
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">
                    Revenue Today
                  </p>
                  <p className="text-2xl font-black text-white">
                    {formatCurrency(selectedStation.kpi.revenueToday)}
                  </p>
                </div>
                <div className="p-4 bg-white/5 rounded-xl">
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">
                    Orders Today
                  </p>
                  <p className="text-2xl font-black text-white">
                    {selectedStation.kpi.ordersToday}
                  </p>
                </div>
                <div className="p-4 bg-white/5 rounded-xl">
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">
                    Photos Today
                  </p>
                  <p className="text-2xl font-black text-white">
                    {selectedStation.kpi.photosToday}
                  </p>
                </div>
                <div className="p-4 bg-white/5 rounded-xl">
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">
                    Status
                  </p>
                  <p
                    className={`text-2xl font-black ${selectedStation.status === "online" ? "text-emerald-400" : "text-red-400"}`}
                  >
                    {selectedStation.status}
                  </p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-4 bg-white/5 rounded-xl">
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">
                    Location
                  </p>
                  <p className="text-lg font-bold text-white">
                    {selectedStation.location || "Unknown"}
                  </p>
                </div>
                <div className="p-4 bg-white/5 rounded-xl">
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">
                    Last Seen
                  </p>
                  <p className="text-lg font-bold text-white">
                    {selectedStation.lastSeen || "N/A"}
                  </p>
                </div>
                <div className="p-4 bg-white/5 rounded-xl">
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">
                    Version
                  </p>
                  <p className="text-lg font-bold text-white">
                    {selectedStation.version || "N/A"}
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default UnifiedMasterDashboard;
