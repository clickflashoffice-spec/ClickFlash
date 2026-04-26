import React, { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Order } from "../../../types";
import { useTheme } from "../../ThemeContext";
import { useCurrency } from "../../CurrencyContext";

interface SalesLineChartProps {
  orders: Order[];
}

const SalesLineChart: React.FC<SalesLineChartProps> = ({ orders }) => {
  const { theme } = useTheme();
  const { currency } = useCurrency();

  const data = useMemo(() => {
    const salesByDate = new Map<string, number>();
    orders.forEach((order) => {
      if (order.status === "Completed") {
        salesByDate.set(
          order.date,
          (salesByDate.get(order.date) || 0) + order.total,
        );
      }
    });

    const sortedDates = Array.from(salesByDate.keys()).sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime(),
    );

    return sortedDates.map((date) => ({
      label: new Date(date).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      sales: (salesByDate.get(date) || 0) * currency.rate,
    }));
  }, [orders, currency]);

  const tickColor = theme === "dark" ? "#94a3b8" : "#64748b";
  const gridColor =
    theme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";

  return (
    <div className="h-96">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 16, right: 8, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient
              id="salesLineGradient"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="5%"
                stopColor="rgb(59,130,246)"
                stopOpacity={0.25}
              />
              <stop
                offset="95%"
                stopColor="rgb(59,130,246)"
                stopOpacity={0.02}
              />
            </linearGradient>
          </defs>
          <CartesianGrid
            vertical={false}
            stroke={gridColor}
            strokeDasharray="4 4"
          />
          <XAxis
            dataKey="label"
            tick={{ fill: tickColor, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fill: tickColor, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={56}
            tickFormatter={(v) =>
              new Intl.NumberFormat(undefined, {
                style: "currency",
                currency: currency.code,
                notation: "compact",
              }).format(v)
            }
          />
          <Tooltip
            formatter={(v: number) => [
              new Intl.NumberFormat(undefined, {
                style: "currency",
                currency: currency.code,
              }).format(v),
              `Sales in ${currency.code}`,
            ]}
            cursor={{ stroke: "rgba(59,130,246,0.3)", strokeWidth: 1 }}
          />
          <Area
            type="monotone"
            dataKey="sales"
            name={`Sales in ${currency.code}`}
            stroke="rgb(59,130,246)"
            strokeWidth={2}
            fill="url(#salesLineGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SalesLineChart;
