// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/apiService.ts';

interface KioskPairingProps {
    targetKioskId?: string;
    targetKioskName?: string;
}

const KioskPairing: React.FC<KioskPairingProps> = ({ targetKioskId, targetKioskName }) => {
    const [listening, setListening] = useState(true);

    return (
        <div className="flex flex-col items-center justify-center p-6 text-center animate-fadeIn">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 mb-8 w-full max-w-2xl">
                <div className="flex items-center justify-center mb-4">
                    <div className="relative flex h-12 w-12 items-center justify-center">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-8 w-8 bg-blue-500"></span>
                    </div>
                </div>
                <h3 className="text-xl font-bold text-blue-800 dark:text-blue-200 mb-2">
                    {targetKioskName ? `Pairing "${targetKioskName}"` : 'Listening for Kiosks...'}
                </h3>
                <p className="text-sm text-blue-600 dark:text-blue-300">
                    Master is broadcasting its presence on the local network (UDP Port 41234). 
                    Open the Touch Kiosk app on any tablet on this Wi-Fi network and it will connect automatically.
                </p>
                {targetKioskId && (
                    <p className="text-xs text-blue-500 mt-4 font-mono bg-blue-100 dark:bg-blue-900/40 py-1 px-3 rounded-full inline-block">
                        Target ID: {targetKioskId}
                    </p>
                )}
            </div>
            
            <div className="text-slate-500 text-sm max-w-lg">
                <p className="mb-2 font-semibold">Zero-Config Enabled</p>
                <ul className="text-xs space-y-1 text-left list-disc list-inside">
                    <li>Kiosks automatically discover this server.</li>
                    <li>Upload and Order folders are created automatically.</li>
                    <li>No manual IP entry required.</li>
                </ul>
            </div>
        </div>
    );
};

export default KioskPairing;
