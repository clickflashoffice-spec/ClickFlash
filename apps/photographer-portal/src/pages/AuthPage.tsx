import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Zap, ShieldCheck, ArrowRight } from 'lucide-react';
import { usePhotographerStore } from '../stores/photographerStore';

export const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const setSession = usePhotographerStore((state) => state.setSession);
  const [name, setName] = useState('');
  const [stationId, setStationId] = useState('DESK-01');
  const [passcode, setPasscode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      setSession({
        photographerId: `photog_${Date.now()}`,
        photographerName: name || 'External Freelance Pro',
        token: `jwt_freelance_${Date.now()}`,
        stationId: stationId || 'DESK-01',
        activeEventName: 'Resort Afternoon Session',
        activeAccessCode: 'CLICK2026',
      });
      setIsLoading(false);
      navigate('/');
    }, 600);
  };

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center p-4 relative overflow-hidden text-slate-100">
      {/* Subtle Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full glass-card p-8 rounded-3xl border border-slate-800 bg-slate-900/80 backdrop-blur-2xl shadow-2xl relative z-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Camera size={28} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Photographer Edge Portal</h1>
            <p className="text-xs text-slate-400">Zero-Install Direct-to-R2 Cloud Uploads</p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Photographer Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
              placeholder="e.g. Alex Rivera"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Assigned Station / Desk (Optional)</label>
            <input
              type="text"
              value={stationId}
              onChange={(e) => setStationId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
              placeholder="DESK-01"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">PIN / Event Passcode</label>
            <input
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
              placeholder="••••"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3 bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-slate-950 font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all text-sm"
          >
            {isLoading ? 'Connecting to Cloudflare Edge...' : 'Launch Uploader'} <ArrowRight size={16} />
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1"><Zap size={12} className="text-cyan-400" /> Cloudflare Edge v7.0</span>
          <span className="flex items-center gap-1"><ShieldCheck size={12} className="text-emerald-400" /> Zero Software Install</span>
        </div>
      </div>
    </div>
  );
};
