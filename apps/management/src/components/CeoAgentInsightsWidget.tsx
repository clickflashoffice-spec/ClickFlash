import { useState } from 'react';
import { Brain, TrendingUp, MapPin, AlertTriangle, Lightbulb } from 'lucide-react';

interface Insight {
  id: string;
  type: 'revenue' | 'dispatch' | 'warning' | 'opportunity';
  title: string;
  description: string;
  timestamp: string;
  impact?: string;
}

const mockInsights: Insight[] = [
  {
    id: '1',
    type: 'revenue',
    title: 'Revenue Surge Detected',
    description: 'Pool Area B is generating 3.2x average revenue per photographer this hour. Consider deploying 2 additional staff.',
    timestamp: '2 min ago',
    impact: '+€840 projected',
  },
  {
    id: '2',
    type: 'dispatch',
    title: 'Swarm Redistribution Recommended',
    description: 'Main Entrance has 4 idle photographers while Waterpark has 0 coverage. Auto-dispatch triggered for Photographer #12 and #7.',
    timestamp: '8 min ago',
  },
  {
    id: '3',
    type: 'warning',
    title: 'Abandoned Cart Spike',
    description: '14 carts abandoned in the last hour (2.3x normal rate). Possible cause: gallery load times increased to 4.2s. Infrastructure check recommended.',
    timestamp: '15 min ago',
    impact: '-€620 at risk',
  },
  {
    id: '4',
    type: 'opportunity',
    title: 'AI Reel Conversion Opportunity',
    description: 'Galleries with AI Reels enabled convert at 47% vs 23% without. 38 active galleries do not have Reels enabled. Enable globally for projected +€2,100/day.',
    timestamp: '1 hour ago',
    impact: '+€2,100/day projected',
  },
];

const typeConfig = {
  revenue: { icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  dispatch: { icon: MapPin, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
  warning: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  opportunity: { icon: Lightbulb, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
};

export function CeoAgentInsightsWidget() {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visibleInsights = mockInsights.filter(i => !dismissed.has(i.id));

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
            <Brain className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">CEO Agent — Live Insights</h3>
            <p className="text-xs text-slate-500">AI-generated actionable intelligence from your ecosystem</p>
          </div>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Live
        </span>
      </div>

      <div className="divide-y divide-slate-800/50">
        {visibleInsights.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">All insights dismissed. New insights will appear as the AI analyzes incoming data.</div>
        ) : (
          visibleInsights.map(insight => {
            const config = typeConfig[insight.type];
            const Icon = config.icon;
            return (
              <div key={insight.id} className="p-4 hover:bg-slate-800/30 transition-colors group">
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg ${config.bg} border ${config.border} flex items-center justify-center shrink-0 mt-0.5`}>
                    <Icon className={`w-4 h-4 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-bold text-white">{insight.title}</h4>
                      <span className="text-[10px] text-slate-500 shrink-0">{insight.timestamp}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{insight.description}</p>
                    {insight.impact && (
                      <span className={`inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-bold ${
                        insight.impact.startsWith('+') ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                      }`}>
                        {insight.impact}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setDismissed(prev => new Set([...prev, insight.id]))}
                    className="text-slate-600 hover:text-slate-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
