import { useState } from 'react';
import { Camera, Printer, BatteryCharging, AlertTriangle, CheckCircle, RefreshCw, Layers } from 'lucide-react';
import type { SerializedEquipment, DnpSublimationPrintJob } from '@clickflash/types';

const mockEquipment: SerializedEquipment[] = [
  {
    id: 'EQ-001',
    assetTag: 'CF-CAM-801',
    category: 'CAMERA_BODY',
    model: 'Sony A7 IV',
    serialNumber: 'SN-9982410',
    batteryHealthPercent: 94,
    shutterCount: 34210,
    assignedPhotographerId: 'P-01',
    assignedPhotographerName: 'Sarah M.',
    status: 'CHECKED_OUT',
    conditionRating: 5,
    lastAuditDate: '2026-08-20',
  },
  {
    id: 'EQ-002',
    assetTag: 'CF-LENS-2470',
    category: 'LENS',
    model: 'FE 24-70mm f/2.8 GM II',
    serialNumber: 'SN-1102948',
    assignedPhotographerId: 'P-01',
    assignedPhotographerName: 'Sarah M.',
    status: 'CHECKED_OUT',
    conditionRating: 5,
    lastAuditDate: '2026-08-20',
  },
  {
    id: 'EQ-003',
    assetTag: 'CF-CAM-802',
    category: 'CAMERA_BODY',
    model: 'Sony A7 IV',
    serialNumber: 'SN-9982411',
    batteryHealthPercent: 78,
    shutterCount: 88400,
    assignedPhotographerId: 'P-04',
    assignedPhotographerName: 'James K.',
    status: 'CHECKED_OUT',
    conditionRating: 4,
    lastAuditDate: '2026-08-19',
  },
  {
    id: 'EQ-004',
    assetTag: 'CF-BAT-04',
    category: 'BATTERY',
    model: 'NP-FZ100 (Pack of 2)',
    serialNumber: 'SN-BAT-0921',
    batteryHealthPercent: 99,
    status: 'AVAILABLE',
    conditionRating: 5,
    lastAuditDate: '2026-08-22',
  },
  {
    id: 'EQ-005',
    assetTag: 'CF-SD-128',
    category: 'SD_CARD',
    model: 'SanDisk Extreme Pro 128GB V90',
    serialNumber: 'SN-SD-4410',
    status: 'AVAILABLE',
    conditionRating: 5,
    lastAuditDate: '2026-08-21',
  },
  {
    id: 'EQ-006',
    assetTag: 'CF-CAM-803',
    category: 'CAMERA_BODY',
    model: 'Canon EOS R6 Mark II',
    serialNumber: 'SN-3394811',
    batteryHealthPercent: 62,
    shutterCount: 142000,
    status: 'MAINTENANCE',
    conditionRating: 2,
    lastAuditDate: '2026-08-15',
  },
];

const mockPrintJobs: DnpSublimationPrintJob[] = [
  {
    id: 'PJ-901',
    galleryId: 'gal_beach_101',
    photoId: 'photo_9901',
    photoUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400',
    printSize: '6x8',
    copies: 2,
    printerId: 'DNP-DS620-LOBBY',
    printerModel: 'DNP DS620A Dye-Sub',
    paperRemainingPercent: 68,
    ribbonRemainingPercent: 54,
    iccProfile: 'DNP_Lustre_v2.icc',
    status: 'PRINTING',
    cropAlignment: { x: 0.5, y: 0.5, zoom: 1.0 },
    submittedAt: '2 mins ago',
  },
  {
    id: 'PJ-902',
    galleryId: 'gal_pool_202',
    photoId: 'photo_9902',
    photoUrl: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=400',
    printSize: '8x10',
    copies: 1,
    printerId: 'DNP-DS820-STUDIO',
    printerModel: 'DNP DS820 Metallic Pro',
    paperRemainingPercent: 82,
    ribbonRemainingPercent: 79,
    iccProfile: 'DNP_Metallic_Gloss.icc',
    status: 'QUEUED',
    cropAlignment: { x: 0.5, y: 0.45, zoom: 1.05 },
    submittedAt: '5 mins ago',
  },
  {
    id: 'PJ-900',
    galleryId: 'gal_water_303',
    photoId: 'photo_9900',
    photoUrl: 'https://images.unsplash.com/photo-1538964173425-93884d739596?w=400',
    printSize: '4x6',
    copies: 3,
    printerId: 'DNP-DS620-LOBBY',
    printerModel: 'DNP DS620A Dye-Sub',
    paperRemainingPercent: 68,
    ribbonRemainingPercent: 54,
    iccProfile: 'DNP_Lustre_v2.icc',
    status: 'COMPLETED',
    cropAlignment: { x: 0.5, y: 0.5, zoom: 1.0 },
    submittedAt: '18 mins ago',
    completedAt: '16 mins ago',
  },
];

