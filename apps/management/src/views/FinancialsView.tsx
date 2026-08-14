import { DollarSign, Download, ArrowUpRight, ArrowDownRight, Building2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'Mon', revenue: 4000, payouts: 2400 },
  { name: 'Tue', revenue: 3000, payouts: 1398 },
  { name: 'Wed', revenue: 2000, payouts: 9800 },
  { name: 'Thu', revenue: 2780, payouts: 3908 },
  { name: 'Fri', revenue: 1890, payouts: 4800 },
  { name: 'Sat', revenue: 2390, payouts: 3800 },
  { name: 'Sun', revenue: 3490, payouts: 4300 },
];

const transactions = [
  { id: 'TRX-101', type: 'Payout', entity: 'John Doe (Photographer)', amount: -450.00, status: 'Completed', date: 'Today, 10:30 AM' },
  { id: 'TRX-102', type: 'Revenue', entity: 'Online Gallery Sale', amount: 89.00, status: 'Completed', date: 'Today, 09:15 AM' },
  { id: 'TRX-103', type: 'Revenue', entity: 'Kiosk Sale (Main Lobby)', amount: 120.00, status: 'Completed', date: 'Yesterday, 14:20 PM' },
  { id: 'TRX-104', type: 'Payout', entity: 'Resort Commission (Marhaba)', amount: -1250.00, status: 'Processing', date: 'Yesterday, 09:00 AM' },
];

export function FinancialsView() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-emerald-500" />
            Financials & Payouts
          </h2>
          <p className="text-slate-400 mt-1">Track revenue, manage commissions, and process payouts.</p>
        </div>
        <button className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export Ledger
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
          <h3 className="text-slate-400 text-sm font-medium mb-2">Total Revenue (7d)</h3>
          <div className="flex items-end gap-3">
            <span className="text-3xl font-bold text-white">$12,450.00</span>
            <span className="flex items-center text-sm font-medium text-emerald-400 mb-1">
              <ArrowUpRight className="w-4 h-4 mr-0.5" /> +14.5%
            </span>
          </div>
        </div>
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
          <h3 className="text-slate-400 text-sm font-medium mb-2">Pending Payouts</h3>
          <div className="flex items-end gap-3">
            <span className="text-3xl font-bold text-white">$3,240.50</span>
            <span className="text-sm font-medium text-slate-500 mb-1">12 pending</span>
          </div>
        </div>
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
          <h3 className="text-slate-400 text-sm font-medium mb-2">Net Profit Margin</h3>
          <div className="flex items-end gap-3">
            <span className="text-3xl font-bold text-white">42.8%</span>
            <span className="flex items-center text-sm font-medium text-rose-400 mb-1">
              <ArrowDownRight className="w-4 h-4 mr-0.5" /> -2.1%
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-slate-900 rounded-xl border border-slate-800 p-6">
          <h3 className="text-lg font-bold text-white mb-6">Cash Flow (7 Days)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorPayouts" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '0.5rem' }}
                  itemStyle={{ color: '#f8fafc' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" fillOpacity={1} fill="url(#colorRevenue)" />
                <Area type="monotone" dataKey="payouts" stroke="#f43f5e" fillOpacity={1} fill="url(#colorPayouts)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-white">Recent Transactions</h3>
            <button className="text-sm font-medium text-emerald-400 hover:text-emerald-300">View All</button>
          </div>
          
          <div className="space-y-4 flex-1 overflow-y-auto">
            {transactions.map(trx => (
              <div key={trx.id} className="flex justify-between items-center p-3 rounded-lg hover:bg-slate-800/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${trx.amount > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-white">{trx.entity}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{trx.date}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold text-sm ${trx.amount > 0 ? 'text-emerald-400' : 'text-white'}`}>
                    {trx.amount > 0 ? '+' : ''}{trx.amount.toFixed(2)}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{trx.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
