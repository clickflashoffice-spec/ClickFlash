
import React, { useState, useEffect, useRef } from 'react';
import useLocalStorage from '../../hooks/useLocalStorage.ts';
import { pb } from '../../services/pb.ts';
import { logger } from '../../utils/logger';
import { DEFAULT_API_URL, DEFAULT_API_HOST } from '../../config.ts';
import QRCode from 'qrcode';

interface PairingData {
    version: string;
    httpUrl: string;
    wsUrl: string;
    kioskId?: string;
    kioskName?: string;
    pairingToken: string;
    expiresAt: string;
    mode: 'touch' | 'kiosk';
    pair: boolean;
}

interface KioskPairingProps {
    targetKioskId?: string;
    targetKioskName?: string;
}

const KioskPairing: React.FC<KioskPairingProps> = ({ targetKioskId, targetKioskName }) => {
    const [masterLocalIp, setMasterLocalIp] = useLocalStorage('masterLocalIPAddress', 'localhost');
    const [detectedIp, setDetectedIp] = useState<string | null>(null);
    const [pairingToken, setPairingToken] = useState<string>('');
    const [expiresAt, setExpiresAt] = useState<string>('');
    const [timeRemaining, setTimeRemaining] = useState<string>('');
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Generate pairing token
    const generatePairingToken = () => {
        // Use crypto.randomUUID if available, otherwise fallback
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        // Fallback: generate random string
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };

    // Generate expiration timestamp (15 minutes from now)
    const generateExpiration = (minutes: number = 15) => {
        return new Date(Date.now() + minutes * 60000).toISOString();
    };

    // Initialize or regenerate pairing data
    const initializePairing = async () => {
        const token = generatePairingToken();
        const expires = generateExpiration(15);
        setPairingToken(token);
        setExpiresAt(expires);

        // Register token with backend
        try {
            const baseUrl = pb.baseUrlValue || DEFAULT_API_URL;
            // Use explicitly detected IP if available, otherwise fallback to hostname
            // This ensures the Kiosk gets a reachable IP (e.g. 192.168.x.x) instead of 'localhost'
            const effectiveIp = detectedIp || (window.location.hostname === 'localhost' ? DEFAULT_API_HOST : window.location.hostname);

            // Construct full URLs for the Kiosk to connect back
            const serverHttpUrl = `http://${effectiveIp}:${window.location.port || '8090'}`; // Use actual port or default
            const serverWsUrl = `ws://${effectiveIp}:${window.location.port || '8090'}`; // WS usually on same port or specific

            const res = await fetch(`${baseUrl}/api/pairing/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pairingToken: token,
                    kioskId: targetKioskId,
                    kioskName: targetKioskName,
                    httpUrl: serverHttpUrl,
                    wsUrl: serverWsUrl,
                    expiresAt: expires
                })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || `Server returned ${res.status}`);
            }
            logger.info('Pairing token registered with backend');
        } catch (error) {
            logger.error('Failed to register pairing token', error);
        }
    };

    useEffect(() => {
        initializePairing();
    }, []);

    // Update countdown timer
    useEffect(() => {
        if (!expiresAt) return;

        const updateTimer = () => {
            const now = Date.now();
            const expiry = new Date(expiresAt).getTime();
            const diff = expiry - now;

            if (diff <= 0) {
                setTimeRemaining('Expired');
                return;
            }

            const minutes = Math.floor(diff / 60000);
            const seconds = Math.floor((diff % 60000) / 1000);
            setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [expiresAt]);

    useEffect(() => {
        const detectIp = async () => {
            try {
                const baseUrl = pb.baseUrlValue || DEFAULT_API_URL;
                const res = await fetch(`${baseUrl}/api/ip`);
                if (res.ok) {
                    const data = await res.json();
                    if (data && Array.isArray(data.interfaces)) {
                        const valid = data.interfaces.find((i: any) => i && i.ip && i.ip !== '127.0.0.1');
                        if (valid) {
                            setDetectedIp(valid.ip);
                            setMasterLocalIp(valid.ip);
                        }
                    }
                }
            } catch (err) {
                console.error('Failed to detect IP for kiosk pairing:', err);
            }
        };

        if (masterLocalIp === 'localhost' || masterLocalIp === '127.0.0.1') {
            detectIp();
        } else {
            setDetectedIp(masterLocalIp);
        }
    }, [masterLocalIp, setMasterLocalIp]);

    // Construct enhanced pairing data
    const effectiveIp = detectedIp || (window.location.hostname === 'localhost' ? '127.0.0.1' : window.location.hostname);

    const pairingData: PairingData = {
        version: '1.0',
        httpUrl: `http://${effectiveIp}:8090`,  // Master backend port
        wsUrl: `ws://${effectiveIp}:3001`,
        kioskId: targetKioskId,
        kioskName: targetKioskName,
        pairingToken,
        expiresAt,
        mode: 'touch',
        pair: true
    };

    const qrCodeData = JSON.stringify(pairingData);

    useEffect(() => {
        if (canvasRef.current && qrCodeData) {
            QRCode.toCanvas(canvasRef.current, qrCodeData, {
                width: 256,
                margin: 2,
                color: {
                    dark: '#0f172a',
                    light: '#ffffff'
                }
            }, (error: any) => {
                if (error) console.error(error);
            });
        }
    }, [qrCodeData]);

    const isExpired = timeRemaining === 'Expired';

    return (
        <div className="flex flex-col items-center justify-center p-6 text-center animate-fadeIn">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-8 w-full max-w-2xl">
                <h3 className="text-lg font-bold text-blue-800 dark:text-blue-200 mb-1">
                    {targetKioskName ? `Pairing "${targetKioskName}"` : 'Scan to Connect'}
                </h3>
                <p className="text-sm text-blue-600 dark:text-blue-300">
                    {targetKioskId
                        ? `Scan this code to assign this tablet as "${targetKioskName}".`
                        : "Open the camera app on your iPad or Tablet and scan this code to instantly pair it with this station."}
                </p>
            </div>

            <div className="flex flex-col items-center bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl relative">
                {/* Expiration Badge */}
                <div className={`absolute -top-3 -right-3 px-4 py-2 rounded-full text-xs font-bold shadow-lg ${isExpired
                    ? 'bg-red-500 text-white'
                    : 'bg-green-500 text-white'
                    }`}>
                    {isExpired ? '⚠️ Expired' : `⏱️ ${timeRemaining}`}
                </div>

                <div className={`bg-white p-2 rounded-xl shadow-inner border border-slate-100 ${isExpired ? 'opacity-50 grayscale' : ''}`}>
                    <canvas ref={canvasRef} className="block rounded-lg"></canvas>
                </div>

                <div className="mt-6 text-center space-y-2">
                    <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Server Address</p>
                    <p className="text-lg font-mono font-bold text-slate-700 dark:text-slate-200">{effectiveIp}</p>

                    <div className="flex gap-4 text-xs text-slate-500 mt-3">
                        <div>
                            <span className="font-semibold">HTTP:</span> :8090
                        </div>
                        <div>
                            <span className="font-semibold">WebSocket:</span> :3001
                        </div>
                    </div>

                    {targetKioskId && (
                        <p className="text-xs text-slate-500 mt-2 font-mono">ID: {targetKioskId}</p>
                    )}
                </div>

                {/* Regenerate Button */}
                <button
                    onClick={initializePairing}
                    className="mt-6 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-lg shadow-lg transition-all hover:scale-105 active:scale-95"
                >
                    <span className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Regenerate QR Code
                    </span>
                </button>

                <p className="text-xs text-slate-400 mt-3 max-w-xs">
                    QR code expires in 15 minutes for security. Click regenerate to create a new code.
                </p>
            </div>
        </div>
    );
};

export default KioskPairing;
