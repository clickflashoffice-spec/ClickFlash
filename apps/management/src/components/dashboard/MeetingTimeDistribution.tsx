import React from "react";
import ReactApexChart from "react-apexcharts";
import { ApexOptions } from "apexcharts";

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
  const series = data.map((d) => d.meeting_count);
  const labels = data.map((d) => d.time_slot);

  const options: ApexOptions = {
    chart: {
      type: "donut",
      background: "transparent",
      fontFamily: "inherit",
    },
    colors: ["#3b82f6", "#10b981", "#f59e0b", "#6366f1"],
    labels: labels,
    stroke: {
      show: false,
    },
    dataLabels: {
      enabled: false,
    },
    legend: {
      position: "bottom",
      fontSize: "12px",
      fontWeight: 600,
      labels: {
        colors: "#94a3b8",
      },
      markers: {},
      itemMargin: {
        horizontal: 10,
        vertical: 5,
      },
    },
    plotOptions: {
      pie: {
        donut: {
          size: "70%",
          labels: {
            show: true,
            name: {
              show: true,
              fontSize: "12px",
              fontWeight: 600,
              color: "#64748b",
              offsetY: -10,
            },
            value: {
              show: true,
              fontSize: "20px",
              fontWeight: 800,
              color: "#ffffff",
              offsetY: 4,
              formatter: (val) => val,
            },
            total: {
              show: true,
              label: "TOTAL",
              color: "#64748b",
              fontSize: "10px",
              fontWeight: 700,
              formatter: (w) => {
                return w.globals.seriesTotals.reduce(
                  (a: number, b: number) => a + b,
                  0,
                );
              },
            },
          },
        },
      },
    },
    tooltip: {
      theme: "dark",
      style: {
        fontSize: "12px",
      },
    },
  };

  return (
    <div className="w-full h-full flex flex-col justify-center">
      <ReactApexChart
        options={options}
        series={series}
        type="donut"
        height={280}
      />
    </div>
  );
};

export default MeetingTimeDistribution;
