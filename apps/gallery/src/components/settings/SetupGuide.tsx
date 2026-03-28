
import React from 'react';
import Card from '../common/Card.tsx';

const Code: React.FC<{ children: React.ReactNode }> = ({ children }) => <code className="bg-slate-100 dark:bg-slate-700 text-red-500 dark:text-red-400 font-mono rounded px-2 py-1 text-sm">{children}</code>;

const SetupGuide: React.FC = () => {

    const stepStyle = "flex items-start space-x-4";
    const stepNumberStyle = "flex-shrink-0 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg";
    
    return (
        <div>
            <div className="flex justify-between items-center mb-6 no-print">
                <h2 className="text-2xl font-bold">Offline Setup & Troubleshooting Guide</h2>
                <button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg">Print / Save as PDF</button>
            </div>
            
            <div id="printable-guide-area" className="printable-area space-y-8">
                <Card>
                    <h2 className="text-2xl font-bold mb-2">System Overview</h2>
                    <p className="text-slate-500 dark:text-slate-400">
                        Welcome to the Star Master OS (Enterprise Edition). This system runs on a custom <strong>Embedded Node.js Engine</strong> designed for zero-configuration offline deployment. No external database software is required.
                    </p>
                </Card>
                
                 <Card>
                    <h2 className="text-2xl font-bold mb-4">Master PC Setup</h2>
                    <div className="space-y-6">
                        <div className={stepStyle}>
                            <div className={stepNumberStyle}>1</div>
                            <div>
                                <h4 className="font-bold">Install & Launch</h4>
                                <p className="text-slate-500 dark:text-slate-400">Run the <strong>Star Master OS Setup.exe</strong> installer. Launch via the Desktop Shortcut. The internal server (Port 8090) starts automatically in the background.</p>
                            </div>
                        </div>
                         <div className={stepStyle}>
                            <div className={stepNumberStyle}>2</div>
                            <div>
                                <h4 className="font-bold">Network Interface Selection</h4>
                                <p className="text-slate-500 dark:text-slate-400">
                                    Navigate to <Code>Settings &gt; Local Portal Settings</Code>. Under "Local Network Mode", use the dropdown to select the correct network adapter:
                                </p>
                                <ul className="list-disc list-inside mt-2 text-sm text-slate-600 dark:text-slate-400">
                                    <li><strong>Wi-Fi:</strong> If connecting Kiosks wirelessly.</li>
                                    <li><strong>Ethernet:</strong> If using a wired switch/router (Recommended for speed).</li>
                                </ul>
                                <p className="text-sm mt-1 text-slate-500">The selected IP will be used to generate QR codes for Kiosks.</p>
                            </div>
                        </div>
                         <div className={stepStyle}>
                            <div className={stepNumberStyle}>3</div>
                            <div>
                                <h4 className="font-bold">Link to Management Portal</h4>
                                <p className="text-slate-500 dark:text-slate-400">
                                    Copy the <strong>License Key</strong> from <Code>Settings &gt; Local Portal Settings</Code>. Enter this key in the Management Portal to authorize Cloud Sync for this destination.
                                </p>
                            </div>
                        </div>
                    </div>
                </Card>
                
                <Card>
                    <h2 className="text-2xl font-bold mb-4">Touch Kiosk Setup</h2>
                     <div className="space-y-6">
                        <div className={stepStyle}>
                            <div className={stepNumberStyle}>1</div>
                            <div>
                                <h4 className="font-bold">Connect to Network</h4>
                                <p className="text-slate-500 dark:text-slate-400">Ensure the tablet is connected to the <strong>same network</strong> as the Master PC.</p>
                            </div>
                        </div>
                        <div className={stepStyle}>
                            <div className={stepNumberStyle}>2</div>
                            <div>
                                <h4 className="font-bold">Pair via QR Code</h4>
                                <p className="text-slate-500 dark:text-slate-400">
                                    On Master: Go to <Code>Settings &gt; Kiosks</Code>.
                                    <br/>On Tablet: Scan the QR code. This auto-configures the server URL.
                                </p>
                            </div>
                        </div>
                        
                        <div className="mt-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                            <h4 className="font-bold text-indigo-800 dark:text-indigo-300 mb-2">Troubleshooting Connection</h4>
                            <ul className="list-disc list-inside text-sm text-indigo-700 dark:text-indigo-400">
                                <li><strong>Check IP:</strong> Verify the IP in Kiosk Settings matches the Master PC's selected interface.</li>
                                <li><strong>Firewall:</strong> Ensure the application main executable is allowed through Windows Firewall on Private Networks. The backend runs on Port <strong>8090</strong>.</li>
                                <li><strong>Ping:</strong> Try accessing <Code>http://[MASTER_IP]:8090/api/health</Code> from the tablet's browser directly. You should see a JSON success message.</li>
                            </ul>
                        </div>
                    </div>
                </Card>
                
                <Card>
                    <h3 className="text-xl font-bold mb-4">Deployment Modes</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                            <h4 className="font-bold text-blue-600 mb-2">Local Mode (Default)</h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Best for unstable internet. Data is stored on the Master PC in <Code>data.json</Code>. Syncs to cloud manually. Kiosks connect over LAN.
                            </p>
                        </div>
                        <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                            <h4 className="font-bold text-purple-600 mb-2">Cloud Mode</h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Requires strong internet. Master and Kiosks connect directly to the cloud database. Real-time sync across multiple locations.
                            </p>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default SetupGuide;
