
import React, { useState } from 'react';
import Card from '../common/Card.tsx';
import { apiService } from '../../services/apiService.ts';
import useLocalStorage from '../../hooks/useLocalStorage.ts';
import { pbManagement } from '../../services/pbManagement.ts';

interface SyncDataSummary {
    albums: number;
    photos: number;
    orders: number;
    users: number;
    totalSizeMB: number;
}

interface CloudSyncProps {
    showToast: (message: string) => void;
}

const CloudSync: React.FC<CloudSyncProps> = ({ showToast }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [syncSummary, setSyncSummary] = useState<SyncDataSummary | null>(null);
    const [error, setError] = useState<string | null>(null);
    
    // Cloud Upload State
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadStatusMessage, setUploadStatusMessage] = useState("Initializing...");
    const [lastCloudSync, setLastCloudSync] = useLocalStorage<string | null>('lastCloudSyncTime', null);
    const [cloudSettings, setCloudSettings] = useLocalStorage('masterCloudSettings', { url: '', key: '' });

    // Test Connection State
    const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');

    const handlePrepareSync = async () => {
        setIsLoading(true);
        setError(null);
        setSyncSummary(null);
        try {
            const data = await apiService.exportDataForSync();
            setSyncSummary(data.summary);
        } catch (err) {
            console.error("Failed to prepare sync data:", err);
            setError("Could not gather data from the local database.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleTestConnection = async () => {
         if (!cloudSettings.url || !cloudSettings.key) {
            alert("Please enter Server URL and API Key.");
            return;
        }
        setConnectionStatus('testing');
        const success = await pbManagement.testConnection(cloudSettings.url, cloudSettings.key);
        setConnectionStatus(success ? 'success' : 'failed');
        if (success) {
            showToast("Connection Successful!");
        } else {
            alert("Connection Failed. Please check the URL and API Key.");
        }
    };

    const handleStartUpload = async () => {
        if (!cloudSettings.url || !cloudSettings.key) {
            alert("Cloud settings are missing. Please configure your Cloud Server URL and API Key above.");
            return;
        }

        setIsUploading(true);
        setUploadProgress(0);
        setUploadStatusMessage("Connecting...");
        setError(null);

        try {
            await pbManagement.syncLocalToCloud(
                cloudSettings.url,
                cloudSettings.key,
                (msg, percent) => {
                    setUploadStatusMessage(msg);
                    setUploadProgress(percent);
                }
            );
            
            setLastCloudSync(new Date().toISOString());
            showToast("Cloud Sync Successful!");
            setTimeout(() => {
                setIsUploading(false);
                setSyncSummary(null);
            }, 2000);
        } catch (err: any) {
            console.error("Sync failed:", err);
            setError(`Sync failed: ${err.message || "Unknown error"}`);
            setIsUploading(false);
        }
    };

    const handleSaveCloudConfig = () => {
        showToast('Cloud configuration saved locally.');
        setConnectionStatus('idle');
    };

    const inputStyles = "w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none";
    const labelStyles = "block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1";

    return (
        <div className="space-y-8">
            <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 rounded-r-lg">
                <h3 className="font-bold text-blue-800 dark:text-blue-200 mb-1">Offline-First Architecture</h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                    This Master Portal is designed to operate completely offline. All data is stored locally on this machine. 
                    Cloud synchronization is <strong>optional and manual</strong>, ensuring you have full control over when data is transmitted.
                </p>
            </div>

             {/* Section: Cloud Configuration */}
             <Card>
                <div className="flex items-start space-x-3 mb-4">
                     <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2h2" /></svg>
                     </div>
                     <div>
                        <h3 className="text-lg font-bold">Cloud Server Configuration</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Required for "Online Mode" and manual Cloud Sync operations.</p>
                     </div>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className={labelStyles}>Server URL</label>
                        <input 
                            type="text" 
                            value={cloudSettings.url || ''} 
                            onChange={e => setCloudSettings({...cloudSettings, url: e.target.value})} 
                            className={inputStyles} 
                            placeholder="https://api.starmaster.cloud" 
                        />
                    </div>
                    <div>
                        <label className={labelStyles}>API Key / Authorization</label>
                        <input 
                            type="password" 
                            value={cloudSettings.key || ''} 
                            onChange={e => setCloudSettings({...cloudSettings, key: e.target.value})} 
                            className={inputStyles} 
                            placeholder="Enter destination License Key or Admin Password"
                        />
                        <p className="text-xs text-slate-500 mt-1">This key authenticates this Master Portal with your specific destination in the cloud.</p>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                         <div className="flex items-center space-x-2">
                            <button 
                                onClick={handleTestConnection} 
                                className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center space-x-2"
                                disabled={connectionStatus === 'testing'}
                            >
                                {connectionStatus === 'testing' && <div className="animate-spin h-4 w-4 border-2 border-slate-500 border-t-transparent rounded-full"></div>}
                                <span>Test Connection</span>
                            </button>
                            {connectionStatus === 'success' && <span className="text-green-600 font-bold">✓ Connected</span>}
                            {connectionStatus === 'failed' && <span className="text-red-500 font-bold">✗ Failed</span>}
                        </div>

                        <button onClick={handleSaveCloudConfig} className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
                            Save Cloud Config
                        </button>
                    </div>
                </div>
            </Card>

            <Card>
                <div className="flex items-start space-x-3 mb-6">
                     <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                     </div>
                     <div className="flex-1">
                        <div className="flex justify-between items-start">
                            <h2 className="text-2xl font-bold">Cloud Sync (Manual)</h2>
                            {lastCloudSync && (
                                <div className="text-right">
                                    <p className="text-xs text-slate-500">Last Successful Sync</p>
                                    <p className="font-mono font-bold text-green-600 dark:text-green-400">{new Date(lastCloudSync).toLocaleString()}</p>
                                </div>
                            )}
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                            Push your local sales, albums, and customer data to the global Management Portal.
                        </p>
                     </div>
                </div>
                
                {isUploading ? (
                    <div className="my-8 space-y-2">
                        <div className="flex justify-between text-sm font-semibold">
                            <span>{uploadStatusMessage}</span>
                            <span>{uploadProgress}%</span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-4 overflow-hidden">
                            <div 
                                className="bg-indigo-600 h-4 rounded-full transition-all duration-300 ease-linear" 
                                style={{ width: `${uploadProgress}%` }}
                            ></div>
                        </div>
                        <p className="text-xs text-slate-500 text-center mt-2">Sending data securely to {cloudSettings.url || 'Server'}...</p>
                    </div>
                ) : (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        <button 
                            onClick={handlePrepareSync} 
                            disabled={isLoading}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg disabled:bg-slate-400 shadow-md transition-colors flex items-center"
                        >
                            {isLoading && <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>}
                            {isLoading ? 'Analyzing Database...' : '1. Prepare Data Package'}
                        </button>
                        
                        {syncSummary && (
                            <>
                                <div className="hidden sm:block h-px w-8 bg-slate-300 dark:bg-slate-600"></div>
                                <button 
                                    onClick={handleStartUpload}
                                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-colors animate-pulse flex items-center"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                    2. Upload to Cloud
                                </button>
                            </>
                        )}
                    </div>
                )}

                <div className="mt-8">
                    {error && !syncSummary && (
                        <div className="p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg border border-red-200 dark:border-red-800">
                            {error}
                        </div>
                    )}
                    
                    {syncSummary && !isUploading && (
                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                            <div className="bg-slate-100 dark:bg-slate-800 px-4 py-3 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-200">
                                Sync Package Summary
                            </div>
                            <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-bold">Albums</p>
                                    <p className="text-xl font-mono">{syncSummary.albums.toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-bold">Photos</p>
                                    <p className="text-xl font-mono">{syncSummary.photos.toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-bold">Orders</p>
                                    <p className="text-xl font-mono">{syncSummary.orders.toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-bold">Est. Size</p>
                                    <p className="text-xl font-mono">{syncSummary.totalSizeMB.toFixed(1)} MB</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default CloudSync;
