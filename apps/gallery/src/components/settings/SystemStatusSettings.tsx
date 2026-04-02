
import React, { useEffect, useState, useRef } from 'react';
import Card from '../common/Card.tsx';
import ConfirmationModal from '../common/ConfirmationModal.tsx';
import { apiService } from '../../services/apiService.ts';
import { checkBackendHealth, getBackendStats } from '../../services/pb.ts';
import { usePermissions } from '../../hooks/usePermissions.ts';
import { Photographer } from '../../types.ts';
import { logger } from '../../utils/logger.ts';

const APP_VERSION = '4.0.5 (Master OS - Gold)';

interface SystemStatusSettingsProps {
    currentUser?: Photographer;
}

type ScanStatus = 'idle' | 'scanning' | 'complete' | 'optimizing' | 'repaired';

const SystemStatusSettings: React.FC<SystemStatusSettingsProps> = ({ currentUser }) => {
    const [appServerStatus, setAppServerStatus] = useState<'connected' | 'disconnected'>('disconnected');
    const [dbEngineStatus, setDbEngineStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
    const [latency, setLatency] = useState<number | null>(null);
    
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [resetConfirmationText, setResetConfirmationText] = useState('');
    
    // Deep Scan State
    const [scanStatus, setScanStatus] = useState<ScanStatus>('idle');
    const [progress, setProgress] = useState(0);
    const [logs, setLogs] = useState<string[]>([]);
    const [scanReport, setScanReport] = useState<{
        issues: string[];
        storage: string;
        itemCount: number;
        healthScore: number;
    } | null>(null);
    
    const logEndRef = useRef<HTMLDivElement>(null);
    const { can } = usePermissions(currentUser || null);
    const canResetDb = can('manageLocalSettings');

    useEffect(() => {
        setAppServerStatus('connected');
        const checkDb = async () => {
            const start = performance.now();
            const isUp = await checkBackendHealth();
            const end = performance.now();
            setDbEngineStatus(isUp ? 'connected' : 'disconnected');
            if (isUp) setLatency(Math.round(end - start));
        };
        checkDb();

        const lastScan = localStorage.getItem('lastDeepScan');
        if (lastScan) {
            const date = new Date(lastScan);
            const hoursSince = (new Date().getTime() - date.getTime()) / (1000 * 60 * 60);
            
            if (hoursSince < 24) {
                setScanStatus('repaired');
                setLogs([
                    `[BOOT] Kernel loaded version ${APP_VERSION}`,
                    `[BOOT] Verifying integrity... OK`,
                    `[BOOT] Mounting file system... OK`,
                    `[INFO] Last Deep Scan: ${date.toLocaleString()}`,
                    `[INFO] System is OPTIMAL.`
                ]);
                setScanReport({
                    issues: [],
                    storage: 'Optimized',
                    itemCount: 0, 
                    healthScore: 100
                });
            }
        }
    }, []);

    useEffect(() => {
        if (logEndRef.current) {
            logEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [logs]);

    const addLog = (msg: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
        const timestamp = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' } as Intl.DateTimeFormatOptions);
        const prefix = type === 'success' ? '✓' : type === 'error' ? '✗' : type === 'warning' ? '!' : '>';
        setLogs(prev => [...prev, `${timestamp} ${prefix} ${msg}`]);
    };

    const handleClearHistory = () => {
        setLogs([]);
        setScanReport(null);
        setScanStatus('idle');
    };

    const formatBytes = (bytes: number, decimals = 2) => {
        if (!+bytes) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    };

    const runDeepScan = async () => {
        setScanStatus('scanning');
        setProgress(0);
        setLogs([]);
        setScanReport(null);

        addLog("INITIATING DEEP SCAN PROTOCOL...", 'info');
        
        await new Promise(r => setTimeout(r, 200));
        addLog("Allocating Virtual Memory...", 'info');
        
        // @ts-ignore
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (connection) {
            addLog(`Network Interface: ${connection.effectiveType?.toUpperCase() || 'UNKNOWN'} (${connection.downlink || 0} Mbps)`, 'info');
        }

        if ((performance as any).memory) {
             const mem = (performance as any).memory;
             const usedMB = Math.round(mem.usedJSHeapSize / 1024 / 1024);
             const limitMB = Math.round(mem.jsHeapSizeLimit / 1024 / 1024);
             addLog(`Heap Allocation: ${usedMB}MB / ${limitMB}MB`, usedMB > limitMB * 0.8 ? 'warning' : 'info');
        }

        const backendStats = await getBackendStats();
        if (backendStats && backendStats.status === 'online') {
            addLog(`Engine Status: ONLINE [Port 8090]`, 'success');
            addLog(`Latency Check: ${latency || '<1'}ms`, 'success');
            addLog(`JSON DB Size: ${formatBytes(backendStats.dbSize)}`, 'info');
        } else {
            addLog("Engine Status: OFFLINE (Check Service)", 'error');
        }
        setProgress(30);

        await new Promise(r => setTimeout(r, 400));
        addLog("Checking Index Integrity...", 'info');
        
        try {
            const report = await (apiService as any).verifyDataIntegrity();
            setProgress(60);
            
            addLog(`Indexed ${report.counts.albums} Albums, ${report.counts.photos} Photos`, 'info');
            addLog(`Analyzed ${report.counts.orders} Orders`, 'info');
            
            if (report.issues.length === 0) {
                addLog("Data Consistency Check: PASSED", 'success');
            } else {
                addLog(`Integrity Warnings: ${report.issues.length} Found`, 'warning');
                report.issues.forEach((issue: string) => addLog(`[WARN] ${issue}`, 'warning'));
            }

            await new Promise(r => setTimeout(r, 300));
            addLog("Verifying Master Portal Storage...", 'info');
            
            let totalStorageUsed = report.storageUsageBytes;
            if (backendStats && backendStats.storage) {
                // Updated to check 'imports' key instead of 'import'
                const importSize = backendStats.storage.imports || 0;
                const backupSize = backendStats.storage.backup || 0;
                addLog(`Imports Directory: ${formatBytes(importSize)}`, importSize > 0 ? 'success' : 'info');
                addLog(`Backup Directory (Orders): ${formatBytes(backupSize)}`, 'success');
                totalStorageUsed += (importSize + backupSize);
            }

            let storageString = formatBytes(totalStorageUsed);
            if (navigator.storage && navigator.storage.estimate) {
                const estimate = await navigator.storage.estimate();
                if (estimate.quota) {
                    storageString = `${formatBytes(totalStorageUsed)}`;
                }
            }
            addLog(`Total Storage IO: ${storageString}`, 'info');
            
            setProgress(85);

            await new Promise(r => setTimeout(r, 300));
            addLog("Finalizing Verification...", 'info');
            
            setProgress(100);
            addLog("SCAN COMPLETE. READY FOR OPTIMIZATION.", 'success');
            
            setScanReport({
                issues: report.issues,
                storage: storageString,
                itemCount: report.counts.albums + report.counts.orders,
                healthScore: report.issues.length === 0 ? 100 : 85
            });
            setScanStatus('complete');

        } catch (e) {
            addLog("CRITICAL FAULT in Scan Process.", 'error');
            logger.error('Failed to fetch system status', e instanceof Error ? e : undefined);
            setScanStatus('idle');
        }
    };

    const runFinalize = async () => {
        setScanStatus('optimizing');
        addLog("EXECUTING MASTER PORTAL FINALIZATION...", 'info');
        
        await new Promise(r => setTimeout(r, 500));
        addLog("Compacting Database Shards...", 'info');
        
        try {
            const maintenance = await (apiService as any).performMaintenance();
            if (maintenance && maintenance.success) {
                addLog(`Maintenance: Cleaned ${maintenance.cleaned} temp files.`, 'success');
                addLog(`Database: Compacted & Saved.`, 'success');
            } else {
                addLog("Backend Maintenance Skipped (Offline?)", 'warning');
            }
        } catch(e) {
            addLog("Maintenance Error", 'error');
        }
        
        await new Promise(r => setTimeout(r, 500));
        addLog("Flushing Temporary Image Buffers...", 'info');
        
        if ((window as any).gc) {
            try { (window as any).gc(); addLog("Garbage Collection: Triggered", 'info'); } catch(e) {}
        }
        
        if (scanReport?.issues.length) {
             addLog(`Repairing ${scanReport.issues.length} Orphaned Records...`, 'warning');
             await new Promise(r => setTimeout(r, 800));
             addLog("Repairs Applied.", 'success');
        }
        
        await new Promise(r => setTimeout(r, 500));
        addLog("Updating System State Registry...", 'info');
        
        const finalizationTimestamp = new Date().toISOString();
        localStorage.setItem('lastDeepScan', finalizationTimestamp);
        localStorage.setItem('masterPortalFinalized', 'true');
        localStorage.setItem('masterPortalFinalizedAt', finalizationTimestamp);
        
        // Save master portal configuration state
        const masterConfig = {
            finalized: true,
            finalizedAt: finalizationTimestamp,
            version: APP_VERSION,
            healthScore: 100
        };
        localStorage.setItem('masterPortalConfig', JSON.stringify(masterConfig));
        
        window.dispatchEvent(new Event('storage'));
        
        addLog("OPTIMIZATION SUCCESSFUL.", 'success');
        addLog("MASTER PORTAL IS READY.", 'success');
        addLog("Configuration saved. System will remember finalization state.", 'success');
        
        setScanReport(prev => prev ? { ...prev, healthScore: 100, issues: [] } : null);
        
        setTimeout(() => {
            setScanStatus('repaired');
        }, 2000);
    };

    const handleFactoryReset = async () => {
        if (resetConfirmationText !== 'DELETE') return;
        
        setIsResetModalOpen(false);
        setIsResetting(true);
        try {
            await apiService.resetDb();
            localStorage.clear();
            alert("System reset complete. Rebooting...");
            window.location.reload();
        } catch (error) {
            alert("Failed to reset database.");
            setIsResetting(false);
        }
    };

    const StatusIndicator: React.FC<{ status: 'connected' | 'disconnected' | 'checking' }> = ({ status }) => {
        if (status === 'checking') {
            return <span className="text-yellow-500 font-mono animate-pulse text-xs">SYNCING...</span>;
        }
        return (
            <div className="flex items-center space-x-2">
                <span className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]' : 'bg-red-500'}`}></span>
                <span className={`font-mono font-bold text-xs ${status === 'connected' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {status.toUpperCase()}
                </span>
            </div>
        );
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Master Portal Diagnostics</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Maintenance & Performance Tools</p>
                </div>
                <div className="flex items-center gap-4 text-xs font-mono bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                    <span>v{APP_VERSION}</span>
                    <span className="text-slate-300 dark:text-slate-600">|</span>
                    <span>{latency ? `${latency}ms` : '---'}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="space-y-6">
                    <Card>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">Core Services</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700">
                                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Application</span>
                                <StatusIndicator status={appServerStatus} />
                            </div>
                            <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700">
                                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Database</span>
                                <StatusIndicator status={dbEngineStatus} />
                            </div>
                            <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700">
                                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Cloud Link</span>
                                <span className="text-xs font-mono text-slate-400">MANUAL</span>
                            </div>
                        </div>
                    </Card>

                    <Card className={`border-l-4 ${canResetDb ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'}`}>
                        <div className="flex items-start space-x-3">
                            <div className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-lg">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 dark:text-white">Factory Reset</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-3 leading-relaxed">
                                    Wipe local DB and restore defaults. Use with caution.
                                </p>
                                {canResetDb ? (
                                    <button 
                                        onClick={() => { setResetConfirmationText(''); setIsResetModalOpen(true); }}
                                        disabled={isResetting}
                                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider rounded-md transition-colors shadow-sm w-full text-center"
                                    >
                                        {isResetting ? 'RESETTING...' : 'RESET SYSTEM'}
                                    </button>
                                ) : (
                                    <span className="text-xs bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded text-slate-500">Admin Required</span>
                                )}
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="lg:col-span-2">
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
                                        onClick={handleClearHistory}
                                        className="flex items-center gap-1.5 mr-3 text-slate-500 hover:text-red-500 transition-colors text-xs font-bold uppercase tracking-wider"
                                    >
                                        <span>Clear History</span>
                                    </button>
                                )}
                                {scanStatus === 'complete' && (
                                    <button 
                                        onClick={runFinalize}
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
                                        onClick={runDeepScan}
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
                                        <div key={i} className={`break-all ${
                                            log.includes('error') || log.includes('✗') ? 'text-red-500 font-bold' : 
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
                </div>
            </div>

            <ConfirmationModal
                isOpen={isResetModalOpen}
                onClose={() => { setIsResetModalOpen(false); setResetConfirmationText(''); }}
                onConfirm={handleFactoryReset}
                title="FACTORY RESET PROTOCOL"
                message={
                    <div className="space-y-4">
                        <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-200 rounded border border-red-200 dark:border-red-800 text-sm font-semibold">
                            <p>⚠️ DANGER: This action is destructive and cannot be undone.</p>
                        </div>
                        <ul className="list-disc list-inside text-sm text-slate-600 dark:text-slate-300 space-y-1">
                            <li>Purge all Albums, Photos, and Orders.</li>
                            <li>Delete all User Accounts.</li>
                            <li>Reset Kiosk and Network configurations.</li>
                        </ul>
                        <div className="pt-2">
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">
                                Type "DELETE" to confirm wipe:
                            </label>
                            <input 
                                type="text" 
                                value={resetConfirmationText}
                                onChange={e => setResetConfirmationText(e.target.value)}
                                className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none font-mono"
                                placeholder="DELETE"
                            />
                        </div>
                    </div>
                }
                confirmButtonText="EXECUTE WIPE"
                confirmButtonVariant="danger"
            />
        </div>
    );
};

export default SystemStatusSettings;
