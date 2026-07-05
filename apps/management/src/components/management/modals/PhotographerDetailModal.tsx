import React, { useMemo } from "react";
import {Photographer, Order} from "../../../types.ts";
import { useCurrency } from "../../CurrencyContext.tsx";
import {X,
  TrendingUp,
  ShoppingBag,
  DollarSign,
  Activity,
  ArrowUpRight} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface PhotographerDetailModalProps {
  photographer: Photographer & {
    totalSales: number;
    totalCosts: number;
    netContribution: number;
    orderCount: number;
    aov: number;
    efficiency: number;
  };
  orders: Order[];
  onClose: () => void;
}

const PhotographerDetailModal: React.FC<PhotographerDetailModalProps> = ({
  photographer,
  orders,
  onClose,
}) => {
  const { formatCurrency } = useCurrency();

  const photographerOrders = useMemo(
    () => orders.filter((o) => o.photographerId === photographer.id),
    [orders, photographer.id],
  );

  const last30DaysData = useMemo(() => {
    const data = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - i,
      );
      const dateStr = date.toISOString().split("T")[0];
      const daySales = photographerOrders
        .filter((o) => o.date === dateStr && o.status === "Completed")
        .reduce((sum, o) => sum + o.total, 0);
      data.push({
        date: date.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
        sales: daySales,
      });
    }
    return data;
  }, [photographerOrders]);

  const chartData = last30DaysData.map((d) => ({
    date: d.date,
    sales: d.sales,
  }));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      ></div>
      <div className="relative w-full max-w-4xl bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col md:flex-row h-[90vh] md:h-auto animate-in fade-in zoom-in duration-300">
        {/* Sidebar Info */}
        <div className="w-full md:w-80 bg-slate-50 p-8 border-r border-slate-100 flex flex-col">
          <div className="flex justify-between items-start md:mb-8">
            <img
              src={photographer.avatarUrl || "/logo.png"}
              alt={photographer.name}
              className="w-20 h-20 rounded-3xl object-cover border-4 border-white shadow-xl"
            />
            <button
              onClick={onClose}
              className="md:hidden p-2 text-slate-400 hover:text-slate-600"
              aria-label="Close"
              title="Close Profile"
            >
              <X size={24} />
            </button>
          </div>

          <div className="mt-6 md:mt-0">
            <h2 className="text-2xl font-black text-slate-900 leading-tight">
              {photographer.name}
            </h2>
            <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em] mt-1">
              Photographer ID: {photographer.id.slice(0, 8)}
            </p>
          </div>

          <div className="mt-8 space-y-4">
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                AOV
              </p>
              <p className="text-xl font-black text-slate-900">
                {formatCurrency(photographer.aov)}
              </p>
            </div>
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                Photo Efficiency
              </p>
              <p className="text-xl font-black text-blue-600">
                {photographer.efficiency.toFixed(1)}%
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="hidden md:flex mt-auto w-full items-center justify-center gap-2 py-4 text-slate-400 hover:text-slate-600 font-bold text-sm transition-colors border-t border-slate-200"
          >
            <X size={16} /> Close Profile
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-white">
          <div className="hidden md:flex justify-end mb-6">
            <button
              onClick={onClose}
              className="p-2 text-slate-300 hover:text-slate-600 transition-colors"
              aria-label="Close"
              title="Close"
            >
              <X size={24} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Sales Trend */}
            <div className="space-y-4">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <TrendingUp size={16} className="text-blue-500" />
                30-Day Sales Trend
              </h3>
              <div className="h-48 bg-slate-50 rounded-3xl p-6 border border-slate-100">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData}
                    margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="modalSalesGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="rgb(59,130,246)"
                          stopOpacity={0.15}
                        />
                        <stop
                          offset="95%"
                          stopColor="rgb(59,130,246)"
                          stopOpacity={0.01}
                        />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" hide />
                    <YAxis hide domain={[0, "auto"]} />
                    <Tooltip
                      formatter={(v) => [
                        formatCurrency(Number(v)),
                        "Daily Sales",
                      ]}
                      cursor={{
                        stroke: "rgba(59,130,246,0.3)",
                        strokeWidth: 1,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="sales"
                      stroke="rgb(59,130,246)"
                      strokeWidth={2}
                      fill="url(#modalSalesGradient)"
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Performance KPIs */}
            <div className="space-y-4">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <Activity size={16} className="text-emerald-500" />
                Lifetime Totals
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 bg-emerald-50 rounded-3xl border border-emerald-100">
                  <DollarSign size={20} className="text-emerald-600 mb-2" />
                  <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest">
                    Revenue
                  </p>
                  <p className="text-lg font-black text-emerald-900">
                    {formatCurrency(photographer.totalSales)}
                  </p>
                </div>
                <div className="p-5 bg-blue-50 rounded-3xl border border-blue-100">
                  <ShoppingBag size={20} className="text-blue-600 mb-2" />
                  <p className="text-[10px] font-bold text-blue-800 uppercase tracking-widest">
                    Orders
                  </p>
                  <p className="text-lg font-black text-blue-900">
                    {photographer.orderCount}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Orders */}
          <div className="mt-12 space-y-4">
            <div className="flex justify-between items-end">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <ShoppingBag size={16} className="text-slate-400" />
                Top Contributing Orders
              </h3>
            </div>
            <div className="space-y-3">
              {photographerOrders
                .sort((a, b) => b.total - a.total)
                .slice(0, 5)
                .map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-100 group transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 group-hover:text-blue-500 shadow-sm border border-slate-200 transition-colors">
                        <ShoppingBag size={18} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-sm">
                          Order #{order.id.slice(-6)}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          {new Date(order.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-slate-900">
                        {formatCurrency(order.total)}
                      </p>
                      <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest flex items-center justify-end gap-1">
                        Completed <ArrowUpRight size={10} />
                      </p>
                    </div>
                  </div>
                ))}
              {photographerOrders.length === 0 && (
                <div className="text-center py-12 text-slate-400 font-bold italic border-2 border-dashed border-slate-100 rounded-3xl">
                  No order history recorded for this photographer yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhotographerDetailModal;
