import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/apiService';
import { SyncLog } from '../../types';
import { format } from 'date-fns';

export const SyncLogViewer: React.FC = () => {
    const [logs, setLogs] = useState<SyncLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'info' | 'warn' | 'error'>('all');

    const fetchLogs = async () => {
        try {
            const data = await apiService.getSyncLogs(50);
            setLogs(data);
        } catch (error) {
            console.error('Failed to fetch sync logs:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
        const interval = setInterval(fetchLogs, 5000); // Polling for now, can switch to WebSocket later
        return () => clearInterval(interval);
    }, []);

    const filteredLogs = filter === 'all' ? logs : logs.filter(l => l.level === filter);

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                    Live Sync Events
                </h3>
                <div className="flex gap-2 text-xs">
                    {(['all', 'info', 'warn', 'error'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-3 py-1 rounded-full capitalize transition-colors ${filter === f
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-300'
                                }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            <div className="max-h-[400px] overflow-y-auto font-mono text-[11px]">
                {isLoading ? (
                    <div className="p-8 text-center text-slate-400">Streaming logs...</div>
                ) : filteredLogs.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">No sync events recorded.</div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900 text-slate-500 uppercase tracking-tighter border-b border-slate-200 dark:border-slate-700">
                            <tr>
                                <th className="p-2 w-24">Timestamp</th>
                                <th className="p-2 w-24">Desk</th>
                                <th className="p-2 w-32">Event</th>
                                <th className="p-2">Message</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLogs.map(log => (
                                <tr key={log.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                    <td className="p-2 text-slate-400 whitespace-nowrap">
                                        {format(new Date(log.timestamp || log.created || Date.now()), 'HH:mm:ss')}
                                    </td>
                                    <td className="p-2">
                                        <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase">
                                            {log.masterId?.substring(0, 8) || 'GLOBAL'}
                                        </span>
                                    </td>
                                    <td className="p-2">
                                        <span className={`font-bold ${log.level === 'error' ? 'text-red-500' :
                                                log.level === 'warn' ? 'text-amber-500' : 'text-blue-500'
                                            }`}>
                                            {log.event}
                                        </span>
                                    </td>
                                    <td className="p-2 text-slate-700 dark:text-slate-300">
                                        {log.message}
                                        {log.details != null && (
                                            <span className="ml-2 opacity-50 italic">
                                                ({JSON.stringify(log.details).substring(0, 50)}...)
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
            <div className="p-2 bg-slate-50 dark:bg-slate-900 text-[10px] text-slate-400 text-center border-t border-slate-200 dark:border-slate-700">
                Connected to Central Telemetry Hub • Auto-refreshing every 5s
            </div>
        </div>
    );
};
