import React, { useState, useEffect, useCallback } from "react";
import {Activity, 
  ShieldCheck,
  LayoutDashboard,
  LineChart,
  HardDrive,
  Cpu} from "lucide-react";
import { Photographer } from "../../types";
import { cloudApiService } from "../../services/cloudApiService";
import { useStation } from "../../context/StationContext";
import { StationSelector } from "../controls/StationSelector";

import MasterOverview from "./MasterOverview";
import BusinessIntelligence, { BusinessChartsData } from "./BusinessIntelligence";
import ResortIntelligence from "./ResortIntelligence";
import AISwarmCommandCenter from "../../ai/AISwarmCommandCenter";

interface ResortDashboardProps {
  currentUser: Photographer;
}

type DashboardTab = "overview" | "bi" | "fleet" | "swarm";

const ResortDashboard: React.FC<ResortDashboardProps> = ({ currentUser: currentUser }) => {
  const { selectedStationId } = useStation();
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Aggregated Data States
  const [kpis, setKpis] = useState({
    currentIncome: 0,
    monthlyIncome: 0,
    monthlyTarget: 35000,
    basketAverage: 0,
    incomePerCustomer: 0,
    actualMeetingsAvg: 0,
    meetingsTarget: 5.5,
    captureRate: 0,
    conversion: 0,
  });

  const [chartsData, setChartsData] = useState<BusinessChartsData>({
    meetingsTaken: [],
    meetingsMade: [],
    photographerNames: [],
    incomeThemePie: [],
    themeLabels: [],
    simpleSessions: { income: 0, meetings: 0 },
    multipleSessions: { income: 0, meetings: 0 },
  });

  const [trendData, setTrendData] = useState<{ date: string; income: number }[]>([]);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split("T")[0];
      
      // Build query with station/desk filtering if selected
      let url = `/api/analytics/dashboard?endDate=${today}`;
      if (selectedStationId) {
        url += `&deskId=${selectedStationId}`;
      }

      const res = await cloudApiService.get(url);

      if (res.data && res.data.success !== false) {
        const { orderState = [], paymentState = [], commissionState = [] } = res.data.data || res.data;

        let totalIncome = 0;
        let totalMeetingsMade = orderState.length;
        let totalGuests = orderState.length * 3;
        let totalViewingSessions = orderState.length;
        let simpleIncome = 0;
        let multipleIncome = 0;

        const photoThemes: Record<string, number> = {};
        const perfByPhotographer: Record<string, { taken: number; made: number }> = {};
        const dailyIncomeMap: Record<string, number> = {};

        orderState.forEach((o: any) => {
          const amount = o.total_amount || 0;
          if (o.status === 'PAID') {
            totalIncome += amount;
            simpleIncome += amount;
            
            const dateStr = String(o.created_at || '');
            const date = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.split(' ')[0] || 'Unknown Date';
            dailyIncomeMap[date] = (dailyIncomeMap[date] || 0) + amount;
          }

          const pid = o.photographer_id || 'Unknown';
          if (!perfByPhotographer[pid]) {
            perfByPhotographer[pid] = { taken: 0, made: 0 };
          }
          perfByPhotographer[pid].taken += 1;
          if (o.status === 'PAID') {
            perfByPhotographer[pid].made += 1;
          }
        });


        // Computed metrics
        const basketAverage = totalMeetingsMade > 0 ? totalIncome / totalMeetingsMade : 0;
        const captureRate = totalGuests > 0 ? (totalViewingSessions / totalGuests) * 100 : 0;
        const incomePerCustomer = totalGuests > 0 ? totalIncome / totalGuests : 0;
        const conversion = totalViewingSessions > 0 ? (totalMeetingsMade / totalViewingSessions) * 100 : 0;

        const pNames = Object.keys(perfByPhotographer);
        
        setKpis({
            currentIncome: totalIncome,
            monthlyIncome: totalIncome, // This would ideally be a different dataset or sum the months
            monthlyTarget: 35000,
            basketAverage,
            incomePerCustomer,
            actualMeetingsAvg: totalMeetingsMade > 0 ? (totalMeetingsMade / (pNames.length || 1)) : 0,
            meetingsTarget: 5.5,
            captureRate,
            conversion
        });

        setChartsData({
            meetingsTaken: pNames.map(n => perfByPhotographer[n].taken),
            meetingsMade: pNames.map(n => perfByPhotographer[n].made),
            photographerNames: pNames,
            incomeThemePie: Object.values(photoThemes),
            themeLabels: Object.keys(photoThemes),
            simpleSessions: { income: simpleIncome, meetings: totalMeetingsMade / 2 },
            multipleSessions: { income: multipleIncome, meetings: totalMeetingsMade / 2 }
        });

        setTrendData(Object.keys(dailyIncomeMap).sort().map(d => ({ date: d, income: dailyIncomeMap[d] })));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, [selectedStationId]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const TabButton = ({ id, label, icon: Icon }: { id: DashboardTab, label: string, icon: React.ComponentType<{ className?: string }> }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2.5 py-2 px-5 rounded-2xl transition-all duration-500 font-bold uppercase tracking-widest text-[10px] ${
        activeTab === id 
        ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_20px_rgba(6,182,212,0.15)] scale-105" 
        : "text-slate-500 hover:text-white"
      }`}
    >
      <Icon className={`w-4 h-4 ${activeTab === id ? "text-cyan-400" : "text-slate-600"}`} />
      {label}
    </button>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Dynamic Command Header */}
      <div className="relative overflow-hidden p-8 rounded-[3.5rem] bg-slate-900 border border-slate-800 shadow-3xl flex flex-col md:flex-row justify-between items-center gap-6 group">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-cyan-500/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 group-hover:bg-cyan-500/10 transition-all duration-1000"></div>
        <div className="flex items-center gap-6 relative z-10">
          <div className="w-16 h-16 bg-gradient-to-br from-cyan-500/20 to-blue-500/10 rounded-3xl flex items-center justify-center border border-cyan-500/20 shadow-2xl active-glow">
            <LayoutDashboard className="w-8 h-8 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-4xl font-black text-white tracking-tighter leading-tight drop-shadow-2xl">
                Global Operations
            </h2>
            <div className="flex items-center gap-3 mt-1">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                    Central Command Unit
                </p>
                <div className="h-4 w-px bg-slate-800"></div>
                <p className="text-[9px] font-bold text-cyan-500/70 uppercase tracking-widest">
                    V-5.4 Stable
                </p>
            </div>
          </div>
        </div>

        {/* View Switcher & Global Filter */}
        <div className="flex flex-col md:flex-row items-center gap-4 relative z-10">
            <div className="flex bg-slate-950/40 p-1.5 rounded-[1.5rem] border border-slate-800/50">
                <TabButton id="overview" label="Overview" icon={Activity} />
                <TabButton id="bi" label="Analytics" icon={LineChart} />
                <TabButton id="fleet" label="Fleet" icon={HardDrive} />
                <TabButton id="swarm" label="AI Swarm" icon={Cpu} />
            </div>
            <div className="h-10 w-px bg-slate-800 hidden md:block"></div>
            <StationSelector />
        </div>
      </div>

      <div className="min-h-[600px] relative">
        {loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/20 backdrop-blur-sm rounded-[3rem] z-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-cyan-500/10 border-t-cyan-500 rounded-full animate-spin"></div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest animate-pulse">Synchronizing Global Stream...</p>
                </div>
            </div>
        ) : error ? (
            <div className="p-20 text-center glass-panel rounded-[3rem] border-red-500/20 bg-red-500/5">
                <ShieldCheck className="w-12 h-12 text-red-400 mx-auto mb-4" />
                <h3 className="text-xl font-black text-white uppercase tracking-widest">Connection Terminated</h3>
                <p className="text-slate-400 mt-2">{error}</p>
                <button 
                  onClick={fetchDashboardData}
                  className="mt-6 px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  Reconnect Signal
                </button>
            </div>
        ) : (
            <>
                {activeTab === "overview" && <MasterOverview kpis={kpis} stats={[]} />}
                {activeTab === "bi" && <BusinessIntelligence chartsData={chartsData} trendData={trendData} />}
                {activeTab === "fleet" && <ResortIntelligence />}
                {activeTab === "swarm" && <AISwarmCommandCenter />}
            </>
        )}
      </div>

      {/* Footer Info */}
      <div className="flex justify-between items-center px-8 text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">
          <div className="flex items-center gap-4">
              <span>System Latency: 42ms</span>
              <span className="w-1 h-1 bg-slate-800 rounded-full"></span>
              <span>Encrypted SSL/TSL-2.3</span>
          </div>
          <p>© 2025 ClickFlash Photography Ecosystem • All Rights Reserved</p>
      </div>
    </div>
  );
};

export default ResortDashboard;
