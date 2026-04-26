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
import { useTheme } from "../../ThemeContext.tsx";
import { useCurrency } from "../../CurrencyContext.tsx";

interface PerformanceData {
  name: string;
  netContribution: number;
}

interface ContributionChartProps {
  data: PerformanceData[];
}

const ContributionChart: React.FC<ContributionChartProps> = ({ data }) => {
  const { theme } = useTheme();
  const { currency } = useCurrency();

  const chartData = useMemo(() => {
    return [...data]
      .sort((a, b) => a.netContribution - b.netContribution)
      .map((p) => ({
        name: p.name,
        value: p.netContribution * currency.rate,
      }));
  }, [data, currency]);

  const tickColor = theme === "dark" ? "#94a3b8" : "#64748b";
  const gridColor =
    theme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
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
          width={80}
        />
        <Tooltip
          formatter={(value: number) => [
            new Intl.NumberFormat(undefined, {
              style: "currency",
              currency: currency.code,
            }).format(value),
            `Net Contribution in ${currency.code}`,
          ]}
          cursor={{ fill: "rgba(59,130,246,0.05)" }}
        />
        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
          {chartData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={
                entry.value >= 0
                  ? "rgba(59,130,246,0.7)"
                  : "rgba(239,68,68,0.7)"
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export default ContributionChart;
