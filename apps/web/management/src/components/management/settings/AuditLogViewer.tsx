import React, { useState } from 'react';
import { ShieldAlert, Download, Filter, Eye, X } from 'lucide-react';

interface AuditLog {
  id: string;
  timestamp: string;
  actor: string;
  role: string;
  actionType: string;
  ipAddress: string;
  resource: string;
  status: 'Success' | 'Failed' | 'Warning';
  payload?: any;
}

const mockLogs: AuditLog[] = [
  { id: '1', timestamp: '2026-08-10T14:30:00Z', actor: 'Admin Sarah', role: 'System Admin', actionType: 'Pricing Change', ipAddress: '192.168.1.10', resource: 'Premium Package', status: 'Success', payload: { oldPrice: 25, newPrice: 30 } },
  { id: '2', timestamp: '2026-08-10T14:15:22Z', actor: 'Photo Kiosk 3', role: 'System', actionType: 'Auth', ipAddress: '10.0.0.5', resource: 'Session Login', status: 'Failed', payload: { error: 'Invalid PIN' } },
  { id: '3', timestamp: '2026-08-10T13:45:10Z', actor: 'Manager Tom', role: 'Manager', actionType: 'Payout', ipAddress: '192.168.1.45', resource: 'Photographer John', status: 'Success', payload: { amount: 1250, period: '2026-07' } },
  { id: '4', timestamp: '2026-08-10T12:00:00Z', actor: 'System', role: 'System', actionType: 'License Update', ipAddress: '127.0.0.1', resource: 'Resort B Key', status: 'Warning', payload: { daysRemaining: 3 } },
  { id: '5', timestamp: '2026-08-09T16:20:00Z', actor: 'Photographer Alex', role: 'Photographer', actionType: 'Photo Delete', ipAddress: '10.0.0.12', resource: 'Session #892', status: 'Success', payload: { photoIds: ['p_123', 'p_124'] } },
];

export default function AuditLogViewer() {
  const [logs] = useState<AuditLog[]>(mockLogs);
  const [filterAction, setFilterAction] = useState<string>('All');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const actionTypes = ['All', 'Auth', 'Pricing Change', 'Photo Delete', 'Payout', 'License Update'];

  const filteredLogs = filterAction === 'All' 
    ? logs 
    : logs.filter(log => log.actionType === filterAction);

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Success': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
      case 'Failed': return 'text-red-400 bg-red-400/10 border-red-400/20';
      case 'Warning': return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
      default: return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
    }
  };

  const handleExport = (format: 'csv' | 'json') => {
    let content = '';
    let mime = '';
    if (format === 'json') {
      content = JSON.stringify(filteredLogs, null, 2);
      mime = 'application/json';
    } else {
      content = ['Timestamp,Actor,Role,Action,Resource,Status'].concat(
        filteredLogs.map(l => `${l.timestamp},${l.actor},${l.role},${l.actionType},${l.resource},${l.status}`)
      ).join('\n');
      mime = 'text/csv';
    }
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-xl">
            <ShieldAlert className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight text-white">Security & Audit Logs</h2>
            <p className="text-slate-400 text-sm">System-wide immutable activity trail.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select 
              value={filterAction}
              onChange={e => setFilterAction(e.target.value)}
              className="bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 appearance-none"
            >
              {actionTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <button 
            onClick={() => handleExport('csv')}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-sm font-bold transition-colors"
          >
            <Download className="w-4 h-4" />
            CSV
          </button>
          <button 
            onClick={() => handleExport('json')}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 rounded-xl text-sm font-bold transition-colors"
          >
            JSON
          </button>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-black/20 border-b border-white/10">
              <tr>
                <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Timestamp</th>
                <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Actor</th>
                <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Action</th>
                <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Resource</th>
                <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">IP Address</th>
                <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Status</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredLogs.map(log => (
                <tr key={log.id} className="hover:bg-white/5 transition-colors">
                  <td className="p-4 font-mono text-sm text-slate-400">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="p-4">
                    <div className="text-sm font-bold text-white">{log.actor}</div>
                    <div className="text-xs text-slate-500">{log.role}</div>
                  </td>
                  <td className="p-4">
                    <span className="text-sm text-slate-300 bg-white/5 px-2 py-1 rounded-md border border-white/5">
                      {log.actionType}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-slate-300">{log.resource}</td>
                  <td className="p-4 text-sm font-mono text-slate-500">{log.ipAddress}</td>
                  <td className="p-4 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusColor(log.status)}`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => setSelectedLog(log)}
                      className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                      title="View Payload"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    No logs found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/40">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Log Details <span className="text-slate-500 font-mono text-xs">#{selectedLog.id}</span>
              </h3>
              <button 
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase mb-1">Actor</p>
                  <p className="text-white text-sm">{selectedLog.actor} <span className="text-slate-400">({selectedLog.role})</span></p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase mb-1">Timestamp</p>
                  <p className="text-white text-sm font-mono">{new Date(selectedLog.timestamp).toISOString()}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase mb-1">Action</p>
                  <p className="text-white text-sm">{selectedLog.actionType}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase mb-1">Status</p>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold border ${getStatusColor(selectedLog.status)}`}>
                    {selectedLog.status}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-500 uppercase mb-2">Event Payload (JSON)</p>
                <div className="bg-black/60 border border-white/10 rounded-xl p-4 overflow-x-auto">
                  <pre className="text-emerald-400 font-mono text-sm">
                    {JSON.stringify(selectedLog.payload, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
