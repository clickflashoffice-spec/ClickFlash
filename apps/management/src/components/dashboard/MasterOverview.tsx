import React from "react";
import ReactApexChart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { useStation } from "../../context/StationContext";

interface MasterOverviewProps {
  stats: any;
  kpis: any;
}

const MasterOverview: React.FC<MasterOverviewProps> = ({ stats, kpis }) => {
  const { selectedStationId } = useStation();

  const getGaugeOptions = (
    label: string,
    max: number,
    color: string,
    formatPrefix = "",
  ): ApexOptions => ({
    chart: { type: "radialBar", sparkline: { enabled: true } },
    plotOptions: {
      radialBar: {
        startAngle: -90,
        endAngle: 90,
        track: { background: "#1e293b", margin: 5, strokeWidth: "97%" },
        dataLabels: {
          name: {
            show: true,
            offsetY: 20,
            color: "#64748b",
            fontSize: "12px",
            fontWeight: "bold",
          },
          value: {
            offsetY: -5,
            fontSize: "24px",
            fontWeight: 900,
            color: "#fff",
            formatter: (val) => formatPrefix + ((val * max) / 100).toFixed(2),
          },
        },
      },
    },
    fill: {
      type: "gradient",
      gradient: {
        shade: "dark",
        type: "horizontal",
        gradientToColors: [color],
        stops: [0, 100],
      },
    },
    stroke: { lineCap: "round" },
    labels: [label],
    colors: [color],
  });

  const getPercentageValue = (val: number, max: number) =>
    Math.min(100, (val / max) * 100);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* KPI Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="glass-panel rounded-3xl p-6 border-slate-800/30 flex flex-col items-center justify-center bg-slate-900 shadow-xl">
          <ReactApexChart
            options={getGaugeOptions("Today's Income", 15000, "#10b981", "€")}
            series={[getPercentageValue(kpis.currentIncome, 15000)]}
            type="radialBar"
            height={220}
          />
        </div>

        <div className="glass-panel rounded-3xl p-6 border-slate-800/30 lg:col-span-2 flex flex-col justify-center bg-slate-900 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-[40px] -translate-y-1/2 translate-x-1/2"></div>
            <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2 relative z-10">
                Monthly Income Progress
            </p>
            <div className="flex justify-between items-end mb-2 relative z-10">
                <span className="text-4xl font-black text-white">
                €{kpis.monthlyIncome.toFixed(0)}
                </span>
                <span className="text-xs font-bold text-slate-400">
                Target €{kpis.monthlyTarget}
                </span>
            </div>
            <div className="h-4 bg-slate-950/60 rounded-full p-1 border border-slate-800/50 shadow-inner mb-4 relative z-10 w-full overflow-hidden">
                <div
                className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all duration-1000"
                style={{
                    width: `${Math.min(100, (kpis.monthlyIncome / kpis.monthlyTarget) * 100)}%`,
                }}
                ></div>
            </div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter relative z-10">
                {Math.round((kpis.monthlyIncome / kpis.monthlyTarget) * 100)}% of monthly target achieved
            </p>
        </div>

        <div className="glass-panel rounded-3xl p-6 border-slate-800/30 flex flex-col items-center justify-center bg-slate-900 shadow-xl">
          <ReactApexChart
            options={getGaugeOptions("Basket Average", 200, "#6366f1", "€")}
            series={[getPercentageValue(kpis.basketAverage, 200)]}
            type="radialBar"
            height={220}
          />
        </div>

        <div className="glass-panel rounded-3xl p-6 border-slate-800/30 flex flex-col items-center justify-center bg-slate-900 shadow-xl">
          <ReactApexChart
            options={getGaugeOptions("Income/Cust", 20, "#eab308", "€")}
            series={[getPercentageValue(kpis.incomePerCustomer, 20)]}
            type="radialBar"
            height={220}
          />
        </div>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="glass-panel rounded-3xl p-6 border-slate-800/30 flex flex-col items-center justify-center bg-slate-900 shadow-xl">
          <ReactApexChart
            options={getGaugeOptions("Staff Activity", 10, "#3b82f6", "")}
            series={[getPercentageValue(kpis.actualMeetingsAvg, 10)]}
            type="radialBar"
            height={220}
          />
        </div>

        <div className="glass-panel rounded-3xl p-6 border-slate-800/30 lg:col-span-4 bg-slate-900 shadow-xl flex items-center">
          <div className="grid grid-cols-4 w-full divide-x divide-slate-800">
            <div className="px-4 text-center">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Capture Rate
              </p>
              <p className={`text-3xl font-black mt-2 ${kpis.captureRate >= 15 ? "text-emerald-400" : "text-amber-400"}`}>
                {kpis.captureRate.toFixed(1)}%
              </p>
              <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">
                Target: &gt;15%
              </p>
            </div>
            <div className="px-4 text-center">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Conversion
              </p>
              <p className={`text-3xl font-black mt-2 ${kpis.conversion >= 40 ? "text-emerald-400" : "text-amber-400"}`}>
                {kpis.conversion.toFixed(1)}%
              </p>
              <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">
                Target: &gt;40%
              </p>
            </div>
            <div className="px-4 text-center">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Avg Order Val
              </p>
              <p className={`text-3xl font-black mt-2 ${kpis.basketAverage >= 40 ? "text-emerald-400" : "text-amber-400"}`}>
                €{kpis.basketAverage.toFixed(1)}
              </p>
              <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">
                Target: &gt;€40
              </p>
            </div>
            <div className="px-4 text-center">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Daily Revenue
              </p>
              <p className="text-3xl font-black mt-2 text-cyan-400">
                €{kpis.currentIncome.toLocaleString()}
              </p>
              <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">
                Today's Actual
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MasterOverview;
