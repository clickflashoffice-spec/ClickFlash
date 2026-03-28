
import React from 'react';
import { KioskSettings } from '../../../types';

interface AccessSettingsProps {
    settings: KioskSettings;
    handleCheckboxChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const AccessSettings: React.FC<AccessSettingsProps> = ({ settings, handleCheckboxChange }) => {
    return (
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
    );
};
