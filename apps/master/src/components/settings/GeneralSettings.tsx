import { Spinner } from "@clickflash/ui";

import React, { useEffect, useState } from 'react';
import { Photographer, Destination } from '../../types.ts';
import { apiService } from '../../services/apiService.ts';

import useLocalStorage from '../../hooks/useLocalStorage.ts';
import { safeStorage } from '../../utils/safeStorage';
import { usePermissions } from '../../hooks/usePermissions.ts';
import { pb } from '../../services/pb.ts';
import { logger } from '../../utils/logger.ts';
import { DEFAULT_API_URL, DEFAULT_API_HOST } from '../../config.ts';
import { useDestinations, destinationKeys } from '../../hooks/useDestinations.ts';
import { useQueryClient } from '@tanstack/react-query';
import { useCurrency } from '../CurrencyContext.tsx';
import {
    Wifi,
    Globe,
    Server,
    Key,
    Building2,
    Save,
    RefreshCw,
    CheckCircle2,
    AlertCircle,
    Copy,
    Shield,
    Network
} from 'lucide-react';

interface GeneralSettingsProps {
    currentUser: Photographer;
    onCurrentUserUpdate: (user?: Photographer) => void;
    showToast: (message: string) => void;
    onHasChanges?: (has: boolean) => void;
}

interface NetworkInterface {
    name: string;
    ip: string;
}

// Reusable card component
const SettingsCard: React.FC<{
    title: string;
    icon: React.ElementType;
    children: React.ReactNode;
    action?: React.ReactNode;
}> = ({ title, icon: Icon, children, action }) => (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg">
                    <Icon className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white">{title}</h3>
            </div>
            {action}
        </div>
        <div className="p-6">
            {children}
        </div>
    </div>
);

