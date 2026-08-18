import React from 'react';

interface MetricProps {
    label: string;
    value: string | number;
    unit?: string;
    status?: 'success' | 'warning' | 'error' | 'info';
    icon?: React.ReactNode;
}

const Metric: React.FC<MetricProps> = ({ label, value, unit, status = 'info', icon }) => {
    const statusColors = {
        success: 'text-green-400 bg-green-400/10 border-green-500/20',
        warning: 'text-amber-400 bg-amber-400/10 border-amber-500/20',
        error: 'text-red-400 bg-red-400/10 border-red-500/20',
        info: 'text-blue-400 bg-blue-400/10 border-blue-500/20'
    };

    return (
        <div className={`p-4 rounded-2xl border backdrop-blur-md transition-all hover:scale-[1.02] ${statusColors[status]}`}>
            <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-70">{label}</span>
                {icon && <div className="opacity-50">{icon}</div>}
            </div>
            <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black">{value}</span>
                {unit && <span className="text-xs font-bold opacity-50">{unit}</span>}
            </div>
        </div>
    );
};

interface DiagnosticMetricsProps {
    diagnostics: any;
}

const DiagnosticMetrics: React.FC<DiagnosticMetricsProps> = ({ diagnostics }) => {
    if (!diagnostics) return null;

    const { server, hardware, thermal, database } = diagnostics;

    const getTempStatus = (temp: number) => {
        if (temp > 80) return 'error';
        if (temp > 65) return 'warning';
        return 'success';
    };

    const getMemStatus = (usage: number) => {
        if (usage > 90) return 'error';
        if (usage > 75) return 'warning';
        return 'success';
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* CPU Thermal */}
            <Metric
                label="CPU Temperature"
                value={thermal?.cpuTemp?.toFixed(1) || 'N/A'}
                unit="°C"
                status={thermal?.cpuTemp ? getTempStatus(thermal.cpuTemp) : 'info'}
                icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
            />

            {/* Memory Usage */}
            <Metric
                label="Memory Usage"
                value={server?.memory?.usage || 'N/A'}
                unit="%"
                status={server?.memory?.usage ? getMemStatus(server.memory.usage) : 'info'}
                icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg>}
            />

            {/* Database Health */}
            <Metric
                label="Database Status"
                value={database?.connected ? 'Online' : 'Offline'}
                status={database?.connected ? 'success' : 'error'}
                icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>}
            />

            {/* Print Queue */}
            <Metric
                label="Print Queue"
                value={hardware?.queueDepth || 0}
                unit="jobs"
                status={hardware?.queueDepth > 5 ? 'warning' : 'success'}
                icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>}
            />
        </div>
    );
};

export default DiagnosticMetrics;
