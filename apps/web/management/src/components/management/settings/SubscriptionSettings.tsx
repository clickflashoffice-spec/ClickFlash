import React, { useState } from "react";
import { CheckCircle2, Copy, TrendingUp, Gift, Palette } from "lucide-react";

const SubscriptionSettings: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const [whiteLabelEnabled, setWhiteLabelEnabled] = useState(false);
  const referralLink = "clickflash.com/?ref=STUDIO-7A9B2C";

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-10 animate-fade-in text-white">
      <div>
        <h2 className="text-xl font-black uppercase tracking-widest mb-1">
          Subscription & Growth
        </h2>
        <p className="text-sm text-slate-400 font-medium">
          Manage your ClickFlash tier, referrals, and branding.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Current Plan */}
        <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4">
            <span className="bg-cyan-500/20 text-cyan-400 text-[10px] font-black uppercase tracking-widest py-1 px-3 rounded-full border border-cyan-500/30">
              Active
            </span>
          </div>
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">
            Current Plan
          </h3>
          <div className="mb-4">
            <span className="text-3xl font-black tracking-tighter">
              Studio Pro
            </span>
          </div>
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
              <span className="text-sm text-slate-300">Unlimited users</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
              <span className="text-sm text-slate-300">1TB secure storage</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
              <span className="text-sm text-slate-300">White-label galleries</span>
            </div>
          </div>
          <button className="w-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors rounded-xl py-3 text-xs font-black uppercase tracking-widest">
            Manage Billing
          </button>
        </div>

        {/* Referrals */}
        <div className="bg-slate-900 border border-white/10 rounded-3xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Gift className="w-4 h-4 text-blue-400" />
            </div>
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">
              Referral Program
            </h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-black/50 rounded-2xl p-4 border border-white/5">
              <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Earned Credits</p>
              <p className="text-2xl font-black text-blue-400">$120.00</p>
            </div>
            <div className="bg-black/50 rounded-2xl p-4 border border-white/5">
              <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Active Referrals</p>
              <p className="text-2xl font-black">6</p>
            </div>
          </div>

          <p className="text-xs text-slate-400 mb-2">Your Invite Link</p>
          <div className="flex items-center gap-2">
            <input 
              type="text" 
              readOnly 
              value={referralLink}
              className="flex-grow bg-black/50 border border-white/10 rounded-xl py-2 px-3 text-sm text-slate-300 outline-none"
            />
            <button 
              onClick={handleCopy}
              className="bg-blue-500 hover:bg-blue-600 transition-colors p-2.5 rounded-xl flex items-center justify-center text-white"
            >
              {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[10px] text-slate-500 mt-3 font-medium">
            Earn $20 in account credits for every studio that signs up for a paid plan.
          </p>
        </div>
      </div>

      {/* White-Labeling Settings */}
      <div className="bg-slate-900 border border-white/10 rounded-3xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
            <Palette className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">
              White-Labeling
            </h3>
            <p className="text-[10px] text-slate-500 font-medium">Control platform branding on client galleries.</p>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-black/50 border border-white/5 rounded-2xl">
          <div>
            <p className="text-sm font-bold">Remove "Powered by ClickFlash"</p>
            <p className="text-xs text-slate-500">Hides the ClickFlash footer from all customer-facing views.</p>
          </div>
          <button 
            onClick={() => setWhiteLabelEnabled(!whiteLabelEnabled)}
            className={`w-12 h-6 rounded-full transition-colors relative ${whiteLabelEnabled ? 'bg-cyan-500' : 'bg-slate-700'}`}
          >
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${whiteLabelEnabled ? 'left-7' : 'left-1'}`} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionSettings;
