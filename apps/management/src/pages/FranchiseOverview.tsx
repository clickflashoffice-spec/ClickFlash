import { useEffect, useState } from 'react';
import { Building2, DollarSign, ShoppingBag, Users, TrendingUp } from 'lucide-react';

interface TenantStats {
  id: string;
  name: string;
  region: string;
  totalRevenue: number;
  totalOrders: number;
  activePhotographers: number;
}

export function FranchiseOverview() {
  const [stats, setStats] = useState<TenantStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulated fetch for Franchise stats
    setTimeout(() => {
      setStats([
        { id: '1', name: 'ClickFlash Orlando', region: 'AMER', totalRevenue: 154000, totalOrders: 4200, activePhotographers: 45 },
        { id: '2', name: 'ClickFlash Paris', region: 'EU', totalRevenue: 98000, totalOrders: 2800, activePhotographers: 32 },
        { id: '3', name: 'ClickFlash Tokyo', region: 'APAC', totalRevenue: 210000, totalOrders: 5800, activePhotographers: 60 }
      ]);
      setLoading(false);
    }, 400);
  }, []);

  const totalRevenue = stats.reduce((acc, curr) => acc + curr.totalRevenue, 0);
  const totalOrders = stats.reduce((acc, curr) => acc + curr.totalOrders, 0);

  if (loading) {
    return <div className="p-8 text-slate-400">Loading multi-tenant franchise telemetry...</div>;
  }

  return (
    <div className="p-8 space-y-6 text-slate-100">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Building2 className="text-cyan-400" /> Franchise & Regional Performance
          </h1>
          <p className="text-sm text-slate-400">Global multi-tenant edge node deployment overview</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Global Multi-Tenant Revenue</span>
            <DollarSign className="text-emerald-400" size={16} />
          </div>
          <div className="text-3xl font-extrabold text-white mt-2">
            ${totalRevenue.toLocaleString()}
          </div>
          <div className="text-xs text-emerald-400 flex items-center gap-1 mt-2 font-medium">
            <TrendingUp size={14} /> +18.4% vs last month
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Total Completed Resort Orders</span>
            <ShoppingBag className="text-cyan-400" size={16} />
          </div>
          <div className="text-3xl font-extrabold text-white mt-2">
            {totalOrders.toLocaleString()}
          </div>
          <div className="text-xs text-cyan-400 flex items-center gap-1 mt-2 font-medium">
            <TrendingUp size={14} /> +12.1% conversion efficiency
          </div>
        </div>
      </div>

      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
        <h3 className="text-base font-bold text-white mb-4">Franchise Destinations by Region</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats.map((tenant) => (
            <div key={tenant.id} className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm">{tenant.name}</span>
                <span className="text-[10px] bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-500/20 font-bold">
                  {tenant.region}
                </span>
              </div>
              <div className="text-lg font-bold text-emerald-400">${tenant.totalRevenue.toLocaleString()}</div>
              <div className="text-xs text-slate-400 flex justify-between pt-1 border-t border-slate-800">
                <span>Orders: {tenant.totalOrders}</span>
                <span className="flex items-center gap-1"><Users size={12} /> {tenant.activePhotographers} active</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default FranchiseOverview;
