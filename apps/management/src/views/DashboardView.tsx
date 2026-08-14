import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';

const data = [
  { name: 'Mon', revenue: 4000, kioskUptime: 98 },
  { name: 'Tue', revenue: 3000, kioskUptime: 97 },
  { name: 'Wed', revenue: 2000, kioskUptime: 99 },
  { name: 'Thu', revenue: 2780, kioskUptime: 100 },
  { name: 'Fri', revenue: 1890, kioskUptime: 98 },
  { name: 'Sat', revenue: 2390, kioskUptime: 96 },
  { name: 'Sun', revenue: 3490, kioskUptime: 99 },
];

export function DashboardView() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold">Executive Dashboard</h2>
          <p className="text-slate-400 mt-1">Here is what's happening at ClickFlash today.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-sm">
          <h3 className="text-slate-400 text-sm font-medium mb-2">Today's Revenue</h3>
          <div className="flex items-baseline gap-2">
            <p className="text-4xl font-bold text-white">$12,450</p>
            <span className="text-emerald-400 text-sm font-medium">+14%</span>
          </div>
        </div>
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-sm">
          <h3 className="text-slate-400 text-sm font-medium mb-2">Active Kiosks</h3>
          <div className="flex items-baseline gap-2">
            <p className="text-4xl font-bold text-white">42 / 45</p>
            <span className="text-rose-400 text-sm font-medium">3 Offline</span>
          </div>
        </div>
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-sm">
          <h3 className="text-slate-400 text-sm font-medium mb-2">Active Staff</h3>
          <div className="flex items-baseline gap-2">
            <p className="text-4xl font-bold text-white">18</p>
            <span className="text-slate-400 text-sm font-medium">On Shift</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-sm">
          <h3 className="text-slate-200 text-base font-semibold mb-6">Revenue Over Time</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc' }}
                  itemStyle={{ color: '#3b82f6' }}
                />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-sm">
          <h3 className="text-slate-200 text-base font-semibold mb-6">Kiosk Uptime %</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} domain={[90, 100]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc' }}
                  itemStyle={{ color: '#10b981' }}
                />
                <Line type="monotone" dataKey="kioskUptime" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
