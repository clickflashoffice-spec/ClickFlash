import { useState } from 'react';
import { Camera, BatteryCharging, Plus, CheckCircle, Clock } from 'lucide-react';
import { MOCK_GEAR_ASSETS } from '../services/concessionService';
import { GearAsset } from '@clickflash/types';

export function EquipmentView() {
  const [assets, setAssets] = useState<GearAsset[]>(MOCK_GEAR_ASSETS);
  const [filter, setFilter] = useState<string>('ALL');

  const filteredAssets = assets.filter(a => {
    if (filter === 'ALL') return true;
    return a.category === filter;
  });

  const handleReturn = (id: string) => {
    setAssets(prev => prev.map(a => a.id === id ? { ...a, status: 'AVAILABLE', assignedToUserId: undefined, assignedToName: undefined } : a));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">
            Camera & Hardware Asset Fleet
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Serialized gear tracking, battery health monitoring, and photographer sign-out logs.
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" />
          Add Hardware Asset
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Total Assets</span>
            <Camera className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">{assets.length}</p>
          <p className="text-xs text-emerald-400 mt-1">100% In Active Rotation</p>
        </div>
        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Checked Out</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-amber-400 mt-2">
            {assets.filter(a => a.status === 'CHECKED_OUT').length}
          </p>
          <p className="text-xs text-slate-400 mt-1">Assigned to Field Photographers</p>
        </div>
        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Available in Lockbox</span>
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400 mt-2">
            {assets.filter(a => a.status === 'AVAILABLE').length}
          </p>
          <p className="text-xs text-slate-400 mt-1">Ready for Next Shift</p>
        </div>
        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Average Battery Health</span>
            <BatteryCharging className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">96.5%</p>
          <p className="text-xs text-slate-400 mt-1">Li-Ion Smart Cycle Telemetry</p>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        {['ALL', 'BODY', 'LENS', 'STROBE', 'BATTERY', 'SD_CARD'].map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === cat
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {cat === 'ALL' ? 'All Gear' : cat}
          </button>
        ))}
      </div>

      {/* Asset Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAssets.map((asset) => (
          <div key={asset.id} className="p-5 bg-slate-900/60 border border-slate-800 rounded-xl hover:border-slate-700 transition-all space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wider rounded bg-slate-800 text-slate-300">
                  {asset.assetTag}
                </span>
                <h3 className="font-semibold text-white mt-1.5">{asset.model}</h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{asset.serialNumber}</p>
              </div>
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                asset.status === 'AVAILABLE'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : asset.status === 'CHECKED_OUT'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}>
                {asset.status === 'CHECKED_OUT' ? `In Field: ${asset.assignedToName}` : asset.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-800/80">
              <div>
                <span className="text-slate-500">Condition:</span>
                <span className="ml-1 text-slate-300 font-medium">{'★'.repeat(asset.conditionRating)} ({asset.conditionRating}/5)</span>
              </div>
              {asset.batteryHealthPercent && (
                <div>
                  <span className="text-slate-500">Battery Health:</span>
                  <span className="ml-1 text-emerald-400 font-medium">{asset.batteryHealthPercent}%</span>
                </div>
              )}
              {asset.shutterCount && (
                <div>
                  <span className="text-slate-500">Shutter Count:</span>
                  <span className="ml-1 text-slate-300 font-medium">{asset.shutterCount.toLocaleString()}</span>
                </div>
              )}
              {asset.lastServiceDate && (
                <div>
                  <span className="text-slate-500">Last Service:</span>
                  <span className="ml-1 text-slate-300">{asset.lastServiceDate}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              {asset.status === 'CHECKED_OUT' ? (
                <button
                  onClick={() => handleReturn(asset.id)}
                  className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 rounded-lg transition-colors"
                >
                  Return to Lockbox
                </button>
              ) : (
                <button
                  onClick={() => {
                    const name = prompt('Assign to Photographer Name:', 'Marco Rossi');
                    if (name) {
                      setAssets(prev => prev.map(a => a.id === asset.id ? { ...a, status: 'CHECKED_OUT', assignedToName: name } : a));
                    }
                  }}
                  className="w-full py-1.5 bg-blue-600/80 hover:bg-blue-600 text-xs font-medium text-white rounded-lg transition-colors"
                >
                  Check Out Gear
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
