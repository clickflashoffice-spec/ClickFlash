import React from 'react';
import { useIngestionSession } from '../hooks/useIngestionSession';
import { PlayCircle, CheckCircle, AlertCircle } from 'lucide-react';

export function SessionHistory() {
  const { sessions, isLoading } = useIngestionSession();

  if (isLoading) {
    return <div className="text-slate-400 p-8 text-center">Loading sessions...</div>;
  }

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-950/50 border-b border-slate-800 text-xs uppercase tracking-wider text-slate-400 font-bold">
            <th className="p-4">Date</th>
            <th className="p-4">Source</th>
            <th className="p-4">Photos</th>
            <th className="p-4">Keepers</th>
            <th className="p-4">Reject Rate</th>
            <th className="p-4">Duration</th>
            <th className="p-4">Status</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((session) => (
            <tr key={session.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors group cursor-pointer">
              <td className="p-4 text-sm text-slate-300 font-medium">{session.date}</td>
              <td className="p-4 text-sm text-slate-400">{session.source}</td>
              <td className="p-4 text-sm text-white font-bold">{session.totalPhotos}</td>
              <td className="p-4 text-sm text-emerald-400 font-bold">{session.keepers}</td>
              <td className="p-4 text-sm text-amber-400">{session.rejectRate}%</td>
              <td className="p-4 text-sm text-slate-400">{session.duration}</td>
              <td className="p-4">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${
                  session.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                  session.status === 'processing' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 
                  'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}>
                  {session.status === 'completed' && <CheckCircle className="w-3.5 h-3.5" />}
                  {session.status === 'processing' && <PlayCircle className="w-3.5 h-3.5" />}
                  {session.status === 'failed' && <AlertCircle className="w-3.5 h-3.5" />}
                  {session.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
