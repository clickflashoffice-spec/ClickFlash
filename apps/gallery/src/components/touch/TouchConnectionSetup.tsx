
import React, { useState, useEffect } from 'react';
import Card from '../common/Card.tsx';
import OnScreenKeyboard from './OnScreenKeyboard';
import { syncService } from '../../services/syncService.ts';

interface TouchConnectionSetupProps {
    onConnected: (ip?: string) => void;
    variant?: 'fullscreen' | 'embedded';
    onCancel?: () => void;
}

const TouchConnectionSetup: React.FC<TouchConnectionSetupProps> = ({ onConnected, variant = 'fullscreen', onCancel }) => {
    const [ipAddress, setIpAddress] = useState('');
    const [isChecking, setIsChecking] = useState(false);
    const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // If running in a browser (iPad/Tablet), auto-suggest the current host IP
        const host = window.location.hostname;
        if (host && host !== 'localhost' && host !== '127.0.0.1') {
            setIpAddress(host);
        } else {
            // Default fallback
            setIpAddress('192.168.1.100');
        }
    }, []);

    const performHealthCheck = async (ip: string) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        try {
            // Master backend runs on 8090
            const res = await fetch(`http://${ip}:8090/api/health`, { 
                signal: controller.signal 
            });
            clearTimeout(timeoutId);
            return res.ok;
        } catch (e) {
            return false;
        }
    };

    const handleTestConnection = async () => {
        setTestStatus('testing');
        setError(null);
        const success = await performHealthCheck(ipAddress);
        
        if (success) {
            setTestStatus('success');
        } else {
            setTestStatus('error');
            setError(`Failed to reach Master at ${ipAddress}:8090`);
        }
    };

    const handleConnect = async () => {
        setIsChecking(true);
        setError(null);

        const success = await performHealthCheck(ipAddress);

        if (success) {
            // Save for Sync Service
            syncService.updateMasterIp(ipAddress);
            // Trigger sync loop start
            syncService.startSyncLoop();
            onConnected(ipAddress);
        } else {
            setError(`Could not reach Master at ${ipAddress}. Ensure Master PC is on, app is running, and firewall allows port 8090.`);
            setIsChecking(false);
        }
    };

    const containerClasses = variant === 'fullscreen' 
        ? "min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-6"
        : "w-full animate-fadeIn";

    return (
        <div className={containerClasses}>
            <div className={`w-full ${variant === 'fullscreen' ? 'max-w-md space-y-8' : 'space-y-4'}`}>
                {variant === 'fullscreen' && (
                    <div className="text-center">
                        <h1 className="text-3xl font-bold">Setup Sync Connection</h1>
                        <p className="text-slate-400 mt-2">Connect this Kiosk to the Master Station for data synchronization.</p>
                    </div>
                )}

                <Card className={`${variant === 'fullscreen' ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 dark:bg-slate-800 border-0 shadow-none'}`}>
                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between items-baseline mb-2">
                                <label htmlFor="master-pc-ip" className="block text-sm font-medium text-slate-500 dark:text-slate-300">Master PC IP Address</label>
                                <button 
                                    onClick={() => { setIpAddress('127.0.0.1'); setTestStatus('idle'); }}
                                    className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                                >
                                    Use Test IP (Localhost)
                                </button>
                            </div>
                            <div className="flex space-x-2">
                                <input 
                                    id="master-pc-ip"
                                    type="text" 
                                    value={ipAddress} 
                                    readOnly 
                                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg p-4 text-xl font-mono text-center tracking-wider focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
                                />
                                <button 
                                    onClick={handleTestConnection}
                                    className={`px-4 rounded-lg font-bold transition-colors min-w-[80px] ${
                                        testStatus === 'success' ? 'bg-green-600 text-white' :
                                        testStatus === 'error' ? 'bg-red-600 text-white' :
                                        testStatus === 'testing' ? 'bg-yellow-600 text-white' :
                                        'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300'
                                    }`}
                                >
                                    {testStatus === 'testing' ? '...' : testStatus === 'success' ? 'OK' : testStatus === 'error' ? 'ERR' : 'Test'}
                                </button>
                            </div>
                        </div>

                        <OnScreenKeyboard value={ipAddress} onChange={(val) => { setIpAddress(val); setTestStatus('idle'); }} />

                        {error && (
                            <div className="p-3 bg-red-100 dark:bg-red-900/50 border border-red-200 dark:border-red-500/50 rounded text-red-700 dark:text-red-200 text-sm text-center animate-fadeIn">
                                {error}
                            </div>
                        )}
                        
                        {testStatus === 'success' && !error && (
                            <div className="p-3 bg-green-100 dark:bg-green-900/50 border border-green-200 dark:border-green-500/50 rounded text-green-700 dark:text-green-200 text-sm text-center animate-fadeIn">
                                Connection Verified! Ready to Link.
                            </div>
                        )}

                        <div className="flex gap-3 pt-2">
                            {variant === 'embedded' && onCancel && (
                                <button 
                                    onClick={onCancel} 
                                    className="flex-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-bold py-4 rounded-xl text-lg transition-colors"
                                >
                                    Cancel
                                </button>
                            )}
                            <button 
                                onClick={handleConnect} 
                                disabled={isChecking}
                                className={`flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 dark:disabled:bg-slate-600 text-white font-bold py-4 rounded-xl text-lg transition-colors shadow-lg`}
                            >
                                {isChecking ? 'Verifying...' : 'Save & Link'}
                            </button>
                        </div>
                    </div>
                </Card>
                
                {variant === 'fullscreen' && (
                    <div className="text-center text-xs text-slate-500">
                        <p>This Kiosk runs its own database. Data will be synced automatically when connected.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TouchConnectionSetup;
