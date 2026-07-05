
import React from 'react';
import { KioskSettings } from '../../../types';
import { DEFAULT_MASTER_PORT } from '../../../constants';

interface ConnectionSettingsProps {
    settings: KioskSettings;
    setSettings: React.Dispatch<React.SetStateAction<KioskSettings>>;
    connectionType: 'local' | 'cloud';
    setConnectionType: (type: 'local' | 'cloud') => void;
    connectionTestStatus: 'idle' | 'testing' | 'success' | 'error';
    onLaunchWizard: () => void;
    onTestConnection: () => void;
    kioskConnectionStatus: 'Connected' | 'Disconnected';
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
    handleCopyKioskId: () => void;
}

export const ConnectionSettings: React.FC<ConnectionSettingsProps> = ({
    settings,
    setSettings,
    connectionType,
    setConnectionType,
    connectionTestStatus,
    onLaunchWizard,
    onTestConnection,
    kioskConnectionStatus,
    handleChange,
    handleCopyKioskId
}) => {

    const InfoRow: React.FC<{ label: string, value: string, color?: string, mono?: boolean, onCopy?: () => void }> = ({ label, value, color, mono, onCopy }) => (
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
        <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">Connection</h3>
                {connectionType === 'local' && (
                    <button
                        onClick={onLaunchWizard}
                        className="text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 px-3 py-1.5 rounded-full font-bold flex items-center gap-1 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        Launch Wizard
                    </button>
                )}
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
                <button
                    onClick={() => setConnectionType('local')}
                    className={`p-2 rounded-lg border text-sm font-bold transition-all ${connectionType === 'local' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}
                >
                    Local Network
                </button>
                <button
                    onClick={() => setConnectionType('cloud')}
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
                                onClick={() => setSettings(prev => ({ ...prev, serverUrl: `http://127.0.0.1:${DEFAULT_MASTER_PORT}` }))}
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
                            placeholder={connectionType === 'local' ? `http://192.168.1.100:${DEFAULT_MASTER_PORT}` : "https://api.starmaster.cloud"}
                            className="flex-grow bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-lg font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                        {connectionType === 'local' && (
                            <button
                                onClick={onTestConnection}
                                className={`px-4 py-2 rounded-md font-semibold transition-colors min-w-[60px] flex items-center justify-center ${connectionTestStatus === 'success' ? 'bg-green-100 text-green-700 border border-green-300' :
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
                            ? `Enter the IP of the Master PC. Ensure port ${DEFAULT_MASTER_PORT} is allowed in firewall.`
                            : "Kiosk will connect directly to the internet. No local Master PC required."}
                    </p>
                </div>
                <InfoRow label="Kiosk ID" value={settings.kioskId} mono={true} onCopy={handleCopyKioskId} />
                <InfoRow label="Status" value={kioskConnectionStatus} color={kioskConnectionStatus === 'Connected' ? 'text-green-400' : 'text-red-400'} />
                <div>
                    <label htmlFor="shared-folder-path-input" className="block text-sm font-medium text-slate-500 dark:text-slate-300 mb-1">
                        Monitored Photo Folder
                        {settings.sharedFolderPath?.startsWith('C:\\ClickFlash') || settings.sharedFolderPath?.startsWith('/ClickFlash') ? (
                            <span className="ml-2 text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 px-1.5 py-0.5 rounded-full font-bold">AUTO</span>
                        ) : null}
                    </label>
                    <input
                        id="shared-folder-path-input"
                        type="text"
                        name="sharedFolderPath"
                        value={settings.sharedFolderPath || ''}
                        onChange={handleChange}
                        placeholder="e.g., C:\\Photos or /home/user/photos"
                        className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 font-mono text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <p className="text-xs text-slate-400 mt-1">
                        Local path where this Kiosk should look for new photos (e.g. mapped network drive).
                        {settings.sharedFolderPath?.startsWith('C:\\ClickFlash') || settings.sharedFolderPath?.startsWith('/ClickFlash') ? (
                            <span className="text-green-600 dark:text-green-400 font-medium"> Auto-configured via pairing.</span>
                        ) : null}
                    </p>
                </div>
                <div>
                    <label htmlFor="orders-folder-path-input" className="block text-sm font-medium text-slate-500 dark:text-slate-300 mb-1">
                        Orders Hot Folder
                        {settings.touchOrdersFolder?.startsWith('C:\\ClickFlash') || settings.touchOrdersFolder?.startsWith('/ClickFlash') ? (
                            <span className="ml-2 text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 px-1.5 py-0.5 rounded-full font-bold">AUTO</span>
                        ) : null}
                    </label>
                    <input
                        id="orders-folder-path-input"
                        type="text"
                        name="touchOrdersFolder"
                        value={settings.touchOrdersFolder || ''}
                        onChange={handleChange}
                        placeholder="e.g., C:\\Orders or /home/user/orders"
                        className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 font-mono text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <p className="text-xs text-slate-400 mt-1">
                        Local path where JSON order files will be created for fulfillment.
                        {settings.touchOrdersFolder?.startsWith('C:\\ClickFlash') || settings.touchOrdersFolder?.startsWith('/ClickFlash') ? (
                            <span className="text-green-600 dark:text-green-400 font-medium"> Auto-configured via pairing.</span>
                        ) : null}
                    </p>
                </div>
            </div>
        </div>
    );
};
