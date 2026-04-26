import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const DONUT_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#6366f1", "#ec4899"];

interface MeetingTimePoint {
  time_slot: string;
  meeting_count: number;
}

interface MeetingTimeDistributionProps {
  data: MeetingTimePoint[];
}

const MeetingTimeDistribution: React.FC<MeetingTimeDistributionProps> = ({
  data,
}) => {
  const chartData = data.map((d) => ({
    name: d.time_slot,
    value: d.meeting_count,
  }));

  const total = chartData.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="w-full h-full flex flex-col justify-center">
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="45%"
            innerRadius="55%"
            outerRadius="75%"
            dataKey="value"
            nameKey="name"
            strokeWidth={0}
          >
            {chartData.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={DONUT_COLORS[index % DONUT_COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "#1e293b",
              border: "1px solid #334155",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            labelStyle={{ color: "#94a3b8" }}
            itemStyle={{ color: "#e2e8f0" }}
          />
          <Legend
            iconType="circle"
            iconSize={10}
            wrapperStyle={{
              fontSize: "12px",
              fontWeight: 600,
              color: "#94a3b8",
              paddingTop: "8px",
            }}
          />
          {/* Center label rendered as a custom element via SVG */}
        </PieChart>
      </ResponsiveContainer>

      {/* Total count displayed below */}
      <p className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
        Total:{" "}
        <span className="text-white text-sm font-black">{total}</span>
      </p>
    </div>
  );
};

export default MeetingTimeDistribution;
