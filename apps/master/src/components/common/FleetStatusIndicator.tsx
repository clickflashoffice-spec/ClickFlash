import React, { useState, useEffect } from 'react';
import { Monitor } from 'lucide-react';
import { apiService } from '../../services/apiService';

const FleetStatusIndicator: React.FC = () => {
  const [onlineCount, setOnlineCount] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(0);

  const fetchStatus = async () => {
    try {
      const data = await (apiService as any).get('/pairing/kiosks');
      const now = Date.now();
      const online = data.filter((k: any) => {
        if (!k.last_seen) return false;
        return (now - new Date(k.last_seen).getTime()) < 120000; // 2 minutes
      }).length;
      
      setOnlineCount(online);
      setTotalCount(data.length);
    } catch (err) {
      // Silent fail for sidebar indicator
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  if (totalCount === 0) return null;

  return (
    <div className="flex items-center justify-between px-3 py-2 glass-card bg-white/40 dark:bg-slate-800/40 rounded-xl border border-slate-200/50 dark:border-white/5">
      <div className="flex items-center gap-2">
        <Monitor className={`w-3.5 h-3.5 ${onlineCount > 0 ? 'text-emerald-500' : 'text-slate-400'}`} />
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Fleet Health
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className={`text-[10px] font-bold ${onlineCount > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>
          {onlineCount}/{totalCount}
        </span>
        <div className={`w-1.5 h-1.5 rounded-full ${onlineCount > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
      </div>
    </div>
  );
};

export default FleetStatusIndicator;
