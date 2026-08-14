
import React from 'react';

interface SecuritySettingsProps {
    newPassword: string;
    setNewPassword: (val: string) => void;
    confirmPassword: string;
    setConfirmPassword: (val: string) => void;
}

export const SecuritySettings: React.FC<SecuritySettingsProps> = ({
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword
}) => {
    return (
        <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
            <h3 className="text-lg font-bold mb-4">Security</h3>
            <div className="space-y-4 mb-4">
                <div>
                    <label htmlFor="new-password-input" className="block text-sm font-medium text-slate-500 dark:text-slate-300 mb-1">New Password</label>
                    <input
                        id="new-password-input"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Leave empty to keep current password"
                        className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2"
                    />
                </div>
                <div>
                    <label htmlFor="confirm-password-input" className="block text-sm font-medium text-slate-500 dark:text-slate-300 mb-1">Confirm Password</label>
                    <input
                        id="confirm-password-input"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                        className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2"
                    />
                </div>
            </div>
        </div>
    );
};