export function EquipmentPrintHubView() {
  const [activeTab, setActiveTab] = useState<'equipment' | 'printQueue'>('equipment');
  const [equipmentList] = useState<SerializedEquipment[]>(mockEquipment);
  const [printJobs, setPrintJobs] = useState<DnpSublimationPrintJob[]>(mockPrintJobs);

  const handleReprint = (jobId: string) => {
    setPrintJobs(prev =>
      prev.map(j => (j.id === jobId ? { ...j, status: 'QUEUED', submittedAt: 'Just now' } : j))
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3 text-white">
            <Camera className="w-8 h-8 text-indigo-400" />
            Equipment & Thermal Print Hub
          </h2>
          <p className="text-slate-400 mt-1">
            Track serialized camera bodies, lenses, battery cycles, and DNP dye-sublimation print spoolers.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveTab('equipment')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'equipment'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Equipment Fleet ({equipmentList.length})
          </button>
          <button
            onClick={() => setActiveTab('printQueue')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'printQueue'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            DNP Print Spooler ({printJobs.length})
          </button>
        </div>
      </div>

      {/* Equipment View */}
      {activeTab === 'equipment' && (
        <div className="space-y-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Assets</span>
              <p className="text-2xl font-bold text-white mt-1">{equipmentList.length}</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Checked Out (Field)</span>
              <p className="text-2xl font-bold text-emerald-400 mt-1">
                {equipmentList.filter(e => e.status === 'CHECKED_OUT').length}
              </p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">In Locker (Ready)</span>
              <p className="text-2xl font-bold text-blue-400 mt-1">
                {equipmentList.filter(e => e.status === 'AVAILABLE').length}
              </p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Maintenance</span>
              <p className="text-2xl font-bold text-amber-400 mt-1">
                {equipmentList.filter(e => e.status === 'MAINTENANCE').length}
              </p>
            </div>
          </div>

          {/* Equipment Table */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
              <h3 className="font-semibold text-white">Serialized Hardware Registry</h3>
              <span className="text-xs text-slate-400">Digital Sign-in / Sign-out Active</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-800/60 text-xs uppercase text-slate-400 font-semibold border-b border-slate-700">
                  <tr>
                    <th className="p-3">Asset Tag / S/N</th>
                    <th className="p-3">Model & Category</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Assigned To</th>
                    <th className="p-3">Battery Health</th>
                    <th className="p-3">Shutter Count</th>
                    <th className="p-3">Condition</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {equipmentList.map(item => (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 font-mono font-medium text-white">
                        <div>{item.assetTag}</div>
                        <div className="text-xs text-slate-500">{item.serialNumber}</div>
                      </td>
                      <td className="p-3">
                        <div className="font-medium text-slate-200">{item.model}</div>
                        <div className="text-xs text-slate-400">{item.category}</div>
                      </td>
                      <td className="p-3">
                        {item.status === 'CHECKED_OUT' && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Checked Out
                          </span>
                        )}
                        {item.status === 'AVAILABLE' && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            In Locker
                          </span>
                        )}
                        {item.status === 'MAINTENANCE' && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Maintenance
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-slate-300">
                        {item.assignedPhotographerName || <span className="text-slate-500">—</span>}
                      </td>
                      <td className="p-3">
                        {item.batteryHealthPercent ? (
                          <div className="flex items-center gap-2">
                            <BatteryCharging className="w-4 h-4 text-emerald-400" />
                            <span>{item.batteryHealthPercent}%</span>
                          </div>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="p-3 text-slate-300">
                        {item.shutterCount ? item.shutterCount.toLocaleString() : '—'}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <div
                              key={i}
                              className={`w-2 h-2 rounded-full ${
                                i < item.conditionRating ? 'bg-amber-400' : 'bg-slate-700'
                              }`}
                            />
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* DNP Sublimation Print Queue */}
      {activeTab === 'printQueue' && (
        <div className="space-y-6">
          {/* Printer Telemetry */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <Printer className="w-6 h-6 text-indigo-400" />
                  <div>
                    <h4 className="font-semibold text-white">DNP DS620A (Lobby Station)</h4>
                    <span className="text-xs text-emerald-400 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Online & Ready
                    </span>
                  </div>
                </div>
                <span className="text-xs font-mono bg-slate-800 px-2 py-1 rounded text-slate-300">USB High-Speed</span>
              </div>
              <div className="space-y-2 text-sm text-slate-300">
                <div className="flex justify-between">
                  <span>Paper Roll (6x8)</span>
                  <span className="font-semibold text-white">68% (272 prints left)</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-indigo-500 h-full rounded-full" style={{ width: '68%' }} />
                </div>
                <div className="flex justify-between pt-1">
                  <span>Dye Ribbon</span>
                  <span className="font-semibold text-white">54%</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: '54%' }} />
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <Printer className="w-6 h-6 text-purple-400" />
                  <div>
                    <h4 className="font-semibold text-white">DNP DS820 (Metallic Studio)</h4>
                    <span className="text-xs text-emerald-400 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Online & Ready
                    </span>
                  </div>
                </div>
                <span className="text-xs font-mono bg-slate-800 px-2 py-1 rounded text-slate-300">LAN IP: 192.168.1.182</span>
              </div>
              <div className="space-y-2 text-sm text-slate-300">
                <div className="flex justify-between">
                  <span>Metallic Paper (8x10)</span>
                  <span className="font-semibold text-white">82% (110 prints left)</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-purple-500 h-full rounded-full" style={{ width: '82%' }} />
                </div>
                <div className="flex justify-between pt-1">
                  <span>Ribbon (Color + Overlay)</span>
                  <span className="font-semibold text-white">79%</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: '79%' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Active Queue Table */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-400" />
                Active Thermal Print Queue
              </h3>
              <button className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" /> Refresh Queue
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-800/60 text-xs uppercase text-slate-400 font-semibold border-b border-slate-700">
                  <tr>
                    <th className="p-3">Preview</th>
                    <th className="p-3">Job ID</th>
                    <th className="p-3">Size & Copies</th>
                    <th className="p-3">Target Printer</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Timing</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {printJobs.map(job => (
                    <tr key={job.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3">
                        <img
                          src={job.photoUrl}
                          alt="Print Thumbnail"
                          className="w-12 h-12 object-cover rounded-md border border-slate-700"
                        />
                      </td>
                      <td className="p-3 font-mono font-medium text-white">
                        {job.id}
                        <div className="text-xs text-slate-500">{job.galleryId}</div>
                      </td>
                      <td className="p-3">
                        <span className="font-semibold text-indigo-300">{job.printSize}</span>
                        <span className="text-slate-400 ml-1">({job.copies}x)</span>
                        <div className="text-xs text-slate-500 font-mono">{job.iccProfile}</div>
                      </td>
                      <td className="p-3 text-slate-300">{job.printerId}</td>
                      <td className="p-3">
                        {job.status === 'PRINTING' && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 animate-pulse">
                            Printing...
                          </span>
                        )}
                        {job.status === 'QUEUED' && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Queued
                          </span>
                        )}
                        {job.status === 'COMPLETED' && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Completed
                          </span>
                        )}
                        {job.status === 'FAILED' && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Failed
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-slate-400 text-xs">
                        <div>Submitted: {job.submittedAt}</div>
                        {job.completedAt && <div className="text-emerald-400">Done: {job.completedAt}</div>}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleReprint(job.id)}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
                        >
                          Reprint
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
