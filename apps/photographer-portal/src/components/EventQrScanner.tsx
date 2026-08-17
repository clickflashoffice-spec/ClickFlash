import React, { useState } from 'react';
import { QrCode, Tag, Sparkles, Check } from 'lucide-react';
import { usePhotographerStore } from '../stores/photographerStore';

export const EventQrScanner: React.FC = () => {
  const session = usePhotographerStore((state) => state.session);
  const updateEventDetails = usePhotographerStore((state) => state.updateEventDetails);

  const [eventName, setEventName] = useState(session?.activeEventName || 'Sunset VIP Coaster');
  const [accessCode, setAccessCode] = useState(session?.activeAccessCode || 'SUNSET2026');
  const [wristbandId, setWristbandId] = useState(session?.activeWristbandId || '');
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateEventDetails(eventName, accessCode, wristbandId);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <form onSubmit={handleSave} className="glass-card p-5 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
          <Tag size={14} className="text-cyan-400" /> Active Session & Guest Tagging
        </h3>
        <span className="text-[11px] text-slate-400">Auto-links photos to Self-Service Gallery</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1">Event / Shoot Name</label>
          <input
            type="text"
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
            placeholder="e.g. VIP Water Rapids"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1">Gallery Access Code</label>
          <input
            type="text"
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-cyan-400 focus:outline-none focus:border-cyan-500"
            placeholder="e.g. PASS-9921"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1">Wristband / RFID Token (Optional)</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={wristbandId}
              onChange={(e) => setWristbandId(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
              placeholder="Scan QR or Wristband"
            />
            <button
              type="submit"
              className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1 transition-all ${
                saved
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/20'
              }`}
            >
              {saved ? <Check size={14} /> : 'Set'}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
};
