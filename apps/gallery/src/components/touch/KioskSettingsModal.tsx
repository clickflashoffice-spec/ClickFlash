
import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal.tsx';
import { KioskSettings } from '../../types.ts';
import { useCurrency } from '../CurrencyContext.tsx';
import { configureConnection } from '../../services/pb.ts';
import TouchConnectionSetup from './TouchConnectionSetup';

const KIOSK_SETTINGS_KEY = 'kioskSettingsV2';
const DEFAULT_LOGO = 'https://i.imgur.com/3Y2j2s2.png';
const DEFAULT_MESSAGE = 'Welcome';
const DEVICE_ROLE_KEY = 'star_master_device_role';

interface KioskSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (settings: KioskSettings) => void;
    kioskConnectionStatus: 'Connected' | 'Disconnected';
}

type ConnectionTestStatus = 'idle' | 'testing' | 'success' | 'error';
type ConnectionType = 'local' | 'cloud';
type ViewState = 'settings' | 'connectionWizard';

const KioskSettingsModal: React.FC<KioskSettingsModalProps> = ({ isOpen, onClose, onSave, kioskConnectionStatus }) => {
    const { currency, setCurrency } = useCurrency();
    const [settings, setSettings] = useState<KioskSettings>({
        logoUrl: DEFAULT_LOGO,
        welcomeMessage: DEFAULT_MESSAGE,
        kioskId: '',
        serverUrl: window.location.origin,
        screensaverTimeout: 60,
        enableRFID: true,
        enableFaceLogin: true,
        enableFaceSearch: true,
    });
    const [logoPreview, setLogoPreview] = useState<string>(DEFAULT_LOGO);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [connectionTestStatus, setConnectionTestStatus] = useState<ConnectionTestStatus>('idle');
    const [view, setView] = useState<ViewState>('settings');
    
    // Determine type based on current URL structure
    const [connectionType, setConnectionType] = useState<ConnectionType>('local');

    const generateNewKioskId = () => `kiosk-${Math.random().toString(36).substr(2, 9)}`;

    useEffect(() => {
        if (isOpen) {
            const savedSettingsRaw = localStorage.getItem(KIOSK_SETTINGS_KEY);
            const initialSettings: KioskSettings = {
                logoUrl: DEFAULT_LOGO,
                welcomeMessage: DEFAULT_MESSAGE,
                kioskId: '',
                serverUrl: window.location.origin,
                screensaverTimeout: 60,
                enableRFID: true,
                enableFaceLogin: true,
                enableFaceSearch: true,
            };

            if (savedSettingsRaw) {
                try {
                    const parsed = JSON.parse(savedSettingsRaw);
                    if (!parsed.kioskId) parsed.kioskId = generateNewKioskId();
                    
                    const merged = { ...initialSettings, ...parsed };
                    setSettings(merged);
                    setLogoPreview(merged.logoUrl);
                    if (merged.currencyCode) setCurrency(merged.currencyCode);

                    // Detect connection type
                    if (merged.serverUrl && merged.serverUrl.includes('http') && !merged.serverUrl.includes('192.168') && !merged.serverUrl.includes('localhost') && !merged.serverUrl.includes('127.0.0.1')) {
                        setConnectionType('cloud');
                    } else {
                        setConnectionType('local');
                    }

                } catch (e) {
                    console.error(e);
                    setSettings(initialSettings);
                }
            } else {
                initialSettings.kioskId = generateNewKioskId();
                setSettings(initialSettings);
            }
            setNewPassword('');
            setConfirmPassword('');
            setConnectionTestStatus('idle');
            setView('settings');
        }
    }, [isOpen, setCurrency]);


    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setSettings(prev => ({...prev, [name]: value }));
        if (name === 'serverUrl') setConnectionTestStatus('idle');
    };

    const handleConnectionTypeChange = (type: ConnectionType) => {
        setConnectionType(type);
        setSettings(prev => ({
            ...prev,
            serverUrl: type === 'local' ? 'http://192.168.1.100:8090' : 'https://api.starmaster.cloud'
        }));
    };

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        setSettings(prev => ({ ...prev, [name]: checked }));
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                setLogoPreview(base64String);
                setSettings(prev => ({ ...prev, logoUrl: base64String }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSaveAndReload = () => {
        let settingsToSave = { ...settings, currencyCode: currency.code };
        
        if (newPassword) {
            if (newPassword !== confirmPassword) {
                alert("Passwords do not match.");
                return;
            }
            settingsToSave.password = newPassword;
        }
        
        if (settingsToSave.screensaverTimeout) {
            settingsToSave.screensaverTimeout = Number(settingsToSave.screensaverTimeout);
        }

        localStorage.setItem(KIOSK_SETTINGS_KEY, JSON.stringify(settingsToSave));
        
        // Critical: Update global connection config immediately
        configureConnection();
        
        onSave(settingsToSave);
        onClose();
        window.location.reload(); 
    };
    
    const handleResetDeviceRole = () => {
        if (window.confirm("Reset device role?")) {
            localStorage.removeItem(DEVICE_ROLE_KEY);
            window.location.reload();
        }
    };

    const performConnectionTest = async (url: string) => {
        setConnectionTestStatus('testing');
        const normalizedUrl = url.startsWith('http') ? url : `http://${url}`;
        
        try {
            const response = await fetch(`${normalizedUrl}/api/health`, { method: 'GET', mode: 'cors' });
            if (response.ok) setConnectionTestStatus('success');
            else setConnectionTestStatus('error');
        } catch (e) {
            setConnectionTestStatus('error');
        }
    };

    const handleTestConnection = () => {
        performConnectionTest(settings.serverUrl || window.location.origin);
    };
    
    const handleWizardComplete = (ip?: string) => {
        if (ip) {
            const newUrl = `http://${ip}:8090`;
            setSettings(prev => ({ ...prev, serverUrl: newUrl }));
            setConnectionTestStatus('success');
        }
        setView('settings');
    };

    const handleCopyKioskId = async () => {
        try {
            await navigator.clipboard.writeText(settings.kioskId);
            // You could add a toast notification here if available
            alert('Kiosk ID copied to clipboard!');
        } catch (err) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = settings.kioskId;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            alert('Kiosk ID copied to clipboard!');
        }
    };
    
    const InfoRow: React.FC<{label: string, value: string, color?: string, mono?: boolean, onCopy?: () => void}> = ({label, value, color, mono, onCopy}) => (
        <div className="flex justify-between items-center p-3 bg-slate-100 dark:bg-slate-700/50 rounded-lg">
            <span className="font-semibold text-slate-500 dark:text-slate-300">{label}</span>
            <div className="flex items-center gap-2">
                <span className={`${color || ''} ${mono ? 'font-mono' : ''}`}>{value}</span>
                {onCopy && (
                    <button
                        onClick={onCopy}
                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-600 rounded transition-colors"
                        title="Copy to clipboard"
                        aria-label="Copy to clipboard"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-600 dark:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                    </button>
                )}
            </div>
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Kiosk Settings">
            {view === 'connectionWizard' ? (
                <div className="py-4">
                    <h3 className="text-lg font-bold mb-4 text-center">Find Master Station</h3>
                    <TouchConnectionSetup 
                        variant="embedded" 
                        onConnected={handleWizardComplete} 
                        onCancel={() => setView('settings')} 
                    />
                </div>
            ) : (
                <div className="space-y-6 no-print">
                    {/* Section 1: Connection */}
                    <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold">Connection</h3>
                            {connectionType === 'local' && (
                                <button 
                                    onClick={() => setView('connectionWizard')}
                                    className="text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 px-3 py-1.5 rounded-full font-bold flex items-center gap-1 transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                    Launch Wizard
                                </button>
                            )}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 mb-4">
                             <button 
                                onClick={() => handleConnectionTypeChange('local')}
                                className={`p-2 rounded-lg border text-sm font-bold transition-all ${connectionType === 'local' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}
                            >
                                Local Network
                            </button>
                            <button 
                                onClick={() => handleConnectionTypeChange('cloud')}
                                 className={`p-2 rounded-lg border text-sm font-bold transition-all ${connectionType === 'cloud' ? 'bg-purple-50 border-purple-500 text-purple-700' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}
                            >
                                Cloud Server
                            </button>
                        </div>

                        <div className="space-y-4 text-sm">
                            <div>
                                <div className="flex justify-between items-baseline mb-1">
                                    <label className="block text-sm font-medium text-slate-500 dark:text-slate-300">
                                        {connectionType === 'local' ? 'Master PC Backend URL' : 'Cloud Server URL'}
                                    </label>
                                    {connectionType === 'local' && (
                                        <button 
                                            onClick={() => setSettings(prev => ({ ...prev, serverUrl: 'http://127.0.0.1:8090' }))}
                                            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                                        >
                                            Set Localhost
                                        </button>
                                    )}
                                </div>
                                <div className="flex space-x-2">
                                    <input
                                        type="text"
                                        name="serverUrl"
                                        value={settings.serverUrl}
                                        onChange={handleChange}
                                        placeholder={connectionType === 'local' ? "http://192.168.1.100:8090" : "https://api.starmaster.cloud"}
                                        className="flex-grow bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-lg font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    />
                                    {connectionType === 'local' && (
                                        <button 
                                            onClick={handleTestConnection}
                                            className={`px-4 py-2 rounded-md font-semibold transition-colors min-w-[60px] flex items-center justify-center ${
                                                connectionTestStatus === 'success' ? 'bg-green-100 text-green-700 border border-green-300' :
                                                connectionTestStatus === 'error' ? 'bg-red-100 text-red-700 border border-red-300' :
                                                'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600'
                                            }`}
                                        >
                                            {connectionTestStatus === 'testing' ? <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full"></div> : 
                                                connectionTestStatus === 'success' ? "OK" : 
                                                connectionTestStatus === 'error' ? "Fail" : "Test"}
                                        </button>
                                    )}
                                </div>
                                 <p className="text-xs text-slate-400 mt-1">
                                    {connectionType === 'local' 
                                        ? "Enter the IP of the Master PC. Ensure port 8090 is allowed in firewall."
                                        : "Kiosk will connect directly to the internet. No local Master PC required."}
                                </p>
                            </div>
                            <InfoRow label="Kiosk ID" value={settings.kioskId} mono={true} onCopy={handleCopyKioskId} />
                            <InfoRow label="Status" value={kioskConnectionStatus} color={kioskConnectionStatus === 'Connected' ? 'text-green-400' : 'text-red-400'} />
                        </div>
                    </div>

                    {/* Section 2: Security */}
                    <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                        <h3 className="text-lg font-bold mb-4">Security</h3>
                        <div className="space-y-4 mb-4">
                            <div>
                                <label htmlFor="new-password-input" className="block text-sm font-medium text-slate-500 dark:text-slate-300 mb-1">New Password</label>
                                <input 
                                    id="new-password-input"
                                    type="password" 
                                    value={newPassword} 
                                    onChange={(e) => setNewPassword(e.target.value)} 
                                    placeholder="Leave empty to keep current password"
                                    className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2" 
                                />
                            </div>
                            <div>
                                <label htmlFor="confirm-password-input" className="block text-sm font-medium text-slate-500 dark:text-slate-300 mb-1">Confirm Password</label>
                                <input 
                                    id="confirm-password-input"
                                    type="password" 
                                    value={confirmPassword} 
                                    onChange={(e) => setConfirmPassword(e.target.value)} 
                                    placeholder="Confirm new password"
                                    className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2" 
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Access Control */}
                    <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                        <h3 className="text-lg font-bold mb-4">Access Control</h3>
                        <div className="space-y-3">
                             <div className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-700/50 rounded-lg">
                                <div>
                                    <span className="font-bold block text-slate-700 dark:text-slate-200">RFID Login</span>
                                    <span className="text-xs text-slate-500">Tap bracelet to login.</span>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer" aria-label="Enable RFID Login">
                                    <input type="checkbox" name="enableRFID" checked={!!settings.enableRFID} onChange={handleCheckboxChange} className="sr-only peer" aria-label="Enable RFID Login" title="Enable RFID Login" />
                                    <div className="w-11 h-6 bg-slate-200 rounded-full peer dark:bg-slate-600 peer-checked:bg-blue-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                                </label>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-700/50 rounded-lg">
                                <div>
                                    <span className="font-bold block text-slate-700 dark:text-slate-200">Face Login</span>
                                    <span className="text-xs text-slate-500">Biometric entry.</span>
                                </div>
                                 <label className="relative inline-flex items-center cursor-pointer" aria-label="Enable Face Login">
                                    <input type="checkbox" name="enableFaceLogin" checked={!!settings.enableFaceLogin} onChange={handleCheckboxChange} className="sr-only peer" aria-label="Enable Face Login" title="Enable Face Login" />
                                    <div className="w-11 h-6 bg-slate-200 rounded-full peer dark:bg-slate-600 peer-checked:bg-blue-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                                </label>
                            </div>
                        </div>
                    </div>

                     {/* Section 4: Gallery Features */}
                    <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                        <h3 className="text-lg font-bold mb-4">Gallery Features</h3>
                        <div className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-700/50 rounded-lg">
                            <div>
                                <span className="font-bold block text-slate-700 dark:text-slate-200">AI Face Search</span>
                                <span className="text-xs text-slate-500">Enable "Find Me" button.</span>
                            </div>
                             <label className="relative inline-flex items-center cursor-pointer" aria-label="Enable AI Face Search">
                                <input type="checkbox" name="enableFaceSearch" checked={!!settings.enableFaceSearch} onChange={handleCheckboxChange} className="sr-only peer" aria-label="Enable AI Face Search" title="Enable AI Face Search" />
                                <div className="w-11 h-6 bg-slate-200 rounded-full peer dark:bg-slate-600 peer-checked:bg-blue-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                            </label>
                        </div>
                    </div>

                    {/* Section 5: Identity & Appearance */}
                    <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                        <h3 className="text-lg font-bold mb-4">Identity</h3>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="welcome-message-input" className="block text-sm font-medium text-slate-500 dark:text-slate-300 mb-1">Welcome Message</label>
                                <input id="welcome-message-input" type="text" name="welcomeMessage" value={settings.welcomeMessage} onChange={handleChange} className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2" placeholder="Enter welcome message" title="Welcome message input" />
                            </div>
                            <div className="flex items-center space-x-4">
                                <div className="flex-grow">
                                    <label htmlFor="logo-upload-input" className="block text-sm font-medium text-slate-500 dark:text-slate-300 mb-1">Logo</label>
                                    <input id="logo-upload-input" type="file" accept="image/*" onChange={handleLogoChange} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-slate-200 dark:file:bg-slate-700 hover:file:bg-slate-300" aria-label="Upload logo image" title="Upload logo image" />
                                </div>
                                <img src={logoPreview} alt="Logo preview" title="Logo preview" className="w-12 h-12 rounded-full bg-slate-200 object-cover" />
                            </div>
                        </div>
                    </div>

                     {/* Section 6: Reset */}
                     <div className="p-4 border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10 rounded-lg flex justify-between items-center">
                        <div>
                            <h4 className="font-bold text-red-700 dark:text-red-400">System Reset</h4>
                            <p className="text-xs text-red-600 dark:text-red-300">Switch back to Master Portal mode.</p>
                        </div>
                        <button onClick={handleResetDeviceRole} className="text-xs bg-red-100 text-red-600 px-3 py-2 rounded-lg font-bold">
                            Reset Role
                        </button>
                    </div>
                </div>
            )}

            <div className="pt-6 border-t border-slate-200 dark:border-slate-700 mt-6">
                 <div className="flex justify-end space-x-3">
                    <button type="button" onClick={onClose} className="bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 dark:text-white font-semibold py-2 px-4 rounded-lg">Cancel</button>
                    <button type="button" onClick={handleSaveAndReload} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg">Save & Reload</button>
                </div>
            </div>
        </Modal>
    );
};

export default KioskSettingsModal;
