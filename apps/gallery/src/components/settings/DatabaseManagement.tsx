
import React, { useState, useEffect } from 'react';
import Card from '../common/Card.tsx';
import { checkBackendHealth, pb } from '../../services/pb.ts';
import { pbManagement } from '../../services/pbManagement.ts';

const DatabaseManagement: React.FC = () => {
    const [status, setStatus] = useState<'online' | 'offline'>('offline');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isAdmin, setIsAdmin] = useState(pb.authStore.isValid && pb.authStore.isAdmin);
    const [logs, setLogs] = useState<string[]>([]);
    const [progress, setProgress] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        checkBackendHealth().then(isUp => setStatus(isUp ? 'online' : 'offline'));
        
        // Subscribe to auth changes
        return (pb.authStore as any).onChange(() => {
            setIsAdmin(pb.authStore.isValid && pb.authStore.isAdmin);
        });
    }, []);

    const addLog = (msg: string) => setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);

    const handleAdminLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await pbManagement.adminLogin(email, password);
            addLog("Logged in as Admin successfully.");
        } catch (err) {
            addLog("Login failed. Ensure you have created an admin account in the PocketBase dashboard first.");
        }
    };

    const handleInitSchema = async () => {
        setIsProcessing(true);
        addLog("Initializing Database Schema...");
        try {
            const results = await pbManagement.initSchema();
            results.forEach(r => addLog(`Collection '${r.name}': ${r.status}`));
        } catch (err: any) {
            addLog(`Schema Error: ${err.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSyncData = async () => {
        setIsProcessing(true);
        addLog("Starting Full Data Migration (Products, Albums, Photos)...");
        try {
            await pbManagement.syncLocalToRemote((msg, percent) => {
                setProgress(percent);
                if (percent % 10 === 0 || percent === 100) addLog(msg);
            });
            addLog("Migration Completed Successfully.");
        } catch (err: any) {
            addLog(`Migration Failed: ${err.message}`);
        } finally {
            setIsProcessing(false);
        }
    };
    
    const openAdminPanel = () => {
        window.open(`http://${window.location.hostname}:8090/_/`, '_blank');
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Status Card */}
                <Card className={`border-l-4 ${status === 'online' ? 'border-green-500' : 'border-red-500'}`}>
                    <h3 className="text-lg font-bold mb-2">Engine Status</h3>
                    <div className="flex items-center space-x-2">
                        <span className={`w-3 h-3 rounded-full ${status === 'online' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        <span className="font-mono text-lg">{status.toUpperCase()}</span>
                    </div>
                    <p className="text-sm text-slate-500 mt-2">
                        Target: <span className="font-mono">http://{window.location.hostname}:8090</span>
                    </p>
                    <button 
                        onClick={openAdminPanel}
                        className="mt-4 w-full bg-slate-800 hover:bg-slate-700 text-white py-2 rounded-lg flex items-center justify-center space-x-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        <span>Open Admin Dashboard</span>
                    </button>
                    <p className="text-xs text-slate-400 mt-2 text-center">Use this to create your first Admin account.</p>
                </Card>

                {/* Admin Auth Card */}
                <Card>
                    <h3 className="text-lg font-bold mb-4">Database Administration</h3>
                    {isAdmin ? (
                        <div className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 p-4 rounded-lg text-center">
                            <p className="font-bold">✓ Authenticated as Admin</p>
                            <button onClick={() => pb.authStore.clear()} className="mt-2 text-sm underline hover:text-green-600">Logout</button>
                        </div>
                    ) : (
                        <form onSubmit={handleAdminLogin} className="space-y-3">
                            <input 
                                type="email" 
                                placeholder="Admin Email" 
                                value={email} 
                                onChange={e => setEmail(e.target.value)} 
                                className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600"
                            />
                            <input 
                                type="password" 
                                placeholder="Password" 
                                value={password} 
                                onChange={e => setPassword(e.target.value)} 
                                className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600"
                            />
                            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-semibold">
                                Login to Enable Tools
                            </button>
                        </form>
                    )}
                </Card>
            </div>

            {/* Tools Section (Locked if not admin) */}
            {isAdmin && (
                <Card>
                    <h3 className="text-xl font-bold mb-4">Management Tools</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button 
                            onClick={handleInitSchema}
                            disabled={isProcessing}
                            className="p-4 border-2 border-dashed border-blue-300 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-xl text-blue-700 dark:text-blue-300 font-bold disabled:opacity-50"
                        >
                            1. Initialize Database Schema
                            <span className="block text-xs font-normal mt-1">Creates 'albums', 'photos', 'orders', 'products' collections</span>
                        </button>
                         <button 
                            onClick={handleSyncData}
                            disabled={isProcessing}
                            className="p-4 border-2 border-dashed border-purple-300 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/40 rounded-xl text-purple-700 dark:text-purple-300 font-bold disabled:opacity-50"
                        >
                            2. Migrate Local Data
                            <span className="block text-xs font-normal mt-1">Push Products & Albums to Database</span>
                        </button>
                    </div>

                    {/* Progress & Logs */}
                    <div className="mt-6">
                        {isProcessing && (
                            <div className="w-full bg-slate-200 rounded-full h-2.5 mb-4 dark:bg-slate-700">
                                <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                            </div>
                        )}
                        <div className="bg-slate-900 text-green-400 font-mono text-xs p-4 rounded-lg h-48 overflow-y-auto">
                            {logs.length === 0 ? <span className="text-slate-500">System idle...</span> : logs.map((log, i) => (
                                <div key={i}>{log}</div>
                            ))}
                        </div>
                    </div>
                </Card>
            )}
        </div>
    );
};

export default DatabaseManagement;
