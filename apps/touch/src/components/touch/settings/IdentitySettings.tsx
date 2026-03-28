
import React from 'react';
import { KioskSettings } from '../../../types';

interface IdentitySettingsProps {
    settings: KioskSettings;
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
    handleLogoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    logoPreview: string;
}

export const IdentitySettings: React.FC<IdentitySettingsProps> = ({
    settings,
    handleChange,
    handleLogoChange,
    logoPreview
}) => {
    return (
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
    );
};
