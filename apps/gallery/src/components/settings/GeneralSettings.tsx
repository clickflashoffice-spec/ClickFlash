
import React, { useEffect, useState } from 'react';
import Card from '../common/Card.tsx';
import { useCurrency } from '../CurrencyContext.tsx';
import { Photographer, Destination } from '../../types.ts';
import { apiService } from '../../services/apiService.ts';
import Spinner from '../common/Spinner.tsx';
import useLocalStorage from '../../hooks/useLocalStorage.ts';
import UserEditModal from '../modals/UserEditModal.tsx';
import { usePermissions } from '../../hooks/usePermissions.ts';
import { pb } from '../../services/pb.ts';
import { logger } from '../../utils/logger.ts';

const MASTER_PORTAL_CURRENCY_KEY = 'masterPortalCurrency';
const MASTER_LOCAL_IP_KEY = 'masterLocalIPAddress';

interface GeneralSettingsProps {
    currentUser: Photographer;
    onCurrentUserUpdate: () => void;
    showToast: (message: string) => void;
}

interface NetworkInterface {
    name: string;
    ip: string;
}

const GeneralSettings: React.FC<GeneralSettingsProps> = ({ currentUser, onCurrentUserUpdate, showToast }) => {
    const { currency, setCurrency, availableCurrencies } = useCurrency();
    const [destination, setDestination] = useState<Destination | null>(null);
    const [loading, setLoading] = useState(true);
    const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
    const { can } = usePermissions(currentUser);
    
    const [newDestData, setNewDestData] = useState<{ name: string; country: string; type: 'Resort' | 'City' }>({ name: '', country: '', type: 'Resort' });
    const [isCreatingDest, setIsCreatingDest] = useState(false);
    const [isCreatingDestLoading, setIsCreatingDestLoading] = useState(false);

    const [connectionSettings, setConnectionSettings] = useLocalStorage('connectionSettings', {
        mode: 'local',
    });
    
    const [cloudConfig, setCloudConfig] = useLocalStorage('masterCloudSettings', { 
        url: '', 
        key: '' 
    });

    const [masterLocalIp, setMasterLocalIp] = useLocalStorage(MASTER_LOCAL_IP_KEY, '127.0.0.1');
    const [availableInterfaces, setAvailableInterfaces] = useState<NetworkInterface[]>([]);
    const [detectingIP, setDetectingIP] = useState(false);

    const canManageSettings = can('manageLocalSettings');

    useEffect(() => {
        const savedCurrencyCode = localStorage.getItem(MASTER_PORTAL_CURRENCY_KEY);
        if (savedCurrencyCode) {
            setCurrency(savedCurrencyCode);
        }
        detectNetworkInterfaces();
    }, [setCurrency]);

    const detectNetworkInterfaces = async () => {
        try {
            // Use the backend base URL from pb service to ensure correct port
            const baseUrl = pb.baseUrlValue || 'http://127.0.0.1:8090';
            const response = await fetch(`${baseUrl}/api/ip`);
            if (response.ok) {
                const data = await response.json();
                if (data.interfaces && data.interfaces.length > 0) {
                    setAvailableInterfaces(data.interfaces);
                }
            }
        } catch (e) {
            console.error('Failed to detect network interfaces:', e);
        }
    }

    useEffect(() => {
        const loadDestination = async () => {
            setLoading(true);
            try {
                if (currentUser.destinationId) {
                    const allDestinations = await apiService.getDestinations();
                    const currentDest = allDestinations.find(d => d.id === currentUser.destinationId);
                    setDestination(currentDest || null);
                } else {
                    setDestination(null);
                }
            } catch (error) {
                console.error("Failed to load destination data", error);
            } finally {
                setLoading(false);
            }
        };
        loadDestination();
    }, [currentUser.destinationId]);

    const handleCurrencyChange = (code: string) => {
        setCurrency(code);
        localStorage.setItem(MASTER_PORTAL_CURRENCY_KEY, code);
    };

    const handleDestinationChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        if (!destination) return;
        const { name, value } = e.target;
        setDestination({ ...destination, [name]: value });
    };

    const handleSaveDestination = async () => {
        if (destination && destination.id) {
            // Optimistic update: destination state is already updated in handleDestinationChange
            const originalDestination = { ...destination };
            
            try {
                const savedDestination = await apiService.updateDestination(destination.id, destination);
                // Update with server response to ensure consistency
                setDestination(savedDestination);
                showToast('Destination settings saved successfully!');
            } catch (error) {
                // Revert on error
                setDestination(originalDestination);
                logger.error("Failed to save destination settings", error instanceof Error ? error : undefined);
                showToast('Failed to save destination settings.');
            }
        }
    };
    
    const handleVerifyKey = () => {
        if (destination && destination.licenseKey) {
            const key = destination.licenseKey.trim();
            if (key.startsWith('SM-') && key.length > 8) {
                showToast("Success: Key format is valid.");
            } else {
                showToast("Error: Invalid Key format. Must start with 'SM-'.");
            }
        } else {
            showToast("Please enter a license key to verify.");
        }
    };

    const handleCreateDestination = async () => {
        if (isCreatingDestLoading) return; // Prevent double submission
        
        if (!newDestData.name || !newDestData.country || !newDestData.type) {
            showToast("Please fill in all destination fields (name, country, and type).");
            return;
        }
        
        // Validate input
        if (newDestData.name.trim().length === 0) {
            showToast("Destination name cannot be empty.");
            return;
        }
        if (newDestData.country.trim().length === 0) {
            showToast("Country cannot be empty.");
            return;
        }
        
        setIsCreatingDestLoading(true);
        try {
            // Generate a random license key for new destinations
            const licenseKey = 'SM-' + Math.random().toString(36).substr(2, 9).toUpperCase();
            
            const destinationData = {
                name: newDestData.name.trim(),
                country: newDestData.country.trim(),
                type: newDestData.type,
                licenseKey
            };
            
            logger.info("Creating destination", { destinationData });
            const createdDest = await apiService.createDestination(destinationData);
            
            logger.info("Destination created successfully", { destinationId: createdDest.id });
            
            // Link destination to current user
            try {
                await apiService.updateUser(currentUser.id, { destinationId: createdDest.id });
            } catch (updateError) {
                logger.error("Failed to link destination to user", updateError instanceof Error ? updateError : undefined);
                // Still show success for destination creation, but warn about linking
                showToast("Destination created, but failed to link to user. Please refresh and try again.");
                setIsCreatingDest(false);
                setIsCreatingDestLoading(false);
                setNewDestData({ name: '', country: '', type: 'Resort' as const });
                return;
            }
            
            setDestination(createdDest);
            showToast("Destination created and linked.");
            onCurrentUserUpdate(); 
            setIsCreatingDest(false);
            setIsCreatingDestLoading(false);
            // Reset form
            setNewDestData({ name: '', country: '', type: 'Resort' as const });
        } catch (error) {
            setIsCreatingDestLoading(false);
            
            // Log full error for debugging
            console.error("Full destination creation error:", error);
            console.error("Error type:", typeof error);
            console.error("Error keys:", error && typeof error === 'object' ? Object.keys(error) : 'N/A');
            if (error && typeof error === 'object' && 'response' in error) {
                console.error("Error response:", (error as { response: unknown }).response);
            }
            
            logger.error("Failed to create destination", error instanceof Error ? error : undefined, {
                destinationName: newDestData.name,
                destinationCountry: newDestData.country,
                destinationType: newDestData.type,
                fullError: error
            });
            
            // Extract more detailed error message
            let errorMessage = 'Failed to create destination';
            if (error instanceof Error) {
                errorMessage = error.message;
            } else if (typeof error === 'object' && error !== null) {
                // Try to extract from PocketBase error structure
                if ('message' in error) {
                    errorMessage = String(error.message);
                } else if ('response' in error && typeof (error as { response?: unknown }).response === 'object' && (error as { response?: unknown }).response !== null) {
                    const response = (error as { response: { data?: { message?: string; data?: Record<string, unknown> }; status?: number } }).response;
                    if (response.data?.message) {
                        errorMessage = response.data.message;
                    } else if (response.data?.data) {
                        // Validation errors
                        const validationErrors = Object.entries(response.data.data)
                            .map(([field, msg]) => `${field}: ${String(msg)}`)
                            .join(', ');
                        errorMessage = validationErrors || errorMessage;
                    } else if (response.status) {
                        errorMessage = `Server error (${response.status}): ${errorMessage}`;
                    }
                }
            }
            
            // Show both toast and console error for visibility
            console.error("❌ Destination creation failed:", errorMessage);
            console.error("Full error object:", error);
            showToast(`Error creating destination: ${errorMessage}`);
            
            // Also show alert for critical errors to ensure user sees it
            if (errorMessage.includes('does not exist') || errorMessage.includes('Table')) {
                alert(`Database Error: ${errorMessage}\n\nPlease restart the backend server to create the destinations table.`);
            }
        }
    };

    const handleConnectionModeChange = (mode: 'local' | 'cloud') => {
        if (!canManageSettings) return;
        if (mode === 'cloud' && !cloudConfig.url) {
            showToast("Error: Missing Cloud URL. Enter server address first.");
            return;
        }
        if (window.confirm(`Switching to ${mode.toUpperCase()} mode requires an application reload. Continue?`)) {
            setConnectionSettings(prev => ({ ...prev, mode }));
            setTimeout(() => window.location.reload(), 500);
        }
    };
    
    const handleDetectNetwork = async () => {
        if (!canManageSettings) return;
        setDetectingIP(true);
        try {
            // Use the backend base URL from pb service to ensure correct port
            const baseUrl = pb.baseUrlValue || 'http://127.0.0.1:8090';
            const response = await fetch(`${baseUrl}/api/ip`);
            if (response.ok) {
                const data = await response.json();
                if (data.interfaces && data.interfaces.length > 0) {
                    setAvailableInterfaces(data.interfaces);
                    // Automatically select the first real IP if current is localhost
                    if (masterLocalIp === '127.0.0.1' || !data.interfaces.find((iface: any) => iface.ip === masterLocalIp)) {
                        setMasterLocalIp(data.interfaces[0].ip);
                    }
                    showToast(`Found ${data.interfaces.length} interfaces.`);
                } else {
                    setMasterLocalIp('127.0.0.1');
                    showToast('No external interfaces found. Using localhost.');
                }
            } else {
                const errorText = await response.text().catch(() => 'Unknown error');
                console.error('IP detection failed:', response.status, errorText);
                setMasterLocalIp('127.0.0.1');
                showToast(`Failed to detect IP (${response.status}).`);
            }
        } catch (error) {
            console.error('IP detection error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Network error';
            showToast(`Failed to detect IP: ${errorMessage}`);
        } finally {
            setDetectingIP(false);
        }
    };

    const labelStyles = "block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1";
    const inputStyles = "w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors";
    const disabledLabel = canManageSettings ? "" : " (Locked)";

    const isKeyValid = destination?.licenseKey?.startsWith('SM-') && destination.licenseKey.length > 8;

    return (
        <div className="space-y-6">
            {!canManageSettings && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 p-4 rounded-r-lg flex items-start space-x-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-600 dark:text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    <div>
                        <h3 className="font-bold text-amber-800 dark:text-amber-200 mb-1">Settings Locked</h3>
                        <p className="text-sm text-amber-700 dark:text-amber-300">Contact an Admin to modify system configuration.</p>
                    </div>
                </div>
            )}
            
            {connectionSettings.mode === 'cloud' && destination && !destination.licenseKey && (
                <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-r-lg flex items-start space-x-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600 dark:text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    <div>
                        <h3 className="font-bold text-red-800 dark:text-red-200 mb-1">Configuration Error</h3>
                        <p className="text-sm text-red-700 dark:text-red-300">Cloud Sync is enabled but the License Key is missing. Please enter a valid key below.</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column: Network & Destination */}
                <div className="space-y-6">
                    {/* Network Architecture */}
                    <Card>
                        <div className="flex justify-between items-center mb-4">
                             <h3 className="text-lg font-bold flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2h2" /></svg>
                                Network Configuration
                            </h3>
                             <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${connectionSettings.mode === 'cloud' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'}`}>
                                {connectionSettings.mode} Mode
                            </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 mb-6">
                            <button 
                                onClick={() => handleConnectionModeChange('local')}
                                disabled={!canManageSettings || connectionSettings.mode === 'local'}
                                className={`p-3 rounded-lg border text-center transition-all ${connectionSettings.mode === 'local' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500' : 'border-slate-200 dark:border-slate-700 opacity-60 hover:opacity-100'}`}
                            >
                                <span className="font-bold block">Offline First</span>
                                <span className="text-[10px] opacity-80">Local Database (Default)</span>
                            </button>
                            <button 
                                onClick={() => handleConnectionModeChange('cloud')}
                                disabled={!canManageSettings || connectionSettings.mode === 'cloud'}
                                className={`p-3 rounded-lg border text-center transition-all ${connectionSettings.mode === 'cloud' ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 ring-1 ring-purple-500' : 'border-slate-200 dark:border-slate-700 opacity-60 hover:opacity-100'}`}
                            >
                                <span className="font-bold block">Fully Online</span>
                                <span className="text-[10px] opacity-80">Cloud Database</span>
                            </button>
                        </div>

                        {connectionSettings.mode === 'local' ? (
                            <div className="border-t border-slate-200 dark:border-slate-700 pt-4 animate-fadeIn">
                                <label htmlFor="local-interface" className={labelStyles}>Local Interface (for Kiosks)</label>
                                <div className="flex space-x-2 mb-2">
                                    <div className="flex-grow relative">
                                        <select 
                                            id="local-interface"
                                            value={masterLocalIp} 
                                            onChange={(e) => setMasterLocalIp(e.target.value)} 
                                            className={inputStyles}
                                            disabled={!canManageSettings}
                                        >
                                            {availableInterfaces.length > 0 ? (
                                                availableInterfaces.map((iface) => (
                                                    <option key={iface.ip} value={iface.ip}>
                                                        {iface.name}: {iface.ip}
                                                    </option>
                                                ))
                                            ) : (
                                                 <option value="127.0.0.1">Loopback: 127.0.0.1</option>
                                            )}
                                        </select>
                                    </div>
                                    <button 
                                        onClick={handleDetectNetwork} 
                                        disabled={detectingIP || !canManageSettings}
                                        className="bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50 px-4 rounded-md text-sm font-bold transition-colors"
                                    >
                                        {detectingIP ? 'Scanning...' : 'Refresh IPs'}
                                    </button>
                                </div>
                                <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400">
                                    <p className="mb-1"><strong>Kiosk Connect URL:</strong> <span className="font-mono select-all">http://{masterLocalIp || 'localhost'}:8000</span></p>
                                    <p>Ensure your selected interface (Wi-Fi or Ethernet) matches the network the Kiosks are connected to.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="border-t border-slate-200 dark:border-slate-700 pt-4 animate-fadeIn">
                                <label htmlFor="cloud-server-url" className={labelStyles}>Cloud Server URL</label>
                                <input 
                                    id="cloud-server-url"
                                    type="url" 
                                    value={cloudConfig.url}
                                    onChange={(e) => setCloudConfig({...cloudConfig, url: e.target.value})}
                                    className={inputStyles}
                                    placeholder="https://api.starmaster.cloud"
                                    disabled={!canManageSettings}
                                />
                                <p className="text-xs text-slate-500 mt-1">
                                    <span className="text-amber-500 font-bold">Warning:</span> Online Mode requires a stable internet connection. Kiosks must also have internet access.
                                </p>
                            </div>
                        )}
                    </Card>

                    {/* Destination Profile */}
                     <Card>
                        <h3 className="text-lg font-bold mb-4">Destination Profile</h3>
                        {loading ? <Spinner /> : destination ? (
                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="destination-name" className={labelStyles}>Destination Name{disabledLabel}</label>
                                    <input id="destination-name" name="name" type="text" value={destination.name || ''} onChange={handleDestinationChange} className={inputStyles} disabled={!canManageSettings} />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label htmlFor="destination-country" className={labelStyles}>Country{disabledLabel}</label>
                                        <input id="destination-country" name="country" type="text" value={destination.country || ''} onChange={handleDestinationChange} className={inputStyles} disabled={!canManageSettings} />
                                    </div>
                                    <div>
                                        <label htmlFor="destination-type" className={labelStyles}>Type{disabledLabel}</label>
                                        <select id="destination-type" name="type" value={destination.type || 'Resort'} onChange={handleDestinationChange} className={inputStyles} disabled={!canManageSettings}>
                                            <option value="Resort">Resort</option>
                                            <option value="City">City</option>
                                        </select>
                                    </div>
                                </div>
                                
                                <div>
                                    <label htmlFor="license-key" className={labelStyles}>License Key (Cloud Sync)</label>
                                    <div className="flex space-x-2">
                                        <input 
                                            id="license-key"
                                            name="licenseKey"
                                            type="text" 
                                            value={destination.licenseKey || ''} 
                                            onChange={handleDestinationChange}
                                            className={`${inputStyles} font-mono ${destination.licenseKey ? (isKeyValid ? 'border-green-500 ring-1 ring-green-500' : 'border-amber-500 ring-1 ring-amber-500') : ''}`}
                                            disabled={!canManageSettings}
                                            placeholder="Enter License Key"
                                        />
                                        <button 
                                            onClick={() => { navigator.clipboard.writeText(destination.licenseKey || ''); showToast("Copied!"); }}
                                            className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 px-3 rounded-md font-bold text-sm"
                                            title="Copy"
                                        >
                                            Copy
                                        </button>
                                        <button 
                                            onClick={handleVerifyKey}
                                             className="bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 px-3 rounded-md font-bold text-sm"
                                        >
                                            Verify
                                        </button>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">
                                        {connectionSettings.mode === 'cloud' && !destination.licenseKey ? (
                                            <span className="text-red-500 font-bold">Required for Cloud Sync. </span>
                                        ) : (
                                            "Used to authenticate this Master Portal with the Management Cloud."
                                        )}
                                    </p>
                                </div>

                                <div className="pt-2 flex justify-end border-t border-slate-200 dark:border-slate-700">
                                    <button onClick={handleSaveDestination} disabled={!canManageSettings} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg text-sm disabled:bg-slate-400 shadow-md transition-transform active:scale-95">Save Changes</button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center p-8 bg-slate-50 dark:bg-slate-800/50 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700">
                                <p className="text-sm text-slate-500 mb-4">No destination configured for this portal.</p>
                                {!isCreatingDest ? (
                                    <button onClick={() => setIsCreatingDest(true)} disabled={!canManageSettings} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg shadow-md">Create New Destination</button>
                                ) : (
                                    <div className="space-y-3 text-left animate-fadeIn">
                                        <input type="text" value={newDestData.name} onChange={e => setNewDestData({...newDestData, name: e.target.value})} className={inputStyles} placeholder="Destination Name" autoFocus />
                                        <input type="text" value={newDestData.country} onChange={e => setNewDestData({...newDestData, country: e.target.value})} className={inputStyles} placeholder="Country" />
                                        <select 
                                            value={newDestData.type} 
                                            onChange={e => setNewDestData({...newDestData, type: e.target.value as 'Resort' | 'City'})} 
                                            className={inputStyles}
                                            aria-label="Destination Type"
                                        >
                                            <option value="Resort">Resort</option>
                                            <option value="City">City</option>
                                        </select>
                                        <div className="flex justify-end space-x-3 mt-4">
                                            <button onClick={() => setIsCreatingDest(false)} disabled={isCreatingDestLoading} className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 px-2 disabled:opacity-50">Cancel</button>
                                            <button onClick={handleCreateDestination} disabled={isCreatingDestLoading} className="bg-green-600 hover:bg-green-700 text-white font-bold text-sm px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                                                {isCreatingDestLoading ? (
                                                    <>
                                                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                        </svg>
                                                        Creating...
                                                    </>
                                                ) : (
                                                    'Create & Link'
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </Card>
                </div>

                {/* Right Column: User & Locale */}
                <div className="space-y-6">
                     <Card>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold">Active User Profile</h3>
                        </div>
                        <div className="flex items-center space-x-4 mb-6 p-4 bg-slate-50 dark:bg-slate-700/30 rounded-xl border border-slate-100 dark:border-slate-700">
                            <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-16 h-16 rounded-full object-cover border-2 border-white dark:border-slate-600 shadow-sm" />
                            <div>
                                <p className="text-lg font-bold text-slate-900 dark:text-white">{currentUser.name}</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">{currentUser.email}</p>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide mt-2 ${currentUser.role === 'Admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'} dark:bg-opacity-20`}>
                                    {currentUser.role}
                                </span>
                            </div>
                        </div>
                        <button 
                            onClick={() => setIsEditProfileModalOpen(true)} 
                            className="w-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold py-2.5 rounded-lg transition-colors text-sm shadow-sm"
                        >
                            Edit My Profile
                        </button>
                    </Card>

                    <Card>
                        <h3 className="text-lg font-bold mb-4">Localization</h3>
                        <div>
                            <label htmlFor="display-currency" className={labelStyles}>Display Currency{disabledLabel}</label>
                            <select
                                id="display-currency"
                                value={currency.code}
                                onChange={(e) => handleCurrencyChange(e.target.value)}
                                className={inputStyles}
                                disabled={!canManageSettings}
                            >
                                {availableCurrencies.map(c => (
                                    <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
                                ))}
                            </select>
                            <p className="text-xs text-slate-500 mt-2">
                                Affects pricing display across the Dashboard, Orders, and Kiosk. Base prices are stored in {availableCurrencies[0].code}.
                            </p>
                        </div>
                    </Card>
                </div>
            </div>

            <UserEditModal 
                isOpen={isEditProfileModalOpen}
                onClose={() => setIsEditProfileModalOpen(false)}
                onDataChange={onCurrentUserUpdate}
                userToEdit={currentUser}
                availableRoles={['Photographer', 'Team Leader', 'Admin']}
            />
        </div>
    )
}

export default GeneralSettings;
