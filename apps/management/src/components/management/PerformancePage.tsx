import React, { useState, useEffect, useMemo, useCallback } from "react";
import Card from "../common/Card.tsx";
import { Photographer, Order, Expense } from "../../types.ts";
import { useCurrency } from "../CurrencyContext.tsx";
import { apiService } from "../../services/apiService.ts";
import { fleetService, MasterStation } from "../../services/fleetService.ts";
import Spinner from "../common/Spinner.tsx";
import ContributionChart from "./performance/ContributionChart.tsx";
import PhotographerDetailModal from "./modals/PhotographerDetailModal.tsx";
import {TrendingUp,
  Award,
  Globe,
  Users,
  Camera,
  DollarSign,
  Activity,
  RefreshCw,
} from "lucide-react";

type TimeFilter = "All Time" | "This Month" | "This Year";
type ViewMode = "global" | "photographers";

interface StationStats extends MasterStation {
  total_orders?: number;
  total_photos?: number;
  last_seen?: string;
  Status?: string;
}

interface PhotographerPerformance extends Photographer {
  totalSales: number;
  totalCosts: number;
  netContribution: number;
  orderCount: number;
  aov: number;
  efficiency: number;
}

interface ExpenseWithLegacy extends Expense {
  photographerId?: string;
}

interface OrderWithPhotos extends Order {
  photoCount?: number;
}

// ─── Stat Card ───────────────────────────────────────────────────────────────
import StatCard from "../common/StatCard.tsx";

