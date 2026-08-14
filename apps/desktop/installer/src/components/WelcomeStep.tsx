import React from "react";
import { Camera, ArrowRight, Globe, Shield, Zap } from "lucide-react";

interface WelcomeStepProps {
  onNext: () => void;
}

const WelcomeStep: React.FC<WelcomeStepProps> = ({ onNext }) => {
  return (
    <div className="step-card max-w-2xl mx-auto mt-8">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-cyan-500/10 rounded-2xl mb-4">
          <Camera className="w-8 h-8 text-cyan-400" />
        </div>
        <h2 className="text-2xl font-bold text-slate-100 mb-2">
          Welcome to ClickFlash Studio
        </h2>
        <p className="text-slate-400">
          Professional photography management for resorts and event venues worldwide.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700/50">
          <Zap className="w-5 h-5 text-amber-400 mb-2" />
          <h3 className="text-sm font-semibold text-slate-200 mb-1">1-Click Setup</h3>
          <p className="text-xs text-slate-500">
            Install, configure, and launch in under 3 minutes.
          </p>
        </div>
        <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700/50">
          <Globe className="w-5 h-5 text-cyan-400 mb-2" />
          <h3 className="text-sm font-semibold text-slate-200 mb-1">Global Sync</h3>
          <p className="text-xs text-slate-500">
            Connect to your worldwide studio fleet instantly.
          </p>
        </div>
        <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700/50">
          <Shield className="w-5 h-5 text-emerald-400 mb-2" />
          <h3 className="text-sm font-semibold text-slate-200 mb-1">Enterprise Security</h3>
          <p className="text-xs text-slate-500">
            End-to-end encryption, GDPR compliance, secure kiosk mode.
          </p>
        </div>
      </div>

      <div className="bg-slate-900/50 rounded-lg border border-slate-700/50 p-4 mb-6">
        <h3 className="text-sm font-semibold text-slate-200 mb-2">What will be installed</h3>
        <ul className="space-y-2 text-sm text-slate-400">
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            ClickFlash Master Portal — Studio control hub (Port 8090)
          </li>
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            ClickFlash Touch Kiosk — Customer-facing terminal (Port 8091)
          </li>
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            Cloudflare Integration — Global sync, gallery, management hub
          </li>
        </ul>
      </div>

      <div className="flex justify-end">
        <button onClick={onNext} className="btn-primary flex items-center gap-2">
          Get Started
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default WelcomeStep;
