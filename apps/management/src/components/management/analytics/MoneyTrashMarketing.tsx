import React, { useState, useEffect, useMemo } from "react";
import {Recycle,
  TrendingUp,
  Users,
  ArrowUpRight,
  Clock,
  Target,
  Mail,
  Zap} from "lucide-react";
import Card from "../../common/Card.tsx";
import Spinner from "../../common/Spinner.tsx";
import { apiService } from "../../../services/apiService.ts";
import { Order, Photographer } from "../../../types.ts";
import { useCurrency } from "../../CurrencyContext.tsx";
import { logger } from "@/utils/logger";

interface MoneyTrashMarketingProps {
  currentUser: Photographer;
  context?: string;
}

const MoneyTrashMarketing: React.FC<MoneyTrashMarketingProps> = ({
  currentUser: currentUser,
  context,
}) => {
  const { formatCurrency } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ orders: Order[] } | null>(null);

  useEffect(() => {
    const fetchRecoveryData = async () => {
      setLoading(true);
      try {
        const orders = await apiService.getOrders();
        setData({ orders });
      } catch (error) {
        logger.error("Failed to load MoneyTrash data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchRecoveryData();
  }, []);

  const stats = useMemo(() => {
    if (!data) return null;

    // Filter by context if provided (Hotel ID)
    const filteredOrders =
      !context || context === "global"
        ? data.orders
        : data.orders.filter((o) => o.destinationId === context);

    // Recovery detection: Orders with source 'website' and status 'Completed'
    const recoveryOrders = filteredOrders.filter(
      (o) => (o.source as string) === "website" && o.status === "Completed",
    );

    // Potential recovery: Website orders that are still pending or cancelled
    const abandonedOrders = filteredOrders.filter(
      (o) =>
        (o.source as string) === "website" &&
        (o.status === "Pending" || o.status === "Cancelled"),
    );

    const totalRecovered = recoveryOrders.reduce((sum, o) => sum + o.total, 0);
    const buybackRate =
      filteredOrders.length > 0
        ? (recoveryOrders.length / filteredOrders.length) * 100
        : 0;

    return {
      buybackRate,
      avgRecoveryTime: 2.8, // Days (Simulated)
      totalRecovered,
      recoveryOrdersCount: recoveryOrders.length,
      abandonedCount: abandonedOrders.length,
      totalTraffic: filteredOrders.length * 5, // Simulation of raw gallery visits
    };
  }, [data, context]);

  if (loading || !stats) {
    return (
      <div className="h-64 flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 animate-fadeIn">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            MoneyTrash Hub
          </h1>
          <p className="text-sm font-medium text-slate-500">
            Digital Asset Recovery & Retention Engine
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center"
              >
                <Users className="w-4 h-4 text-slate-500" />
              </div>
            ))}
          </div>
          <p className="text-xs font-bold text-slate-400">1.2k Leads Tracked</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricItem
          icon={Recycle}
          label="Buy-back Rate"
          value={`${stats.buybackRate.toFixed(1)}%`}
          color="cyan"
        />
        <MetricItem
          icon={Clock}
          label="Avg. Recovery Time"
          value={`${stats.avgRecoveryTime} Days`}
          color="violet"
        />
        <MetricItem
          icon={TrendingUp}
          label="Recovered Revenue"
          value={formatCurrency(stats.totalRecovered)}
          color="emerald"
        />
        <MetricItem
          icon={Target}
          label="Recovery Orders"
          value={stats.recoveryOrdersCount.toString()}
          color="amber"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2" title="Drop-off Recovery Funnel">
          <div className="p-4 space-y-8">
            <FunnelStep
              label="Digital Viewing"
              count={stats.totalTraffic}
              subtext="Guests accessed private galleries"
              percent={100}
              color="bg-slate-200"
            />
            <FunnelStep
              label="Cart Abandonment"
              count={stats.abandonedCount + stats.recoveryOrdersCount}
              subtext="Added to cart but did not finalize"
              percent={Math.round(
                ((stats.abandonedCount + stats.recoveryOrdersCount) /
                  Math.max(1, stats.totalTraffic)) *
                  100,
              )}
              color="bg-indigo-300"
            />
            <FunnelStep
              label="MoneyTrash Recovery"
              count={stats.recoveryOrdersCount}
              subtext="Finalized via automated follow-up"
              percent={Math.round(
                (stats.recoveryOrdersCount /
                  Math.max(
                    1,
                    stats.abandonedCount + stats.recoveryOrdersCount,
                  )) *
                  100,
              )}
              color="bg-emerald-400"
              isTarget
            />
          </div>
        </Card>

        <div className="space-y-6">
          <Card title="Direct Marketing Actions">
            <div className="space-y-3">
              <button
                onClick={() =>
                  alert("Email Recall sequence queued for 124 leads.")
                }
                className="w-full flex items-center justify-between p-4 bg-indigo-50 border border-indigo-100 rounded-2xl group hover:bg-indigo-600 hover:text-white transition-all shadow-sm active:scale-95"
              >
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 opacity-60" />
                  <span className="font-bold text-sm text-indigo-900 group-hover:text-white">
                    Email Recall
                  </span>
                </div>
                <ArrowUpRight className="w-4 h-4 opacity-40 group-hover:opacity-100" />
              </button>
              <button
                onClick={() =>
                  alert("SMS Push notifications scheduled for priority leads.")
                }
                className="w-full flex items-center justify-between p-4 bg-emerald-50 border border-emerald-100 rounded-2xl group hover:bg-emerald-600 hover:text-white transition-all shadow-sm active:scale-95"
              >
                <div className="flex items-center gap-3">
                  <Zap className="w-5 h-5 opacity-60" />
                  <span className="font-bold text-sm text-emerald-900 group-hover:text-white">
                    SMS Push
                  </span>
                </div>
                <ArrowUpRight className="w-4 h-4 opacity-40 group-hover:opacity-100" />
              </button>
            </div>
          </Card>

          <Card className="bg-slate-900 text-white border-none overflow-hidden relative">
            <div className="relative z-10">
              <h3 className="font-bold mb-2">Automation Status</h3>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                  Live & Optimizing
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                The AI agent is currently monitoring cart abandons from 8
                locations.
              </p>
            </div>
            <Recycle className="absolute -bottom-4 -right-4 w-24 h-24 opacity-10 rotate-12" />
          </Card>
        </div>
      </div>
    </div>
  );
};

