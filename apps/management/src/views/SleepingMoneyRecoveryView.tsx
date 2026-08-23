import { useState } from 'react';
import { CircleDollarSign, Send, Clock, Flame, ShieldAlert, Sparkles, CheckCircle } from 'lucide-react';
import type { SleepingMoneyLead, CashDrawerRecord } from '@clickflash/types';

const mockLeads: SleepingMoneyLead[] = [
  {
    id: 'SML-101',
    guestName: 'The Henderson Family',
    phone: '+1 (555) 234-5678',
    email: 'henderson.vacay@example.com',
    galleryId: 'gal_beach_101',
    totalPhotos: 24,
    galleryValue: 149.00,
    hoursUnsold: 4.5,
    initialCartValue: 149.00,
    currentDiscountPercent: 20,
    urgencyLevel: 'HIGH',
    closerSwarmHandoff: true,
    lastMessageSent: '30 mins ago (20% Off Magic Link)',
    status: 'OFFER_SENT',
    abandonedAt: '2026-08-23T14:00:00Z',
  },
  {
    id: 'SML-102',
    guestName: 'Marcus & Chloe Vance',
    phone: '+1 (555) 876-5432',
    galleryId: 'gal_pool_084',
    totalPhotos: 18,
    galleryValue: 99.00,
    hoursUnsold: 1.2,
    initialCartValue: 99.00,
    currentDiscountPercent: 15,
    urgencyLevel: 'MEDIUM',
    closerSwarmHandoff: false,
    status: 'PENDING_OFFER',
    abandonedAt: '2026-08-23T17:00:00Z',
  },
  {
    id: 'SML-103',
    guestName: 'Aiden & Liam Rossi',
    phone: '+39 340 123 4567',
    galleryId: 'gal_sunset_032',
    totalPhotos: 42,
    galleryValue: 249.00,
    hoursUnsold: 7.8,
    initialCartValue: 249.00,
    currentDiscountPercent: 30,
    urgencyLevel: 'CRITICAL',
    closerSwarmHandoff: true,
    lastMessageSent: '10 mins ago (Flash 30% Off Countdown)',
    status: 'OFFER_SENT',
    abandonedAt: '2026-08-23T10:30:00Z',
  },
  {
    id: 'SML-100',
    guestName: 'Carlos Rodriguez',
    phone: '+34 612 345 678',
    email: 'carlos.r@example.es',
    galleryId: 'gal_water_099',
    totalPhotos: 30,
    galleryValue: 189.00,
    hoursUnsold: 6.0,
    initialCartValue: 189.00,
    currentDiscountPercent: 25,
    urgencyLevel: 'HIGH',
    closerSwarmHandoff: true,
    lastMessageSent: '1 hour ago',
    status: 'RECOVERED',
    abandonedAt: '2026-08-23T12:00:00Z',
  },
];

const mockCashDrawer: CashDrawerRecord = {
  id: 'CASH-20260823-01',
  terminalId: 'POS-01',
  openedByUserId: 'EMP-003',
  openedByUserName: 'Elena R.',
  cashierId: 'EMP-003',
  cashierName: 'Elena R. (Front Desk Kiosk)',
  shiftDate: '2026-08-23',
  floatAmount: 300.00,
  openingFloat: 300.00,
  cashSalesTotal: 1480.00,
  cashSalesRecorded: 1480.00,
  safeDropAmount: 1000.00,
  safeDrops: 1000.00,
  expectedInDrawer: 780.00,
  actualCounted: 780.00,
  closingCashCounted: 780.00,
  discrepancyAmount: 0.00,
  discrepancy: 0.00,
  status: 'RECONCILED',
  notes: 'All drawer counts balanced. Mid-day safe drop verified by Shift Lead.',
};

