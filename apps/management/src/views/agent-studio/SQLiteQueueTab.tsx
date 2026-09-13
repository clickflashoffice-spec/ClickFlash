import { useState } from 'react';
import { Database } from 'lucide-react';

export function SQLiteQueueTab() {
  const [queueStats] = useState({
    pending: 3,
    flushing: 1,
    failed: 0,
    oldestPending: '24s ago',
    sentinelUptime: '99.98%',
    dbPath: 'apps/desktop/master/star_master.db (SQLite triple-write)'
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <Database className="w-4 h-4 text-cyan-400" />
          SQLite Persistent Write Queue (DbWriteQueue.ts) & Edge Sentinel
        </h3>
        <span className="text-xs text-emerald-400 flex items-center gap-1 font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          Sentinel Active ({queueStats.sentinelUptime})
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
          <span className="text-[11px] text-slate-400">Pending Writes</span>
          <p className="text-lg font-bold text-cyan-400">{queueStats.pending}</p>
        </div>
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
          <span className="text-[11px] text-slate-400">Flushing State</span>
          <p className="text-lg font-bold text-amber-400">{queueStats.flushing}</p>
        </div>
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
          <span className="text-[11px] text-slate-400">Failed / Retries</span>
          <p className="text-lg font-bold text-emerald-400">{queueStats.failed}</p>
        </div>
      </div>

      <div className="text-[11px] font-mono text-slate-500 flex items-center justify-between border-t border-slate-800/80 pt-3">
        <span>Active DB Path: {queueStats.dbPath}</span>
        <span>Oldest: {queueStats.oldestPending}</span>
      </div>
    </div>
  );
}
