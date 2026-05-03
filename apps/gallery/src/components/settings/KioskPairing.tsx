
import React, { useState, useEffect, useRef } from 'react';
import useLocalStorage from '../../hooks/useLocalStorage.ts';
import { pb } from '../../services/pb.ts';
import QRCode from 'qrcode';

interface KioskPairingProps {
    targetKioskId?: string;
    targetKioskName?: string;
}

const KioskPairing: React.FC<KioskPairingProps> = ({ targetKioskId, targetKioskName }) => {
    const [masterLocalIp, setMasterLocalIp] = useLocalStorage('masterLocalIPAddress', 'localhost');
    const [detectedIp, setDetectedIp] = useState<string | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const detectIp = async () => {
            try {
                // Use the backend base URL from pb service to ensure correct port
                const baseUrl = pb.baseUrlValue || 'http://127.0.0.1:8090';
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

    // Construct the auto-config URL
    // pair=true triggers auto-configuration in TouchPortal.tsx
    const effectiveIp = detectedIp || (window.location.hostname === 'localhost' ? '127.0.0.1' : window.location.hostname);
    
    let connectionUrl = `http://${effectiveIp}:8000/?mode=touch&pair=true`;
    if (targetKioskId) {
        connectionUrl += `&id=${targetKioskId}`;
    }

    useEffect(() => {
        if (canvasRef.current) {
            QRCode.toCanvas(canvasRef.current, connectionUrl, {
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
    }, [connectionUrl]);
    
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

            <div className="flex flex-col items-center bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl">
                <div className="bg-white p-2 rounded-xl shadow-inner border border-slate-100">
                    <canvas ref={canvasRef} className="block rounded-lg"></canvas>
                </div>
                <div className="mt-6 text-center">
                    <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Server Address</p>
                    <p className="text-lg font-mono font-bold text-slate-700 dark:text-slate-200">{effectiveIp}</p>
                    {targetKioskId && (
                        <p className="text-xs text-slate-500 mt-2 font-mono">ID: {targetKioskId}</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default KioskPairing;
