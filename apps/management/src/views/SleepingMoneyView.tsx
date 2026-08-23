import { useState } from 'react';
import { DollarSign, MessageCircle, AlertOctagon, CheckCircle, Send, ShieldAlert } from 'lucide-react';
import { MOCK_SLEEPING_MONEY, MOCK_CASH_RECONCILIATION, MOCK_FRAUD_ALERTS } from '../services/concessionService';
import { SleepingMoneyGallery, CashReconciliation, FraudAlertEvent } from '@clickflash/types';

export function SleepingMoneyView() {
  const [activeTab, setActiveTab] = useState<'sleeping-money' | 'cash' | 'expenses' | 'fraud'>('sleeping-money');
  const [galleries, setGalleries] = useState<SleepingMoneyGallery[]>(MOCK_SLEEPING_MONEY);
  const [cash] = useState<CashReconciliation>(MOCK_CASH_RECONCILIATION);
  const [fraud] = useState<FraudAlertEvent[]>(MOCK_FRAUD_ALERTS);

  const totalSleepingValue = galleries.reduce((acc, g) => acc + (g.initialCartValue ?? g.galleryValue ?? 0), 0);
  const totalRecovered = galleries.reduce((acc, g) => acc + (g.recoveredValue || 0), 0);

  const handleTriggerRecovery = (id: string) => {
    setGalleries(prev => prev.map(g => {
      if (g.id === id) {
        return {
          ...g,
          status: 'CONVERTED',
          recoveredValue: (g.initialCartValue ?? g.galleryValue ?? 100) * 0.85,
          recoveryStage: 'RECOVERED',
          lastTouchAt: new Date().toISOString()
        };
      }
      return g;
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-400">
            Financials & "Sleeping Money" Recovery Cockpit
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Autonomous WhatsApp swarm recovery for abandoned carts, cashier drawer balancing, and fraud alerts.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('sleeping-money')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'sleeping-money' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            Sleeping Money Swarm
          </button>
          <button
            onClick={() => setActiveTab('cash')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'cash' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            Cash Reconciliation
          </button>
          <button
            onClick={() => setActiveTab('fraud')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'fraud' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            Fraud & Leakage Alerts
          </button>
        </div>
      </div>

      {/* Tab 1: Sleeping Money Swarm */}
      {activeTab === 'sleeping-money' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl">
              <span className="text-xs text-slate-400 font-medium">Unrecovered Opportunities</span>
              <p className="text-2xl font-bold text-amber-400 mt-2">€{totalSleepingValue.toFixed(2)}</p>
              <p className="text-xs text-slate-400 mt-1">From Unpurchased Kiosk Previews</p>
            </div>
            <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl">
              <span className="text-xs text-slate-400 font-medium">Recovered via WhatsApp Swarm</span>
              <p className="text-2xl font-bold text-emerald-400 mt-2">€{totalRecovered.toFixed(2)}</p>
              <p className="text-xs text-emerald-400/80 mt-1">38.4% Recovery Yield (+€144.00 today)</p>
            </div>
            <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl">
              <span className="text-xs text-slate-400 font-medium">Average Response Latency</span>
              <p className="text-2xl font-bold text-blue-400 mt-2">&lt; 15 mins</p>
              <p className="text-xs text-slate-400 mt-1">Autonomous Negotiator Dispatch</p>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="font-semibold text-white text-base">Unpurchased Guest Galleries (Sleeping Money)</h2>
              <span className="text-xs text-slate-400">{galleries.length} active recovery targets</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-3">Guest & Contact</th>
                    <th className="px-6 py-3">Photos in Album</th>
                    <th className="px-6 py-3">Cart Value</th>
                    <th className="px-6 py-3">Recovery Stage</th>
                    <th className="px-6 py-3">Channel</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Autonomous Closer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {galleries.map((gal) => (
                    <tr key={gal.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-3.5">
                        <p className="font-medium text-white">{gal.guestName || 'Guest'}</p>
                        <p className="text-xs text-slate-500 font-mono">{gal.guestPhone || gal.guestEmail}</p>
                      </td>
                      <td className="px-6 py-3.5 font-medium text-slate-300">{gal.photoCount ?? gal.totalPhotos ?? 0} photos</td>
                      <td className="px-6 py-3.5 font-semibold text-white">€{(gal.initialCartValue ?? gal.galleryValue ?? 0).toFixed(2)}</td>
                      <td className="px-6 py-3.5">
                        <span className="px-2 py-0.5 text-xs font-semibold rounded bg-slate-800 text-slate-300">
                          {gal.recoveryStage}
                        </span>
                      </td>
                      <td className="px-6 py-3.5">
                        <span className="flex items-center gap-1.5 text-xs text-slate-300">
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                          {gal.channelUsed || 'WHATSAPP'}
                        </span>
                      </td>
                      <td className="px-6 py-3.5">
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                          gal.status === 'CONVERTED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : gal.status === 'CONTACTED'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {gal.status}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        {gal.status !== 'CONVERTED' ? (
                          <button
                            onClick={() => handleTriggerRecovery(gal.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition-colors"
                          >
                            <Send className="w-3 h-3" />
                            Trigger Swarm Hook
                          </button>
                        ) : (
                          <span className="text-xs text-emerald-400 font-medium">Recovered (+€{gal.recoveredValue?.toFixed(2)})</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Cash Reconciliation */}
      {activeTab === 'cash' && (
        <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-xl space-y-6 max-w-3xl">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h2 className="font-semibold text-white text-lg">Daily Drawer Float & Safe Drop Balancing</h2>
              <p className="text-xs text-slate-400">Terminal {cash.terminalId} • Shift Date: {cash.shiftDate}</p>
            </div>
            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-semibold">
              Status: {cash.status}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="p-3.5 bg-slate-950/60 rounded-lg border border-slate-800">
              <span className="text-xs text-slate-400">Opening Cash Float:</span>
              <p className="text-lg font-bold text-white mt-1">€{(cash.floatAmount ?? cash.openingFloat ?? 0).toFixed(2)}</p>
            </div>
            <div className="p-3.5 bg-slate-950/60 rounded-lg border border-slate-800">
              <span className="text-xs text-slate-400">Total Cash Ingested Today:</span>
              <p className="text-lg font-bold text-emerald-400 mt-1">€{(cash.cashSalesTotal ?? cash.cashSalesRecorded ?? 0).toFixed(2)}</p>
            </div>
            <div className="p-3.5 bg-slate-950/60 rounded-lg border border-slate-800">
              <span className="text-xs text-slate-400">Mid-Shift Safe Drop (Depository):</span>
              <p className="text-lg font-bold text-purple-400 mt-1">€{(cash.safeDropAmount ?? cash.safeDrops ?? 0).toFixed(2)}</p>
            </div>
            <div className="p-3.5 bg-slate-950/60 rounded-lg border border-slate-800">
              <span className="text-xs text-slate-400">Expected in Cashier Drawer:</span>
              <p className="text-lg font-bold text-white mt-1">€{(cash.expectedInDrawer ?? 0).toFixed(2)}</p>
            </div>
          </div>

          <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Cashier: <span className="text-white font-medium">{cash.openedByUserName ?? cash.cashierName}</span></p>
              <p className="text-xs text-slate-400">Verified Witness: <span className="text-white font-medium">{cash.witnessName ?? 'Store Lead'}</span></p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400">Discrepancy:</span>
              <p className="text-lg font-bold text-emerald-400">€{(cash.discrepancyAmount ?? cash.discrepancy ?? 0).toFixed(2)} (Perfect Match)</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Fraud Alerts */}
      {activeTab === 'fraud' && (
        <div className="space-y-4">
          {fraud.map((f) => (
            <div key={f.id} className="p-5 bg-slate-900/60 border border-slate-800 rounded-xl flex items-start justify-between">
              <div className="flex items-start gap-3">
                <AlertOctagon className="w-5 h-5 text-amber-400 mt-0.5" />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-white text-sm">{f.type}</h3>
                    <span className="px-2 py-0.5 text-[10px] font-semibold bg-amber-500/10 text-amber-400 rounded">
                      {f.severity}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{f.description}</p>
                  <p className="text-xs text-slate-500 mt-1">Terminal: {f.terminalId} • Cashier: {f.involvedUserName}</p>
                </div>
              </div>
              <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Resolved by Manager
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