// ─── Status Badge ─────────────────────────────────────────────────────────────
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const s = status?.toLowerCase();
  const cls =
    s === "online"
      ? "bg-emerald-500/15 text-emerald-400 ring-emerald-500/30"
      : s === "warning"
        ? "bg-amber-500/15 text-amber-400 ring-amber-500/30"
        : "bg-slate-500/15 text-slate-400 ring-slate-500/30";
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ring-1 ${cls}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${s === "online" ? "bg-emerald-400 animate-pulse" : s === "warning" ? "bg-amber-400" : "bg-slate-400"}`}
      />
      {status ?? "Unknown"}
    </span>
  );
};

// ─── Mini bar ─────────────────────────────────────────────────────────────────
const MiniBar: React.FC<{ value: number; max: number; color?: string }> = ({
  value,
  max,
  color = "#6366f1",
}) => {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={
          {
            "--tw-progress": `${pct}%`,
            backgroundColor: color,
          } as React.CSSProperties
        }
      />
    </div>
  );
};

// ─── Global Leaderboard ───────────────────────────────────────────────────────
const GlobalLeaderboard: React.FC<{
  stations: StationStats[];
  formatCurrency: (n: number) => string;
}> = ({ stations, formatCurrency: formatCurrency }) => {
  const sorted = useMemo(
    () =>
      [...stations].sort(
        (a, b) => (b.total_orders ?? 0) - (a.total_orders ?? 0),
      ),
    [stations],
  );
  const maxOrders = sorted[0] ? sorted[0].total_orders || 1 : 1;
  const maxPhotos = Math.max(
    ...sorted.map((s) => s.total_photos || 0),
    1,
  );
  const totalOnline = stations.filter((s) => s.status === "online").length;
  const totalOrders = stations.reduce(
    (acc, s) => acc + (s.total_orders || 0),
    0,
  );
  const totalPhotos = stations.reduce(
    (acc, s) => acc + (s.total_photos || 0),
    0,
  );

  return (
    <div className="space-y-6">
      {/* Global KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Sites"
          value={`${totalOnline} / ${stations.length}`}
          sub="stations online"
          icon={<Globe className="h-5 w-5" />}
          colorClass="text-blue-600"
          trend="up"
        />
        <StatCard
          title="Total Orders (All Sites)"
          value={totalOrders.toLocaleString()}
          sub="across all stations"
          icon={<DollarSign className="h-5 w-5" />}
          colorClass="bg-emerald-500/10 text-emerald-400"
        />
        <StatCard
          title="Total Photos (All Sites)"
          value={totalPhotos.toLocaleString()}
          sub="synced to hub"
          icon={<Camera className="h-5 w-5" />}
          colorClass="bg-violet-500/10 text-violet-400"
        />
        <StatCard
          title="Avg Orders / Site"
          value={
            stations.length > 0
              ? Math.round(totalOrders / stations.length).toLocaleString()
              : "—"
          }
          sub="lifetime average"
          icon={<Activity className="h-5 w-5" />}
          colorClass="bg-amber-500/10 text-amber-400"
        />
      </div>

      {/* Site Leaderboard Table */}
      <Card className="!p-0">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
          <Award className="h-4 w-4 text-amber-400" />
          <h3 className="font-bold text-base">
            Site Leaderboard — All Master Stations
          </h3>
          <span className="ml-auto text-xs text-slate-400">
            {stations.length} registered sites
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-6 py-3 w-8">#</th>
                <th className="px-6 py-3">Station / Site</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Total Orders</th>
                <th className="px-6 py-3">Order Share</th>
                <th className="px-6 py-3 text-right">Total Photos</th>
                <th className="px-6 py-3">Photo Volume</th>
                <th className="px-6 py-3">Last Sync</th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-10 text-center text-slate-400"
                  >
                    No stations connected yet. Master Stations will appear here
                    after their first heartbeat.
                  </td>
                </tr>
              ) : (
                sorted.map((station, idx) => {
                  const orders = station.total_orders || 0;
                  const photos = station.total_photos || 0;
                  const lastSeen = station.lastSeen || station.last_seen;
                  const timeAgo = lastSeen
                    ? (() => {
                        const diff = Date.now() - new Date(lastSeen).getTime();
                        if (diff < 60000) return "Just now";
                        if (diff < 3600000)
                          return `${Math.floor(diff / 60000)}m ago`;
                        if (diff < 86400000)
                          return `${Math.floor(diff / 3600000)}h ago`;
                        return `${Math.floor(diff / 86400000)}d ago`;
                      })()
                    : "Never";

                  return (
                    <tr
                      key={station.id}
                      className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-6 py-3.5 text-slate-400 font-mono text-xs">
                        {idx + 1}
                      </td>
                      <td className="px-6 py-3.5">
                        <div
                          className="font-semibold truncate max-w-[160px]"
                          title={station.name || station.id}
                        >
                          {station.name || station.id}
                        </div>
                        <div className="text-xs text-slate-400 font-mono">
                          {station.id?.slice(0, 12)}…
                        </div>
                      </td>
                      <td className="px-6 py-3.5">
                        <StatusBadge
                          status={
                            station.status || station.Status || "offline"
                          }
                        />
                      </td>
                      <td className="px-6 py-3.5 text-right font-bold font-mono">
                        {orders.toLocaleString()}
                      </td>
                      <td className="px-6 py-3.5 w-32">
                        <MiniBar
                          value={orders}
                          max={maxOrders}
                          color="#6366f1"
                        />
                      </td>
                      <td className="px-6 py-3.5 text-right font-mono text-slate-500 dark:text-slate-300">
                        {photos.toLocaleString()}
                      </td>
                      <td className="px-6 py-3.5 w-32">
                        <MiniBar
                          value={photos}
                          max={maxPhotos}
                          color="#8b5cf6"
                        />
                      </td>
                      <td className="px-6 py-3.5 text-xs text-slate-400 whitespace-nowrap">
                        {timeAgo}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

// ─── Per-Photographer View ────────────────────────────────────────────────────
const PhotographerView: React.FC<{
  photographers: Photographer[];
  orders: Order[];
  expenses: Expense[];
  timeFilter: TimeFilter;
  setTimeFilter: (f: TimeFilter) => void;
  formatCurrency: (n: number) => string;
  onSelect: (p: PhotographerPerformance) => void;
}> = ({
  photographers,
  orders,
  expenses,
  timeFilter,
  setTimeFilter,
  formatCurrency,
  onSelect,
}) => {
  const filterOptions: TimeFilter[] = ["All Time", "This Year", "This Month"];

  const performanceData = useMemo(() => {
    let timeFilteredOrders = orders;
    let timeFilteredExpenses = expenses;
    const now = new Date();

    if (timeFilter === "This Month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split("T")[0];
      timeFilteredOrders = orders.filter((o) => o.date >= start);
      timeFilteredExpenses = expenses.filter((e) => e.date >= start);
    } else if (timeFilter === "This Year") {
      const start = new Date(now.getFullYear(), 0, 1)
        .toISOString()
        .split("T")[0];
      timeFilteredOrders = orders.filter((o) => o.date >= start);
      timeFilteredExpenses = expenses.filter((e) => e.date >= start);
    }

    return photographers
      .map((p) => {
        const sales = timeFilteredOrders
          .filter((o) => o.photographerId === p.id && o.status === "Completed")
          .reduce((sum, o) => sum + o.total, 0);
        const costs = timeFilteredExpenses
          .filter((e) => {
            const legacyId = (e as ExpenseWithLegacy).photographerId;
            const pIds = e.photographerIds || [];
            if (pIds.includes(p.id) && pIds.length > 0) return true;
            if (legacyId === p.id) return true;
            return false;
          })
          .reduce((sum, e) => {
            const legacyId = (e as ExpenseWithLegacy).photographerId;
            const pIds = e.photographerIds || [];
            if (pIds.includes(p.id) && pIds.length > 0) {
              return sum + e.cost / pIds.length;
            } else if (legacyId === p.id) {
              return sum + (e.cost || 0);
            }
            return sum;
          }, 0);
        const totalPhotos = timeFilteredOrders
          .filter((o) => o.photographerId === p.id)
          .reduce((sum, o) => sum + ((o as OrderWithPhotos).photoCount || 0), 0); // Assuming photoCount exists on order or needs collection

        return {
          ...p,
          totalSales: sales,
          totalCosts: costs,
          netContribution: sales - costs,
          orderCount: timeFilteredOrders.filter(
            (o) => o.photographerId === p.id,
          ).length,
          aov:
            sales > 0
              ? sales /
                timeFilteredOrders.filter(
                  (o) => o.photographerId === p.id && o.status === "Completed",
                ).length
              : 0,
          efficiency:
            totalPhotos > 0
              ? (timeFilteredOrders.filter((o) => o.photographerId === p.id)
                  .length /
                  totalPhotos) *
                100
              : 0,
        };
      })
      .sort((a, b) => b.netContribution - a.netContribution);
  }, [photographers, orders, expenses, timeFilter]);

  const totalNet = performanceData.reduce((s, p) => s + p.netContribution, 0);
  const topPerformer = performanceData[0] ?? null;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex justify-end">
        <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
          {filterOptions.map((opt) => (
            <button
              key={opt}
              onClick={() => setTimeFilter(opt)}
              className={`px-3 py-1.5 rounded-md font-semibold text-sm transition-colors ${
                timeFilter === opt
                  ? "bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-white"
                  : "text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard
          title="Total Net Contribution"
          value={formatCurrency(totalNet)}
          icon={<TrendingUp className="h-5 w-5" />}
          colorClass="bg-emerald-500/10 text-emerald-400"
        />
        <StatCard
          title="Top Performer"
          value={topPerformer?.name ?? "—"}
          sub={
            topPerformer
              ? `${formatCurrency(topPerformer.netContribution)} net`
              : undefined
          }
          icon={<Award className="h-5 w-5" />}
          colorClass="bg-amber-500/10 text-amber-400"
        />
      </div>

      {/* Table + Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="!p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="p-4">Photographer</th>
                    <th className="p-4 text-right">Orders</th>
                    <th className="p-4 text-right">AOV</th>
                    <th className="p-4 text-right">Efficiency</th>
                    <th className="p-4 text-right">Income</th>
                    <th className="p-4 text-right">Outcome</th>
                    <th className="p-4 text-right">Net Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {performanceData.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="p-8 text-center text-slate-400"
                      >
                        No photographers found.
                      </td>
                    </tr>
                  ) : (
                    performanceData.map((p) => (
                      <tr
                        key={p.id}
                        onClick={() => onSelect(p)}
                        className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group/row"
                      >
                        <td className="p-4 font-semibold flex items-center space-x-3">
                          <img
                            src={p.avatarUrl}
                            alt={p.name}
                            className="w-9 h-9 rounded-full object-cover bg-slate-200"
                          />
                          <span>{p.name}</span>
                        </td>
                        <td className="p-4 text-right text-slate-500">
                          {p.orderCount}
                        </td>
                        <td className="p-4 text-right font-mono text-slate-600">
                          {formatCurrency(p.aov || 0)}
                        </td>
                        <td className="p-4 text-right font-mono text-blue-500">
                          {((p.efficiency || 0)).toFixed(1)}%
                        </td>
                        <td className="p-4 text-right font-mono text-emerald-500">
                          {formatCurrency(p.totalSales)}
                        </td>
                        <td className="p-4 text-right font-mono text-rose-500">
                          {formatCurrency(p.totalCosts)}
                        </td>
                        <td
                          className={`p-4 text-right font-mono font-bold ${p.netContribution >= 0 ? "text-blue-500" : "text-orange-500"}`}
                        >
                          {formatCurrency(p.netContribution)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
        <div className="lg:col-span-1">
          <Card className="h-full">
            <h3 className="text-base font-bold mb-4">Net Contribution Chart</h3>
            <div className="h-80">
              <ContributionChart
                data={performanceData.map((p) => ({
                  name: p.name,
                  netContribution: p.netContribution,
                }))}
              />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const PerformancePage: React.FC = () => {
  const [photographers, setPhotographers] = useState<Photographer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [stations, setStations] = useState<MasterStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [stationsLoading, setStationsLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("All Time");
  const [viewMode, setViewMode] = useState<ViewMode>("global");
  const [selectedPhotographer, setSelectedPhotographer] = useState<PhotographerPerformance | null>(
    null,
  );
  const { formatCurrency } = useCurrency();

  const fetchLocal = useCallback(async () => {
    setLoading(true);
    try {
      const [users, ordersData, expensesData] = await Promise.all([
        apiService.getUsers(),
        apiService.getOrders(),
        apiService.getExpenses(),
      ]);
      setPhotographers(users);
      setOrders(ordersData);
      setExpenses(expensesData);
    } catch (err) {
      console.error("Failed to load local performance data", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchFleet = useCallback(async () => {
    setStationsLoading(true);
    try {
      const data = await fleetService.getStations();
      setStations(data as StationStats[]);
    } catch (err) {
      console.error("Failed to load fleet stations", err);
    } finally {
      setStationsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocal();
    fetchFleet();
  }, [fetchLocal, fetchFleet]);

  const tabs: { id: ViewMode; label: string; icon: React.ReactNode }[] = [
    {
      id: "global",
      label: "Global Leaderboard",
      icon: <Globe className="h-4 w-4" />,
    },
    {
      id: "photographers",
      label: "Photographer Performance",
      icon: <Users className="h-4 w-4" />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Performance</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Global view across all Master Stations + per-photographer breakdown
          </p>
        </div>
        <button
          onClick={() => {
            fetchLocal();
            fetchFleet();
          }}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
          title="Refresh data"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setViewMode(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              viewMode === tab.id
                ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {viewMode === "global" ? (
        stationsLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <RefreshCw className="h-7 w-7 animate-spin" />
            <span className="text-sm">Loading global fleet data…</span>
          </div>
        ) : (
          <GlobalLeaderboard
            stations={stations}
            formatCurrency={formatCurrency}
          />
        )
      ) : loading ? (
        <Spinner />
      ) : (
        <PhotographerView
          photographers={photographers}
          orders={orders}
          expenses={expenses}
          timeFilter={timeFilter}
          setTimeFilter={setTimeFilter}
          formatCurrency={formatCurrency}
          onSelect={setSelectedPhotographer}
        />
      )}

      {selectedPhotographer && (
        <PhotographerDetailModal
          photographer={selectedPhotographer}
          orders={orders}
          onClose={() => setSelectedPhotographer(null)}
        />
      )}
    </div>
  );
};

export default PerformancePage;
