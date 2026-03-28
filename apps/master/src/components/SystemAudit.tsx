import React, { useEffect, useState, useCallback, useMemo } from 'react';
import DiagnosticMetrics from './dashboard/DiagnosticMetrics';
import Spinner from './common/Spinner';

interface AuditLogEntry {
    timestamp: string;
    level: 'INFO' | 'WARN' | 'ERROR';
    event: string;
    email?: string;
    ip?: string;
    description?: string;
    reason?: string;
    [key: string]: any;
}

export const SystemAudit: React.FC = () => {
    const [diagnostics, setDiagnostics] = useState<any>(null);
    const [logs, setLogs] = useState<AuditLogEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Filters
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedLevel, setSelectedLevel] = useState('ALL');
    const [searchTerm, setSearchTerm] = useState('');

    const fetchData = useCallback(async (isRefresh = false) => {
        if (isRefresh) setIsRefreshing(true);
        else setIsLoading(true);

        try {
            // 1. Fetch Diagnostics
            const diagRes = await fetch('/api/system/diagnostics');
            const diagData = await diagRes.json();
            setDiagnostics(diagData);

            // 2. Fetch Logs
            const logRes = await fetch(`/api/system/logs?date=${selectedDate}&level=${selectedLevel}`);
            const logData = await logRes.json();
            setLogs(logData.logs || []);
        } catch (e) {
            console.error('Audit Fetch Failed:', e);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [selectedDate, selectedLevel]);

    useEffect(() => {
        fetchData();
        // Poll diagnostics every 5s
        const interval = setInterval(() => {
            fetch('/api/system/diagnostics')
                .then(r => r.json())
                .then(setDiagnostics)
                .catch(console.error);
        }, 5000);
        return () => clearInterval(interval);
    }, [fetchData]);

    const filteredLogs = useMemo(() => {
        if (!searchTerm) return logs;
        const lower = searchTerm.toLowerCase();
        return logs.filter(l =>
            l.event.toLowerCase().includes(lower) ||
            l.email?.toLowerCase().includes(lower) ||
            l.description?.toLowerCase().includes(lower)
        );
    }, [logs, searchTerm]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950">
                <Spinner size="large" color="blue" />
                <p className="mt-4 text-slate-500 font-bold uppercase tracking-widest animate-pulse">Initializing Diagnostics...</p>
            </div>
        );
    }

    return (
        <div className="p-8 bg-slate-950 text-slate-200 min-h-screen font-sans">
            {/* Header Area */}
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-3xl font-black text-white uppercase tracking-tighter mb-1 bg-gradient-to-r from-white to-slate-500 bg-clip-text text-transparent">
                        System Architect &lt;Audit&gt;
                    </h1>
                    <p className="text-slate-500 text-xs font-mono">NODE: MASTER-OFFLINE | UPTIME: {Math.floor((diagnostics?.server?.uptime || 0) / 3600)}h {Math.floor(((diagnostics?.server?.uptime || 0) % 3600) / 60)}m</p>
                </div>
                <button
                    onClick={() => fetchData(true)}
                    className="px-6 py-2 bg-slate-900 border border-white/10 hover:bg-slate-800 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all"
                >
                    {isRefreshing ? <Spinner size="small" /> : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>}
                    Refresh Node
                </button>
            </div>

            {/* Metrics Ribbon */}
            <div className="mb-8">
                <DiagnosticMetrics diagnostics={diagnostics} />
            </div>

            {/* Dashboard Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Hardware Health Details */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-slate-900/50 backdrop-blur-md rounded-3xl border border-white/5 p-6 h-fit">
                        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 mb-6 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                            Hardware Inventory
                        </h2>

                        <div className="space-y-4">
                            {/* Printer List */}
                            <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                <span className="text-[9px] font-bold text-slate-500 uppercase block mb-3">Printers Online</span>
                                {diagnostics?.hardware?.printers?.length > 0 ? (
                                    diagnostics.hardware.printers.map((p: any) => (
                                        <div key={p.name} className="flex justify-between items-center text-xs mb-2 last:mb-0">
                                            <span className="text-slate-300 font-medium">{p.name || 'Generic Print Node'}</span>
                                            <span className="px-2 py-0.5 rounded bg-green-500/20 text-green-400 text-[10px] font-bold">READY</span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-slate-600 text-[10px] italic">No hardware nodes detected</p>
                                )}
                            </div>

                            {/* Database Stats */}
                            <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                <span className="text-[9px] font-bold text-slate-500 uppercase block mb-3">Storage Engine</span>
                                <div className="flex justify-between items-center text-xs mb-2">
                                    <span className="text-slate-400">Index Volume:</span>
                                    <span className="text-white font-mono">{diagnostics?.database?.photoCount || 0} Assets</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-400">Database Size:</span>
                                    <span className="text-white font-mono">{((diagnostics?.database?.size || 0) / 1024 / 1024).toFixed(2)} MB</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Audit Logs Table */}
                <div className="lg:col-span-2">
                    <div className="bg-slate-900/50 backdrop-blur-md rounded-3xl border border-white/5 overflow-hidden flex flex-col h-[70vh]">
                        {/* Internal Header/Filter bar */}
                        <div className="p-6 border-b border-white/5 flex flex-wrap gap-4 items-center justify-between">
                            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500">Security & Operational Logs</h2>

                            <div className="flex gap-2">
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="bg-slate-800 border-none rounded-lg text-xs p-2 text-white outline-none focus:ring-1 ring-white/20"
                                />
                                <select
                                    value={selectedLevel}
                                    onChange={(e) => setSelectedLevel(e.target.value)}
                                    className="bg-slate-800 border-none rounded-lg text-xs p-2 text-white outline-none focus:ring-1 ring-white/20"
                                >
                                    <option value="ALL">ALL LEVELS</option>
                                    <option value="INFO">INFO ONLY</option>
                                    <option value="WARN">WARNINGS</option>
                                    <option value="ERROR">CRITICAL</option>
                                </select>
                                <input
                                    type="text"
                                    placeholder="Search events..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="bg-slate-800 border-none rounded-lg text-xs p-2 text-white outline-none focus:ring-1 ring-white/20 w-40"
                                />
                            </div>
                        </div>

                        {/* Table Content */}
                        <div className="flex-1 overflow-auto custom-scrollbar">
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 bg-slate-900 z-10">
                                    <tr>
                                        <th className="px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Timestamp</th>
                                        <th className="px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Level</th>
                                        <th className="px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Event</th>
                                        <th className="px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Context</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {filteredLogs.length > 0 ? (
                                        filteredLogs.map((log, i) => (
                                            <tr key={i} className="hover:bg-white/5 transition-colors group">
                                                <td className="px-6 py-3 text-[10px] font-mono text-slate-500">
                                                    {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                </td>
                                                <td className="px-6 py-3">
                                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black ${log.level === 'ERROR' ? 'bg-red-500/20 text-red-500' :
                                                        log.level === 'WARN' ? 'bg-amber-500/20 text-amber-500' :
                                                            'bg-blue-500/20 text-blue-500'
                                                        }`}>
                                                        {log.level}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3">
                                                    <div className="text-xs font-bold text-slate-300">{log.event}</div>
                                                    {log.description && <div className="text-[10px] text-slate-500 mt-0.5">{log.description}</div>}
                                                </td>
                                                <td className="px-6 py-3">
                                                    <div className="flex flex-wrap gap-2">
                                                        {log.email && <span className="text-[10px] text-slate-400 bg-white/5 px-1.5 py-0.5 rounded border border-white/5">{log.email}</span>}
                                                        {log.ip && <span className="text-[10px] text-slate-400 bg-white/5 px-1.5 py-0.5 rounded border border-white/5">{log.ip}</span>}
                                                        {log.reason && <span className="text-[10px] text-red-400/70 italic">{log.reason}</span>}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-20 text-center text-slate-600 italic text-sm">
                                                No log entries matching your criteria
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
