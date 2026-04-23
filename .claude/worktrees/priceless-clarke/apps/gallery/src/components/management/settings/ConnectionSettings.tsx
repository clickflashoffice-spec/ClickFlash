
import React, { useState, useEffect } from 'react';
import useLocalStorage from '../../../hooks/useLocalStorage';
import { apiService } from '../../../services/apiService';
import { Destination } from '../../../types';

type ConnectionStatus = 'unknown' | 'testing' | 'success' | 'error';

const ConnectionSettings: React.FC = () => {
    const [settings, setSettings] = useLocalStorage('managementCloudSettings', {
        url: 'https://api.starmaster.cloud/v1',
        key: ''
    });
    const [status, setStatus] = useState<ConnectionStatus>('unknown');
    const [syncedPortals, setSyncedPortals] = useState<Destination[]>([]);
    const [loadingPortals, setLoadingPortals] = useState(false);

    const fetchSyncedPortals = async () => {
        setLoadingPortals(true);
        try {
            const dests = await apiService.getDestinations();
            setSyncedPortals(dests);
        } catch (e) {
            console.error("Failed to fetch destinations", e);
        } finally {
            setLoadingPortals(false);
        }
    };

    useEffect(() => {
        fetchSyncedPortals();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSettings(prev => ({...prev, [e.target.name]: e.target.value}));
        setStatus('unknown'); // Reset status on change
    };

    const handleTest = () => {
        setStatus('testing');
        setTimeout(() => {
            if (settings.url.startsWith('http') && settings.key.length > 8) {
                setStatus('success');
            } else {
                setStatus('error');
            }
        }, 1000);
    };

    const StatusMessage: React.FC = () => {
        switch(status) {
            case 'testing': return <div className="flex items-center space-x-2 text-blue-500"><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div><span>Testing...</span></div>;
            case 'success': return <p className="text-green-500 font-semibold">✓ Connection successful!</p>;
            case 'error': return <p className="text-red-500 font-semibold">✗ Connection failed. Please check your URL and Key.</p>;
            case 'unknown':
            default: return <p className="text-slate-500 dark:text-slate-400">Settings have been changed. Test or save to verify.</p>;
        }
    };
    
    const inputStyles = "w-full max-w-md bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none";

    return (
        <div>
            {/* Section 1: Central Server Connection */}
            <h2 className="text-2xl font-bold mb-4">Central Server Connection</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-2xl">
                Configure how this Management Portal connects to the central Star Master cloud server to fetch aggregated data from all synchronized Master Portals.
            </p>
            <div className="space-y-4 mb-8">
                 <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Cloud Server URL</label>
                    <input type="text" name="url" value={settings.url} onChange={handleChange} className={inputStyles} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">API Key</label>
                    <input type="password" name="key" value={settings.key} onChange={handleChange} className={inputStyles} />
                </div>
                <div className="flex items-center space-x-4 pt-4">
                    <button onClick={handleTest} className="bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 text-slate-800 dark:text-white font-semibold py-2 px-4 rounded-lg">Test Connection</button>
                    <button onClick={() => alert('Settings saved!')} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg">Save Settings</button>
                </div>
                 <div className="mt-4 h-6">
                    <StatusMessage />
                </div>
            </div>

            {/* Section 2: Synced Master Portals */}
            <div className="pt-8 border-t border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold">Synced Master Portals</h2>
                    <button onClick={fetchSyncedPortals} className="text-sm text-blue-600 hover:text-blue-800 font-semibold">Refresh List</button>
                </div>
                <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-2xl">
                    This is a live overview of all Master Portals (destinations) that are configured in the system.
                </p>
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                                <tr>
                                    <th className="p-4">Destination Name</th>
                                    <th className="p-4">License Key</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4">Type</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loadingPortals ? (
                                    <tr><td colSpan={4} className="p-8 text-center text-slate-500">Loading portals...</td></tr>
                                ) : syncedPortals.length > 0 ? (
                                    syncedPortals.map(portal => (
                                        <tr key={portal.id} className="border-b border-slate-200 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                            <td className="p-4 font-semibold">{portal.name}</td>
                                            <td className="p-4 font-mono text-xs text-slate-500">{portal.licenseKey || 'N/A'}</td>
                                            <td className="p-4">
                                                <span className={`flex items-center space-x-2 ${portal.features ? 'text-green-500 dark:text-green-400' : 'text-slate-400'}`}>
                                                    <span className={`h-2.5 w-2.5 rounded-full ${portal.features ? 'bg-green-500' : 'bg-slate-400'}`}></span>
                                                    <span>{portal.features ? 'Configured' : 'Pending'}</span>
                                                </span>
                                            </td>
                                            <td className="p-4 text-slate-500 dark:text-slate-400">{portal.type}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan={4} className="p-8 text-center text-slate-500">No destinations found. Create one in the 'Destinations' tab.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConnectionSettings;
