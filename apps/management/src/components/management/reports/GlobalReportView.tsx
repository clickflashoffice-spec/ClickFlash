import React from "react";
import { Card } from "@clickflash/ui";
import { Order, Destination } from "../../../types.ts";
import { useCurrency } from "../../CurrencyContext.tsx";
import {Globe, Trophy} from "lucide-react";

interface GlobalReportViewProps {
  orders: Order[];
  destinations: Destination[];
}

export const GlobalReportView: React.FC<GlobalReportViewProps> = ({
  orders,
  destinations,
}) => {
  const { formatCurrency } = useCurrency();

  const sitePerformance = React.useMemo(() => {
    return destinations
      .map((dest) => {
        const siteOrders = orders.filter((o) => o.destinationId === dest.id);
        const revenue = siteOrders.reduce((sum, o) => sum + o.total, 0);
        return {
          ...dest,
          revenue,
          orderCount: siteOrders.length,
          aov: siteOrders.length > 0 ? revenue / siteOrders.length : 0,
        };
      })
      .sort((a, b) => b.revenue - a.revenue);
  }, [orders, destinations]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2" title="Global Site Leaderboard">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 italic text-slate-400 text-sm">
                  <th className="pb-3 font-medium">Destination</th>
                  <th className="pb-3 font-medium text-center">Orders</th>
                  <th className="pb-3 font-medium text-right text-emerald-600">
                    Cash
                  </th>
                  <th className="pb-3 font-medium text-right text-blue-600">
                    Card
                  </th>
                  <th className="pb-3 font-medium text-right">Total Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {sitePerformance.map((site, index) => (
                  <tr
                    key={site.id}
                    className="group hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 flex items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                          {index + 1}
                        </span>
                        <span className="font-semibold text-slate-900">
                          {site.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 text-center text-slate-600 font-medium">
                      {site.orderCount}
                    </td>
                    <td className="py-4 text-right text-emerald-600 font-semibold italic">
                      {formatCurrency(
                        orders
                          .filter(
                            (o) =>
                              o.destinationId === site.id &&
                              o.paymentMethod !== "Card",
                          )
                          .reduce((s, o) => s + o.total, 0),
                      )}
                    </td>
                    <td className="py-4 text-right text-blue-600 font-semibold italic">
                      {formatCurrency(
                        orders
                          .filter(
                            (o) =>
                              o.destinationId === site.id &&
                              o.paymentMethod === "Card",
                          )
                          .reduce((s, o) => s + o.total, 0),
                      )}
                    </td>
                    <td className="py-4 text-right font-black text-slate-900">
                      {formatCurrency(site.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-6">
          <Card
            title="Network Health"
            className="bg-indigo-600 text-white border-none shadow-indigo-200"
          >
            <div className="flex items-center justify-between mb-4">
              <Globe className="w-8 h-8 opacity-50" />
              <span className="px-2 py-1 rounded-full bg-white/20 text-[10px] font-bold uppercase tracking-widest">
                All Systems Nominal
              </span>
            </div>
            <p className="text-3xl font-bold mb-1">100%</p>
            <p className="text-indigo-100 text-sm">
              Real-time sync uptime across 12 active Masters.
            </p>
          </Card>

          <Card title="Top Global Performance">
            <div className="flex items-center gap-4 p-4 bg-amber-50 rounded-2xl border border-amber-100">
              <Trophy className="w-10 h-10 text-amber-500 shrink-0" />
              <div>
                <p className="text-xs font-bold text-amber-700 uppercase tracking-tight">
                  Best Conversion
                </p>
                <p className="text-lg font-bold text-slate-900 leading-tight">
                  Plimmiri Magic Life
                </p>
                <p className="text-sm font-medium text-amber-600">
                  48.2% (↑ 5.1%)
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
