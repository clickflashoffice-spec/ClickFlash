import React, { useState } from 'react';
import { Globe, Palette, DollarSign, Users, CheckCircle, Upload, Plus, Trash2 } from 'lucide-react';
import { logger } from '@/utils/logger';

export default function FranchiseOnboardingWizard() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    // Step 1: Resort Information
    resortName: '',
    location: '',
    contactPerson: '',
    email: '',
    currency: 'EUR',
    // Step 2: Branding & Theme
    logoUrl: '',
    primaryColor: '#3b82f6',
    subdomain: '',
    // Step 3: Package & Pricing Setup
    pricingTemplate: 'premium',
    commissionRate: 15,
    // Step 4: Team & Kiosk Provisioning
    leadPhotographer: '',
    kiosksToProvision: 2,
  });
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentResult, setDeploymentResult] = useState<any>(null);

  const steps = [
    { id: 1, title: 'Resort Info', icon: <Globe className="w-4 h-4" /> },
    { id: 2, title: 'Branding', icon: <Palette className="w-4 h-4" /> },
    { id: 3, title: 'Pricing', icon: <DollarSign className="w-4 h-4" /> },
    { id: 4, title: 'Provisioning', icon: <Users className="w-4 h-4" /> },
    { id: 5, title: 'Deploy', icon: <CheckCircle className="w-4 h-4" /> },
  ];

  const handleNext = () => setStep(s => Math.min(s + 1, 5));
  const handlePrev = () => setStep(s => Math.max(s - 1, 1));

  const handleDeploy = async () => {
    setIsDeploying(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      const mockKeys = Array.from({ length: formData.kiosksToProvision }).map((_, i) => `KSK-${Math.random().toString(36).substring(2, 8).toUpperCase()}`);
      
      setDeploymentResult({
        success: true,
        resortId: `RES-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        activationKeys: mockKeys
      });
      logger.info(`Franchise onboarded successfully.`);
    } catch (e) {
      logger.error('Franchise deployment failed', e);
      alert('Deployment failed. Check console.');
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight mb-2">Franchise Onboarding Wizard</h1>
        <p className="text-slate-400">Step-by-step setup for a new ClickFlash resort partner.</p>
      </div>

      <div className="flex justify-between items-center relative">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-white/5 rounded-full z-0" />
        <div 
          className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-blue-500 rounded-full z-0 transition-all duration-300"
          style={{ width: `${((step - 1) / (steps.length - 1)) * 100}%` }}
        />
        
        {steps.map((s) => (
          <div key={s.id} className="relative z-10 flex flex-col items-center gap-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors border-4 border-black ${
              s.id < step ? 'bg-blue-500 text-white' : 
              s.id === step ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]' : 
              'bg-white/10 text-slate-400'
            }`}>
              {s.id < step ? <CheckCircle className="w-5 h-5" /> : s.icon}
            </div>
            <span className={`text-xs font-bold uppercase ${s.id <= step ? 'text-blue-400' : 'text-slate-500'}`}>
              {s.title}
            </span>
          </div>
        ))}
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
        {step === 1 && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-white">Resort Information</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Resort Name</label>
                <input 
                  type="text" 
                  value={formData.resortName}
                  onChange={e => setFormData({ ...formData, resortName: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors" 
                  placeholder="e.g. Marhaba Grand Resort" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Location / Country</label>
                <input 
                  type="text" 
                  value={formData.location}
                  onChange={e => setFormData({ ...formData, location: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors" 
                  placeholder="e.g. Sousse, Tunisia" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Contact Person</label>
                <input 
                  type="text" 
                  value={formData.contactPerson}
                  onChange={e => setFormData({ ...formData, contactPerson: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors" 
                  placeholder="John Doe" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Email Address</label>
                <input 
                  type="email" 
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors" 
                  placeholder="john@resort.com" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Base Currency</label>
                <select 
                  value={formData.currency}
                  onChange={e => setFormData({ ...formData, currency: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="EUR">EUR (€)</option>
                  <option value="USD">USD ($)</option>
                  <option value="TND">TND (DT)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-white">Branding & Theme</h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Upload Logo</label>
                <div className="border-2 border-dashed border-white/10 rounded-xl p-8 flex flex-col items-center justify-center bg-black/20 hover:bg-black/40 transition-colors cursor-pointer">
                  <Upload className="w-8 h-8 text-slate-400 mb-2" />
                  <p className="text-sm text-slate-300 font-bold">Click to upload or drag and drop</p>
                  <p className="text-xs text-slate-500 mt-1">SVG, PNG, JPG or GIF (max. 2MB)</p>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Primary Brand Color</label>
                <div className="flex items-center gap-3">
                  <input 
                    type="color" 
                    value={formData.primaryColor}
                    onChange={e => setFormData({ ...formData, primaryColor: e.target.value })}
                    className="w-12 h-12 rounded cursor-pointer bg-transparent border-0 p-0" 
                  />
                  <input 
                    type="text" 
                    value={formData.primaryColor}
                    onChange={e => setFormData({ ...formData, primaryColor: e.target.value })}
                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors font-mono uppercase" 
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Custom Subdomain</label>
                <div className="flex items-center">
                  <input 
                    type="text" 
                    value={formData.subdomain}
                    onChange={e => setFormData({ ...formData, subdomain: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 border-r-0 rounded-l-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors" 
                    placeholder="marhaba" 
                  />
                  <div className="bg-white/5 border border-white/10 border-l-0 rounded-r-xl px-4 py-3 text-slate-400 text-sm font-medium">
                    .clickflash.com
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-white">Package & Pricing Setup</h3>
            <div className="space-y-4">
              <label className="block text-xs font-bold text-slate-400 uppercase">Base Pricing Template</label>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { id: 'budget', name: 'Budget Tier', price: '€5-10/photo' },
                  { id: 'standard', name: 'Standard Tier', price: '€10-20/photo' },
                  { id: 'premium', name: 'Premium Tier', price: '€20-35/photo' },
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setFormData({ ...formData, pricingTemplate: t.id })}
                    className={`p-4 rounded-xl border text-left transition-colors ${
                      formData.pricingTemplate === t.id ? 'bg-blue-500/20 border-blue-500' : 'bg-black/40 border-white/10 hover:bg-white/5'
                    }`}
                  >
                    <p className={`font-bold ${formData.pricingTemplate === t.id ? 'text-white' : 'text-slate-300'}`}>{t.name}</p>
                    <p className={`text-sm mt-1 ${formData.pricingTemplate === t.id ? 'text-blue-300' : 'text-slate-500'}`}>{t.price}</p>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Base Commission Rate (%)</label>
              <div className="flex items-center gap-4">
                <input 
                  type="range" 
                  min="5" 
                  max="50" 
                  step="1"
                  value={formData.commissionRate}
                  onChange={e => setFormData({ ...formData, commissionRate: parseInt(e.target.value) })}
                  className="flex-1 accent-blue-500" 
                />
                <span className="text-xl font-bold text-white min-w-[3rem] text-right">{formData.commissionRate}%</span>
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-white">Team & Kiosk Provisioning</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Lead Photographer Name</label>
                <input 
                  type="text" 
                  value={formData.leadPhotographer}
                  onChange={e => setFormData({ ...formData, leadPhotographer: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors" 
                  placeholder="Admin Photographer" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Kiosks to Provision</label>
                <input 
                  type="number" 
                  min="1"
                  max="20"
                  value={formData.kiosksToProvision}
                  onChange={e => setFormData({ ...formData, kiosksToProvision: parseInt(e.target.value) })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors" 
                />
              </div>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex gap-3">
              <Users className="w-5 h-5 text-blue-400 shrink-0" />
              <div>
                <p className="text-blue-400 font-bold text-sm">Automated Provisioning</p>
                <p className="text-slate-400 text-xs mt-1">
                  Upon deployment, {formData.kiosksToProvision} kiosk activation keys will be generated. The lead photographer will receive an invite email to access the Management Hub.
                </p>
              </div>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-6">
            {!deploymentResult ? (
              <>
                <h3 className="text-lg font-bold text-white">Review & Deploy</h3>
                <div className="bg-black/40 border border-white/10 rounded-xl p-6 grid grid-cols-2 gap-y-6 gap-x-8">
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-bold mb-1">Resort Info</p>
                    <p className="text-white font-medium">{formData.resortName || 'Not specified'}</p>
                    <p className="text-slate-400 text-sm">{formData.location}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-bold mb-1">Contact</p>
                    <p className="text-white font-medium">{formData.contactPerson || 'Not specified'}</p>
                    <p className="text-slate-400 text-sm">{formData.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-bold mb-1">Branding</p>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: formData.primaryColor }} />
                      <p className="text-slate-300 text-sm">{formData.subdomain}.clickflash.com</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-bold mb-1">Financials</p>
                    <p className="text-slate-300 text-sm">{formData.currency} • {formData.pricingTemplate} tier • {formData.commissionRate}% comm.</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-bold mb-1">Provisioning</p>
                    <p className="text-slate-300 text-sm">Lead: {formData.leadPhotographer || 'Pending'}</p>
                    <p className="text-slate-300 text-sm">{formData.kiosksToProvision} Kiosks</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 space-y-6">
                <div className="mx-auto w-16 h-16 bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center rounded-full">
                  <CheckCircle className="w-8 h-8 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white">Franchise Provisioned Successfully</h3>
                  <p className="text-slate-400 mt-2">The resort environment is now live and ready for activation.</p>
                </div>
                
                <div className="bg-black/40 rounded-xl p-6 max-w-md mx-auto text-left border border-white/10 space-y-4">
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-bold mb-1">Resort ID</p>
                    <p className="font-mono text-blue-400 text-sm">{deploymentResult.resortId}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-bold mb-1">Kiosk Activation Keys ({deploymentResult.activationKeys.length})</p>
                    <div className="space-y-2 mt-2">
                      {deploymentResult.activationKeys.map((key: string, idx: number) => (
                        <div key={idx} className="flex justify-between items-center bg-white/5 p-2 rounded border border-white/5">
                          <code className="text-emerald-400 text-sm font-bold">{key}</code>
                          <span className="text-[10px] uppercase text-slate-500 font-bold">Unused</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {!deploymentResult && (
        <div className="flex justify-between mt-8">
          <button 
            onClick={handlePrev}
            disabled={step === 1}
            className="px-6 py-2.5 rounded-xl font-bold text-slate-400 hover:bg-white/5 hover:text-white disabled:opacity-50 transition-colors"
          >
            Back
          </button>
          
          {step < 5 ? (
            <button 
              onClick={handleNext}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all"
            >
              Continue to {steps[step].title}
            </button>
          ) : (
            <button 
              onClick={handleDeploy}
              disabled={isDeploying}
              className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 inline-flex items-center gap-2"
            >
              {isDeploying ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Provisioning...
                </>
              ) : 'Provision Franchise'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