const MetricItem = ({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  color: string;
}) => {
  const colors: Record<string, string> = {
    cyan: "bg-cyan-50 text-cyan-600",
    violet: "bg-violet-50 text-violet-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
  };

  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 transition-all hover:shadow-md">
      <div className={`p-3 rounded-xl ${colors[color]}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">
          {label}
        </p>
        <p className="text-2xl font-black text-slate-900 leading-none">
          {value}
        </p>
      </div>
    </div>
  );
};

const FunnelStep = ({
  label,
  count,
  subtext,
  percent,
  color,
  isTarget,
}: {
  label: string;
  count: number;
  subtext: string;
  percent: number;
  color: string;
  isTarget?: boolean;
}) => (
  <div className="relative">
    <div className="flex justify-between items-end mb-2">
      <div>
        <h4
          className={`text-sm font-bold ${isTarget ? "text-emerald-600" : "text-slate-900"}`}
        >
          {label}
        </h4>
        <p className="text-[10px] text-slate-400 font-medium">{subtext}</p>
      </div>
      <div className="text-right">
        <p className="text-lg font-black text-slate-900 leading-none">
          {count.toLocaleString()}
        </p>
        <p className="text-[10px] font-bold text-slate-400">
          {percent}% of traffic
        </p>
      </div>
    </div>
    <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
      <div
        className={`h-full ${color} transition-all duration-1000`}
        style={{ width: `${percent}%` }}
      />
    </div>
  </div>
);

export default MoneyTrashMarketing;
