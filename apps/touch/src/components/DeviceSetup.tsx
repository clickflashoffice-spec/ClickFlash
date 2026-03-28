
import React, { useState } from 'react';
import { AppMode } from '../types';

interface DeviceSetupProps {
    onConfigure: (mode: AppMode, config?: { masterIp?: string }) => void;
}

const SetupCard: React.FC<{ title: string; description: string; icon: React.ReactNode; onClick: () => void; colorClass: string }> = ({ title, description, icon, onClick, colorClass }) => (
    <button
        onClick={onClick}
        className="group relative flex flex-col items-start p-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 w-full text-left overflow-hidden"
    >
        <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${colorClass} opacity-10 rounded-bl-full transition-transform group-hover:scale-110`}></div>

        <div className={`p-4 rounded-xl ${colorClass} bg-opacity-10 text-opacity-100 mb-6`}>
            {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: "w-10 h-10" })}
        </div>

        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{title}</h3>
        <p className="text-slate-500 dark:text-slate-400 leading-relaxed mb-6">{description}</p>

        <div className="mt-auto flex items-center font-bold text-sm uppercase tracking-wide">
            <span className="group-hover:underline">Install as {title}</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
        </div>
    </button>
);

const DeviceSetup: React.FC<DeviceSetupProps> = ({ onConfigure }) => {
    const [step, setStep] = useState<'select' | 'ip'>('select');
    const [masterIp, setMasterIp] = useState('');
    const [discoveredMasters, setDiscoveredMasters] = useState<any[]>([]);

    const handleKioskSelect = () => {
        setStep('ip');
    };

    React.useEffect(() => {
        if (step === 'ip') {
            // Auto-discover
            fetch('/api/discovery')
                .then(res => res.json())
                .then(data => {
                    if (data && data.servers) {
                        setDiscoveredMasters(data.servers);
                        // Optional: Auto-select if only one found?
                        // if (data.servers.length === 1) setMasterIp(data.servers[0].ip);
                    }
                })
                .catch(err => console.warn('Discovery failed', err));
        }
    }, [step]);

    const handleIpSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onConfigure('touch', { masterIp: masterIp || window.location.hostname });
    };

    if (step === 'ip') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 p-6 font-sans">
                <div className="max-w-md w-full bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700">
                    <h2 className="text-3xl font-bold mb-6 text-slate-900 dark:text-white">Connect to Master</h2>
                    <p className="text-slate-500 dark:text-slate-400 mb-6">Enter the IP Address of the Master Station. You can find this in the Master App settings.</p>

                    <form onSubmit={handleIpSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Master IP Address</label>
                            <input
                                type="text"
                                value={masterIp}
                                onChange={(e) => setMasterIp(e.target.value)}
                                placeholder="e.g., 192.168.1.100"
                                className="w-full p-4 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                autoFocus
                            />
                            {discoveredMasters.length > 0 && (
                                <div className="mt-4 space-y-2">
                                    <p className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wider">
                                        Detected in Local Network:
                                    </p>
                                    <div className="grid gap-2">
                                        {discoveredMasters.map((server: any, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => setMasterIp(server.ip)}
                                                className="flex items-center justify-between p-3 rounded-lg border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40 text-left transition-colors group"
                                            >
                                                <div>
                                                    <span className="block font-bold text-slate-800 dark:text-white">{server.name || 'StarMaster'}</span>
                                                    <span className="text-xs text-slate-500 dark:text-slate-400">{server.ip} • Port {server.port}</span>
                                                </div>
                                                <div className="bg-green-500 text-white text-xs px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                                    Use
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <p className="text-xs text-slate-400 mt-2">Leave empty to use <code>{window.location.hostname}</code></p>
                        </div>

                        <div className="flex gap-4">
                            <button type="button" onClick={() => setStep('select')} className="flex-1 py-4 text-slate-600 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors">
                                Back
                            </button>
                            <button type="submit" className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all">
                                Connect
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 p-6 font-sans">
            <div className="max-w-5xl w-full space-y-12">
                <div className="text-center space-y-4">
                    <img src="https://i.imgur.com/3Y2j2s2.png" alt="Logo" className="w-20 h-20 mx-auto rounded-full shadow-xl" />
                    <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                        System Configuration
                    </h1>
                    <p className="text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
                        Please select the role for this device. This setting will be saved for future launches.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <SetupCard
                        title="Master Station"
                        description="The central server. Connect cameras, import photos, manage albums, and process orders. Acts as the local database host."
                        colorClass="from-blue-500 to-blue-600 text-blue-600"
                        icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 00-2-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" /></svg>}
                        onClick={() => onConfigure('master')}
                    />

                    <SetupCard
                        title="Touch Kiosk"
                        description="A customer-facing terminal. Allows guests to view photos, add to cart, and place orders. Connects to a Master Station."
                        colorClass="from-purple-500 to-purple-600 text-purple-600"
                        icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>}
                        onClick={handleKioskSelect}
                    />
                </div>

                <div className="flex justify-center gap-6 text-sm text-slate-400 pt-8 border-t border-slate-200 dark:border-slate-800">
                    <button onClick={() => onConfigure('management')} className="hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                        Management Portal (Cloud)
                    </button>
                    <span>•</span>
                    <button onClick={() => onConfigure('customer')} className="hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                        Customer Gallery (Cloud)
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeviceSetup;
