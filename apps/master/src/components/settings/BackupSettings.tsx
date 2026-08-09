import { Card } from "@clickflash/ui";
import React, { useState } from 'react';
import { safeStorage } from '../../utils/safeStorage';

interface BackupSettingsProps {
    showToast: (message: string) => void;
}

import { apiService } from '../../services/apiService';
import { logger } from '@/utils/logger';

const BackupSettings: React.FC<BackupSettingsProps> = ({ showToast }) => {
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    const [lastBackup, setLastBackup] = useState<string | null>(safeStorage.getItem('lastBackupTime'));
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleBackup = async () => {
        setIsBackingUp(true);
        try {
            const result = await apiService.backup();
            const now = new Date().toLocaleString();
            setLastBackup(now);
            safeStorage.setItem('lastBackupTime', now);
            showToast(result.message || 'Backup completed successfully!');
        } catch (error) {
            showToast('Backup failed.');
        } finally {
            setIsBackingUp(false);
        }
    };

    const handleRestoreClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!confirm('WARNING: Restoring will overwrite all current data and restart requirements. Are you sure?')) {
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        setIsRestoring(true);
        try {
            await apiService.restore(file);
            showToast('Restore successful! Please RESTART the server.');
            alert('Restore successful! Please restart the application server to apply changes.');
        } catch (error) {
            logger.error('Restore failed:', error);
            showToast('Restore failed. See console for details.');
        } finally {
            setIsRestoring(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Backup & Restore</h2>
                <p className="text-slate-500 dark:text-slate-400">Protect your data with local backups.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                        Manual Backup
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">
                        Create a full backup of the <code>pb_data</code> folder, including the database and all photos.
                    </p>
                    <div className="flex items-center justify-between">
                        <div className="text-xs text-slate-500">
                            Last Backup: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{lastBackup || 'Never'}</span>
                        </div>
                        <button
                            onClick={handleBackup}
                            disabled={isBackingUp}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg shadow-md disabled:opacity-50 flex items-center gap-2"
                        >
                            {isBackingUp ? (
                                <>
                                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    Backing Up...
                                </>
                            ) : 'Backup Now'}
                        </button>
                    </div>
                </Card>

                <Card>
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                        Restore Data
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">
                        Restore the system from a previous backup zip file. <span className="font-bold text-red-500">Warning: This will overwrite current data.</span>
                    </p>
                    <div className="flex justify-end">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept=".zip"
                            className="hidden"
                            aria-label="Select backup file"
                        />
                        <button
                            onClick={handleRestoreClick}
                            disabled={isRestoring}
                            className="border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
                        >
                            {isRestoring ? (
                                <>
                                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    Restoring...
                                </>
                            ) : 'Select Backup File...'}
                        </button>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default BackupSettings;
