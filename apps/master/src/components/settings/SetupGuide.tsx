import React, { useState } from 'react';
import { DEFAULT_MASTER_PORT } from '../../constants';
import { logger } from '@/utils/logger';


const Code: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <code className="bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-mono rounded px-2 py-0.5 text-sm border border-slate-200 dark:border-slate-700">
        {children}
    </code>
);

const StepIcon: React.FC<{ step: number; current: number; icon: React.ReactNode }> = ({ step, current, icon }) => {
    const isActive = step === current;
    const isCompleted = step < current;

    return (
        <div className={`
            w-12 h-12 rounded-2xl flex items-center justify-center text-xl transition-all duration-500 relative z-10
            ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-110' :
                isCompleted ? 'bg-green-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}
        `}>
            {isCompleted ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
            ) : icon}
        </div>
    );
};

const SetupGuide: React.FC = () => {
    const [activeStep, setActiveStep] = useState(1);
    const [networkStatus, setNetworkStatus] = useState<'idle' | 'checking' | 'success' | 'error'>('idle');
    const [networkError, setNetworkError] = useState<string>('');

    const checkNetwork = async () => {
        setNetworkStatus('checking');
        setNetworkError('');

        try {
            // Get base URL from PocketBase or default to localhost
            const baseUrl = (window as any).pb?.baseUrl || `http://127.0.0.1:${DEFAULT_MASTER_PORT}`;

            const response = await fetch(`${baseUrl}/api/network/test-port`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success && data.accessible) {
                setNetworkStatus('success');
            } else {
                setNetworkStatus('error');
                setNetworkError(data.message || 'Port test failed');
            }
        } catch (error) {
            logger.error('Network test error:', error);
            setNetworkStatus('error');
            setNetworkError(error instanceof Error ? error.message : 'Failed to connect to server');
        }
    };

    const steps = [
        { id: 1, title: 'System Overview', icon: '🖥️' },
        { id: 2, title: 'Master PC', icon: '⚙️' },
        { id: 3, title: 'Kiosk Pairing', icon: '📱' },
        { id: 4, title: 'Troubleshooting', icon: '🔧' }
    ];

    return (
        <div className="max-w-5xl mx-auto pb-12 animate-fadeIn">
            {/* Header */}
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
                        System Setup
                    </h1>
                    <p className="text-lg text-slate-500 dark:text-slate-400">
                        Follow this guide to configure your offline photography network.
                    </p>
                </div>
                <button
                    onClick={() => window.print()}
                    className="group flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:shadow-lg transition-all text-sm font-bold text-slate-600 dark:text-slate-300"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400 group-hover:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    <span>Print Guide</span>
                </button>
            </div>

            {/* Progress Stepper */}
            <div className="relative mb-12 px-4 no-print">
                <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-100 dark:bg-slate-800 -z-0 rounded-full"></div>
                <div
                    className="absolute top-1/2 left-0 h-1 bg-blue-500 -z-0 rounded-full transition-all duration-500"
                    ref={(el) => {
                        if (el) el.style.width = `${((activeStep - 1) / (steps.length - 1)) * 100}%`;
                    }}
                ></div>

                <div className="flex justify-between relative z-10">
                    {steps.map((step) => (
                        <button
                            key={step.id}
                            onClick={() => setActiveStep(step.id)}
                            className="flex flex-col items-center gap-3 group focus:outline-none"
                        >
                            <StepIcon step={step.id} current={activeStep} icon={<span>{step.icon}</span>} />
                            <span className={`text-sm font-bold transition-colors ${activeStep === step.id ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>
                                {step.title}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden min-h-[500px] relative">
                        {/* Decorative Background */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-bl-full pointer-events-none"></div>

                        <div className="p-8">
                            {activeStep === 1 && (
                                <div className="space-y-6 animate-fadeIn">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Welcome to Star Master OS</h2>
                                            <p className="text-slate-500">Enterprise Edition v4.1 (Apex Architecture)</p>
                                        </div>
                                    </div>

                                    <div className="prose dark:prose-invert max-w-none text-slate-600 dark:text-slate-300">
                                        <p className="text-lg leading-relaxed">
                                            This system is engineered for <strong>zero-latency offline deployment</strong>.
                                            It utilizes the <strong>Apex 'Super Fast' Protocol</strong> to ensure Kiosks remain responsive even with 1TB+ libraries.
                                        </p>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-8">
                                            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700">
                                                <h3 className="font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                                    Smart Offline Mesh
                                                </h3>
                                                <p className="text-xs text-slate-500">
                                                    Kiosks auto-discover Master via mDNS. No static IP configuration required.
                                                </p>
                                            </div>
                                            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700">
                                                <h3 className="font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                                    Delta Sync & Tiering
                                                </h3>
                                                <p className="text-xs text-slate-500">
                                                    Only changes are synced. Images use "Blur-Up" low-res previews for instant loading.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeStep === 2 && (
                                <div className="space-y-8 animate-fadeIn">
                                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-4">
                                        Master PC Configuration
                                    </h2>

                                    <div className="space-y-6">
                                        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl mb-6">
                                            <div className="flex items-center gap-3 text-amber-900 dark:text-amber-100 font-bold mb-2">
                                                <svg className="w-5 h-5 font-bold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                                Law 01: Dual-Scope Path Guard
                                            </div>
                                            <p className="text-sm text-amber-800 dark:text-amber-200 mb-4">Before proceeding, you MUST verify that you are working within the correct application path. Cross-contamination between Master and Touch apps is strictly prohibited.</p>
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <input type="checkbox" id="verify-path" className="rounded border-amber-300" />
                                                    <label htmlFor="verify-path" className="text-xs font-medium">I confirm I am running <strong>Master Portal</strong> from <code>E:\ClickFlash\apps\master\</code></label>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-4">
                                            <div className="flex-shrink-0 w-8 h-8 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full flex items-center justify-center font-bold">1</div>
                                            <div>
                                                <h3 className="font-bold text-lg text-slate-900 dark:text-white">Launch Application</h3>
                                                <p className="text-slate-500 mt-1">
                                                    Run <Code>Star Master OS.exe</Code>. The internal server (Port {DEFAULT_MASTER_PORT}) starts automatically.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex gap-4">
                                            <div className="flex-shrink-0 w-8 h-8 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full flex items-center justify-center font-bold">2</div>
                                            <div>
                                                <h3 className="font-bold text-lg text-slate-900 dark:text-white">Select Network Interface</h3>
                                                <p className="text-slate-500 mt-1 mb-3">
                                                    Go to <Code>Settings &gt; Local Portal</Code> and select the adapter connected to your Kiosk network.
                                                </p>

                                                <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="text-sm font-mono text-slate-600 dark:text-slate-400">Diagnostic Check</span>
                                                        <button
                                                            onClick={checkNetwork}
                                                            disabled={networkStatus === 'checking' || networkStatus === 'success'}
                                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${networkStatus === 'success' ? 'bg-green-100 text-green-700' :
                                                                networkStatus === 'error' ? 'bg-red-100 text-red-700' :
                                                                    networkStatus === 'checking' ? 'bg-yellow-100 text-yellow-700' :
                                                                        'bg-blue-600 text-white hover:bg-blue-700'
                                                                }`}
                                                        >
                                                            {networkStatus === 'idle' ? `Test Port ${DEFAULT_MASTER_PORT}` :
                                                                networkStatus === 'checking' ? 'Testing...' :
                                                                    networkStatus === 'success' ? 'Port Open' : 'Failed'}
                                                        </button>
                                                    </div>
                                                    {networkStatus === 'error' && networkError && (
                                                        <div className="mt-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded border border-red-200 dark:border-red-800">
                                                            <span className="font-semibold">Error:</span> {networkError}
                                                        </div>
                                                    )}
                                                    {networkStatus === 'success' && (
                                                        <div className="mt-2 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-2 rounded border border-green-200 dark:border-green-800">
                                                            ✓ Port {DEFAULT_MASTER_PORT} is accessible and responding
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex gap-4">
                                            <div className="flex-shrink-0 w-8 h-8 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full flex items-center justify-center font-bold">3</div>
                                            <div>
                                                <h3 className="font-bold text-lg text-slate-900 dark:text-white">License Activation</h3>
                                                <p className="text-slate-500 mt-1">
                                                    Copy the License Key from Settings and enter it in the Management Portal to authorize this device.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-8 p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl">
                                        <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                                            <strong>Law 10 Reminder:</strong> All setup steps must adhere to the Core Operations Manual. If you encounter issues, refer to the <a href="#operational-laws" className="text-blue-500 hover:underline">Operational Laws</a> section in the documentation.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {activeStep === 3 && (
                                <div className="space-y-8 animate-fadeIn">
                                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-4">
                                        Connecting Touch Kiosks
                                    </h2>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800">
                                            <div className="text-4xl mb-4">📡</div>
                                            <h3 className="font-bold text-blue-900 dark:text-blue-100 mb-2">1. Connect to Wi-Fi</h3>
                                            <p className="text-sm text-blue-800 dark:text-blue-200 opacity-80">
                                                Ensure the tablet is on the <strong>same local network</strong> as this Master PC.
                                            </p>
                                        </div>

                                        <div className="p-6 bg-purple-50 dark:bg-purple-900/20 rounded-2xl border border-purple-100 dark:border-purple-800">
                                            <div className="text-4xl mb-4">📷</div>
                                            <h3 className="font-bold text-purple-900 dark:text-purple-100 mb-2">2. Scan QR Code</h3>
                                            <p className="text-sm text-purple-800 dark:text-purple-200 opacity-80">
                                                Open <Code>Settings &gt; Kiosks</Code> on Master to generate a pairing code. Scan it with the tablet.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-8">
                                        <h3 className="font-bold text-slate-900 dark:text-white mb-4">Verification</h3>
                                        <div className="bg-slate-100 dark:bg-slate-900 rounded-xl p-4 font-mono text-sm text-slate-600 dark:text-slate-400">
                                            <p className="mb-2">// On the Tablet Browser:</p>
                                            <p>1. Open Chrome/Safari</p>
                                            <p>2. Navigate to: <span className="text-blue-600 dark:text-blue-400">http://[MASTER_IP]:{DEFAULT_MASTER_PORT}/api/health</span></p>
                                            <p>3. You should see: <span className="text-green-600">{"{\"code\":200,\"message\":\"API Online\"}"}</span></p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeStep === 4 && (
                                <div className="space-y-8 animate-fadeIn">
                                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-4">
                                        Troubleshooting
                                    </h2>

                                    <div className="space-y-4">
                                        <div className="collapse collapse-plus bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl">
                                            <input type="radio" name="my-accordion-3" defaultChecked aria-label="Toggle Kiosk Disconnected troubleshooting" />
                                            <div className="collapse-title text-lg font-medium text-slate-900 dark:text-white">
                                                Kiosk says "Disconnected"
                                            </div>
                                            <div className="collapse-content text-slate-600 dark:text-slate-400">
                                                <p>Check Windows Firewall. Ensure <strong>Node.js</strong> and <strong>Star Master OS</strong> are allowed on Private Networks. The backend runs on port {DEFAULT_MASTER_PORT}.</p>
                                            </div>
                                        </div>
                                        <div className="collapse collapse-plus bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl">
                                            <input type="radio" name="my-accordion-3" aria-label="Toggle Photos not syncing troubleshooting" />
                                            <div className="collapse-title text-lg font-medium text-slate-900 dark:text-white">
                                                Photos not syncing
                                            </div>
                                            <div className="collapse-content text-slate-600 dark:text-slate-400">
                                                <p>Verify the "Local Network Mode" in Settings matches your actual IP address. If the IP changed (DHCP), you must re-pair the kiosks.</p>
                                            </div>
                                        </div>
                                        <div className="collapse collapse-plus bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl">
                                            <input type="radio" name="my-accordion-3" aria-label="Toggle Printer not found troubleshooting" />
                                            <div className="collapse-title text-lg font-medium text-slate-900 dark:text-white">
                                                Printer not found
                                            </div>
                                            <div className="collapse-content text-slate-600 dark:text-slate-400">
                                                <p>Ensure the printer is set as the <strong>Default Printer</strong> in Windows Control Panel. The app prints to the system default automatically.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Navigation Footer */}
                        <div className="bg-slate-50 dark:bg-slate-900/50 p-6 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                            <button
                                onClick={() => setActiveStep(Math.max(1, activeStep - 1))}
                                disabled={activeStep === 1}
                                className="px-6 py-2 rounded-lg font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Back
                            </button>
                            <button
                                onClick={() => setActiveStep(Math.min(steps.length, activeStep + 1))}
                                disabled={activeStep === steps.length}
                                className="px-8 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed transition-all transform active:scale-95"
                            >
                                {activeStep === steps.length ? 'Finish' : 'Next Step'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Sidebar / Quick Tips */}
                <div className="space-y-6">
                    {/* Pro Tips Section */}
                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none rounded-xl p-6 shadow-lg">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-white/10 rounded-lg">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold mb-2">Pro Tips for Success</h3>
                                <ul className="space-y-2 text-slate-300 text-sm">
                                    <li className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full"></span>
                                        Always connect the Master PC via Ethernet for maximum stability.
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full"></span>
                                        Run the "Network Diagnostic" tool if Kiosks cannot find the server.
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full"></span>
                                        Backup your <code>pb_data</code> folder weekly to an external drive.
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                        <h3 className="font-bold text-slate-900 dark:text-white mb-4">Support Contacts</h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-slate-500">IT Hotline</span>
                                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">+1 (800) 555-0199</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-slate-500">Email</span>
                                <span className="font-bold text-blue-600">support@starmaster.os</span>
                            </div>
                            <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-700 text-center">
                                <a href="#" className="text-xs font-bold text-slate-400 hover:text-blue-500 uppercase tracking-wider">Open Ticket Portal</a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SetupGuide;
