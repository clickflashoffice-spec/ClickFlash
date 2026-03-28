import React from "react";
import ReactApexChart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { useStation } from "../../context/StationContext";

interface BusinessIntelligenceProps {
  chartsData: any;
  trendData: any;
}

const BusinessIntelligence: React.FC<BusinessIntelligenceProps> = ({ chartsData, trendData }) => {
  const { selectedStationId } = useStation();

  // --- Bar Chart (Meetings)
  const barOptions: ApexOptions = {
    chart: { type: "bar", toolbar: { show: false }, background: "transparent" },
    plotOptions: {
      bar: { horizontal: false, columnWidth: "60%", borderRadius: 4 },
    },
    dataLabels: { enabled: false },
    stroke: { show: true, width: 2, colors: ["transparent"] },
    xaxis: {
      categories: chartsData.photographerNames,
      labels: { style: { colors: "#64748b" } },
    },
    yaxis: { labels: { style: { colors: "#64748b" } } },
    fill: { opacity: 1 },
    colors: ["#6366f1", "#14b8a6"],
    theme: { mode: "dark" },
    legend: { position: "top", labels: { colors: "#94a3b8" } },
  };

  // --- Donut Chart (Themes)
  const donutOptions: ApexOptions = {
    chart: { type: "donut", background: "transparent" },
    labels:
      chartsData.themeLabels?.length > 0
        ? chartsData.themeLabels
        : ["Pool", "Beach", "Night", "Restaurant"],
    colors: ["#3b82f6", "#14b8a6", "#8b5cf6", "#f59e0b", "#ec4899"],
    stroke: { show: true, colors: ["#020617"], width: 2 },
    legend: { position: "right", labels: { colors: "#94a3b8" } },
    dataLabels: { enabled: false },
    theme: { mode: "dark" },
    plotOptions: { pie: { donut: { size: "75%" } } },
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Performance Bar */}
        <div className="glass-panel p-8 rounded-[3rem] border-slate-800/30 bg-slate-900 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[80px] -translate-y-1/2 -translate-x-1/2"></div>
            <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6 relative z-10">
                Staff Performance Leaderboard
            </h3>
            <div className="h-64 relative z-10">
                <ReactApexChart
                options={barOptions}
                series={[
                    { name: "Meetings Taken", data: chartsData.meetingsTaken },
                    { name: "Sales Made", data: chartsData.meetingsMade },
                ]}
                type="bar"
                height="100%"
                />
            </div>
        </div>

        {/* Theme Donut */}
        <div className="glass-panel p-8 rounded-[3rem] border-slate-800/30 bg-slate-900 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2"></div>
            <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6 relative z-10">
                Photo Content Strategy (Themes)
            </h3>
            <div className="h-64 relative z-10">
                {chartsData.incomeThemePie.length > 0 ? (
                <ReactApexChart
                    options={donutOptions}
                    series={chartsData.incomeThemePie}
                    type="donut"
                    height="100%"
                />
                ) : (
                <div className="h-full flex items-center justify-center text-slate-500 font-bold uppercase tracking-widest text-xs">
                    No Theme Data Available
                </div>
                )}
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Product Mix Table */}
        <div className="glass-panel p-8 rounded-[3rem] border-slate-800/30 bg-slate-900 shadow-2xl overflow-hidden">
          <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6">
            Product Mix Analysis
          </h3>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/40">
                <th className="py-2 px-4 text-[10px] font-black text-slate-500 uppercase">Product Type</th>
                <th className="py-2 px-4 text-[10px] font-black text-slate-500 uppercase text-right">Revenue Avg</th>
                <th className="py-2 px-4 text-[10px] font-black text-slate-500 uppercase text-right">Unit Dist.</th>
                <th className="py-2 px-4 text-[10px] font-black text-slate-500 uppercase text-right">Volume</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
              <tr className="hover:bg-slate-800/40 transition-colors">
                <td className="py-3 px-4">
                  <span className="text-[10px] font-black text-blue-400 uppercase bg-blue-500/10 py-1 px-3 rounded border border-blue-500/20">
                    Simple Selection
                  </span>
                </td>
                <td className="py-3 px-4 text-right text-sm font-black text-white">
                  €{chartsData.simpleSessions.income.toFixed(2)}
                </td>
                <td className="py-3 px-4 text-right text-xs font-bold text-slate-300">1.0 Units</td>
                <td className="py-3 px-4 text-right text-xs font-bold text-slate-300">
                  {chartsData.simpleSessions.meetings.toFixed(0)}
                </td>
              </tr>
              <tr className="hover:bg-slate-800/40 transition-colors">
                <td className="py-3 px-4">
                  <span className="text-[10px] font-black text-teal-400 uppercase bg-teal-500/10 py-1 px-3 rounded border border-teal-500/20">
                    Multiple Assets
                  </span>
                </td>
                <td className="py-3 px-4 text-right text-sm font-black text-white">
                  €{chartsData.multipleSessions.income.toFixed(2)}
                </td>
                <td className="py-3 px-4 text-right text-xs font-bold text-slate-300">3.5 Units</td>
                <td className="py-3 px-4 text-right text-xs font-bold text-slate-300">
                  {chartsData.multipleSessions.meetings.toFixed(0)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Breakdown bar */}
        <div className="glass-panel p-8 rounded-[3rem] border-slate-800/30 bg-slate-900 shadow-2xl flex flex-col justify-center">
          <h3 className="text-xs font-black text-white mb-6 uppercase tracking-[0.25em]">
            Revenue Engine Decomposition
          </h3>
          <div className="h-10 bg-slate-950/60 rounded-2xl flex overflow-hidden border border-slate-800/50 p-1">
            <div
              className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-xl flex items-center justify-center text-[10px] font-black text-white shadow-lg z-10"
              style={{ width: "92%" }}
            >
              PRIMARY (92%)
            </div>
            <div
              className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-xl flex items-center justify-center text-[10px] font-black text-white -ml-2 pl-4"
              style={{ width: "8%" }}
            >
              SECONDARY (8%)
            </div>
          </div>
          <p className="text-slate-500 text-[10px] mt-4 font-bold uppercase tracking-widest text-center">
            Calculated from {selectedStationId ? "Station " + selectedStationId : "Global Fleet"} Volume
          </p>
        </div>
      </div>
    </div>
  );
};

export default BusinessIntelligence;
