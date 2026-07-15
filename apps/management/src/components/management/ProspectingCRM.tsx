import React, { useState } from "react";
import {Search, 
  MessageCircle, 
  Linkedin, 
  ExternalLink,
  Target,
  Clock} from "lucide-react";
import { PixelFounderCard } from "../common/PixelFounderCard.tsx";
import { logger } from "@/utils/logger";

interface Prospect {
  id: string;
  resort: string;
  contact: string;
  role: string;
  status: "New" | "Contacted" | "Auditing" | "Closing" | "Partner";
  lastAction: string;
  priority: "High" | "Medium" | "Low";
}

const ProspectingCRM: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [_loading, setLoading] = useState(true);

  React.useEffect(() => {
    fetch("/api/prospecting/leads")
      .then(res => res.json())
      .then(data => {
        setProspects(data);
        setLoading(false);
      })
      .catch(err => {
        logger.error("Failed to fetch leads", err);
        setLoading(false);
      });
  }, []);

  const getStatusColor = (status: Prospect["status"]) => {
    switch (status) {
      case "New": return "text-[#38bdf8] bg-[#38bdf8]/10 border-[#38bdf8]/20";
      case "Contacted": return "text-amber-500 bg-amber-500/10 border-amber-500/20";
      case "Auditing": return "text-indigo-400 bg-indigo-400/10 border-indigo-400/20";
      case "Closing": return "text-pink-500 bg-pink-500/10 border-pink-500/20";
      case "Partner": return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-serif font-black text-white">B2B Prospecting Engine</h2>
          <p className="text-sm font-bold text-[#94a3b8] uppercase tracking-widest mt-2">Strategic Partnership CRM & Outreach</p>
        </div>
        <button className="btn-whatsapp px-8">
          <MessageCircle className="w-5 h-5" />
          Lead Commander
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <PixelFounderCard title="Priority Prospect Pipeline" subtitle="Active Hunt">
            <div className="mt-4 space-y-4">
              <div className="flex gap-4 p-4 bg-white/5 rounded-2xl border border-white/10 group focus-within:border-[#38bdf8]/50 transition-all">
                <Search className="w-5 h-5 text-[#94a3b8]" />
                <input 
                  type="text" 
                  placeholder="Search resorts, GMs, or leads..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-transparent border-none outline-none text-sm font-bold text-white placeholder-[#475569] flex-1"
                />
              </div>

              <div className="overflow-x-auto rounded-3xl border border-white/5 bg-black/20">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-white/5 text-[9px] font-black text-[#94a3b8] uppercase tracking-[0.2em]">
                    <tr>
                      <th className="p-5">Partner Target</th>
                      <th className="p-5">Contact Node</th>
                      <th className="p-5">Status Phase</th>
                      <th className="p-5">Priority</th>
                      <th className="p-5 text-right">Mandate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {prospects.map((p) => (
                      <tr key={p.id} className="hover:bg-white/5 transition-all group cursor-pointer">
                        <td className="p-5">
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-white">{p.resort}</span>
                            <span className="text-[10px] text-[#475569] font-bold uppercase">Tunisia • Coastal Sector</span>
                          </div>
                        </td>
                        <td className="p-5">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-white">{p.contact}</span>
                            <span className="text-[9px] text-[#38bdf8] font-black uppercase tracking-widest">{p.role}</span>
                          </div>
                        </td>
                        <td className="p-5">
                          <span className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-full border ${getStatusColor(p.status)}`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="p-5">
                          <div className="flex items-center gap-2">
                             <div className={`w-2 h-2 rounded-full ${p.priority === 'High' ? 'bg-pink-500' : 'bg-blue-500'}`}></div>
                             <span className="text-[10px] font-black text-[#94a3b8] uppercase">{p.priority}</span>
                          </div>
                        </td>
                        <td className="p-5 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="p-2 hover:bg-[#25D366]/20 text-[#25D366] rounded-lg border border-transparent hover:border-[#25D366]/30 transition-all" title="WhatsApp Lead">
                              <MessageCircle className="w-4 h-4" />
                            </button>
                            <button className="p-2 hover:bg-[#0077B5]/20 text-[#0077B5] rounded-lg border border-transparent hover:border-[#0077B5]/30 transition-all" title="LinkedIn Outreach">
                              <Linkedin className="w-4 h-4" />
                            </button>
                            <button className="p-2 hover:bg-[#38bdf8]/20 text-[#38bdf8] rounded-lg border border-transparent hover:border-[#38bdf8]/30 transition-all" title="External Audit">
                              <ExternalLink className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </PixelFounderCard>
        </div>

        <div className="space-y-8">
          <PixelFounderCard title="Lead Triage Stats" subtitle="HQ Oversight">
            <div className="mt-6 space-y-6">
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                <div className="flex items-center gap-3">
                  <Target className="w-5 h-5 text-pink-500" />
                  <span className="text-xs font-black text-white uppercase">Closing Velocity</span>
                </div>
                <span className="text-lg font-serif font-black text-pink-500">+12%</span>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center text-[10px] font-black uppercase text-[#94a3b8] tracking-widest">
                  <span>Activation Rate</span>
                  <span>74%</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 w-[74%]"></div>
                </div>
              </div>

              <div className="pt-4 grid grid-cols-2 gap-4">
                <div className="p-4 bg-black/40 border border-white/5 rounded-2xl text-center">
                  <div className="text-2xl font-serif font-black text-white">28</div>
                  <div className="text-[9px] font-black text-[#94a3b8] uppercase mt-1">Total Hits</div>
                </div>
                <div className="p-4 bg-black/40 border border-white/5 rounded-2xl text-center">
                  <div className="text-2xl font-serif font-black text-[#38bdf8]">4</div>
                  <div className="text-[9px] font-black text-[#94a3b8] uppercase mt-1">Pending Sync</div>
                </div>
              </div>
            </div>
          </PixelFounderCard>

          <PixelFounderCard title="Outreach Simulation" subtitle="AI Copywriter">
            <div className="mt-4 space-y-4">
               <div className="p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-2xl relative">
                 <div className="absolute top-4 right-4 animate-pulse">
                   <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                 </div>
                 <h6 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3">Suggested Message (WhatsApp)</h6>
                 <p className="text-[11px] text-[#94a3b8] italic leading-relaxed">
                   "Hi {prospects[2].contact}, based on our AI diagnostic of the Sousse sector, Mövenpick could be seeing a 15% yield gap in digital photo capture. I'd love to share the PixelFounder audit with you..."
                 </p>
                 <div className="mt-4 flex gap-2">
                   <button className="flex-1 bg-white/5 p-2 rounded-xl text-[9px] font-black text-white uppercase hover:bg-white/10 transition-all">Copy</button>
                   <button className="flex-1 bg-[#25D366] p-2 rounded-xl text-[9px] font-black text-[#070b14] uppercase">Send Live</button>
                 </div>
               </div>
               
               <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl text-[#94a3b8]">
                 <Clock className="w-4 h-4" />
                 <span className="text-[10px] font-bold uppercase">Best Time: Tuesday, 09:45 AM</span>
               </div>
            </div>
          </PixelFounderCard>
        </div>
      </div>
    </div>
  );
};

export default ProspectingCRM;
