import { useState, useEffect } from 'react';
import { MapPin, Users, TrendingUp, Zap, ArrowRight } from 'lucide-react';

interface LocationNode {
  id: string;
  name: string;
  currentFootTraffic: number;
  recentTransactions: number;
  activePhotographers: number;
  profitabilityScore: number;
}

interface DispatchAction {
  photographerName: string;
  fromLocation: string;
  toLocation: string;
  reason: string;
}

const mockLocations: LocationNode[] = [
  { id: 'loc-1', name: 'Pool Area B', currentFootTraffic: 92, recentTransactions: 18, activePhotographers: 3, profitabilityScore: 94.2 },
  { id: 'loc-2', name: 'Main Entrance', currentFootTraffic: 78, recentTransactions: 8, activePhotographers: 4, profitabilityScore: 38.0 },
  { id: 'loc-3', name: 'Waterpark Slide', currentFootTraffic: 85, recentTransactions: 14, activePhotographers: 1, profitabilityScore: 87.0 },
  { id: 'loc-4', name: 'Restaurant Terrace', currentFootTraffic: 45, recentTransactions: 5, activePhotographers: 2, profitabilityScore: 25.0 },
  { id: 'loc-5', name: 'Beach Cabanas', currentFootTraffic: 68, recentTransactions: 11, activePhotographers: 2, profitabilityScore: 58.0 },
  { id: 'loc-6', name: 'Kids Club', currentFootTraffic: 35, recentTransactions: 3, activePhotographers: 1, profitabilityScore: 15.0 },
];

const mockActions: DispatchAction[] = [
  { photographerName: 'James Chen', fromLocation: 'Main Entrance', toLocation: 'Waterpark Slide', reason: 'High traffic, low coverage' },
  { photographerName: 'Sophie Laurent', fromLocation: 'Kids Club', toLocation: 'Pool Area B', reason: 'Revenue surge detected' },
];

export function SwarmDispatchPanel() {
  const [isAutoDispatch, setIsAutoDispatch] = useState(true);
  const [locations, setLocations] = useState(mockLocations);

  // Simulate live score updates
  useEffect(() => {
    const interval = setInterval(() => {
      setLocations(prev => prev.map(loc => ({
        ...loc,
        currentFootTraffic: Math.min(100, Math.max(10, loc.currentFootTraffic + (Math.random() - 0.5) * 8)),
        recentTransactions: Math.max(0, loc.recentTransactions + Math.floor((Math.random() - 0.4) * 3)),
      })));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const sortedLocations = [...locations].sort((a, b) => b.profitabilityScore - a.profitabilityScore);

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Zap className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Swarm Dispatch — Live Heatmap</h3>
            <p className="text-xs text-slate-500">AI-optimized photographer routing by profitability score</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">Auto-Dispatch</span>
          <button
            onClick={() => setIsAutoDispatch(!isAutoDispatch)}
            className={`relative w-10 h-5 rounded-full transition-colors ${isAutoDispatch ? 'bg-amber-500' : 'bg-slate-700'}`}
          >
            <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${isAutoDispatch ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>
      </div>

      {/* Location Heatmap */}
      <div className="p-4 space-y-2">
        {sortedLocations.map((loc, i) => {
          const barWidth = Math.max(5, loc.profitabilityScore);
          const barColor = loc.profitabilityScore > 70 ? 'bg-emerald-500' : loc.profitabilityScore > 40 ? 'bg-amber-500' : 'bg-slate-600';

          return (
            <div key={loc.id} className="flex items-center gap-3 group">
              <span className="text-xs text-slate-500 w-4 text-right font-mono">#{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-slate-500" />
                    <span className="text-xs font-bold text-white truncate">{loc.name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-slate-500 shrink-0">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {loc.activePhotographers}
                    </span>
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      {loc.recentTransactions}
                    </span>
                    <span className="font-bold text-white">{loc.profitabilityScore.toFixed(0)}</span>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div className={`h-full rounded-full ${barColor} transition-all duration-700`} style={{ width: `${barWidth}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Dispatch Actions */}
      {mockActions.length > 0 && (
        <div className="border-t border-slate-800 p-4">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">Recent Dispatch Actions</h4>
          <div className="space-y-2">
            {mockActions.map((action, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/5 border border-amber-500/10 text-xs">
                <span className="font-bold text-white">{action.photographerName}</span>
                <span className="text-slate-500">{action.fromLocation}</span>
                <ArrowRight className="w-3 h-3 text-amber-400 shrink-0" />
                <span className="font-bold text-amber-400">{action.toLocation}</span>
                <span className="text-slate-500 ml-auto hidden sm:inline">({action.reason})</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
