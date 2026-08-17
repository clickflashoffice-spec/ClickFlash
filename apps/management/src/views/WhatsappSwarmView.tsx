import React, { useState } from 'react';
import { 
  MessageCircle, 
  Sparkles, 
  TrendingUp, 
  Zap, 
  CheckCircle2, 
  Clock, 
  Bot,
  Users
} from 'lucide-react';

interface NegotiationSession {
  id: string;
  phone: string;
  status: 'active' | 'closed' | 'lost';
  messages: { role: 'user' | 'agent'; content: string; time: string }[];
  discountOffered: number;
  revenuePotential: number;
}

interface MagicLinkEvent {
  id: string;
  guestId: string;
  phone: string;
  photosFound: number;
  aiSelected: number;
  time: string;
}

// Mock Data
const MOCK_NEGOTIATIONS: NegotiationSession[] = [
  {
    id: 'neg-101',
    phone: '+1 (555) 019-2834',
    status: 'active',
    discountOffered: 20,
    revenuePotential: 89.99,
    messages: [
      { role: 'agent', content: "Hi Sarah! 📸 Your vacation photos look incredible. Use code MEMORIES20 for 20% OFF your entire album today!", time: "10:42 AM" },
      { role: 'user', content: "They look great but that's still a bit expensive for me right now.", time: "10:45 AM" },
      { role: 'agent', content: "We'd love to help you save! 🎁 Use code FLASH20 at checkout for an instant 20% off your entire album today.", time: "10:45 AM" }
    ]
  },
  {
    id: 'neg-102',
    phone: '+44 7911 123456',
    status: 'closed',
    discountOffered: 25,
    revenuePotential: 120.00,
    messages: [
      { role: 'agent', content: "✨ Your VIP mountain coaster photos are ready!", time: "09:15 AM" },
      { role: 'user', content: "Is there any discount if I buy all of them?", time: "09:30 AM" },
      { role: 'agent', content: "Absolutely! I've just activated code VIP25 for 25% off the full digital package. Valid for the next hour!", time: "09:31 AM" },
      { role: 'user', content: "Perfect, bought them. Thanks!", time: "09:45 AM" }
    ]
  }
];

const MOCK_MAGIC_LINKS: MagicLinkEvent[] = [
  { id: 'ml-001', guestId: 'gst_99x3a', phone: '+1 (555) 992-1122', photosFound: 142, aiSelected: 12, time: 'Just now' },
  { id: 'ml-002', guestId: 'gst_82y4b', phone: '+1 (555) 883-4455', photosFound: 89, aiSelected: 8, time: '2 mins ago' },
  { id: 'ml-003', guestId: 'gst_77z5c', phone: '+44 7700 900123', photosFound: 215, aiSelected: 24, time: '5 mins ago' },
  { id: 'ml-004', guestId: 'gst_66w1d', phone: '+61 491 570 110', photosFound: 45, aiSelected: 5, time: '12 mins ago' },
];