// Form field component
const FormField: React.FC<{
    label: string;
    children: React.ReactNode;
    help?: string;
    error?: string;
}> = ({ label, children, help, error }) => (
    <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
        {children}
        {help && <p className="text-xs text-slate-500 dark:text-slate-400">{help}</p>}
        {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
);

const GeneralSettings: React.FC<GeneralSettingsProps> = ({ 
    currentUser, 
    onCurrentUserUpdate, 
    showToast,
    onHasChanges
}) => {
    const { currency, setCurrency, availableCurrencies } = useCurrency();
    const [destination, setDestination] = useState<Destination | null>(null);
    const [loading, setLoading] = useState(true);
    const { can } = usePermissions(currentUser);
    const [hasChanges, setHasChanges] = useState(false);

    const [newDestData, setNewDestData] = useState<{ name: string; country: string; type: 'Resort' | 'City'; licenseKey: string }>({ 
        name: '', 
        country: '', 
        type: 'Resort',
        licenseKey: ''
    });
    const [isCreatingDest, setIsCreatingDest] = useState(false);
    const [isCreatingDestLoading, setIsCreatingDestLoading] = useState(false);
    const [isSavingDestination, setIsSavingDestination] = useState(false);
    const queryClient = useQueryClient();

    const [connectionSettings, setConnectionSettings] = useLocalStorage('connectionSettings', { mode: 'local' });
    const [cloudConfig, setCloudConfig] = useLocalStorage('masterCloudSettings', { url: '', key: '' });
    const [masterLocalIp, setMasterLocalIp] = useLocalStorage('MASTER_LOCAL_IP_ADDRESS', DEFAULT_API_HOST);
    const [availableInterfaces, setAvailableInterfaces] = useState<NetworkInterface[]>([]);
    const [_detectingIP, _setDetectingIP] = useState(false);
    const [isSavingNetwork, setIsSavingNetwork] = useState(false);

    const canManageSettings = can('manageLocalSettings');

    useEffect(() => {
        const initializeSettings = async () => {
            try {
                const baseUrl = pb.baseUrlValue || DEFAULT_API_URL;
                const response = await fetch(`${baseUrl}/api/network/settings`);
                if (response.ok) {
                    const savedSettings = await response.json();
                    if (savedSettings.masterLocalIp) setMasterLocalIp(savedSettings.masterLocalIp);
                }
            } catch (e) {
                logger.error('Failed to load network settings', e);
            }
            detectNetworkInterfaces();
        };
        initializeSettings();
    }, []);

    const detectNetworkInterfaces = async () => {
        try {
            const baseUrl = pb.baseUrlValue || DEFAULT_API_URL;
            const response = await fetch(`${baseUrl}/api/ip`);
            if (response.ok) {
                const data = await response.json();
                if (data.interfaces?.length > 0) {
                    setAvailableInterfaces(data.interfaces);
                } else {
                    setAvailableInterfaces([{ name: 'Loopback', ip: DEFAULT_API_HOST }]);
                }
            }
        } catch (e) {
            logger.error('Failed to detect network', e);
        } finally {
            setLoading(false);
        }
    };

    const { data: allDestinations = [], isLoading: destinationsLoading } = useDestinations();

    useEffect(() => {
        if (!destinationsLoading) {
            const currentDest = allDestinations.find(d => d.id === currentUser.destinationId);
            setDestination(currentDest || null);
            setLoading(false);
        }
    }, [currentUser.destinationId, allDestinations, destinationsLoading]);

    useEffect(() => {
        onHasChanges?.(hasChanges);
    }, [hasChanges, onHasChanges]);

    const handleDestinationChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        if (!destination) return;
        const { name, value } = e.target;
        setDestination({ ...destination, [name]: value });
        setHasChanges(true);
    };

    const handleSaveDestination = async () => {
        if (!destination?.id || isSavingDestination) return;
        setIsSavingDestination(true);
        try {
            const saved = await apiService.updateDestination(destination.id, destination);
            setDestination(saved);
            queryClient.invalidateQueries({ queryKey: destinationKeys.all });
            showToast('Destination saved successfully!');
            setHasChanges(false);
        } catch (error) {
            logger.error("Failed to save destination", error);
            showToast(`Error: ${error instanceof Error ? error.message : 'Failed to save'}`);
        } finally {
            setIsSavingDestination(false);
        }
    };

    const handleCreateDestination = async () => {
        if (isCreatingDestLoading) return;
        if (!newDestData.name || !newDestData.country || !newDestData.licenseKey) {
            showToast("Please fill in all fields including the License Key");
            return;
        }

        setIsCreatingDestLoading(true);
        try {
            const created = await apiService.createDestination({
                name: newDestData.name.trim(),
                country: newDestData.country.trim(),
                type: newDestData.type,
                licenseKey: newDestData.licenseKey.trim()
            });

            await apiService.updateUser(currentUser.id, { destinationId: created.id });
            setDestination(created);
            queryClient.invalidateQueries({ queryKey: destinationKeys.all });
            showToast("Destination created!");
            onCurrentUserUpdate();
            setIsCreatingDest(false);
            setNewDestData({ name: '', country: '', type: 'Resort', licenseKey: '' });
        } catch (error) {
            logger.error('Failed to create destination', error);
            showToast(`Error: ${error instanceof Error ? error.message : 'Failed to create'}`);
        } finally {
            setIsCreatingDestLoading(false);
        }
    };

    const handleSaveNetwork = async () => {
        setIsSavingNetwork(true);
        try {
            const baseUrl = pb.baseUrlValue || DEFAULT_API_URL;
            await fetch(`${baseUrl}/api/network/settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    masterLocalIp,
                    connectionMode: connectionSettings.mode,
                    cloudUrl: cloudConfig.url
                })
            });
            showToast('Network settings saved!');
            setHasChanges(false);
        } catch (error) {
            showToast('Failed to save network settings');
        } finally {
            setIsSavingNetwork(false);
        }
    };

    const handleModeChange = (mode: 'local' | 'cloud') => {
        if (!canManageSettings) return;
        if (window.confirm(`Switch to ${mode.toUpperCase()} mode? This requires a reload.`)) {
            setConnectionSettings(prev => ({ ...prev, mode }));
            setHasChanges(true);
            setTimeout(() => window.location.reload(), 500);
        }
    };

    const isKeyValid = destination?.licenseKey?.startsWith('CF-LIVE-') && destination.licenseKey.length >= 50;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Spinner size="large" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-5xl">
            {/* Connection Mode Toggle */}
            <SettingsCard 
                title="Connection Mode" 
                icon={Network}
                action={
                    <span className={`
                        px-3 py-1 rounded-full text-xs font-bold uppercase
                        ${connectionSettings.mode === 'cloud' 
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' 
                            : 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300'}
                    `}>
                        {connectionSettings.mode} Mode
                    </span>
                }
            >
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button
                            onClick={() => handleModeChange('local')}
                            disabled={!canManageSettings || connectionSettings.mode === 'local'}
                            className={`
                                p-4 rounded-xl border-2 text-left transition-all
                                ${connectionSettings.mode === 'local'
                                    ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20'
                                    : 'border-slate-200 dark:border-slate-700 hover:border-cyan-300'}
                                ${!canManageSettings ? 'opacity-50 cursor-not-allowed' : ''}
                            `}
                        >
                            <div className="flex items-center gap-3 mb-2">
                                <Server className="w-5 h-5 text-cyan-600" />
                                <span className="font-bold">Offline First</span>
                                {connectionSettings.mode === 'local' && (
                                    <CheckCircle2 className="w-4 h-4 text-cyan-500 ml-auto" />
                                )}
                            </div>
                            <p className="text-sm text-slate-500">Local database with optional cloud sync</p>
                        </button>

                        <button
                            onClick={() => handleModeChange('cloud')}
                            disabled={!canManageSettings || connectionSettings.mode === 'cloud'}
                            className={`
                                p-4 rounded-xl border-2 text-left transition-all
                                ${connectionSettings.mode === 'cloud'
                                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                                    : 'border-slate-200 dark:border-slate-700 hover:border-purple-300'}
                                ${!canManageSettings ? 'opacity-50 cursor-not-allowed' : ''}
                            `}
                        >
                            <div className="flex items-center gap-3 mb-2">
                                <Wifi className="w-5 h-5 text-purple-600" />
                                <span className="font-bold">Fully Online</span>
                                {connectionSettings.mode === 'cloud' && (
                                    <CheckCircle2 className="w-4 h-4 text-purple-500 ml-auto" />
                                )}
                            </div>
                            <p className="text-sm text-slate-500">Cloud database with real-time sync</p>
                        </button>
                    </div>

                    {connectionSettings.mode === 'local' ? (
                        <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                            <FormField 
                                label="Local Network Interface"
                                help="IP address that Kiosks will use to connect"
                            >
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={masterLocalIp}
                                        onChange={(e) => { setMasterLocalIp(e.target.value); setHasChanges(true); }}
                                        className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                                        placeholder="192.168.1.100"
                                        disabled={!canManageSettings}
                                    />
                                    <select
                                        onChange={(e) => { if (e.target.value) { setMasterLocalIp(e.target.value); setHasChanges(true); }}}
                                        className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                                        disabled={!canManageSettings}
                                        value=""
                                    >
                                        <option value="">Auto-detect...</option>
                                        {availableInterfaces.map(iface => (
                                            <option key={iface.ip} value={iface.ip}>{iface.name}: {iface.ip}</option>
                                        ))}
                                    </select>
                                    <button
                                        onClick={detectNetworkInterfaces}
                                        disabled={!canManageSettings}
                                        className="px-3 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
                                        title="Scan network"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                    </button>
                                </div>
                            </FormField>
                            
                            <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    <span className="font-medium">Kiosk URL:</span>{' '}
                                    <code className="bg-white dark:bg-slate-800 px-2 py-0.5 rounded font-mono text-cyan-600">
                                        http://{masterLocalIp || 'localhost'}:8090
                                    </code>
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                            <FormField 
                                label="Cloud Server URL"
                                help="Management Hub or cloud server address"
                            >
                                <input
                                    type="url"
                                    value={cloudConfig.url}
                                    onChange={(e) => { setCloudConfig({ ...cloudConfig, url: e.target.value }); setHasChanges(true); }}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500"
                                    placeholder="https://hub.clickflash.app"
                                    disabled={!canManageSettings}
                                />
                            </FormField>
                        </div>
                    )}

                    <div className="pt-4 flex justify-end">
                        <button
                            onClick={handleSaveNetwork}
                            disabled={isSavingNetwork || !canManageSettings}
                            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                        >
                            {isSavingNetwork ? <Spinner size="small" /> : <Save className="w-4 h-4" />}
                            Save Network Settings
                        </button>
                    </div>
                </div>
            </SettingsCard>

            {/* Destination Profile */}
            <SettingsCard 
                title="Destination Profile" 
                icon={Building2}
                action={destination && (
                    <button
                        onClick={handleSaveDestination}
                        disabled={!canManageSettings || isSavingDestination || !hasChanges}
                        className="flex items-center gap-2 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    >
                        {isSavingDestination ? <Spinner size="small" /> : <Save className="w-4 h-4" />}
                        Save
                    </button>
                )}
            >
                {destination ? (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField label="Destination Name">
                                <input
                                    type="text"
                                    name="name"
                                    value={destination.name || ''}
                                    onChange={handleDestinationChange}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-cyan-500"
                                    disabled={!canManageSettings}
                                />
                            </FormField>
                            <FormField label="Country">
                                <input
                                    type="text"
                                    name="country"
                                    value={destination.country || ''}
                                    onChange={handleDestinationChange}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-cyan-500"
                                    disabled={!canManageSettings}
                                />
                            </FormField>
                        </div>

                        <FormField label="Type">
                            <select
                                name="type"
                                value={destination.type || 'Resort'}
                                onChange={handleDestinationChange}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-cyan-500"
                                disabled={!canManageSettings}
                            >
                                <option value="Resort">Resort</option>
                                <option value="City">City</option>
                                <option value="Studio">Studio</option>
                                <option value="Event">Event</option>
                            </select>
                        </FormField>

                        <FormField 
                            label="License Key"
                            help="Required for cloud synchronization"
                        >
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        name="licenseKey"
                                        value={destination.licenseKey || ''}
                                        onChange={handleDestinationChange}
                                        className={`
                                            w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border rounded-lg font-mono text-sm
                                            ${isKeyValid 
                                                ? 'border-green-500 focus:ring-green-500' 
                                                : 'border-slate-200 dark:border-slate-700 focus:ring-cyan-500'}
                                        `}
                                        placeholder="CF-LIVE-XXXX-XXXX-XXXX-XXXX"
                                        disabled={!canManageSettings}
                                    />
                                    {isKeyValid && (
                                        <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                                    )}
                                </div>
                                <button
                                    onClick={() => { navigator.clipboard.writeText(destination.licenseKey || ''); showToast('Copied!'); }}
                                    className="p-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
                                    title="Copy"
                                >
                                    <Copy className="w-4 h-4" />
                                </button>
                            </div>
                            {!isKeyValid && connectionSettings.mode === 'cloud' && (
                                <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
                                    <AlertCircle className="w-3 h-3" />
                                    Valid license key required for cloud sync
                                </p>
                            )}
                        </FormField>
                    </div>
                ) : (
                    <div className="text-center py-8">
                        {!isCreatingDest ? (
                            <div className="space-y-4">
                                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto">
                                    <Building2 className="w-8 h-8 text-slate-400" />
                                </div>
                                <p className="text-slate-500">No destination configured</p>
                                <button
                                    onClick={() => setIsCreatingDest(true)}
                                    disabled={!canManageSettings}
                                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition-colors"
                                >
                                    Create Destination
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3 max-w-md mx-auto">
                                <input
                                    type="text"
                                    value={newDestData.name}
                                    onChange={e => setNewDestData({ ...newDestData, name: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                                    placeholder="Destination Name"
                                    autoFocus
                                />
                                <input
                                    type="text"
                                    value={newDestData.country}
                                    onChange={e => setNewDestData({ ...newDestData, country: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                                    placeholder="Country"
                                />
                                <input
                                    type="text"
                                    value={newDestData.licenseKey}
                                    onChange={e => setNewDestData({ ...newDestData, licenseKey: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-sm"
                                    placeholder="Ed25519 License Key (from Generator or Hub)"
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setIsCreatingDest(false)}
                                        className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleCreateDestination}
                                        disabled={isCreatingDestLoading}
                                        className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                                    >
                                        {isCreatingDestLoading ? <Spinner size="small" /> : 'Create'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </SettingsCard>

            {/* Localization */}
            <SettingsCard title="Localization" icon={Globe}>
                <FormField 
                    label="Display Currency"
                    help="Affects pricing display across the application"
                >
                    <select
                        value={currency.code}
                        onChange={(e) => {
                            setCurrency(e.target.value);
                            safeStorage.setItem('masterPortalCurrency', e.target.value);
                            setHasChanges(true);
                        }}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-cyan-500"
                        disabled={!canManageSettings}
                    >
                        {availableCurrencies.map(c => (
                            <option key={c.code} value={c.code}>{c.name} ({c.symbol})</option>
                        ))}
                    </select>
                </FormField>
            </SettingsCard>

            {!canManageSettings && (
                <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                    <Shield className="w-5 h-5 text-amber-600 flex-shrink-0" />
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                        Some settings are locked. Contact an administrator to make changes.
                    </p>
                </div>
            )}
        </div>
    );
};

export default GeneralSettings;
