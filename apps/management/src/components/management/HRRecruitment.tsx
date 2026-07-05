import React, { useState } from "react";
import {Search, AlertCircle, UserPlus, LogOut, Briefcase, ChevronRight} from "lucide-react";
import { PixelFounderCard } from "../common/PixelFounderCard.tsx";

interface StaffAction {
  id: string;
  name: string;
  type: "Recruitment" | "Exit";
  status: "Pending" | "Approved" | "Active";
  date: string;
}

const HRRecruitment: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [actions, setActions] = useState<StaffAction[]>([]);
  const [_loading, setLoading] = useState(true);

  React.useEffect(() => {
    fetch("/api/hr/actions")
      .then(res => res.json())
      .then(data => {
        setActions(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch HR actions", err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-serif font-black text-white">HR: Recruitment & Exits</h2>
          <p className="text-sm font-bold text-[#94a3b8] uppercase tracking-widest mt-2">Staff Audits & Resource Management</p>
        </div>
        <button className="btn-ai bg-[#38bdf8] text-[#070b14]">
          <UserPlus className="w-5 h-5" />
          Add Personnel
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <PixelFounderCard title="Active HR Pipeline" subtitle="Staffing Flow">
             <div className="mt-4 space-y-4">
                <div className="flex gap-4 p-4 bg-white/5 rounded-2xl border border-white/10">
                  <Search className="w-5 h-5 text-[#94a3b8]" />
                  <input 
                    type="text" 
                    placeholder="Search personnel..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-transparent border-none outline-none text-sm font-bold text-white flex-1"
                  />
                </div>

                <div className="space-y-4">
                   {actions.map((act) => (
                     <div key={act.id} className="flex items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/5 hover:border-[#38bdf8]/30 transition-all group">
                        <div className="flex items-center gap-5">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border border-white/5 ${act.type === 'Recruitment' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                            {act.type === 'Recruitment' ? <UserPlus className="w-6 h-6" /> : <LogOut className="w-6 h-6" />}
                          </div>
                          <div>
                            <h4 className="text-base font-black text-white uppercase">{act.name}</h4>
                            <div className="text-[10px] text-[#94a3b8] font-black uppercase tracking-widest">{act.type} • {act.date}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                           <span className={`px-3 py-1 text-[9px] font-black uppercase rounded-full border ${act.status === 'Approved' ? 'text-emerald-500 border-emerald-500/20' : 'text-amber-500 border-amber-500/20'}`}>
                             {act.status}
                           </span>
                           <button className="p-2.5 bg-white/5 rounded-xl text-[#94a3b8] hover:text-[#38bdf8] transition-all" title="View Details">
                             <ChevronRight className="w-5 h-5" />
                           </button>
                        </div>
                     </div>
                   ))}
                </div>
             </div>
          </PixelFounderCard>
        </div>

        <div className="space-y-8">
           <PixelFounderCard title="Staff Morale" subtitle="AI Sentiment Audit">
              <div className="mt-6 flex flex-col items-center">
                 <div className="text-5xl font-serif font-black text-emerald-500">92%</div>
                 <span className="text-[10px] font-black uppercase tracking-widest text-[#94a3b8] mt-2 text-center">Current Network Sentiment</span>
                 <div className="w-full mt-6 h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 w-[92%]"></div>
                 </div>
              </div>
           </PixelFounderCard>

           <PixelFounderCard title="HQ Directives" subtitle="HR Mandates">
              <div className="mt-4 space-y-4">
                 <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-4">
                    <AlertCircle className="w-5 h-5 text-amber-500 mt-1 shrink-0" />
                    <p className="text-[11px] text-[#94a3b8] font-bold leading-relaxed">
                      "Mandate <span className="text-white">v2.1</span>: All L2 Photographers must complete the 'Digital Upsell Master' course by end of week."
                    </p>
                 </div>
                 <div className="p-4 bg-[#38bdf8]/5 border border-[#38bdf8]/20 rounded-2xl flex items-start gap-4">
                    <Briefcase className="w-5 h-5 text-[#38bdf8] mt-1 shrink-0" />
                    <p className="text-[11px] text-[#94a3b8] font-bold leading-relaxed">
                      "Hiring freeze lifted for <span className="text-white">Marhaba Occidental</span>. 2 open slots for Junior Suite Photographers."
                    </p>
                 </div>
              </div>
           </PixelFounderCard>
        </div>
      </div>
    </div>
  );
};

export default HRRecruitment;
