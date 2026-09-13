import { useEffect, useState } from 'react';
import { Building2, DollarSign, ShoppingBag, Users, TrendingUp, ShieldAlert, KeyRound, Globe, Star, MessageSquare } from 'lucide-react';

interface TenantStats {
  id: string;
  name: string;
  region: string;
  totalRevenue: number;
  totalOrders: number;
  activePhotographers: number;
  csatScore: number;
  activePrintLab: string;
}

function FranchiseOverview() {
  const [stats, setStats] = useState<TenantStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [impersonatingTenant, setImpersonatingTenant] = useState<TenantStats | null>(null);
  const [routingPolicy, setRoutingPolicy] = useState<'MARGIN_MAXIMIZER' | 'SPEED_FASTEST' | 'LOCAL_ONLY'>('MARGIN_MAXIMIZER');

  useEffect(() => {
    // Simulated fetch for Franchise stats
    setTimeout(() => {
      setStats([
        { id: '1', name: 'ClickFlash Orlando', region: 'AMER', totalRevenue: 154000, totalOrders: 4200, activePhotographers: 45, csatScore: 4.8, activePrintLab: 'Prodigi US (99.2% SLA)' },
        { id: '2', name: 'ClickFlash Paris', region: 'EU', totalRevenue: 98000, totalOrders: 2800, activePhotographers: 32, csatScore: 4.6, activePrintLab: 'Whitewall Berlin (99.8% SLA)' },
        { id: '3', name: 'ClickFlash Tokyo', region: 'APAC', totalRevenue: 210000, totalOrders: 5800, activePhotographers: 60, csatScore: 4.9, activePrintLab: 'Local DNP Kiosk Spooler (100% SLA)' },
        { id: '4', name: 'ClickFlash Dubai Atlantis', region: 'EMEA', totalRevenue: 185000, totalOrders: 5100, activePhotographers: 50, csatScore: 4.7, activePrintLab: 'Loxley Global (98.9% SLA)' }
      ]);
      setLoading(false);
    }, 300);
  }, []);

  const totalRevenue = stats.reduce((acc, curr) => acc + curr.totalRevenue, 0);
  const totalOrders = stats.reduce((acc, curr) => acc + curr.totalOrders, 0);

  if (loading) {
    return <div className="p-8 text-slate-400">Loading multi-tenant franchise telemetry...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Super Admin Impersonation Banner */}
      {impersonatingTenant && (
        <div className="p-4 bg-amber-500/20 border border-amber-500/40 rounded-xl flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            <div>
              <p className="text-sm font-bold text-white">
                HQ Super-Admin Impersonation Active: <span className="text-amber-300">{impersonatingTenant.name}</span>
              </p>
              <p className="text-xs text-amber-200/80">
                You are viewing this venue's operations with General Manager authorization. Actions are audited in the HQ ledger.
              </p>
            </div>
          </div>
          <button
            onClick={() => setImpersonatingTenant(null)}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-lg text-xs transition-colors"
          >
            Exit Impersonation
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500 flex items-center gap-2">
            <Building2 className="text-cyan-400" /> Franchise HQ & Global Orchestration
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Global concession super-admin, multi-region print lab routing, tenant impersonation & aggregated CSAT telemetry.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-2 rounded-xl text-xs">
          <Globe className="w-4 h-4 text-cyan-400" />
          <span className="text-slate-400">Lab Routing:</span>
          <select
            value={routingPolicy}
            onChange={(e) => setRoutingPolicy(e.target.value as any)}
            className="bg-slate-800 text-white font-medium rounded px-2 py-1 border border-slate-700 outline-none"
          >
            <option value="MARGIN_MAXIMIZER">Margin Maximizer (Highest Gross Profit)</option>
            <option value="SPEED_FASTEST">Speed First (&lt;24h Courier Delivery)</option>
            <option value="LOCAL_ONLY">Edge DNP Kiosk Spooler Only</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Global Concession CSAT Average</span>
            <Star className="text-amber-400" size={16} />
          </div>
          <div className="text-3xl font-extrabold text-amber-400 mt-2">
            4.75 / 5.0
          </div>
          <div className="text-xs text-slate-400 flex items-center gap-1 mt-2 font-medium">
            <MessageSquare size={14} /> 99.1% Negative Review Interception Rate
          </div>
        </div>
      </div>

      {/* Destinations by Region & Impersonation Matrix */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl space-y-4">
        <h3 className="text-base font-bold text-white">Franchise Destinations & Remote Operator Switcher</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stats.map((tenant) => (
            <div key={tenant.id} className="p-5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-white text-base">{tenant.name}</span>
                  <p className="text-xs text-slate-400">Lab: {tenant.activePrintLab}</p>
                </div>
                <span className="text-[11px] bg-cyan-500/10 text-cyan-400 px-2.5 py-1 rounded-full border border-cyan-500/20 font-bold">
                  {tenant.region}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-800/80 text-xs">
                <div>
                  <span className="text-slate-500 text-[10px]">Revenue</span>
                  <p className="font-bold text-emerald-400 mt-0.5">${tenant.totalRevenue.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px]">Orders</span>
                  <p className="font-bold text-white mt-0.5">{tenant.totalOrders}</p>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px]">CSAT</span>
                  <p className="font-bold text-amber-400 mt-0.5">{tenant.csatScore} ★</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Users size={13} /> {tenant.activePhotographers} on shift
                </span>
                <button
                  onClick={() => setImpersonatingTenant(tenant)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-semibold rounded-lg transition-colors border border-slate-700"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  Impersonate GM
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default FranchiseOverview;
