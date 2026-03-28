import React, { useState, useEffect } from 'react';
import Card from '../common/Card';
import useLocalStorage from '../../hooks/useLocalStorage';

// Type guard for Electron API
const isElectron = (): boolean => {
    return typeof window !== 'undefined' && 'electron' in window;
};

const PrintSettings: React.FC = () => {
    const [printConfig, setPrintConfig] = useLocalStorage('printSettings', {
        defaultPrinter: '',
        paperSize: '4x6',
        autoPrint: false,
        printReceipts: true
    });

    const [installedPrinters, setInstalledPrinters] = useState<string[]>([]);
    const [isLoadingPrinters, setIsLoadingPrinters] = useState(true);
    const [printerError, setPrinterError] = useState<string | null>(null);

    useEffect(() => {
        // Detect installed printers
        const detectPrinters = async () => {
            setIsLoadingPrinters(true);
            setPrinterError(null);

            try {
                // Check if we're in Electron environment
                if (isElectron() && window.electron?.getPrinters) {
                    const printers = await window.electron.getPrinters();
                    setInstalledPrinters(printers.map((p: any) => p.name));
                } else {
                    // Fallback: Use Backend API
                    const response = await fetch('/api/printers');
                    if (!response.ok) throw new Error('Failed to fetch printers from server');
                    const printers = await response.json();
                    setInstalledPrinters(printers.map((p: any) => p.name || p.deviceId || p));
                }
            } catch (error) {
                console.error('Failed to detect printers:', error);
                setPrinterError('Failed to detect printers. Please check your system.');
                // Fallback to common printers if API also fails
                setInstalledPrinters([
                    'DNP DS620',
                    'DNP RX1HS',
                    'Fujifilm ASK-300',
                    'Mitsubishi CP-D90DW',
                    'Microsoft Print to PDF'
                ]);
            } finally {
                setIsLoadingPrinters(false);
            }
        };

        detectPrinters();
    }, []);

    const handleRefreshPrinters = async () => {
        setIsLoadingPrinters(true);
        setPrinterError(null);

        try {
            if (isElectron() && window.electron?.getPrinters) {
                const printers = await window.electron.getPrinters();
                setInstalledPrinters(printers.map((p: any) => p.name));
            } else {
                // Backend API Fallback
                const response = await fetch('/api/printers');
                if (!response.ok) throw new Error('Failed to fetch printers');
                const printers = await response.json();
                setInstalledPrinters(printers.map((p: any) => p.name || p.deviceId || p));
            }
        } catch (error) {
            console.error('Failed to refresh printers:', error);
            setPrinterError('Failed to refresh printers.');
        } finally {
            setIsLoadingPrinters(false);
        }
    };

    const handleTestPrint = async () => {
        if (!printConfig.defaultPrinter) {
            alert('Please select a printer first');
            return;
        }

        try {
            if (isElectron() && window.electron?.print) {
                await window.electron.print({
                    printer: printConfig.defaultPrinter,
                    content: 'Test Print - Star Master Photography OS',
                    silent: false
                });
                alert('Test print sent successfully!');
            } else {
                // Backend API Fallback
                const response = await fetch('/api/print', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        printer: printConfig.defaultPrinter,
                        type: 'test',
                        content: 'Test Print'
                    })
                });

                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.message || 'Print failed');
                }

                const result = await response.json();
                alert(result.message || 'Test print sent successfully!');
            }
        } catch (error) {
            console.error('Test print failed:', error);
            alert(`Test print failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Print Settings</h2>
                <p className="text-slate-500 dark:text-slate-400">Manage printers and print automation.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                        Printer Configuration
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Default Photo Printer
                                </label>
                                <button
                                    onClick={handleRefreshPrinters}
                                    disabled={isLoadingPrinters}
                                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
                                >
                                    {isLoadingPrinters ? 'Refreshing...' : '🔄 Refresh'}
                                </button>
                            </div>
                            <select
                                value={printConfig.defaultPrinter}
                                onChange={(e) => setPrintConfig(prev => ({ ...prev, defaultPrinter: e.target.value }))}
                                disabled={isLoadingPrinters}
                                aria-label="Select Default Printer"
                                className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none disabled:opacity-50"
                            >
                                <option value="">
                                    {isLoadingPrinters ? 'Detecting printers...' : 'Select a printer...'}
                                </option>
                                {installedPrinters.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                            {printerError && (
                                <p className="text-xs text-red-600 dark:text-red-400 mt-1">{printerError}</p>
                            )}
                            {!isLoadingPrinters && installedPrinters.length === 0 && (
                                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                    No printers detected. Please install a printer driver.
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Default Paper Size</label>
                            <select
                                value={printConfig.paperSize}
                                onChange={(e) => setPrintConfig(prev => ({ ...prev, paperSize: e.target.value }))}
                                aria-label="Select Paper Size"
                                className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                            >
                                <option value="4x6">4x6" (10x15cm)</option>
                                <option value="5x7">5x7" (13x18cm)</option>
                                <option value="6x8">6x8" (15x20cm)</option>
                                <option value="8x10">8x10" (20x25cm)</option>
                            </select>
                        </div>
                        <button
                            onClick={handleTestPrint}
                            disabled={!printConfig.defaultPrinter || isLoadingPrinters}
                            className="w-full px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
                        >
                            🖨️ Send Test Print
                        </button>
                    </div>
                </Card>

                <Card>
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Automation
                    </h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-slate-900 dark:text-white">Auto-Print Orders</p>
                                <p className="text-xs text-slate-500">Automatically send photos to printer when order is paid.</p>
                            </div>
                            <button
                                onClick={() => setPrintConfig(prev => ({ ...prev, autoPrint: !prev.autoPrint }))}
                                aria-label="Toggle Auto-Print"
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${printConfig.autoPrint ? 'bg-orange-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${printConfig.autoPrint ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-slate-900 dark:text-white">Print Receipts</p>
                                <p className="text-xs text-slate-500">Automatically print customer receipt on checkout.</p>
                            </div>
                            <button
                                onClick={() => setPrintConfig(prev => ({ ...prev, printReceipts: !prev.printReceipts }))}
                                aria-label="Toggle Print Receipts"
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${printConfig.printReceipts ? 'bg-orange-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${printConfig.printReceipts ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>
                    </div>
                </Card>
            </div>

            {printConfig.defaultPrinter && (
                <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                    <div className="flex items-start gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <div>
                            <p className="font-semibold text-green-800 dark:text-green-200">Printer Configured</p>
                            <p className="text-sm text-green-700 dark:text-green-300">
                                Using: <strong>{printConfig.defaultPrinter}</strong> | Paper: <strong>{printConfig.paperSize}"</strong>
                            </p>
                        </div>
                    </div>
                </Card>
            )}
        </div>
    );
};

export default PrintSettings;
