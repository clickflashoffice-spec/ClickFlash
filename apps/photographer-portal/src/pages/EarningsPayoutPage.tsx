import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, DollarSign, TrendingUp, ShieldCheck, CreditCard, ArrowUpRight, Zap, CheckCircle2 } from 'lucide-react';
import { usePhotographerStore } from '../stores/photographerStore';

export const EarningsPayoutPage: React.FC = () => {
  const navigate = useNavigate();
  const session = usePhotographerStore((state) => state.session);
  const stats = usePhotographerStore((state) => state.stats);

  const formattedEarnings = (stats.earnedCommissionsCents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-brand-dark text-slate-100 pb-20"
    >
      <header className="p-4 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="text-slate-300 hover:text-white p-2 flex items-center gap-2 text-sm"
          >
            <ArrowLeft size={18} /> Back to Uploader
          </button>
          <h1 className="text-base font-bold text-white flex items-center gap-2">
            <DollarSign size={16} className="text-emerald-400" /> Commissions & Payouts
          </h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
        {/* Earnings Hero Card */}
        <div className="glass-card p-6 md:p-8 rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-emerald-950/20 backdrop-blur-2xl relative overflow-hidden shadow-2xl">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 mb-1">
                <TrendingUp size={14} /> Live Freelance Earnings
              </span>
              <h2 className="text-4xl font-extrabold text-white tracking-tight">{formattedEarnings}</h2>
              <p className="text-xs text-slate-400 mt-2">
                15% revenue share from all guest purchases linked to your camera session.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button className="px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all">
                <CreditCard size={16} /> Instant Stripe Payout
              </button>
            </div>
          </div>
        </div>

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="glass-card p-5 rounded-2xl border border-slate-800 bg-slate-900/50">
            <span className="text-xs text-slate-400">Total Uploaded</span>
            <div className="text-2xl font-bold text-white mt-1">{stats.totalUploaded}</div>
            <span className="text-[11px] text-slate-500">RAW & JPEG Assets</span>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-slate-800 bg-slate-900/50">
            <span className="text-xs text-slate-400">Keepers Ratio</span>
            <div className="text-2xl font-bold text-cyan-400 mt-1">
              {Math.round((stats.totalKeepers / Math.max(1, stats.totalUploaded)) * 100)}%
            </div>
            <span className="text-[11px] text-slate-500">WASM Sharpness Pass</span>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-slate-800 bg-slate-900/50">
            <span className="text-xs text-slate-400">Guest Views</span>
            <div className="text-2xl font-bold text-indigo-400 mt-1">{stats.guestViews}</div>
            <span className="text-[11px] text-slate-500">Self-Service QR Visits</span>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-slate-800 bg-slate-900/50">
            <span className="text-xs text-slate-400">Guest Orders</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">{stats.completedOrders}</div>
            <span className="text-[11px] text-slate-500">Completed Purchases</span>
          </div>
        </div>

        {/* Recent Session Activity */}
        <div className="glass-card p-6 rounded-2xl border border-slate-800 bg-slate-900/60">
          <h3 className="text-sm font-bold text-white mb-4">Recent Session Commission Logs</h3>
          
          <div className="space-y-3">
            {[
              { shoot: 'Sunset VIP Coaster & Waterslide', time: '20 mins ago', items: 8, commission: '$38.40', type: 'Digital + 8x10 Print' },
              { shoot: 'Wave Pool Family Portraits', time: '1 hour ago', items: 14, commission: '$62.25', type: 'Hardcover Memory Album' },
              { shoot: 'Apex Rapids Action Shot', time: '3 hours ago', items: 5, commission: '$21.00', type: 'Digital High-Res Bundle' },
              { shoot: 'Castle Golden Hour Walk', time: 'Yesterday', items: 22, commission: '$118.50', type: 'Layflat Photo Book' },
            ].map((row, idx) => (
              <div key={idx} className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs">
                <div>
                  <div className="font-semibold text-white">{row.shoot}</div>
                  <div className="text-[11px] text-slate-400">{row.type} • {row.time}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-emerald-400 text-sm">+{row.commission}</div>
                  <div className="text-[10px] text-slate-500">Paid to Balance</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </motion.div>
  );
};
