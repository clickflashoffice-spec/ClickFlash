import React, { useState, useEffect, useCallback } from 'react';
import {
    RefreshCw,
    CheckCircle2,
    XCircle,
    Clock,
    Database,
    AlertTriangle,
    ChevronDown,
    ChevronUp,
    Download,
    RotateCcw,
    FileText,
    Image,
    ShoppingBag,
    DollarSign,
    Activity,
    Search,
    Wifi
} from 'lucide-react';
import { fleetService, SyncOperation } from '../../services/fleetService';
import Spinner from '../common/Spinner.tsx';

type SyncStatus = 'success' | 'error' | 'pending' | 'retrying';
type OperationType = 'photo' | 'order' | 'payroll' | 'expense' | 'inventory' | 'heartbeat' | 'config';

const MOCK_OPERATIONS: SyncOperation[] = [
    { id: 'sync_001', deskId: 'MASTER_01', deskName: 'Soneva Fushi', type: 'order', status: 'success', timestamp: '2026-02-21 14:32:15', duration: 245, recordsCount: 12, retryCount: 0 },
    { id: 'sync_002', deskId: 'MASTER_02', deskName: 'Soneva Jani', type: 'photo', status: 'success', timestamp: '2026-02-21 14:31:45', duration: 1890, recordsCount: 156, retryCount: 0 },
    { id: 'sync_003', deskId: 'MASTER_03', deskName: 'Soneva Kiri', type: 'payroll', status: 'error', timestamp: '2026-02-21 14:30:22', duration: 5000, recordsCount: 0, errorMessage: 'Connection timeout after 5s', retryCount: 2 },
    { id: 'sync_004', deskId: 'MASTER_01', deskName: 'Soneva Fushi', type: 'heartbeat', status: 'success', timestamp: '2026-02-21 14:30:00', duration: 45, recordsCount: 1, retryCount: 0 },
    { id: 'sync_005', deskId: 'MASTER_02', deskName: 'Soneva Jani', type: 'expense', status: 'success', timestamp: '2026-02-21 14:28:15', duration: 120, recordsCount: 3, retryCount: 0 },
    { id: 'sync_006', deskId: 'MASTER_04', deskName: 'Constance Moofushi', type: 'inventory', status: 'error', timestamp: '2026-02-21 14:25:00', duration: 0, recordsCount: 0, errorMessage: 'Master offline', retryCount: 3 },
    { id: 'sync_007', deskId: 'MASTER_01', deskName: 'Soneva Fushi', type: 'config', status: 'success', timestamp: '2026-02-21 14:20:00', duration: 89, recordsCount: 1, retryCount: 0 },
    { id: 'sync_008', deskId: 'MASTER_03', deskName: 'Soneva Kiri', type: 'order', status: 'retrying', timestamp: '2026-02-21 14:15:30', duration: 3200, recordsCount: 8, retryCount: 1 },
    { id: 'sync_009', deskId: 'MASTER_02', deskName: 'Soneva Jani', type: 'heartbeat', status: 'success', timestamp: '2026-02-21 14:15:00', duration: 52, recordsCount: 1, retryCount: 0 },
    { id: 'sync_010', deskId: 'MASTER_01', deskName: 'Soneva Fushi', type: 'photo', status: 'pending', timestamp: '2026-02-21 14:10:00', duration: 0, recordsCount: 23, retryCount: 0 },
];

const StatusIcon: React.FC<{ status: SyncStatus; className?: string }> = ({ status, className = '' }) => {
    switch (status) {
        case 'success':
            return <CheckCircle2 className={`text-emerald-500 ${className}`} />;
        case 'error':
            return <XCircle className={`text-red-500 ${className}`} />;
        case 'pending':
            return <Clock className={`text-slate-400 ${className}`} />;
        case 'retrying':
            return <RefreshCw className={`text-amber-500 animate-spin ${className}`} />;
    }
};