export const WhatsappSwarmView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'live' | 'analytics'>('live');

  return (
    <div className="flex flex-col gap-6 w-full text-slate-200">
      
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <MessageCircle className="text-emerald-400" size={24} />
            </div>
            WhatsApp Sales Swarm
          </h1>
          <p className="text-slate-400 mt-2">Live telemetry for the Autonomous Closer and Negotiator Agents.</p>
        </div>
        
        <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-lg shadow-inner">
          <button
            onClick={() => setActiveTab('live')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'live' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Live Feed
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'analytics' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Swarm Yield
          </button>
        </div>
      </div>

      {/* High-Level Yield Metrics (Glassmorphic) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Swarm Sessions', value: '342', icon: <Users size={20} />, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
          { label: 'Magic Links Sent (24h)', value: '1,845', icon: <Zap size={20} />, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
          { label: 'Agent Close Rate', value: '28.4%', icon: <CheckCircle2 size={20} />, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
          { label: 'AI Swarm Yield (+)', value: '+$14,250', icon: <TrendingUp size={20} />, color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20' }
        ].map((metric, i) => (
          <div key={i} className={`backdrop-blur-md bg-slate-900/50 border rounded-2xl p-5 flex flex-col gap-3 transition-all hover:bg-slate-800/80 shadow-lg ${metric.bg}`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-slate-950/50 backdrop-blur-sm ${metric.color}`}>
                {metric.icon}
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{metric.label}</span>
            </div>
            <div className="text-3xl font-bold text-white tracking-tight">{metric.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        
        {/* Left Col: Instant Magic Links Feed */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 shadow-2xl flex flex-col h-[600px]">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800">
            <Zap className="text-amber-400" size={20} />
            <h2 className="text-lg font-bold text-white">Live AI Culling & Dispatch</h2>
            <div className="ml-auto flex items-center gap-2 text-xs font-medium bg-amber-500/10 text-amber-400 px-2.5 py-1 rounded-full border border-amber-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" /> Sub-second Vector Search Active
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
            {MOCK_MAGIC_LINKS.map((link) => (
              <div key={link.id} className="p-4 rounded-xl bg-slate-950/50 border border-slate-800/50 hover:border-amber-500/30 transition-colors group">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{link.phone}</span>
                    <span className="text-[10px] text-slate-500 font-mono bg-slate-900 px-1.5 rounded">{link.guestId}</span>
                  </div>
                  <span className="text-xs text-slate-500 flex items-center gap-1"><Clock size={12}/>{link.time}</span>
                </div>
                
                <div className="flex items-center gap-4 mt-3">
                  <div className="flex-1 bg-slate-900 rounded-lg p-2.5 border border-slate-800">
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">VP-Tree Match</p>
                    <p className="text-sm text-slate-300 font-medium">{link.photosFound} raw photos found</p>
                  </div>
                  <Sparkles className="text-indigo-400 shrink-0" size={16} />
                  <div className="flex-1 bg-indigo-500/5 rounded-lg p-2.5 border border-indigo-500/20">
                    <p className="text-[10px] text-indigo-400/80 uppercase font-bold tracking-wider mb-1">AI Culling Pitch</p>
                    <p className="text-sm text-indigo-300 font-medium">Top {link.aiSelected} moments pitched</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Col: Negotiator Agent Chat View */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 shadow-2xl flex flex-col h-[600px]">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800">
            <MessageCircle className="text-emerald-400" size={20} />
            <h2 className="text-lg font-bold text-white">Live Negotiator Swarm</h2>
            <div className="ml-auto flex items-center gap-2 text-xs font-medium bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Gemini Flash Engine Active
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
            {MOCK_NEGOTIATIONS.map((session) => (
              <div key={session.id} className="border border-slate-800 rounded-xl overflow-hidden shadow-sm">
                
                {/* Session Header */}
                <div className="bg-slate-950/80 p-3 border-b border-slate-800 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <MessageCircle size={16} className="text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{session.phone}</p>
                      <p className="text-[10px] text-slate-400">Potential: ${session.revenuePotential.toFixed(2)}</p>
                    </div>
                  </div>
                  {session.status === 'closed' ? (
                    <span className="text-[10px] font-bold px-2 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded flex items-center gap-1">
                      <CheckCircle2 size={12}/> CLOSED YIELD
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded animate-pulse">
                      NEGOTIATING
                    </span>
                  )}
                </div>
                
                {/* Chat Messages */}
                <div className="p-4 bg-slate-900/50 space-y-4">
                  {session.messages.map((msg, idx) => (
                    <div key={idx} className={`flex flex-col max-w-[85%] ${msg.role === 'agent' ? 'items-start' : 'items-end ml-auto'}`}>
                      <div className={`px-4 py-2.5 rounded-2xl text-sm ${
                        msg.role === 'agent' 
                          ? 'bg-slate-800 text-slate-200 rounded-tl-sm border border-slate-700/50' 
                          : 'bg-emerald-600 text-white rounded-tr-sm shadow-md'
                      }`}>
                        {msg.content}
                      </div>
                      <span className="text-[9px] text-slate-500 font-medium mt-1 mx-1 flex items-center gap-1">
                        {msg.role === 'agent' && <Bot size={10} className="text-emerald-500" />}
                        {msg.time}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #334155;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #475569;
        }
      `}} />
    </div>
  );
};

export default WhatsappSwarmView;
