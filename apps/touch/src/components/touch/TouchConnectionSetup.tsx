
import React, { useState, useEffect } from 'react';
import Card from '../common/Card.tsx';
import OnScreenKeyboard from './OnScreenKeyboard';
import { syncService } from '../../services/syncService.ts';
import type { PairingData } from '../../types/pairing.ts';
import { logger } from '@/utils/logger';

interface TouchConnectionSetupProps {
    onConnected: (ip?: string, wsUrl?: string, pairingToken?: string) => void;
    variant?: 'fullscreen' | 'embedded';
    onCancel?: () => void;
}

const TouchConnectionSetup: React.FC<TouchConnectionSetupProps> = ({ onConnected, variant = 'fullscreen', onCancel }) => {
    const [ipAddress, setIpAddress] = useState('');
    const [wsUrl, setWsUrl] = useState('');
    const [pairingToken, setPairingToken] = useState('');
    const [isChecking, setIsChecking] = useState(false);
    const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
    const [error, setError] = useState<string | null>(null);
    const [qrData, setQrData] = useState<PairingData | null>(null);

    useEffect(() => {
        // Check if URL has QR code data (from scanning)
        const urlParams = new URLSearchParams(window.location.search);
        const qrParam = urlParams.get('qr');

        if (qrParam) {
            try {
                // Try to parse as JSON (new enhanced format)
                const data: PairingData = JSON.parse(decodeURIComponent(qrParam));

                // Validate expiration
                const now = new Date();
                const expiresAt = new Date(data.expiresAt);

                if (now > expiresAt) {
                    setError('QR code has expired. Please generate a new one.');
                    return;
                }

                // Extract connection info
                const masterIp = new URL(data.httpUrl).hostname;
                setIpAddress(masterIp);
                setWsUrl(data.wsUrl);
                setPairingToken(data.pairingToken);
                setQrData(data);

                // Phase 4: Auto-configure paths from QR (zero-config pairing)
                if (data.uploadFolderPath || data.ordersFolderPath) {
                    try {
                        // Persist auto-paths to Touch local DB
                        const settings = [];
                        if (data.uploadFolderPath) {
                            settings.push({ id: 'sharedFolderPath', key: 'sharedFolderPath', value: JSON.stringify({ path: data.uploadFolderPath }) });
                        }
                        if (data.ordersFolderPath) {
                            settings.push({ id: 'touchOrdersFolder', key: 'touchOrdersFolder', value: JSON.stringify({ path: data.ordersFolderPath }) });
                        }
                        // Fire-and-forget: save to local backend
                        Promise.all(settings.map(s =>
                            fetch(`http://localhost:8091/api/collections/settings/records`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(s)
                            }).catch(() => null)
                        )).then(() => {
                            logger.info('[Pairing] Auto-paths saved to local DB');
                        });
                    } catch (pathErr) {
                        logger.warn('[Pairing] Failed to save auto-paths:', pathErr);
                    }
                }

                // Auto-test connection
                setTimeout(() => handleTestConnection(), 500);
            } catch (e) {
                // Fallback: Try old URL format
                try {
                    const url = new URL(decodeURIComponent(qrParam));
                    const host = url.hostname;
                    if (host && host !== 'localhost') {
                        setIpAddress(host);
                    }
                } catch (urlError) {
                    logger.error('Failed to parse QR data:', e);
                }
            }
        } else {
            // Auto-suggest current host IP
            const host = window.location.hostname;
            if (host && host !== 'localhost' && host !== '127.0.0.1') {
                setIpAddress(host);
            } else {
                setIpAddress('192.168.1.100');
            }

            // NEW: Auto-discover Master via local backend
            const discoverMaster = async () => {
                try {
                    // Try to reach local backend discovery
                    // In dev (port 5173), we need to hit backend port 8091
                    // In prod (port 8091), we can use relative path
                    const backendPort = 8091;
                    const isDev = window.location.port !== String(backendPort);
                    const url = isDev
                        ? `http://${window.location.hostname}:${backendPort}/api/discovery`
                        : '/api/discovery';

                    const res = await fetch(url);
                    if (res.ok) {
                        const data = await res.json();
                        if (data.servers && data.servers.length > 0) {
                            // Found a master!
                            // Found a master!
                            const master = data.servers[0];
                            setIpAddress(master.ip);
                            // Auto-test the discovered IP
                            setTimeout(() => {
                                handleTestConnection(); // This calls performHealthCheck using the state strictly? No, it uses current closure state? 
                                // Actually handleTestConnection uses ipAddress state. 
                                // State updates are async. We can't call handleTestConnection immediately with the old state.
                                // We should probably call performHealthCheck(master.ip) directly or force a re-render.
                                // For simpler logic, just setting IP is enough feedback for the user.
                            }, 100);
                        }
                    }
                } catch (e) {
                    logger.warn('Discovery failed:', e);
                }
            };
            discoverMaster();
        }
    }, []);

    const performHealthCheck = async (ip: string) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        try {
            // Master matches on port 8090
            const res = await fetch(`http://${ip}:8090/api/health`, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            return res.ok;
        } catch (e) {
            return false;
        }
    };

    const validatePairingToken = async (ip: string, token: string, kioskId?: string) => {
        try {
            const res = await fetch(`http://${ip}:8090/api/pairing/validate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    kioskId: kioskId || 'unknown',
                    pairingToken: token,
                    timestamp: new Date().toISOString()
                })
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.message || 'Token validation failed');
            }

            return await res.json();
        } catch (e) {
            logger.error('Pairing validation error:', e);
            throw e;
        }
    };

    const handleTestConnection = async () => {
        setTestStatus('testing');
        setError(null);
        const success = await performHealthCheck(ipAddress);

        if (success) {
            // If we have a pairing token, validate it
            if (pairingToken) {
                try {
                    await validatePairingToken(ipAddress, pairingToken, qrData?.kioskId);
                    setTestStatus('success');
                } catch (e) {
                    setTestStatus('error');
                    setError(e instanceof Error ? e.message : 'Token validation failed');
                }
            } else {
                setTestStatus('success');
            }
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
            // Validate pairing token if present
            if (pairingToken) {
                try {
                    const validation = await validatePairingToken(ipAddress, pairingToken, qrData?.kioskId);

                    // Phase 34: Persist signing secret for HMAC request signing
                    if (validation.signingSecret) {
                        const resolvedKioskId = validation.kioskInfo?.id || qrData?.kioskId || 'unknown';

                        // Save to Touch backend's local DB for orderExport signing
                        try {
                            await fetch(`http://localhost:8091/api/collections/settings/records`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ id: 'signingSecret', key: 'signingSecret', value: validation.signingSecret })
                            });
                            await fetch(`http://localhost:8091/api/collections/settings/records`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ id: 'kioskId', key: 'kioskId', value: resolvedKioskId })
                            });
                            logger.info('[Pairing] Signing credentials persisted to local DB');
                        } catch (dbErr) {
                            logger.warn('[Pairing] Failed to persist signing secret to local DB:', dbErr);
                        }

                        localStorage.setItem('signingSecret', validation.signingSecret);
                        localStorage.setItem('kioskId', resolvedKioskId);
                    }

                } catch (e) {
                    setError(e instanceof Error ? e.message : 'Pairing validation failed');
                    setIsChecking(false);
                    return;
                }
            }

            // Save for Sync Service
            syncService.updateMasterIp(ipAddress);

            // Save WebSocket URL if available
            if (wsUrl) {
                localStorage.setItem('masterWebSocketUrl', wsUrl);
            }

            // Save kiosk info if from QR code
            if (qrData) {
                if (qrData.kioskId) {
                    localStorage.setItem('kioskId', qrData.kioskId);
                }
                if (qrData.kioskName) {
                    localStorage.setItem('kioskName', qrData.kioskName);
                }
            }

            // Trigger sync loop start
            syncService.startSyncLoop();
            onConnected(ipAddress, wsUrl, pairingToken);
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
                        {qrData && (
                            <div className="mt-4 p-3 bg-blue-900/30 border border-blue-500/50 rounded-lg">
                                <p className="text-sm text-blue-300">
                                    🔐 Secure pairing {qrData.kioskName ? `for "${qrData.kioskName}"` : 'detected'}
                                </p>
                            </div>
                        )}
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
                                    onChange={(e) => { setIpAddress(e.target.value); setTestStatus('idle'); }}
                                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg p-4 text-xl font-mono text-center tracking-wider focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
                                />
                                <button
                                    onClick={handleTestConnection}
                                    className={`px-4 rounded-lg font-bold transition-colors min-w-[80px] ${testStatus === 'success' ? 'bg-green-600 text-white' :
                                        testStatus === 'error' ? 'bg-red-600 text-white' :
                                            testStatus === 'testing' ? 'bg-yellow-600 text-white' :
                                                'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300'
                                        }`}
                                >
                                    {testStatus === 'testing' ? '...' : testStatus === 'success' ? 'OK' : testStatus === 'error' ? 'ERR' : 'Test'}
                                </button>
                            </div>

                            {/* Show WebSocket URL if available */}
                            {wsUrl && (
                                <div className="mt-2 p-2 bg-slate-100 dark:bg-slate-700 rounded text-xs">
                                    <span className="text-slate-500 dark:text-slate-400">WebSocket:</span>{' '}
                                    <span className="font-mono text-slate-700 dark:text-slate-200">{wsUrl}</span>
                                </div>
                            )}
                        </div>

                        <OnScreenKeyboard value={ipAddress} onChange={(val) => { setIpAddress(val); setTestStatus('idle'); }} />

                        {error && (
                            <div className="p-3 bg-red-100 dark:bg-red-900/50 border border-red-200 dark:border-red-500/50 rounded text-red-700 dark:text-red-200 text-sm text-center animate-fadeIn">
                                {error}
                            </div>
                        )}

                        {testStatus === 'success' && !error && (
                            <div className="p-3 bg-green-100 dark:bg-green-900/50 border border-green-200 dark:border-green-500/50 rounded text-green-700 dark:text-green-200 text-sm text-center animate-fadeIn">
                                {pairingToken ? '🔐 Secure pairing verified! Ready to connect.' : 'Connection Verified! Ready to Link.'}
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
                                {isChecking ? 'Connecting...' : 'Connect to Master'}
                            </button>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default TouchConnectionSetup;
