import { useState, useEffect } from 'react';
import { Tag, Plus, Check, Loader2 } from 'lucide-react';

interface Package {
  id: string;
  name: string;
  type: string;
  price: number;
  basePrice: number;
  yieldMultiplier: number;
  active: boolean;
}

export function PricingView() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPricing() {
      try {
        const res = await fetch('http://localhost:8787/api/pricing/packages');
        if (res.ok) {
          const data = await res.json();
          setPackages(data.items || []);
        }
      } catch (err) {
        console.error('Failed to fetch pricing:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchPricing();
  }, []);
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <Tag className="w-8 h-8 text-amber-500" />
            Pricing & Products
          </h2>
          <p className="text-slate-400 mt-1">Manage global packages, physical products, and promotional coupons.</p>
        </div>
        <button className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
          <Plus className="w-4 h-4" />
          Create Package
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading ? (
          <div className="col-span-full flex items-center justify-center p-12">
             <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
             <span className="ml-3 text-slate-400">Loading dynamic pricing...</span>
          </div>
        ) : packages.map(pkg => (
          <div key={pkg.id} className={`bg-slate-900 rounded-xl border ${pkg.active ? 'border-amber-500/30' : 'border-slate-800'} p-5 flex flex-col relative overflow-hidden`}>
            {pkg.yieldMultiplier !== 1 && (
               <div className={`absolute top-0 right-0 px-2 py-1 text-[10px] font-bold tracking-wider rounded-bl-lg ${pkg.yieldMultiplier > 1 ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                 YIELD: {pkg.yieldMultiplier > 1 ? '+' : '-'}{Math.abs((pkg.yieldMultiplier - 1) * 100).toFixed(0)}%
               </div>
            )}
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1 block">{pkg.type}</span>
                <h3 className="text-lg font-bold text-white">{pkg.name}</h3>
              </div>
              {pkg.active ? (
                <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <Check className="w-4 h-4 text-amber-400" />
                </div>
              ) : (
                <div className="px-2 py-1 rounded bg-slate-800 text-xs font-medium text-slate-400">Draft</div>
              )}
            </div>
            
            <div className="mt-auto pt-4 border-t border-slate-800/50 flex justify-between items-center">
              <div>
                <span className="text-2xl font-bold text-white">${pkg.price.toFixed(2)}</span>
                {pkg.yieldMultiplier !== 1 && (
                  <span className="text-xs text-slate-500 line-through ml-2">${pkg.basePrice.toFixed(2)}</span>
                )}
              </div>
              <button className="text-sm font-medium text-amber-400 hover:text-amber-300">Edit</button>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-sm">
          <h3 className="text-slate-200 text-base font-semibold mb-4">Active Promotions</h3>
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 flex justify-between items-center">
              <div>
                <span className="font-mono text-emerald-400 font-bold tracking-wider">SUMMER24</span>
                <p className="text-sm text-slate-400 mt-1">15% off All Inclusive Digital</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-slate-300">Used 142 times</p>
                <p className="text-xs text-slate-500 mt-1">Expires in 12 days</p>
              </div>
            </div>
          </div>
          <button className="mt-4 text-sm font-medium text-amber-400 hover:text-amber-300 flex items-center gap-1">
            <Plus className="w-4 h-4" /> Create Coupon Code
          </button>
        </div>
      </div>
    </div>
  );
}
