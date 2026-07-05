
import React, { useMemo } from 'react';

interface KioskStatusWidgetProps {
    detailed?: boolean;
}

interface Kiosk {
    id: string;
    name: string;
    location: string;
    status: 'Online' | 'Offline' | 'Warning' | 'Maintenance';
    lastPing: string;
    version: string;
    alerts?: number;
}

/**
 * KioskStatusWidget Component
 * 
 * Displays status of active kiosks across different locations.
 * 
 * @param {KioskStatusWidgetProps} props - Component props
 */
const KioskStatusWidget: React.FC<KioskStatusWidgetProps> = ({ detailed = false }) => {
    // Mock data - normally fetched from API
    const kiosks: Kiosk[] = useMemo(() => [
        { id: 'k1', name: 'Lobby Kiosk 1', location: 'Grand Hotel', status: 'Online', lastPing: '2 mins ago', version: 'v2.4.1' },
        { id: 'k2', name: 'Poolside Kiosk', location: 'Grand Hotel', status: 'Warning', lastPing: '5 mins ago', version: 'v2.4.1', alerts: 1 },
        { id: 'k3', name: 'Beach Hut', location: 'Beach Resort', status: 'Offline', lastPing: '2 hours ago', version: 'v2.4.0', alerts: 3 },
        { id: 'k4', name: 'Main Hall', location: 'Conference Center', status: 'Online', lastPing: '1 min ago', version: 'v2.4.1' },
        { id: 'k5', name: 'Entrance', location: 'Theme Park', status: 'Maintenance', lastPing: '1 day ago', version: 'v2.3.9' },
    ], []);

    const statusColors = {
        'Online': 'bg-green-100 text-green-700',
        'Offline': 'bg-red-100 text-red-700',
        'Warning': 'bg-amber-100 text-amber-700',
        'Maintenance': 'bg-slate-100 text-slate-700'
    };

    const statusDots = {
        'Online': 'bg-green-500',
        'Offline': 'bg-red-500',
        'Warning': 'bg-amber-500',
        'Maintenance': 'bg-slate-400'
    };

    return (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-slate-900">Kiosk Status</h3>
                    <p className="text-sm text-slate-500">Real-time device monitoring</p>
                </div>
                <div className="flex space-x-2 text-xs">
                    <span className="flex items-center px-2 py-1 bg-green-50 text-green-700 rounded-md border border-green-100">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                        {kiosks.filter(k => k.status === 'Online').length} Online
                    </span>
                    <span className="flex items-center px-2 py-1 bg-red-50 text-red-700 rounded-md border border-red-100">
                        <span className="w-2 h-2 bg-red-500 rounded-full mr-1"></span>
                        {kiosks.filter(k => k.status === 'Offline').length} Offline
                    </span>
                </div>
            </div>

            <div className={`space-y-3 ${detailed ? 'max-h-96 overflow-y-auto pr-2' : ''}`}>
                {kiosks.map((kiosk) => (
                    <div
                        key={kiosk.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-cyan-200 hover:bg-cyan-50/30 transition-colors group"
                    >
                        <div className="flex items-center space-x-3">
                            <div className={`w-2.5 h-2.5 rounded-full ${statusDots[kiosk.status]} shadow-sm`}></div>
                            <div>
                                <p className="text-sm font-semibold text-slate-900 group-hover:text-cyan-700 transition-colors">
                                    {kiosk.name}
                                </p>
                                <p className="text-xs text-slate-500 flex items-center">
                                    <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    {kiosk.location}
                                </p>
                            </div>
                        </div>

                        <div className="text-right">
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${statusColors[kiosk.status]}`}>
                                {kiosk.status}
                            </span>
                            <div className="flex items-center justify-end mt-1 space-x-2">
                                <span className="text-xs text-slate-400">
                                    {kiosk.lastPing}
                                </span>
                                {kiosk.alerts && kiosk.alerts > 0 && (
                                    <span className="flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-red-500 rounded-full">
                                        {kiosk.alerts}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {detailed && (
                <div className="mt-4 pt-4 border-t border-slate-200 text-center">
                    <button className="text-sm text-cyan-600 hover:text-cyan-700 font-medium hover:underline">
                        View Connectivity Map
                    </button>
                </div>
            )}
        </div>
    );
};

KioskStatusWidget.displayName = 'KioskStatusWidget';
export default React.memo(KioskStatusWidget);

