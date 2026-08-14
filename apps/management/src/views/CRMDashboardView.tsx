import React, { useState } from 'react';
import { 
  ShoppingCart, 
  Bell, 
  RefreshCw, 
  CircleDollarSign,
  Search,
  MoreVertical,
  Mail,
  Settings
} from 'lucide-react';

// Mock Data
const MOCK_CARTS = [
  { id: 'crt-001', customer: 'Sarah Jenkins', gallery: 'Summer Splash 2026', value: 145.00, lastActive: '2 hours ago', status: 'Reminder Sent' },
  { id: 'crt-002', customer: 'Mike Thompson', gallery: 'Alpine Resort Winter', value: 89.50, lastActive: '1 day ago', status: 'Swept Up' },
  { id: 'crt-003', customer: 'Emily Chen', gallery: 'Sunset Cruise VIP', value: 210.00, lastActive: '3 days ago', status: 'Recovered' },
  { id: 'crt-004', customer: 'David Garcia', gallery: 'Mountain Coaster', value: 45.00, lastActive: '5 days ago', status: 'Lost' },
  { id: 'crt-005', customer: 'Amanda & Co.', gallery: 'Family Reunion Package', value: 320.00, lastActive: '12 hours ago', status: 'Reminder Sent' },
];

export const CRMDashboardView: React.FC = () => {
  const [autoRemindDelay, setAutoRemindDelay] = useState(24);
  const [sweepDiscount, setSweepDiscount] = useState(15);
  const [maxReminders, setMaxReminders] = useState(3);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Reminder Sent': return <span className="px-2 py-1 text-xs font-medium bg-blue-500/20 text-blue-400 rounded border border-blue-500/30">{status}</span>;
      case 'Swept Up': return <span className="px-2 py-1 text-xs font-medium bg-amber-500/20 text-amber-400 rounded border border-amber-500/30">{status}</span>;
      case 'Recovered': return <span className="px-2 py-1 text-xs font-medium bg-emerald-500/20 text-emerald-400 rounded border border-emerald-500/30">{status}</span>;
      case 'Lost': return <span className="px-2 py-1 text-xs font-medium bg-slate-700 text-slate-400 rounded border border-slate-600">{status}</span>;
      default: return null;
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full text-slate-200">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
          <ShoppingCart className="text-amber-400" size={28} />
          Abandoned-Cart CRM
        </h1>
        <p className="text-slate-400 mt-1">Recover lost revenue with automated reminders and smart sweep-up discounts.</p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Abandoned Carts', value: '1,248', icon: <ShoppingCart size={20} />, color: 'text-slate-400', bg: 'bg-slate-800' },
          { label: '24h Reminders Sent', value: '412', icon: <Bell size={20} />, color: 'text-blue-400', bg: 'bg-blue-500/20' },
          { label: '7-Day Sweep-Ups', value: '185', icon: <RefreshCw size={20} />, color: 'text-amber-400', bg: 'bg-amber-500/20' },
          { label: 'Revenue Recovered', value: '$12,450', icon: <CircleDollarSign size={20} />, color: 'text-emerald-400', bg: 'bg-emerald-500/20' }
        ].map((metric, i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 rounded-lg p-5 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${metric.bg} ${metric.color}`}>
                {metric.icon}
              </div>
              <span className="text-sm font-medium text-slate-400">{metric.label}</span>
            </div>
            <div className="text-3xl font-bold text-slate-100">{metric.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main Table */}
        <div className="xl:col-span-2 bg-slate-900 border border-slate-800 rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Recent Activity</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input 
                type="text" 
                placeholder="Search customers..." 
                className="bg-slate-950 border border-slate-700 text-sm rounded-md pl-9 pr-4 py-2 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-sm">
                  <th className="pb-3 font-medium">Customer</th>
                  <th className="pb-3 font-medium">Gallery</th>
                  <th className="pb-3 font-medium">Cart Value</th>
                  <th className="pb-3 font-medium">Last Active</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {MOCK_CARTS.map((cart, idx) => (
                  <tr key={idx} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                    <td className="py-4 text-slate-200 font-medium">{cart.customer}</td>
                    <td className="py-4 text-slate-400">{cart.gallery}</td>
                    <td className="py-4 text-slate-200">${cart.value.toFixed(2)}</td>
                    <td className="py-4 text-slate-400 text-sm">{cart.lastActive}</td>
                    <td className="py-4">{getStatusBadge(cart.status)}</td>
                    <td className="py-4 text-right">
                      <button className="p-2 hover:bg-slate-800 rounded text-slate-400 transition-colors">
                        <MoreVertical size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Settings Panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 flex flex-col gap-6">
          <div className="flex items-center gap-2 mb-2">
            <Settings className="text-cyan-400" size={24} />
            <h2 className="text-xl font-semibold">Sweep-Up Settings</h2>
          </div>
          
          <div className="space-y-5">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-400">Auto-remind delay (hours)</label>
              <div className="flex items-center gap-4">
                <input 
                  type="range" 
                  min="1" max="72" 
                  value={autoRemindDelay} 
                  onChange={(e) => setAutoRemindDelay(parseInt(e.target.value))}
                  className="w-full accent-cyan-500"
                />
                <span className="bg-slate-950 border border-slate-700 px-3 py-1 rounded text-sm w-16 text-center">{autoRemindDelay}h</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-400">Sweep-up discount percentage</label>
              <div className="flex items-center gap-4">
                <input 
                  type="range" 
                  min="0" max="50" step="5"
                  value={sweepDiscount} 
                  onChange={(e) => setSweepDiscount(parseInt(e.target.value))}
                  className="w-full accent-amber-500"
                />
                <span className="bg-slate-950 border border-slate-700 px-3 py-1 rounded text-sm w-16 text-center">{sweepDiscount}%</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-400">Max reminders per customer</label>
              <select 
                value={maxReminders}
                onChange={(e) => setMaxReminders(parseInt(e.target.value))}
                className="bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 w-full"
              >
                <option value="1">1 Reminder</option>
                <option value="2">2 Reminders</option>
                <option value="3">3 Reminders</option>
                <option value="5">5 Reminders</option>
              </select>
            </div>
          </div>

          <div className="mt-auto pt-6 border-t border-slate-800">
            <button className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-medium py-2.5 rounded flex items-center justify-center gap-2 transition-colors">
              <Mail size={18} />
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CRMDashboardView;
