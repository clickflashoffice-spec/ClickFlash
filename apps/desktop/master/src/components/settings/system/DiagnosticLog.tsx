import React, { useRef, useEffect } from 'react';

type ScanStatus = 'idle' | 'scanning' | 'complete' | 'optimizing' | 'repaired';

interface ScanReport {
    issues: string[];
    storage: string;
    itemCount: number;
    healthScore: number;
}

interface DiagnosticLogProps {
    logs: string[];
    scanStatus: ScanStatus;
    progress: number;
    scanReport: ScanReport | null;
    latency: number | null;
    onClearHistory: () => void;
    onRunDeepScan: () => void;
    onRunFinalize: () => void;
}

export const DiagnosticLog: React.FC<DiagnosticLogProps> = ({
    logs,
    scanStatus,
    progress,
    scanReport,
    onClearHistory,
    onRunDeepScan,
    onRunFinalize
}) => {
    const logEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (logEndRef.current) {
            logEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [logs]);

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col h-full min-h-[500px]">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className="flex space-x-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                    </div>
                    <span className="ml-3 font-mono text-xs font-bold text-slate-600 dark:text-slate-400 opacity-70">
                        admin@os:~/diagnostics
                    </span>
                </div>

                <div className="flex gap-2 items-center">
                    {logs.length > 0 && (
                        <button
                            onClick={onClearHistory}
                            className="flex items-center gap-1.5 mr-3 text-slate-500 hover:text-red-500 transition-colors text-xs font-bold uppercase tracking-wider"
                        >
                            <span>Clear History</span>
                        </button>
                    )}
                    {scanStatus === 'complete' && (
                        <button
                            onClick={onRunFinalize}
                            className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-4 py-1.5 rounded-md shadow-lg shadow-green-500/20 transition-all flex items-center gap-2 animate-pulse"
                        >
                            FINALIZE
                        </button>
                    )}
                    {scanStatus === 'repaired' && (
                        <div className="bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-xs font-bold px-4 py-1.5 rounded-md flex items-center gap-2 cursor-default">
                            SYSTEM OPTIMIZED
                        </div>
                    )}
                    {(scanStatus === 'idle' || scanStatus === 'repaired') && (
                        <button
                            onClick={onRunDeepScan}
                            className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold px-4 py-1.5 rounded-md transition-all"
                        >
                            {scanStatus === 'repaired' ? 'RE-SCAN' : 'START SCAN'}
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 bg-slate-950 p-4 font-mono text-sm overflow-y-auto relative shadow-inner scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 bg-[length:100%_2px,3px_100%]"></div>

                {logs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-700">
                        <p className="tracking-widest text-xs opacity-50">TERMINAL READY</p>
                    </div>
                ) : (
                    <div className="space-y-1.5 pb-4 relative z-20">
                        {logs.map((log, i) => (
                            <div key={i} className={`break-all ${log.includes('error') || log.includes('✗') ? 'text-red-500 font-bold' :
                                log.includes('success') || log.includes('✓') ? 'text-green-400' :
                                    log.includes('warning') || log.includes('!') ? 'text-yellow-400' :
                                        'text-slate-300'
                                }`}>
                                <span className="opacity-50 mr-2">$</span>{log}
                            </div>
                        ))}
                        <div ref={logEndRef} />
                    </div>
                )}
            </div>

            <div className="bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 p-4">
                {scanStatus !== 'idle' && scanStatus !== 'repaired' && (
                    <div className="mb-4">
                        <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase mb-1.5">
                            <span>Execution Progress</span>
                            <span>{progress}%</span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                            <div
                                className="bg-blue-600 h-1.5 rounded-full transition-all duration-300 ease-out relative overflow-hidden"
                                style={{ width: `${progress}%` }}
                            >
                                <div className="absolute inset-0 bg-white/30 animate-[shimmer_1s_infinite]"></div>
                            </div>
                        </div>
                    </div>
                )}

                {scanReport && (
                    <div className="grid grid-cols-3 gap-4 animate-fadeInUp">
                        <div className="p-3 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-center shadow-sm">
                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">System Health</p>
                            <p className={`text-xl font-black ${scanReport.healthScore === 100 ? 'text-green-500' : 'text-yellow-500'}`}>
                                {scanReport.healthScore}%
                            </p>
                        </div>
                        <div className="p-3 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-center shadow-sm">
                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Data Volume</p>
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mt-1">{scanReport.storage}</p>
                        </div>
                        <div className="p-3 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-center shadow-sm">
                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Record Count</p>
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mt-1">{scanReport.itemCount}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
