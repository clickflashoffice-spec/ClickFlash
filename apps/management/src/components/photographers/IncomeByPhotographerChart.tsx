import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card } from "@clickflash/ui";
import { Order, Photographer } from "../../types.ts";
import { useTheme } from "../ThemeContext.tsx";
import { useCurrency } from "../CurrencyContext.tsx";

interface IncomeByPhotographerChartProps {
  orders: Order[];
  photographers: Photographer[];
}

const IncomeByPhotographerChart: React.FC<IncomeByPhotographerChartProps> = ({
  orders,
  photographers,
}) => {
  const { theme } = useTheme();
  const { currency } = useCurrency();

  const data = useMemo(() => {
    const salesMap = new Map<string, number>();
    orders.forEach((order) => {
      if (order.status === "Completed") {
        const pid = String(order.photographerId);
        salesMap.set(pid, (salesMap.get(pid) || 0) + order.total);
      }
    });

    return photographers
      .map((p) => ({
        name: p.name,
        sales: (salesMap.get(String(p.id)) || 0) * currency.rate,
      }))
      .sort((a, b) => b.sales - a.sales);
  }, [orders, photographers, currency]);

  const tickColor = theme === "dark" ? "#94a3b8" : "#64748b";
  const gridColor =
    theme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";

  return (
    <Card className="h-full">
      <h3 className="text-lg font-bold mb-4">Income by Photographer</h3>
      <div className="h-[22rem]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 0, right: 24, left: 0, bottom: 0 }}
          >
            <CartesianGrid
              horizontal={false}
              strokeDasharray="3 3"
              stroke={gridColor}
            />
            <XAxis
              type="number"
              tick={{ fill: tickColor, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) =>
                new Intl.NumberFormat(undefined, {
                  style: "currency",
                  currency: currency.code,
                  notation: "compact",
                }).format(v)
              }
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fill: tickColor, fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={90}
            />
            <Tooltip
              formatter={(value) => [
                new Intl.NumberFormat(undefined, {
                  style: "currency",
                  currency: currency.code,
                }).format(Number(value)),
                `Sales in ${currency.code}`,
              ]}
              cursor={{ fill: "rgba(59,130,246,0.05)" }}
            />
            <Bar dataKey="sales" radius={[0, 4, 4, 0]}>
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill="rgba(59,130,246,0.7)" />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default IncomeByPhotographerChart;
