import React, { useState } from 'react';

interface GeneratorFormProps {
  onGenerate: (plan: string, maxMasters: number, expiresDays: number, count: number, machineId?: string) => void;
}

export function GeneratorForm({ onGenerate }: GeneratorFormProps) {
  const [plan, setPlan] = useState('pro');
  const [maxMasters, setMaxMasters] = useState(5);
  const [expiresDays, setExpiresDays] = useState(365);
  const [count, setCount] = useState(10);
  const [machineId, setMachineId] = useState('');

  const plans = [
    { value: 'trial', label: 'Trial', desc: '1 studio, 14 days', price: 'Free' },
    { value: 'starter', label: 'Starter', desc: '1 studio, basic features', price: '€500/mo' },
    { value: 'pro', label: 'Pro', desc: '5 studios, all features', price: '€1,500/mo' },
    { value: 'enterprise', label: 'Enterprise', desc: '50 studios, GDPR + R2', price: '€2,500/mo' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate(plan, maxMasters, expiresDays, count, machineId.trim() || undefined);
  };

  return (
    <form className="generator-form" onSubmit={handleSubmit}>
      <div className="form-grid">
        <div className="form-group">
          <label>License Plan</label>
          <select value={plan} onChange={(e) => setPlan(e.target.value)}>
            {plans.map(p => (
              <option key={p.value} value={p.value}>
                {p.label} — {p.desc} ({p.price})
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Max Studios</label>
          <input
            type="number"
            value={maxMasters}
            onChange={(e) => setMaxMasters(Number(e.target.value))}
            min={1}
            max={100}
          />
        </div>

        <div className="form-group">
          <label>Duration (days)</label>
          <input
            type="number"
            value={expiresDays}
            onChange={(e) => setExpiresDays(Number(e.target.value))}
            min={1}
            max={3650}
          />
        </div>

        <div className="form-group">
          <label>Quantity</label>
          <input
            type="number"
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            min={1}
            max={100}
          />
        </div>
        
        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label>Hardware Binding (Optional Machine ID)</label>
          <input
            type="text"
            placeholder="e.g. 12345678-1234-1234-1234-123456789012"
            value={machineId}
            onChange={(e) => setMachineId(e.target.value)}
          />
        </div>
      </div>

      <button type="submit" className="generate-btn">
        Generate License Keys
      </button>
    </form>
  );
}
