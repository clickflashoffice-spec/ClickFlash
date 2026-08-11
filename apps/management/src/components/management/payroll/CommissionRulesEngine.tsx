import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Calculator, Play, Save, CheckCircle } from 'lucide-react';

interface Rule {
  id: string;
  name: string;
  role: string;
  conditionType: 'sales_volume' | 'photo_count' | 'peak_hours';
  conditionValue: number;
  bonusRate: number;
}

export default function CommissionRulesEngine() {
  const [rules, setRules] = useState<Rule[]>([
    { id: '1', name: 'High Volume Bonus', role: 'All Photographers', conditionType: 'sales_volume', conditionValue: 1000, bonusRate: 5 },
    { id: '2', name: 'Power Seller', role: 'Senior Photographer', conditionType: 'photo_count', conditionValue: 50, bonusRate: 3 },
  ]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<Rule>>({
    name: '', role: 'All Photographers', conditionType: 'sales_volume', conditionValue: 0, bonusRate: 0
  });

  // Simulator state
  const [simSales, setSimSales] = useState(1200);
  const [simPhotos, setSimPhotos] = useState(45);
  const [simBaseRate, setSimBaseRate] = useState(10);

  const handleOpenModal = (rule?: Rule) => {
    if (rule) {
      setEditingRule(rule);
      setFormData(rule);
    } else {
      setEditingRule(null);
      setFormData({ name: '', role: 'All Photographers', conditionType: 'sales_volume', conditionValue: 0, bonusRate: 0 });
    }
    setIsModalOpen(true);
  };

  const handleSaveRule = () => {
    if (editingRule) {
      setRules(rules.map(r => r.id === editingRule.id ? { ...formData, id: r.id } as Rule : r));
    } else {
      setRules([...rules, { ...formData, id: Math.random().toString(36).substring(7) } as Rule]);
    }
    setIsModalOpen(false);
  };

  const handleDeleteRule = (id: string) => {
    setRules(rules.filter(r => r.id !== id));
  };

  // Simulator logic
  const calculateSimulation = () => {
    let appliedBonuses = 0;
    const appliedRules: string[] = [];

    rules.forEach(rule => {
      let applies = false;
      if (rule.conditionType === 'sales_volume' && simSales >= rule.conditionValue) applies = true;
      if (rule.conditionType === 'photo_count' && simPhotos >= rule.conditionValue) applies = true;
      
      if (applies) {
        appliedBonuses += rule.bonusRate;
        appliedRules.push(rule.name);
      }
    });

    const totalRate = simBaseRate + appliedBonuses;
    const totalCommission = simSales * (totalRate / 100);

    return { totalRate, totalCommission, appliedRules };
  };

  const simResult = calculateSimulation();

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Commission Rules Engine</h2>
          <p className="text-slate-400">Manage automated bonus tiers and commission calculations.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Rule
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {rules.map((rule) => (
            <div key={rule.id} className="bg-white/5 border border-white/10 rounded-xl p-5 flex items-center justify-between hover:bg-white/10 transition-colors">
              <div>
                <h4 className="text-white font-bold">{rule.name}</h4>
                <div className="flex gap-4 mt-2 text-sm">
                  <span className="text-slate-400">Role: <span className="text-slate-300">{rule.role}</span></span>
                  <span className="text-slate-400">
                    Condition: <span className="text-blue-400 font-medium">
                      {rule.conditionType === 'sales_volume' ? `Sales > €${rule.conditionValue}` : 
                       rule.conditionType === 'photo_count' ? `Photos > ${rule.conditionValue}` : 
                       `Peak Hours > ${rule.conditionValue}`}
                    </span>
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <span className="block text-xs font-bold uppercase text-slate-500 mb-1">Bonus</span>
                  <span className="text-emerald-400 font-black text-lg">+{rule.bonusRate}%</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleOpenModal(rule)} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDeleteRule(rule.id)} className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {rules.length === 0 && (
            <div className="text-center py-12 bg-white/5 border border-white/10 border-dashed rounded-xl">
              <p className="text-slate-400">No commission rules defined yet.</p>
            </div>
          )}
        </div>

        <div className="lg:col-span-1">
          <div className="bg-black/40 border border-white/10 rounded-2xl p-6 sticky top-6">
            <div className="flex items-center gap-2 mb-6">
              <Calculator className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg font-bold text-white">Live Simulator</h3>
            </div>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Sample Sales (€)</label>
                <input 
                  type="number" 
                  value={simSales}
                  onChange={e => setSimSales(Number(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Photos Sold</label>
                <input 
                  type="number" 
                  value={simPhotos}
                  onChange={e => setSimPhotos(Number(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Base Rate (%)</label>
                <input 
                  type="number" 
                  value={simBaseRate}
                  onChange={e => setSimBaseRate(Number(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500" 
                />
              </div>
            </div>

            <div className="pt-6 border-t border-white/10 space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Base Commission</span>
                <span className="text-white">€{(simSales * (simBaseRate/100)).toFixed(2)}</span>
              </div>
              {simResult.appliedRules.length > 0 && (
                <div className="space-y-1">
                  <span className="text-xs font-bold text-emerald-400 uppercase">Bonuses Applied:</span>
                  {simResult.appliedRules.map((name, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-slate-300">
                      <CheckCircle className="w-3 h-3 text-emerald-500" />
                      {name}
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-between items-end pt-4 border-t border-white/10">
                <div>
                  <span className="block text-xs font-bold text-slate-500 uppercase">Total Rate</span>
                  <span className="text-lg font-bold text-blue-400">{simResult.totalRate}%</span>
                </div>
                <div className="text-right">
                  <span className="block text-xs font-bold text-slate-500 uppercase">Est. Payout</span>
                  <span className="text-2xl font-black text-emerald-400">€{simResult.totalCommission.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-white mb-6">
              {editingRule ? 'Edit Rule' : 'Create New Rule'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Rule Name</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500" 
                  placeholder="e.g. Weekend Warrior" 
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Applies To</label>
                <select 
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="All Photographers">All Photographers</option>
                  <option value="Senior Photographer">Senior Photographers</option>
                  <option value="Junior Photographer">Junior Photographers</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Condition</label>
                  <select 
                    value={formData.conditionType}
                    onChange={e => setFormData({ ...formData, conditionType: e.target.value as any })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="sales_volume">Sales Volume (€)</option>
                    <option value="photo_count">Photos Sold</option>
                    <option value="peak_hours">Peak Hours</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Greater Than</label>
                  <input 
                    type="number" 
                    value={formData.conditionValue}
                    onChange={e => setFormData({ ...formData, conditionValue: Number(e.target.value) })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Bonus Rate (+%)</label>
                <div className="flex items-center gap-3">
                  <input 
                    type="range" 
                    min="1" 
                    max="20" 
                    value={formData.bonusRate}
                    onChange={e => setFormData({ ...formData, bonusRate: Number(e.target.value) })}
                    className="flex-1 accent-emerald-500" 
                  />
                  <span className="text-xl font-bold text-emerald-400 min-w-[3rem] text-right">+{formData.bonusRate}%</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-slate-400 hover:text-white font-bold transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveRule}
                disabled={!formData.name}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-bold transition-colors"
              >
                <Save className="w-4 h-4" />
                Save Rule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