const TypeIcon: React.FC<{ type: OperationType; className?: string }> = ({ type, className = '' }) => {
    switch (type) {
        case 'photo':
            return <Image className={`text-violet-500 ${className}`} />;
        case 'order':
            return <ShoppingBag className={`text-cyan-500 ${className}`} />;
        case 'payroll':
        case 'expense':
            return <DollarSign className={`text-emerald-500 ${className}`} />;
        case 'inventory':
            return <Database className={`text-amber-500 ${className}`} />;
        case 'heartbeat':
            return <Activity className={`text-blue-500 ${className}`} />;
        case 'config':
            return <FileText className={`text-slate-500 ${className}`} />;
    }
};

const StatusBadge: React.FC<{ status: SyncStatus }> = ({ status }) => {
    const config = {
        success: { dot: 'bg-emerald-400', text: 'text-emerald-400', border: 'border-emerald-400/20 bg-emerald-400/10', label: 'Success' },
        error:   { dot: 'bg-rose-400',    text: 'text-rose-400',    border: 'border-rose-400/20 bg-rose-400/10',       label: 'Failed'  },
        pending: { dot: 'bg-slate-500',   text: 'text-slate-400',   border: 'border-white/10 bg-white/5',              label: 'Pending' },
        retrying:{ dot: 'bg-amber-400',   text: 'text-amber-400',   border: 'border-amber-400/20 bg-amber-400/10',     label: 'Retrying'},
    };
    const { dot, text, border, label } = config[status];
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${border} ${text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${dot} ${status === 'retrying' ? 'animate-pulse' : ''}`} />
            {label}
        </span>
    );
};

const formatDuration = (ms: number) => {
    if (ms === 0) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
};

export const SyncLogsPage: React.FC = () => {
    const [operations, setOperations] = useState<SyncOperation[]>(MOCK_OPERATIONS);
    const [expandedRow, setExpandedRow] = useState<string | null>(null);
    const [filterStatus, setFilterStatus] = useState<SyncStatus | 'all'>('all');
    const [filterType, setFilterType] = useState<OperationType | 'all'>('all');
    const [filterDesk, setFilterDesk] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [retryingId, setRetryingId] = useState<string | null>(null);

    const fetchOperations = useCallback(async () => {
        try {
            setLoading(true);
            // In production:
            // const data = await fleetService.getSyncOperations({
            //     status: filterStatus !== 'all' ? filterStatus : undefined,
            //     type: filterType !== 'all' ? filterType : undefined,
            //     deskId: filterDesk !== 'all' ? filterDesk : undefined,
            // });
            // setOperations(data.operations);
            setLoading(false);
        } catch (err) {
            console.error('Failed to fetch operations:', err);
            setLoading(false);
        }
    }, [filterStatus, filterType, filterDesk]);

    useEffect(() => {
        fetchOperations();
        // Auto-refresh every 5 seconds
        const interval = setInterval(fetchOperations, 5000);
        return () => clearInterval(interval);
    }, [fetchOperations]);

    const filteredOperations = operations.filter(op => {
        if (filterStatus !== 'all' && op.status !== filterStatus) return false;
        if (filterType !== 'all' && op.type !== filterType) return false;
        if (filterDesk !== 'all' && op.deskId !== filterDesk) return false;
        if (searchTerm && !op.deskName.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        return true;
    });

    const stats = {
        total: operations.length,
        success: operations.filter(o => o.status === 'success').length,
        error: operations.filter(o => o.status === 'error').length,
        pending: operations.filter(o => o.status === 'pending').length,
        retrying: operations.filter(o => o.status === 'retrying').length,
    };

    const retryOperation = async (id: string) => {
        try {
            setRetryingId(id);
            await fleetService.retryOperation(id);
            setOperations(prev => prev.map(op => 
                op.id === id ? { ...op, status: 'retrying', retryCount: op.retryCount + 1 } : op
            ));
        } catch (err) {
            console.error('Failed to retry operation:', err);
        } finally {
            setRetryingId(null);
        }
    };

    const retryAllFailed = async () => {
        const failedOps = operations.filter(o => o.status === 'error');
        for (const op of failedOps) {
            await retryOperation(op.id);
        }
    };

    const exportLogs = () => {
        const csv = [
            ['ID', 'Station', 'Type', 'Status', 'Records', 'Duration', 'Timestamp'].join(','),
            ...filteredOperations.map(op => [
                op.id,
                op.deskName,
                op.type,
                op.status,
                op.recordsCount,
                op.duration,
                op.timestamp
            ].join(','))
        ].join('\n');
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sync-logs-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-1">Operations</p>
                    <h1 className="text-2xl font-black text-white tracking-tight">Sync Logs</h1>
                    <p className="text-sm text-slate-500 mt-0.5">Monitor and troubleshoot synchronization operations</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={exportLogs}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 text-slate-300 rounded-xl hover:bg-white/10 transition-all text-xs font-black uppercase tracking-wider"
                    >
                        <Download className="w-4 h-4" />
                        Export
                    </button>
                    <button
                        onClick={retryAllFailed}
                        disabled={stats.error === 0}
                        className="flex items-center gap-2 px-4 py-2.5 bg-amber-400/10 text-amber-400 border border-amber-400/20 rounded-xl hover:bg-amber-400/20 transition-all text-xs font-black uppercase tracking-wider disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <RotateCcw className="w-4 h-4" />
                        Retry Failed
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <div className="p-4 bg-white/4 rounded-2xl border border-white/8">
                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1">Total</p>
                    <p className="text-2xl font-black text-white">{stats.total}</p>
                </div>
                <div className="p-4 bg-emerald-400/5 rounded-2xl border border-emerald-400/15">
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Success</p>
                    <p className="text-2xl font-black text-emerald-400">{stats.success}</p>
                </div>
                <div className="p-4 bg-rose-400/5 rounded-2xl border border-rose-400/15">
                    <p className="text-[10px] font-bold text-rose-600 uppercase tracking-widest mb-1">Failed</p>
                    <p className="text-2xl font-black text-rose-400">{stats.error}</p>
                </div>
                <div className="p-4 bg-amber-400/5 rounded-2xl border border-amber-400/15">
                    <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1">Retrying</p>
                    <p className="text-2xl font-black text-amber-400">{stats.retrying}</p>
                </div>
                <div className="p-4 bg-white/4 rounded-2xl border border-white/8">
                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1">Pending</p>
                    <p className="text-2xl font-black text-white">{stats.pending}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="p-4 bg-white/4 rounded-2xl border border-white/8">
                <div className="flex flex-col lg:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                        <input
                            type="text"
                            placeholder="Search operations..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 transition-all"
                        />
                    </div>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as SyncStatus | 'all')}
                        className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all"
                    >
                        <option value="all">All Status</option>
                        <option value="success">Success</option>
                        <option value="error">Failed</option>
                        <option value="pending">Pending</option>
                        <option value="retrying">Retrying</option>
                    </select>
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value as OperationType | 'all')}
                        className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all"
                    >
                        <option value="all">All Types</option>
                        <option value="photo">Photos</option>
                        <option value="order">Orders</option>
                        <option value="payroll">Payroll</option>
                        <option value="expense">Expenses</option>
                        <option value="inventory">Inventory</option>
                        <option value="heartbeat">Heartbeat</option>
                    </select>
                    <select
                        value={filterDesk}
                        onChange={(e) => setFilterDesk(e.target.value)}
                        className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all"
                    >
                        <option value="all">All Stations</option>
                        <option value="MASTER_01">Soneva Fushi</option>
                        <option value="MASTER_02">Soneva Jani</option>
                        <option value="MASTER_03">Soneva Kiri</option>
                        <option value="MASTER_04">Constance Moofushi</option>
                    </select>
                </div>
            </div>

            {/* Operations Table */}
            <div className="bg-white/4 rounded-2xl border border-white/8 overflow-hidden">
                {loading && (
                    <div className="p-4 flex justify-center"><Spinner /></div>
                )}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="border-b border-white/8">
                            <tr>
                                <th className="text-left text-[10px] font-black text-slate-600 uppercase tracking-widest px-5 py-3.5">Operation</th>
                                <th className="text-left text-[10px] font-black text-slate-600 uppercase tracking-widest px-5 py-3.5">Station</th>
                                <th className="text-left text-[10px] font-black text-slate-600 uppercase tracking-widest px-5 py-3.5">Status</th>
                                <th className="text-left text-[10px] font-black text-slate-600 uppercase tracking-widest px-5 py-3.5">Records</th>
                                <th className="text-left text-[10px] font-black text-slate-600 uppercase tracking-widest px-5 py-3.5">Duration</th>
                                <th className="text-left text-[10px] font-black text-slate-600 uppercase tracking-widest px-5 py-3.5">Time</th>
                                <th className="text-left text-[10px] font-black text-slate-600 uppercase tracking-widest px-5 py-3.5">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredOperations.map((op) => (
                                <React.Fragment key={op.id}>
                                    <tr
                                        className="hover:bg-white/4 cursor-pointer transition-colors"
                                        onClick={() => setExpandedRow(expandedRow === op.id ? null : op.id)}
                                    >
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-3">
                                                <TypeIcon type={op.type} className="w-4 h-4" />
                                                <span className="font-semibold text-white text-sm capitalize">{op.type}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <p className="font-semibold text-white text-sm">{op.deskName}</p>
                                            <p className="text-[10px] text-slate-600 font-mono">{op.deskId}</p>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <StatusBadge status={op.status} />
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <span className="text-slate-400 text-sm">{op.recordsCount}</span>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <span className={`text-sm font-mono ${op.duration > 3000 ? 'text-amber-400' : 'text-slate-400'}`}>
                                                {formatDuration(op.duration)}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <span className="text-xs text-slate-600 font-mono">{op.timestamp}</span>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-2">
                                                {op.status === 'error' && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); retryOperation(op.id); }}
                                                        disabled={retryingId === op.id}
                                                        className="p-1.5 text-amber-400 hover:bg-amber-400/10 rounded-lg transition-colors disabled:opacity-50"
                                                        title="Retry"
                                                    >
                                                        <RotateCcw className={`w-4 h-4 ${retryingId === op.id ? 'animate-spin' : ''}`} />
                                                    </button>
                                                )}
                                                {expandedRow === op.id
                                                    ? <ChevronUp className="w-4 h-4 text-slate-600" />
                                                    : <ChevronDown className="w-4 h-4 text-slate-600" />
                                                }
                                            </div>
                                        </td>
                                    </tr>
                                    {expandedRow === op.id && (
                                        <tr className="bg-black/20">
                                            <td colSpan={7} className="px-5 py-4">
                                                <div className="space-y-3">
                                                    <div className="grid grid-cols-3 gap-4">
                                                        <div>
                                                            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1">Operation ID</p>
                                                            <p className="text-sm font-mono text-slate-400">{op.id}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1">Retry Count</p>
                                                            <p className="text-sm text-white">{op.retryCount}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1">Records Synced</p>
                                                            <p className="text-sm text-white">{op.recordsCount}</p>
                                                        </div>
                                                    </div>
                                                    {op.errorMessage && (
                                                        <div className="p-3 bg-rose-500/8 border border-rose-500/20 rounded-xl">
                                                            <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">Error</p>
                                                            <p className="text-sm text-rose-300 font-mono">{op.errorMessage}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filteredOperations.length === 0 && (
                    <div className="text-center py-12">
                        <Database className="w-10 h-10 text-slate-700 mx-auto mb-4" />
                        <p className="text-slate-500 text-sm">No operations found matching your filters</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SyncLogsPage;
