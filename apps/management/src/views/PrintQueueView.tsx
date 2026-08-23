import { useState } from 'react';
import { Printer, RefreshCw, CheckCircle, AlertTriangle, Play, RotateCcw } from 'lucide-react';
import { MOCK_PRINTERS, MOCK_PRINT_JOBS } from '../services/concessionService';
import { PrintJob, PrinterStatus } from '@clickflash/types';

export function PrintQueueView() {
  const [printers] = useState<PrinterStatus[]>(MOCK_PRINTERS);
  const [jobs, setJobs] = useState<PrintJob[]>(MOCK_PRINT_JOBS);

  const handleReprint = (job: PrintJob) => {
    const newJob: PrintJob = {
      ...job,
      id: `pj-reprint-${Date.now()}`,
      status: 'QUEUED',
      submittedAt: new Date().toISOString()
    };
    setJobs([newJob, ...jobs]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-teal-400">
            DNP Sublimation Print Queue Spooler
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time dye-sublimation print spooler, hardware media telemetry, and instant reprint dispatcher.
          </p>
        </div>
        <button 
          onClick={() => {
            setJobs(prev => prev.map(j => j.status === 'QUEUED' ? { ...j, status: 'PRINTING' } : j));
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Play className="w-4 h-4" />
          Process Next Spool Batch
        </button>
      </div>

      {/* Printer Fleet Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {printers.map((printer) => (
          <div key={printer.id} className="p-5 bg-slate-900/70 border border-slate-800 rounded-xl space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Printer className="w-4 h-4 text-teal-400" />
                  <h3 className="font-semibold text-white text-sm">{printer.name}</h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{printer.model}</p>
                <p className="text-[11px] text-slate-500 font-mono">{printer.ipAddress}</p>
              </div>
              <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full ${
                printer.status === 'ONLINE' || printer.status === 'PRINTING'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}>
                {printer.status}
              </span>
            </div>

            {/* Paper & Ribbon Meters */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Paper Remaining:</span>
                  <span className="font-semibold text-slate-200">{printer.paperRemaining} sheets</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${printer.paperRemaining < 50 ? 'bg-amber-500' : 'bg-teal-500'}`}
                    style={{ width: `${Math.min(100, (printer.paperRemaining / 700) * 100)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Thermal Ribbon:</span>
                  <span className="font-semibold text-slate-200">{printer.ribbonRemainingPercent}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${printer.ribbonRemainingPercent}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between text-[11px] text-slate-500 pt-1">
              <span>Temp: {printer.temperatureCelsius}°C</span>
              <span>Total Lifetime Prints: {printer.totalPrintsCounter.toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Print Queue Jobs Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="font-semibold text-white text-base">Active Spool & Print Jobs</h2>
          <span className="text-xs text-slate-400">{jobs.length} total jobs spooled today</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-6 py-3">Job ID</th>
                <th className="px-6 py-3">Preview</th>
                <th className="px-6 py-3">Guest / Order</th>
                <th className="px-6 py-3">Printer</th>
                <th className="px-6 py-3">Format</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {jobs.map((job) => (
                <tr key={job.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-3.5 font-mono text-xs text-slate-400">{job.id}</td>
                  <td className="px-6 py-3.5">
                    <img 
                      src={job.photoUrl} 
                      alt="Print item" 
                      className="w-10 h-10 object-cover rounded-md border border-slate-700 shadow-sm" 
                    />
                  </td>
                  <td className="px-6 py-3.5">
                    <p className="font-medium text-white">{job.guestName || 'Guest Order'}</p>
                    <p className="text-xs text-slate-500">{job.orderId}</p>
                  </td>
                  <td className="px-6 py-3.5 text-xs text-slate-300">{job.printerName}</td>
                  <td className="px-6 py-3.5">
                    <span className="px-2 py-0.5 text-xs font-semibold rounded bg-slate-800 text-slate-300">
                      {job.paperSize} × {job.copies}
                    </span>
                  </td>
                  <td className="px-6 py-3.5">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                      job.status === 'COMPLETED'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : job.status === 'PRINTING'
                        ? 'bg-blue-500/10 text-blue-400 animate-pulse'
                        : 'bg-amber-500/10 text-amber-400'
                    }`}>
                      {job.status === 'COMPLETED' && <CheckCircle className="w-3 h-3" />}
                      {job.status === 'PRINTING' && <RefreshCw className="w-3 h-3 animate-spin" />}
                      {job.status === 'QUEUED' && <AlertTriangle className="w-3 h-3" />}
                      {job.status}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <button
                      onClick={() => handleReprint(job)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
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
  );
}
