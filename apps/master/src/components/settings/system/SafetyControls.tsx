import React from 'react';
import Card from '../../common/Card';

interface SafetyControlsProps {
    canResetDb: boolean;
    isResetting: boolean;
    onResetClick: () => void;
}

export const SafetyControls: React.FC<SafetyControlsProps> = ({ canResetDb, isResetting, onResetClick }) => {
    return (
        <>
            <Card className={`border-l-4 ${canResetDb ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'}`}>
                <div className="flex items-start space-x-3">
                    <div className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900 dark:text-white">Factory Reset</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-3 leading-relaxed">
                            Wipe local DB and restore defaults. Use with caution.
                        </p>
                        {canResetDb ? (
                            <button
                                onClick={onResetClick}
                                disabled={isResetting}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider rounded-md transition-colors shadow-sm w-full text-center"
                            >
                                {isResetting ? 'RESETTING...' : 'RESET SYSTEM'}
                            </button>
                        ) : (
                            <span className="text-xs bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded text-slate-500">Admin Required</span>
                        )}
                    </div>
                </div>
            </Card>

            <Card className="border-l-4 border-amber-500">
                <div className="flex items-start space-x-3">
                    <div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900 dark:text-white">Exit Kiosk Mode</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-3 leading-relaxed">
                            Close the application and return to Desktop.
                        </p>
                        <button
                            onClick={() => void (async () => {
                                if (confirm('Exit Kiosk Mode and return to OS?')) {
                                    if (!window.electron) {
                                        alert('Kiosk Exit API not available.');
                                        return;
                                    }

                                    const pin = prompt('Enter the administrator PIN:');
                                    if (pin === null) return;
                                    const result = await window.electron.kiosk.unlock(pin);
                                    if (!result.success) alert(result.error ?? 'Unable to exit kiosk mode.');
                                }
                            })()}
                            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold uppercase tracking-wider rounded-md transition-colors shadow-sm w-full text-center"
                        >
                            EXIT TO DESKTOP
                        </button>
                    </div>
                </div>
            </Card>
        </>
    );
};