export function SleepingMoneyRecoveryView() {
  const [leads, setLeads] = useState<SleepingMoneyLead[]>(mockLeads);
  const [cashDrawer] = useState<CashDrawerRecord>(mockCashDrawer);
  const [selectedUrgency, setSelectedUrgency] = useState<string>('ALL');

  const handleTriggerSwarm = (leadId: string) => {
    setLeads(prev =>
      prev.map(l =>
        l.id === leadId
          ? { ...l, closerSwarmHandoff: true, status: 'OFFER_SENT', lastMessageSent: 'Just now (WhatsApp Swarm Handoff)' }
          : l
      )
    );
  };

  const filteredLeads = selectedUrgency === 'ALL'
    ? leads
    : leads.filter(l => l.urgencyLevel === selectedUrgency);

  const totalSleepingValue = leads
    .filter(l => l.status !== 'RECOVERED')
    .reduce((sum, l) => sum + (l.galleryValue ?? l.initialCartValue ?? 0), 0);

  const totalRecoveredValue = leads
    .filter(l => l.status === 'RECOVERED')
    .reduce((sum, l) => sum + (l.galleryValue ?? l.initialCartValue ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3 text-white">
            <CircleDollarSign className="w-8 h-8 text-emerald-400" />
            "Sleeping Money" Recovery & Cash Drawer
          </h2>
          <p className="text-slate-400 mt-1">
            Reclaim lost revenue from unpurchased guest galleries via automated WhatsApp closer swarms and reconcile daily cash floats.
          </p>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider flex items-center gap-1">
            <Flame className="w-3.5 h-3.5" /> Total Sleeping Pipeline
          </span>
          <p className="text-2xl font-bold text-white mt-1">${totalSleepingValue.toFixed(2)}</p>
          <span className="text-xs text-slate-400">{leads.filter(l => l.status !== 'RECOVERED').length} active unsold galleries</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" /> Recovered Today
          </span>
          <p className="text-2xl font-bold text-emerald-400 mt-1">${totalRecoveredValue.toFixed(2)}</p>
          <span className="text-xs text-slate-400">+34% vs standard cart dropoff</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> Swarm Automation Rate
          </span>
          <p className="text-2xl font-bold text-indigo-300 mt-1">92.4%</p>
          <span className="text-xs text-slate-400">Zero human intervention</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5" /> Cash Discrepancy
          </span>
          <p className="text-2xl font-bold text-emerald-400 mt-1">${(cashDrawer.discrepancy ?? 0).toFixed(2)}</p>
          <span className="text-xs text-slate-400">Drawer Perfectly Balanced</span>
        </div>
      </div>

      {/* Sleeping Money Table */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="font-semibold text-white">Unsold Guest Galleries (Urgency Ladder)</h3>
            <p className="text-xs text-slate-400">Automated discount stepped triggers sent to WhatsApp</p>
          </div>
          <div className="flex gap-2">
            {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'].map(urg => (
              <button
                key={urg}
                onClick={() => setSelectedUrgency(urg)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  selectedUrgency === urg
                    ? 'bg-emerald-600 text-white shadow'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {urg}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/60 text-xs uppercase text-slate-400 font-semibold border-b border-slate-700">
              <tr>
                <th className="p-3">Guest & Contact</th>
                <th className="p-3">Photos & Value</th>
                <th className="p-3">Hours Idle</th>
                <th className="p-3">Discount Tier</th>
                <th className="p-3">Urgency</th>
                <th className="p-3">Closer Swarm Status</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredLeads.map(lead => (
                <tr key={lead.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-3">
                    <div className="font-medium text-white">{lead.guestName}</div>
                    <div className="text-xs text-slate-400">{lead.phone || lead.email}</div>
                  </td>
                  <td className="p-3">
                    <div className="font-semibold text-emerald-400">${(lead.galleryValue ?? lead.initialCartValue ?? 0).toFixed(2)}</div>
                    <div className="text-xs text-slate-400">{(lead.totalPhotos ?? lead.photoCount ?? 0)} photos in album</div>
                  </td>
                  <td className="p-3 text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>{lead.hoursUnsold ?? 0} hrs</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className="font-semibold text-indigo-300">-{lead.currentDiscountPercent ?? 15}% Off</span>
                    <div className="text-xs text-slate-500 font-mono">Dynamic Yield</div>
                  </td>
                  <td className="p-3">
                    {lead.urgencyLevel === 'CRITICAL' && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                        CRITICAL (Exit Imminent)
                      </span>
                    )}
                    {lead.urgencyLevel === 'HIGH' && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                        HIGH
                      </span>
                    )}
                    {lead.urgencyLevel === 'MEDIUM' && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/15 text-blue-400 border border-blue-500/30">
                        MEDIUM
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-xs text-slate-300">
                    {lead.status === 'RECOVERED' ? (
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> Converted & Paid
                      </span>
                    ) : lead.closerSwarmHandoff ? (
                      <div>
                        <span className="text-indigo-400 font-medium">WhatsApp Swarm Engaged</span>
                        <div className="text-slate-500 text-[11px]">{lead.lastMessageSent}</div>
                      </div>
                    ) : (
                      <span className="text-slate-500">Awaiting Swarm Dispatch</span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    {lead.status !== 'RECOVERED' && (
                      <button
                        onClick={() => handleTriggerSwarm(lead.id)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 ml-auto"
                      >
                        <Send className="w-3.5 h-3.5" /> Dispatch Closer
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cash Drawer & Safe Drop Reconciliation */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
        <h3 className="font-semibold text-white flex items-center gap-2 mb-3">
          <CircleDollarSign className="w-5 h-5 text-emerald-400" />
          Cash Drawer & Safe Drop Audit (Shift #{cashDrawer.id})
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-sm">
          <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/50">
            <span className="text-xs text-slate-400">Opening Float</span>
            <p className="text-lg font-bold text-white mt-0.5">${(cashDrawer.openingFloat ?? cashDrawer.floatAmount ?? 0).toFixed(2)}</p>
          </div>
          <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/50">
            <span className="text-xs text-slate-400">Cash Ingested</span>
            <p className="text-lg font-bold text-emerald-400 mt-0.5">${(cashDrawer.cashSalesRecorded ?? cashDrawer.cashSalesTotal ?? 0).toFixed(2)}</p>
          </div>
          <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/50">
            <span className="text-xs text-slate-400">Mid-Shift Safe Drops</span>
            <p className="text-lg font-bold text-indigo-300 mt-0.5">-${(cashDrawer.safeDrops ?? cashDrawer.safeDropAmount ?? 0).toFixed(2)}</p>
          </div>
          <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/50">
            <span className="text-xs text-slate-400">Closing Cash Count</span>
            <p className="text-lg font-bold text-white mt-0.5">${(cashDrawer.closingCashCounted ?? cashDrawer.actualCounted ?? 0).toFixed(2)}</p>
          </div>
          <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/50">
            <span className="text-xs text-slate-400">Discrepancy</span>
            <p className="text-lg font-bold text-emerald-400 mt-0.5">${(cashDrawer.discrepancy ?? cashDrawer.discrepancyAmount ?? 0).toFixed(2)} (Balanced)</p>
          </div>
        </div>
        <div className="mt-3 text-xs text-slate-400 flex justify-between items-center">
          <span>Responsible Cashier: <strong className="text-slate-200">{cashDrawer.cashierName}</strong></span>
          <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 font-medium">Reconciliation Verified</span>
        </div>
      </div>
    </div>
  );
}
