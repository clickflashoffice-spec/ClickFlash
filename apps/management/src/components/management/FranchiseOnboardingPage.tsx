import React, { useState } from 'react';
import { ShieldCheck, Key, CheckCircle, Server, Globe, Download } from 'lucide-react';
import { logger } from '@/utils/logger';

export default function FranchiseOnboardingPage() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    region_id: 'MENA',
    country: '',
    base_currency: 'EUR'
  });
  const [isDeploying, setIsDeploying] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleNext = () => setStep(s => Math.min(s + 1, 4));
  const handlePrev = () => setStep(s => Math.max(s - 1, 1));

  const handleDeploy = async () => {
    setIsDeploying(true);
    try {
      const response = await fetch('http://localhost:8787/api/franchise/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      
      if (data.success) {
        setResult(data);
        setStep(4);
        logger.info(`Franchise ${data.resort_id} onboarded successfully.`);
      } else {
        alert(`Deployment failed: ${data.error}`);
      }
    } catch (e) {
      logger.error(e);
      alert('Deployment failed. Check console.');
    } finally {
      setIsDeploying(false);
    }
  };

  const handleDownloadKeys = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resort-config-${result.resort_id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-500/10 rounded-xl">
          <Globe className="w-6 h-6 text-blue-400" />
        </div>
        <div>
          <h2 className="text-2xl font-black tracking-tight">Franchise Setup Wizard</h2>
          <p className="text-slate-400 text-sm">Provision a new global Fotiqo location.</p>
        </div>
      </div>

      <div className="flex gap-4 mb-8">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex-1">
            <div className={`h-1.5 rounded-full ${s <= step ? 'bg-blue-500' : 'bg-white/10'}`} />
            <p className={`mt-2 text-xs font-bold uppercase ${s <= step ? 'text-blue-400' : 'text-slate-500'}`}>
              {s === 1 ? 'Resort Details' : s === 2 ? 'Cloud Region' : s === 3 ? 'License Keys' : 'Deployment'}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white">Resort Identity</h3>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Resort Name</label>
              <input 
                type="text" 
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500" 
                placeholder="e.g. Marhaba Grand Resort" 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Country</label>
                <input 
                  type="text" 
                  value={formData.country}
                  onChange={e => setFormData({ ...formData, country: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500" 
                  placeholder="e.g. Tunisia" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Base Currency</label>
                <select 
                  value={formData.base_currency}
                  onChange={e => setFormData({ ...formData, base_currency: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                  <option value="TND">TND</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white">Cloud Region & Data Sovereignty</h3>
            <p className="text-sm text-slate-400">Select the Cloudflare D1 shard for this location.</p>
            <div className="grid grid-cols-2 gap-4 mt-4">
              {['MENA', 'EU', 'AMER', 'APAC'].map(region => (
                <button
                  key={region}
                  onClick={() => setFormData({ ...formData, region_id: region })}
                  className={`p-4 rounded-xl border text-left flex items-center gap-3 transition-colors ${
                    formData.region_id === region ? 'bg-blue-500/20 border-blue-500 text-white' : 'bg-black/40 border-white/10 text-slate-400 hover:bg-white/5'
                  }`}
                >
                  <Server className="w-5 h-5" />
                  <span className="font-bold">{region} Node</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white">Offline License Provisioning</h3>
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <p className="text-emerald-400 font-bold text-sm">Crypto Engine Ready</p>
                <p className="text-slate-400 text-xs mt-1">
                  Upon deployment, a unique crypto seed will be generated for offline licensing, allowing Fotiqo Master and Touch stations to validate licenses locally without internet connectivity.
                </p>
              </div>
            </div>
          </div>
        )}

        {step === 4 && result && (
          <div className="text-center py-8 space-y-6">
            <div className="mx-auto w-16 h-16 bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center rounded-full">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-white">Resort Online</h3>
              <p className="text-slate-400 mt-2">D1 initialized in {result.region_id}. Station seeds generated.</p>
            </div>
            
            <div className="bg-black/40 rounded-xl p-4 max-w-sm mx-auto text-left border border-white/10">
              <p className="text-xs text-slate-500 uppercase font-bold mb-1">Resort ID</p>
              <p className="font-mono text-blue-400 mb-3 text-sm">{result.resort_id}</p>
              <p className="text-xs text-slate-500 uppercase font-bold mb-1">License Seed</p>
              <p className="font-mono text-emerald-400 text-sm">{result.license_seed}</p>
            </div>

            <button 
              onClick={handleDownloadKeys}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all"
            >
              <Download className="w-5 h-5" />
              Download Config Bundle
            </button>
          </div>
        )}
      </div>

      {step < 4 && (
        <div className="flex justify-between">
          <button 
            onClick={handlePrev}
            disabled={step === 1}
            className="px-6 py-2.5 rounded-xl font-bold text-slate-400 hover:bg-white/5 hover:text-white disabled:opacity-50"
          >
            Back
          </button>
          {step < 3 ? (
            <button 
              onClick={handleNext}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all"
            >
              Continue
            </button>
          ) : (
            <button 
              onClick={handleDeploy}
              disabled={isDeploying || !formData.name}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 inline-flex items-center gap-2"
            >
              {isDeploying && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Deploy Resort
            </button>
          )}
        </div>
      )}
    </div>
  );
}
