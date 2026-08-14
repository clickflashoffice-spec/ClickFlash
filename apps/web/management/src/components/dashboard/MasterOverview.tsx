import React from "react";
import Gauge from "../common/Gauge";
import MarketingWebhooksWidget from "./widgets/MarketingWebhooksWidget";

interface MasterOverviewKpis {
  currentIncome: number;
  monthlyIncome: number;
  monthlyTarget: number;
  basketAverage: number;
  incomePerCustomer: number;
  actualMeetingsAvg: number;
  captureRate: number;
  conversion: number;
}

interface MasterOverviewProps {
  stats: unknown;
  kpis: MasterOverviewKpis;
}

const getPercentageValue = (val: number, max: number) =>
  Math.min(100, (val / max) * 100);

const MasterOverview: React.FC<MasterOverviewProps> = ({ stats: stats, kpis }) => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* KPI Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Today's Income gauge */}
        <div className="glass-panel rounded-3xl p-6 border-slate-800/30 flex flex-col items-center justify-center bg-slate-900 shadow-xl">
          <Gauge
            value={getPercentageValue(kpis.currentIncome, 15000)}
            label={`€${kpis.currentIncome.toFixed(2)}`}
            subLabel="Today's Income"
            color="#10b981"
            bgColor="#1e293b"
            size={200}
          />
        </div>

        {/* Monthly Income Progress */}
        <div className="glass-panel rounded-3xl p-6 border-slate-800/30 lg:col-span-2 flex flex-col justify-center bg-slate-900 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-[40px] -translate-y-1/2 translate-x-1/2" />
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
            />
          </div>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter relative z-10">
            {Math.round((kpis.monthlyIncome / kpis.monthlyTarget) * 100)}% of
            monthly target achieved
          </p>
        </div>

        {/* Basket Average gauge */}
        <div className="glass-panel rounded-3xl p-6 border-slate-800/30 flex flex-col items-center justify-center bg-slate-900 shadow-xl">
          <Gauge
            value={getPercentageValue(kpis.basketAverage, 200)}
            label={`€${kpis.basketAverage.toFixed(2)}`}
            subLabel="Basket Average"
            color="#6366f1"
            bgColor="#1e293b"
            size={200}
          />
        </div>

        {/* Income per Customer gauge */}
        <div className="glass-panel rounded-3xl p-6 border-slate-800/30 flex flex-col items-center justify-center bg-slate-900 shadow-xl">
          <Gauge
            value={getPercentageValue(kpis.incomePerCustomer, 20)}
            label={`€${kpis.incomePerCustomer.toFixed(2)}`}
            subLabel="Income/Cust"
            color="#eab308"
            bgColor="#1e293b"
            size={200}
          />
        </div>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Staff Activity gauge */}
        <div className="glass-panel rounded-3xl p-6 border-slate-800/30 flex flex-col items-center justify-center bg-slate-900 shadow-xl">
          <Gauge
            value={getPercentageValue(kpis.actualMeetingsAvg, 10)}
            label={kpis.actualMeetingsAvg.toFixed(1)}
            subLabel="Staff Activity"
            color="#3b82f6"
            bgColor="#1e293b"
            size={200}
          />
        </div>

        <div className="glass-panel rounded-3xl p-6 border-slate-800/30 lg:col-span-4 bg-slate-900 shadow-xl flex items-center">
          <div className="grid grid-cols-4 w-full divide-x divide-slate-800">
            <div className="px-4 text-center">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Capture Rate
              </p>
              <p
                className={`text-3xl font-black mt-2 ${kpis.captureRate >= 15 ? "text-emerald-400" : "text-amber-400"}`}
              >
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
              <p
                className={`text-3xl font-black mt-2 ${kpis.conversion >= 40 ? "text-emerald-400" : "text-amber-400"}`}
              >
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
              <p
                className={`text-3xl font-black mt-2 ${kpis.basketAverage >= 40 ? "text-emerald-400" : "text-amber-400"}`}
              >
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

      {/* Tertiary Metrics & Webhooks Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-96">
        <div className="lg:col-span-2">
           {/* Placeholder for future wide widgets */}
           <div className="glass-panel rounded-3xl p-6 border-slate-800/30 bg-slate-900 shadow-xl flex items-center justify-center h-full opacity-50">
             <p className="text-slate-500 uppercase tracking-widest text-[10px] font-bold">Activity Graph (Coming Soon)</p>
           </div>
        </div>
        <div className="lg:col-span-1 h-full">
          <MarketingWebhooksWidget />
        </div>
      </div>
    </div>
  );
};

export default MasterOverview;
