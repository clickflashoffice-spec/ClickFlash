import React, { useState, useEffect } from 'react';
import { 
  Server, 
  Monitor, 
  Wifi, 
  Activity, 
  Trash2, 
  RefreshCw,
  Clock,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { apiService } from '../../services/apiService';
import { logger } from '../../utils/logger';

interface KioskTelemetry {
  id: string;
  name: string;
  status: 'Online' | 'Offline' | 'Connected';
  last_seen: string | null;
  app_version: string;
  ip_address: string;
  latency_ms: number;
}

const FleetDashboard: React.FC = () => {
  const [kiosks, setKiosks] = useState<KioskTelemetry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFleet = async () => {
    try {
      setRefreshing(true);
      const data = await apiService.get('/pairing/kiosks');
      setKiosks(data);
    } catch (err) {
      logger.error('[FleetDashboard] Failed to fetch kiosk fleet', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFleet();
    const interval = setInterval(fetchFleet, 30000); // 30s auto-refresh
    return () => clearInterval(interval);
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm(`Are you sure you want to unpair Kiosk ${id}? It will lose access to this master.`)) return;
    try {
      await apiService.delete(`/pairing/kiosks/${id}`);
      setKiosks(kiosks.filter(k => k.id !== id));
    } catch (err) {
      logger.error('[FleetDashboard] Failed to unpair kiosk', err);
    }
  };

  const getStatusColor = (kiosk: KioskTelemetry) => {
    if (!kiosk.last_seen) return 'text-slate-400';
    const lastSeen = new Date(kiosk.last_seen).getTime();
    const now = Date.now();
    const diff = now - lastSeen;
    
    if (diff < 120000) return 'text-emerald-500'; // 2m
    if (diff < 600000) return 'text-amber-500';   // 10m
    return 'text-rose-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
            <Monitor className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Kiosk Fleet</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Monitor and manage local station pairings</p>
          </div>
        </div>
        <button 
          onClick={fetchFleet}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {kiosks.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/20">
          <Wifi className="w-12 h-12 text-slate-300 mb-4" />
          <p className="text-slate-500 font-medium">No kiosks paired yet</p>
          <p className="text-sm text-slate-400">Share your master discovery ID to link kiosks</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {kiosks.map((kiosk) => (
            <div 
              key={kiosk.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 hover:shadow-lg transition-all group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-slate-100 dark:bg-slate-800 ${getStatusColor(kiosk)}`}>
                    <Server className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-white truncate max-w-[150px]">
                      {kiosk.name || 'Unnamed Kiosk'}
                    </h3>
                    <p className="text-xs text-slate-500">ID: {kiosk.id.substring(0, 12)}...</p>
                  </div>
                </div>
                <button 
                  onClick={() => handleDelete(kiosk.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
                <div className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <span className="text-slate-400 block mb-1 uppercase tracking-wider font-semibold">IP Address</span>
                  <span className="text-slate-700 dark:text-slate-200 font-mono">{kiosk.ip_address || '0.0.0.0'}</span>
                </div>
                <div className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <span className="text-slate-400 block mb-1 uppercase tracking-wider font-semibold">Version</span>
                  <span className="text-slate-700 dark:text-slate-200">{kiosk.app_version || 'v1.0.0'}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1.5">
                  <Activity className={`w-3.5 h-3.5 ${getStatusColor(kiosk)}`} />
                  <span className={getStatusColor(kiosk)}>
                    {kiosk.latency_ms > 0 ? `${kiosk.latency_ms}ms` : 'Active'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    {kiosk.last_seen 
                      ? new Date(kiosk.last_seen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : 'Never'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-800/50 rounded-xl flex gap-3">
        <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800 dark:text-amber-400">
          <p className="font-semibold mb-1 uppercase tracking-tight">Security Hardening (Apex Protocol)</p>
          <p className="opacity-80">All paired kiosks communicate over a cryptographically signed HMAC-SHA256 link. Kiosk clocks with more than 5 minutes of drift from the Master will be automatically blocked.</p>
        </div>
      </div>
    </div>
  );
};

export default FleetDashboard;
