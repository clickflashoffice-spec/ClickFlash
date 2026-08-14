import React, { useState } from 'react';
import { 
  TrendingUp, 
  Activity, 
  Clock, 
  Zap,
  Settings2,
  DollarSign
} from 'lucide-react';

export const DynamicPricingPanel: React.FC = () => {
  const [pricingMode, setPricingMode] = useState<'manual' | 'ai' | 'surge'>('ai');
  const [basePrice, setBasePrice] = useState(25);
  const [maxSurge, setMaxSurge] = useState(40);
  const [enableFootTraffic, setEnableFootTraffic] = useState(true);

  // Simple mock data for 24 hours of multipliers (1.0 = base price, 1.4 = +40%)
  const hourlyMultipliers = [
    1.0, 1.0, 0.8, 0.8, 0.8, 0.8, 0.8, 0.9, 
    1.0, 1.1, 1.2, 1.2, 1.3, 1.3, 1.2, 1.1, 
    1.0, 1.2, 1.4, 1.4, 1.3, 1.2, 1.1, 1.0
  ];
  const currentHour = new Date().getHours();
  const currentMultiplier = hourlyMultipliers[currentHour] || 1.0;
  const currentPrice = basePrice * currentMultiplier;

  return (
    <div className="flex flex-col gap-6 w-full text-slate-200">
      
      {/* Header & Live Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-lg">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2 text-slate-100">
            <TrendingUp className="text-amber-400" />
            Dynamic Pricing Controls
          </h2>
          <p className="text-slate-400 mt-1">Automatically adjust gallery and photo pricing based on demand and time.</p>
        </div>
        <div className="flex items-center gap-4 bg-slate-950 px-6 py-4 rounded-lg border border-slate-800">
          <div>
            <div className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Live Price</div>
            <div className="text-3xl font-bold text-amber-400 flex items-center">
              <DollarSign size={24} className="opacity-70" />
              {currentPrice.toFixed(2)}
            </div>
          </div>
          <div className="h-10 w-px bg-slate-800 mx-2"></div>
          <div>
            <div className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Current Multiplier</div>
            <div className="text-xl font-semibold text-slate-200 flex items-center gap-2">
              {currentMultiplier.toFixed(1)}x
              {currentMultiplier > 1.0 ? <Activity size={16} className="text-amber-500" /> : null}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Mode Selection */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-lg h-full">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Settings2 size={20} className="text-cyan-400" />
              Pricing Mode
            </h3>
            
            <div className="space-y-3">
              <button 
                onClick={() => setPricingMode('manual')}
                className={`w-full text-left p-4 rounded-lg border transition-all ${pricingMode === 'manual' ? 'bg-slate-800 border-cyan-500' : 'bg-slate-950 border-slate-800 hover:border-slate-700'}`}
              >
                <div className="font-medium text-slate-200">Manual (Static)</div>
                <div className="text-sm text-slate-500 mt-1">Fixed prices regardless of time or demand.</div>
              </button>
              
              <button 
                onClick={() => setPricingMode('ai')}
                className={`w-full text-left p-4 rounded-lg border transition-all ${pricingMode === 'ai' ? 'bg-slate-800 border-amber-500' : 'bg-slate-950 border-slate-800 hover:border-slate-700'}`}
              >
                <div className="font-medium text-amber-400 flex items-center gap-2">
                  <Zap size={16} /> AI Dynamic
                </div>
                <div className="text-sm text-slate-400 mt-1">Smart pricing using historical data and current foot traffic.</div>
              </button>

              <button 
                onClick={() => setPricingMode('surge')}
                className={`w-full text-left p-4 rounded-lg border transition-all ${pricingMode === 'surge' ? 'bg-slate-800 border-cyan-500' : 'bg-slate-950 border-slate-800 hover:border-slate-700'}`}
              >
                <div className="font-medium text-slate-200">Time-based Surge</div>
                <div className="text-sm text-slate-500 mt-1">Strict schedule based on pre-defined peak hours.</div>
              </button>
            </div>
          </div>
        </div>

        {/* Configuration & Chart */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <Clock size={20} className="text-cyan-400" />
              24-Hour Multiplier Projection
            </h3>
            
            {/* Simple CSS Bar Chart */}
            <div className="h-48 flex items-end gap-1 mb-4 border-b border-slate-800 pb-2 relative">
              {/* Target Line at 1.0 */}
              <div className="absolute w-full border-t border-dashed border-slate-700/50" style={{ bottom: '50%' }}>
                <span className="absolute -left-6 -top-3 text-xs text-slate-500">1.0</span>
              </div>
              
              {hourlyMultipliers.map((mult, idx) => {
                const height = `${(mult / 1.5) * 100}%`;
                const isCurrent = idx === currentHour;
                const isHigh = mult > 1.0;
                const isLow = mult < 1.0;
                
                let bgColor = 'bg-slate-700';
                if (isCurrent) bgColor = 'bg-cyan-500';
                else if (isHigh) bgColor = 'bg-amber-500/70';
                else if (isLow) bgColor = 'bg-slate-800';

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                    {/* Tooltip */}
                    <div className="opacity-0 group-hover:opacity-100 absolute -top-8 bg-slate-800 text-xs px-2 py-1 rounded transition-opacity whitespace-nowrap z-10">
                      {idx}:00 - {mult.toFixed(1)}x
                    </div>
                    {/* Bar */}
                    <div className={`w-full rounded-t-sm transition-all ${bgColor}`} style={{ height }}></div>
                  </div>
                );
              })}
            </div>
            
            <div className="flex justify-between text-xs text-slate-500 px-2">
              <span>12 AM</span>
              <span>6 AM</span>
              <span>12 PM</span>
              <span>6 PM</span>
              <span>11 PM</span>
            </div>
          </div>

          {/* Controls */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Base Gallery Price ($)</label>
                <input 
                  type="number" 
                  value={basePrice}
                  onChange={(e) => setBasePrice(parseFloat(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-md px-4 py-2 focus:outline-none focus:border-cyan-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Max Surge Cap (%)</label>
                <div className="flex items-center gap-4">
                  <input 
                    type="range" 
                    min="0" max="100" step="5"
                    value={maxSurge} 
                    onChange={(e) => setMaxSurge(parseInt(e.target.value))}
                    className="w-full accent-amber-500"
                    disabled={pricingMode === 'manual'}
                  />
                  <span className="bg-slate-950 border border-slate-700 px-3 py-1 rounded text-sm w-16 text-center text-amber-400 font-medium">+{maxSurge}%</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Peak Hours Selection</label>
                <select 
                  className="w-full bg-slate-950 border border-slate-700 rounded-md px-4 py-2 focus:outline-none focus:border-cyan-500"
                  disabled={pricingMode === 'manual'}
                >
                  <option>Evening (6PM - 10PM)</option>
                  <option>Afternoon (1PM - 5PM)</option>
                  <option>Custom Range...</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-lg mt-2">
                <div>
                  <div className="text-sm font-medium text-slate-200">Foot Traffic Integration</div>
                  <div className="text-xs text-slate-500">Boost prices when density is high</div>
                </div>
                <button 
                  onClick={() => setEnableFootTraffic(!enableFootTraffic)}
                  disabled={pricingMode !== 'ai'}
                  className={`w-11 h-6 rounded-full relative transition-colors ${enableFootTraffic && pricingMode === 'ai' ? 'bg-cyan-500' : 'bg-slate-700'} ${pricingMode !== 'ai' ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${enableFootTraffic && pricingMode === 'ai' ? 'translate-x-5' : ''}`} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
