import React, { useState, useEffect } from 'react';
import { Palette, Globe, Image as ImageIcon, Save, RefreshCw } from 'lucide-react';
import { logger } from '@/utils/logger';
import { useManagement } from '../../context/ManagementContext';

export default function WhiteLabelSettingsPage() {
  const { selectedContext } = useManagement();
  
  const [formData, setFormData] = useState({
    logo_url: '',
    primary_color: '#38bdf8',
    domain_cname: '',
    receipt_footer: 'Thank you for your visit!'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // In a real app, selectedContext would be a real resort_id.
  // We'll mock 'global' to 'resort-demo-123' if needed.
  const activeResortId = selectedContext === 'global' ? 'marhaba_club' : selectedContext;

  useEffect(() => {
    async function loadTheme() {
      setIsLoading(true);
      try {
        const res = await fetch(`http://localhost:8787/api/resort/${activeResortId}/theme`);
        if (res.ok) {
          const data = await res.json();
          if (!data.error) {
            setFormData({
              logo_url: data.logo_url || '',
              primary_color: data.primary_color || '#38bdf8',
              domain_cname: data.domain_cname || '',
              receipt_footer: data.receipt_footer || 'Thank you for your visit!'
            });
          }
        }
      } catch (e) {
        logger.error('Failed to load theme data', e as Error);
      } finally {
        setIsLoading(false);
      }
    }
    loadTheme();
  }, [activeResortId]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`http://localhost:8787/api/resort/${activeResortId}/theme`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        logger.info('Theme saved successfully');
      }
    } catch (e) {
      logger.error('Failed to save theme', e as Error);
    } finally {
      setIsSaving(false);
    }
  };

  const presetColors = ['#38bdf8', '#f59e0b', '#10b981', '#ec4899', '#6366f1', '#eab308'];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/10 rounded-xl">
            <Palette className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight">White-Label Branding</h2>
            <p className="text-slate-400 text-sm">Customize Customer Gallery and receipts for {activeResortId}.</p>
          </div>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 inline-flex items-center gap-2 transition-all disabled:opacity-50"
        >
          {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Theme
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Editor Controls */}
        <div className="space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5">
            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase mb-2">
                <ImageIcon className="w-4 h-4" /> Logo URL
              </label>
              <input 
                type="text" 
                value={formData.logo_url}
                onChange={e => setFormData({ ...formData, logo_url: e.target.value })}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500" 
                placeholder="https://example.com/logo.png" 
              />
            </div>
            
            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase mb-2">
                <Palette className="w-4 h-4" /> Primary Brand Color
              </label>
              <div className="flex items-center gap-3 mb-3">
                <input 
                  type="color" 
                  value={formData.primary_color}
                  onChange={e => setFormData({ ...formData, primary_color: e.target.value })}
                  className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0 p-0" 
                />
                <input 
                  type="text" 
                  value={formData.primary_color}
                  onChange={e => setFormData({ ...formData, primary_color: e.target.value })}
                  className="bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none w-32 uppercase font-mono" 
                />
              </div>
              <div className="flex gap-2">
                {presetColors.map(color => (
                  <button
                    key={color}
                    onClick={() => setFormData({ ...formData, primary_color: color })}
                    className="w-6 h-6 rounded-full border border-white/20 transition-transform hover:scale-110"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5">
            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase mb-2">
                <Globe className="w-4 h-4" /> Custom Domain Mapping (CNAME)
              </label>
              <div className="flex">
                <span className="inline-flex items-center px-4 rounded-l-xl border border-r-0 border-white/10 bg-black/60 text-slate-500 sm:text-sm">
                  https://
                </span>
                <input 
                  type="text" 
                  value={formData.domain_cname}
                  onChange={e => setFormData({ ...formData, domain_cname: e.target.value })}
                  className="flex-1 min-w-0 block w-full px-4 py-2.5 rounded-none rounded-r-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-purple-500" 
                  placeholder="gallery.marhabaclub.com" 
                />
              </div>
              <p className="mt-2 text-xs text-slate-500">Point your CNAME record to `cname.fotiqo.com`</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">
                Receipt Footer Text
              </label>
              <textarea 
                rows={3}
                value={formData.receipt_footer}
                onChange={e => setFormData({ ...formData, receipt_footer: e.target.value })}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 resize-none" 
              />
            </div>
          </div>
        </div>

        {/* Live Preview Pane */}
        <div>
          <div className="sticky top-24">
            <h3 className="text-xs font-bold text-slate-400 uppercase mb-3">Live Gallery Preview</h3>
            
            <div className="bg-[#0B111F] border border-white/10 rounded-[2rem] overflow-hidden h-[600px] flex flex-col shadow-2xl relative">
              {/* Dynamic Header */}
              <div className="p-6 border-b border-white/5 flex items-center justify-between z-10 bg-black/20">
                {formData.logo_url ? (
                  <img src={formData.logo_url} alt="Logo" className="h-8 max-w-[150px] object-contain" />
                ) : (
                  <div className="font-serif italic text-2xl" style={{ color: formData.primary_color }}>
                    Fotiqo
                  </div>
                )}
                <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center bg-white/5 text-xs text-white">
                  FR
                </div>
              </div>
              
              {/* Fake Content */}
              <div className="p-6 flex-1 space-y-6">
                <div className="space-y-2">
                  <h4 className="text-3xl font-black text-white">Your Photos</h4>
                  <p className="text-slate-400 text-sm">Unlock your high-quality memories from {activeResortId}.</p>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="aspect-[4/5] rounded-2xl bg-white/5 border border-white/10" />
                  <div className="aspect-[4/5] rounded-2xl bg-white/5 border border-white/10" />
                </div>
              </div>
              
              {/* Fake Purchase Footer */}
              <div className="p-6 border-t border-white/5 bg-black/40 space-y-4">
                <button 
                  className="w-full py-4 rounded-2xl font-black text-white text-lg transition-transform hover:scale-[1.02]"
                  style={{ backgroundColor: formData.primary_color, boxShadow: `0 10px 20px -10px ${formData.primary_color}` }}
                >
                  Purchase Album — €85
                </button>
                <p className="text-center text-xs text-slate-500">{formData.receipt_footer}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
