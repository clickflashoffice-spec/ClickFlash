import { useState } from 'react';
import { Activity, AlertOctagon, TrendingUp, DollarSign, StopCircle } from 'lucide-react';

export function AutonomousCeo() {
  const [isKilled, setIsKilled] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Autonomous CEO Dashboard</h1>
          <p className="text-slate-400 mt-1">Master control panel for active autonomous experiments and AI directives.</p>
        </div>
        <button
          onClick={() => setIsKilled(!isKilled)}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-lg transition-all ${
            isKilled 
              ? 'bg-red-500/10 text-red-500 border border-red-500/50 hover:bg-red-500/20'
              : 'bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-500/20'
          }`}
        >
          <StopCircle className="w-6 h-6" />
          {isKilled ? 'SYSTEMS HALTED (RESUME)' : 'GLOBAL KILL SWITCH'}
        </button>
      </div>

      {isKilled && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-4 flex items-start gap-3">
          <AlertOctagon className="w-6 h-6 text-red-500 shrink-0" />
          <div>
            <h3 className="text-red-500 font-bold">Autonomous Operations Suspended</h3>
            <p className="text-red-400/80 text-sm mt-1">All AI-driven pricing, a/b testing, and dynamic yielding algorithms have been disabled. The system is operating in manual override mode.</p>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-400 text-sm">Real-time ROI Projection</p>
              <h3 className="text-3xl font-bold text-white mt-2">+24.8%</h3>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
            </div>
          </div>
          <p className="text-emerald-500 text-sm mt-4 flex items-center gap-1">
            <TrendingUp className="w-4 h-4" />
            +4.2% from last hour
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-400 text-sm">Active Experiments</p>
              <h3 className="text-3xl font-bold text-white mt-2">12</h3>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Activity className="w-5 h-5 text-blue-500" />
            </div>
          </div>
          <p className="text-slate-400 text-sm mt-4">
            Across 4 park zones
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-400 text-sm">AI Generated Revenue</p>
              <h3 className="text-3xl font-bold text-white mt-2">$14,290</h3>
            </div>
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-purple-500" />
            </div>
          </div>
          <p className="text-slate-400 text-sm mt-4">
            Today so far
          </p>
        </div>
      </div>

      {/* Active Experiments */}
      <h2 className="text-xl font-bold text-white mt-8 mb-4">Active Autonomous Experiments</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Experiment 1 */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Running
              </span>
              <h3 className="text-lg font-bold text-white mt-3">Cart Abandonment Optimization</h3>
              <p className="text-slate-400 text-sm mt-1">A/B Testing 10% vs 20% Discount in Zone B</p>
            </div>
            <div className="flex gap-2">
              <button className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors">
                Details
              </button>
            </div>
          </div>
          
          <div className="space-y-4 mt-6">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-300">Variant A (10% Off)</span>
                <span className="text-emerald-400 font-medium">8.4% Conv.</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div className="bg-slate-500 h-2 rounded-full" style={{ width: '45%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-300">Variant B (20% Off)</span>
                <span className="text-emerald-400 font-medium">14.2% Conv.</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: '75%' }}></div>
              </div>
            </div>
          </div>
          
          <div className="mt-6 pt-4 border-t border-slate-800 flex justify-between items-center text-sm">
            <span className="text-slate-400">Proj. Annual Lift: <span className="text-white font-medium">+$42,000</span></span>
            <span className="text-slate-400">Confidence: <span className="text-emerald-400">92%</span></span>
          </div>
        </div>

        {/* Experiment 2 */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Winning Variant Found
              </span>
              <h3 className="text-lg font-bold text-white mt-3">Dynamic Yield Pricing</h3>
              <p className="text-slate-400 text-sm mt-1">Weather-adjusted multiplier during rain</p>
            </div>
            <div className="flex gap-2">
              <button className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors">
                Deploy
              </button>
            </div>
          </div>
          
          <div className="space-y-4 mt-6">
            <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-indigo-400" />
                </div>
                <div>
                  <p className="text-white text-sm font-medium">1.15x Price Multiplier</p>
                  <p className="text-slate-400 text-xs mt-0.5">Optimal yield curve</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-emerald-400 text-sm font-bold">+$12.50</p>
                <p className="text-slate-400 text-xs mt-0.5">Avg/Cart</p>
              </div>
            </div>
          </div>
          
          <div className="mt-6 pt-4 border-t border-slate-800 flex justify-between items-center text-sm">
            <span className="text-slate-400">Proj. Annual Lift: <span className="text-white font-medium">+$115,000</span></span>
            <span className="text-slate-400">Confidence: <span className="text-emerald-400">98%</span></span>
          </div>
        </div>
      </div>
    </div>
  );
}
